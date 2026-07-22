import { PrismaClient, Prisma, SlotHalf, mealType, GroupStatus } from '@prisma/client';
import { prisma } from '../../../libs/lib/prisma';
import { startOfDayUtc } from '../../shared/helpers/date.helper';

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Maps a meal session to the corresponding ShiftSlot half.
 * Returns null for BREAKFAST (not shift-managed).
 */
export const getSlotHalfForSession = (session: mealType): SlotHalf | null => {
  if (session === 'LUNCH') return SlotHalf.FIRST_HALF;
  if (session === 'DINNER') return SlotHalf.SECOND_HALF;
  return null;
};

/**
 * Reads ShiftSlot for the given date/half and returns the scheduled group.
 *
 * This is the ONLY source of truth — no rotation math is performed here.
 * No modulo, no anchor lookups, no fallback calculation.
 */
export const resolveGroupForSlot = async (
  date: Date,
  half: SlotHalf,
  tx: Db = prisma
) => {
  const slot = await tx.shiftSlot.findUnique({
    where: { date_half: { date: startOfDayUtc(date), half } },
    include: { group: true },
  });

  return slot?.group ?? null;
};

/**
 * Generates ShiftSlot rows from fromDate to toDate (inclusive).
 *
 * Algorithm:
 * - Fetches all ACTIVE groups ordered by rotationOrder ASC, createdAt ASC.
 * - Determines the starting rotation index by finding the most recent slot
 *   that exists before fromDate and continuing after its group.
 * - Iterates slot-by-slot in chronological order (FIRST_HALF then SECOND_HALF per day).
 * - Override rows (isOverride=true) are rotation anchors:
 *   their group defines the current rotation position, and the generator
 *   advances AFTER them. Override rows are never written or deleted by this function.
 * - Generated (isOverride=false) rows are batched and inserted at the end.
 *   skipDuplicates=true prevents errors if a slot already exists.
 *
 * Must be called only AFTER deleting stale generated rows (via rebuildFutureSchedule).
 */
export const generateSchedule = async (
  fromDate: Date,
  toDate: Date,
  tx: Db = prisma
): Promise<void> => {
  const dayFrom = startOfDayUtc(fromDate);
  const dayTo = startOfDayUtc(toDate);

  // Single round-trip: groups, overrides in range, and the last slot before range
  const [groups, existingOverrides, previousSlot] = await Promise.all([
    tx.employeeGroup.findMany({
      where: { status: GroupStatus.ACTIVE },
      orderBy: [{ rotationOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    tx.shiftSlot.findMany({
      where: {
        date: { gte: dayFrom, lte: dayTo },
        isOverride: true,
      },
    }),
    tx.shiftSlot.findFirst({
      where: { date: { lt: dayFrom } },
      orderBy: [{ date: 'desc' }, { half: 'desc' }],
    }),
  ]);

  if (groups.length === 0) return;

  // Build override lookup: "<date-iso>_<half>" → slot
  const overrideMap = new Map<string, (typeof existingOverrides)[number]>();
  for (const slot of existingOverrides) {
    overrideMap.set(`${startOfDayUtc(slot.date).toISOString()}_${slot.half}`, slot);
  }

  // Determine starting rotation index from the last slot before this range
  let groupIndex = 0;
  if (previousSlot) {
    const prevIdx = groups.findIndex((g) => g.id === previousSlot.groupId);
    if (prevIdx !== -1) {
      groupIndex = (prevIdx + 1) % groups.length;
    }
  }

  const slotsToCreate: Array<{
    date: Date;
    half: SlotHalf;
    groupId: string;
    isOverride: boolean;
  }> = [];

  const current = new Date(dayFrom);

  while (current <= dayTo) {
    const dayStart = startOfDayUtc(current);

    for (const half of [SlotHalf.FIRST_HALF, SlotHalf.SECOND_HALF]) {
      const key = `${dayStart.toISOString()}_${half}`;
      const override = overrideMap.get(key);

      if (override) {
        // Override is a rotation anchor — advance AFTER its group, never touch the row
        const overrideIdx = groups.findIndex((g) => g.id === override.groupId);
        if (overrideIdx !== -1) {
          groupIndex = (overrideIdx + 1) % groups.length;
        }
        continue;
      }

      slotsToCreate.push({
        date: dayStart,
        half,
        groupId: groups[groupIndex % groups.length]!.id,
        isOverride: false,
      });

      groupIndex = (groupIndex + 1) % groups.length;
    }

    current.setDate(current.getDate() + 1);
  }

  if (slotsToCreate.length > 0) {
    await tx.shiftSlot.createMany({ data: slotsToCreate, skipDuplicates: true });
  }
};

/**
 * Rebuilds the schedule from effectiveDate onward.
 *
 * 1. Deletes all generated (isOverride=false) ShiftSlot rows from effectiveDate onward.
 *    Manual overrides (isOverride=true) are NEVER deleted.
 * 2. Regenerates rows using the current group configuration.
 *    Override rows are preserved and used as rotation anchors during generation.
 *
 * History before effectiveDate is never modified.
 */
export const rebuildFutureSchedule = async (
  effectiveDate: Date,
  tx: Db = prisma
): Promise<void> => {
  const startDate = startOfDayUtc(effectiveDate);

  // Find the furthest existing slot to know how far to regenerate
  const lastSlot = await tx.shiftSlot.findFirst({
    orderBy: [{ date: 'desc' }, { half: 'desc' }],
  });

  // Regenerate up to the last existing slot, or 90 days ahead if no schedule exists yet
  const endDate =
    lastSlot && startOfDayUtc(lastSlot.date) >= startDate
      ? startOfDayUtc(lastSlot.date)
      : (() => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + 90);
          return d;
        })();

  // Delete only generated rows — overrides are sacred
  await tx.shiftSlot.deleteMany({
    where: {
      date: { gte: startDate },
      isOverride: false,
    },
  });

  await generateSchedule(startDate, endDate, tx);
};

/**
 * Ensures at least 30 days of future schedule exist.
 * If fewer than 30 future days are scheduled, extends by 90 more days.
 *
 * Called on-demand before any schedule read or SHIFT transaction —
 * never run on a background cron.
 *
 * Accepts an optional tx client so it can be called from inside a Prisma transaction.
 */
export const ensureFutureSchedule = async (tx: Db = prisma): Promise<void> => {
  const today = startOfDayUtc(new Date());

  const lastSlot = await tx.shiftSlot.findFirst({
    orderBy: { date: 'desc' },
  });

  const lastDate = lastSlot ? startOfDayUtc(lastSlot.date) : null;

  const daysRemaining = lastDate
    ? Math.round((lastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (daysRemaining < 30) {
    // Extend from the day after the last scheduled date, or from today if no schedule
    const extendFrom = lastDate
      ? (() => {
          const d = new Date(lastDate);
          d.setDate(d.getDate() + 1);
          return d;
        })()
      : today;

    const extendTo = new Date(extendFrom);
    extendTo.setDate(extendTo.getDate() + 90);

    await generateSchedule(extendFrom, extendTo, tx);
  }
};
