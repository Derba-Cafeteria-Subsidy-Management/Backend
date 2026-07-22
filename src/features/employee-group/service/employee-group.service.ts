import { prisma } from '../../../libs/lib/prisma';
import { GroupStatus, SlotHalf, EmployeeType, EmployeeStatus } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../../errors/errors/apperror';
import { createAuditLog } from '../../auth/service/audit.service';
import { EmployeeGroupContext, CreateGroupInput, UpdateGroupInput, GroupListQuery } from '../types/employee-group.types';
import { rebuildFutureSchedule, ensureFutureSchedule, resolveGroupForSlot } from '../helpers/rotation.helper';
import { parseDateOnly, toDateOnlyString, startOfDay, parseDateOnlyUTC, startOfDayUtc } from '../../shared/helpers/date.helper';

export const createGroup = async (body: CreateGroupInput, context: EmployeeGroupContext) => {
  const exists = await prisma.employeeGroup.findUnique({
    where: { name: body.name },
  });

  if (exists) {
    throw new ConflictError('Employee group name already exists');
  }

  const effectiveDate = body.effectiveDate ? parseDateOnly(body.effectiveDate) : startOfDay(new Date());

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.employeeGroup.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        rotationOrder: body.rotationOrder,
        status: GroupStatus.ACTIVE,
      },
    });

    await rebuildFutureSchedule(effectiveDate, tx);

    return created;
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'EMPLOYEE_GROUP_CREATED',
    entityType: 'EmployeeGroup',
    entityId: group.id,
    metadata: {
      name: group.name,
      rotationOrder: group.rotationOrder,
      effectiveDate: body.effectiveDate ?? null,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return group;
};

export const updateGroup = async (id: string, body: UpdateGroupInput, context: EmployeeGroupContext) => {
  const group = await prisma.employeeGroup.findUnique({
    where: { id },
  });

  if (!group) {
    throw new NotFoundError('Employee group not found');
  }

  if (body.name && body.name !== group.name) {
    const exists = await prisma.employeeGroup.findUnique({
      where: { name: body.name },
    });
    if (exists) {
      throw new ConflictError('Employee group name already exists');
    }
  }

  const effectiveDate = body.effectiveDate ? parseDateOnly(body.effectiveDate) : startOfDay(new Date());

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.employeeGroup.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.rotationOrder !== undefined && { rotationOrder: body.rotationOrder }),
        ...(body.status && { status: body.status }),
      },
    });

    if (body.rotationOrder !== undefined || body.status !== undefined) {
      await rebuildFutureSchedule(effectiveDate, tx);
    }

    return res;
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'EMPLOYEE_GROUP_UPDATED',
    entityType: 'EmployeeGroup',
    entityId: updated.id,
    metadata: {
      previous: {
        name: group.name,
        rotationOrder: group.rotationOrder,
        status: group.status,
      },
      updated: {
        name: updated.name,
        rotationOrder: updated.rotationOrder,
        status: updated.status,
      },
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
};

export const activateGroup = async (
  id: string,
  context: EmployeeGroupContext,
  effectiveDateStr?: string
) => {
  const group = await prisma.employeeGroup.findUnique({
    where: { id },
  });

  if (!group) {
    throw new NotFoundError('Employee group not found');
  }

  if (group.status === GroupStatus.ACTIVE) {
    return group;
  }

  const effectiveDate = effectiveDateStr ? parseDateOnly(effectiveDateStr) : startOfDay(new Date());

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.employeeGroup.update({
      where: { id },
      data: { status: GroupStatus.ACTIVE },
    });

    await rebuildFutureSchedule(effectiveDate, tx);

    return res;
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'EMPLOYEE_GROUP_STATUS_CHANGED',
    entityType: 'EmployeeGroup',
    entityId: updated.id,
    metadata: { status: GroupStatus.ACTIVE, effectiveDate: effectiveDateStr ?? null },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
};

export const deactivateGroup = async (
  id: string,
  context: EmployeeGroupContext,
  effectiveDateStr?: string
) => {
  const group = await prisma.employeeGroup.findUnique({
    where: { id },
  });

  if (!group) {
    throw new NotFoundError('Employee group not found');
  }

  if (group.status === GroupStatus.INACTIVE) {
    return group;
  }

  const effectiveDate = effectiveDateStr ? parseDateOnly(effectiveDateStr) : startOfDay(new Date());

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.employeeGroup.update({
      where: { id },
      data: { status: GroupStatus.INACTIVE },
    });

    await rebuildFutureSchedule(effectiveDate, tx);

    return res;
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'EMPLOYEE_GROUP_STATUS_CHANGED',
    entityType: 'EmployeeGroup',
    entityId: updated.id,
    metadata: { status: GroupStatus.INACTIVE, effectiveDate: effectiveDateStr ?? null },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
};

export const getGroups = async (query: GroupListQuery) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const where: any = {};
  if (query.status) {
    where.status = query.status;
  }

  const [groups, total] = await Promise.all([
    prisma.employeeGroup.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { rotationOrder: 'asc' },
      include: {
        _count: {
          select: {
            members: {
              where: { active: true },
            },
          },
        },
      },
    }),
    prisma.employeeGroup.count({ where }),
  ]);

  return {
    groups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getGroupById = async (id: string) => {
  const group = await prisma.employeeGroup.findUnique({
    where: { id },
    include: {
      members: {
        where: { active: true },
        include: {
          employee: {
            select: {
              id: true,
              Employee_number: true,
              full_name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    throw new NotFoundError('Employee group not found');
  }

  return group;
};

export const assignEmployeeToGroup = async (
  employeeId: string,
  groupId: string,
  context: EmployeeGroupContext
) => {
  const [employee, group] = await Promise.all([
    prisma.employees.findUnique({ where: { id: employeeId } }),
    prisma.employeeGroup.findUnique({ where: { id: groupId } }),
  ]);

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  if (employee.status !== EmployeeStatus.ACTIVE) {
    throw new ValidationError('Employee must be active to assign to a group');
  }

  if (employee.employeeType !== EmployeeType.SHIFT) {
    throw new ValidationError('Only SHIFT employees can be assigned to a group');
  }

  if (!group) {
    throw new NotFoundError('Employee group not found');
  }

  if (group.status !== GroupStatus.ACTIVE) {
    throw new ValidationError('Cannot assign employee to an inactive group');
  }

  // Check if employee already has an active group membership
  const existingActive = await prisma.employeeGroupMember.findFirst({
    where: { employeeId, active: true },
  });

  if (existingActive) {
    if (existingActive.groupId === groupId) {
      return existingActive; // already assigned to this group
    }
    throw new ConflictError('Employee is already assigned to another active group. Use Move instead.');
  }

  const membership = await prisma.employeeGroupMember.create({
    data: {
      employeeId,
      groupId,
      active: true,
    },
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'GROUP_MEMBER_ASSIGNED',
    entityType: 'EmployeeGroupMember',
    entityId: membership.id,
    metadata: {
      employeeId,
      employeeNumber: employee.Employee_number,
      groupId,
      groupName: group.name,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return membership;
};




export const removeEmployeeFromGroup = async (
  employeeId: string,
  groupId: string,
  context: EmployeeGroupContext
) => {
  const activeMembership = await prisma.employeeGroupMember.findFirst({
    where: { employeeId, groupId, active: true },
    include: {
      employee: true,
      group: true,
    },
  });

  if (!activeMembership) {
    throw new NotFoundError('Active group membership not found for this employee and group');
  }

  const updated = await prisma.employeeGroupMember.update({
    where: { id: activeMembership.id },
    data: {
      active: false,
      leftAt: new Date(),
    },
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'GROUP_MEMBER_REMOVED',
    entityType: 'EmployeeGroupMember',
    entityId: updated.id,
    metadata: {
      employeeId,
      employeeNumber: activeMembership.employee.Employee_number,
      groupId,
      groupName: activeMembership.group.name,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return updated;
};

export const moveEmployeeBetweenGroups = async (
  employeeId: string,
  fromGroupId: string,
  toGroupId: string,
  context: EmployeeGroupContext
) => {
  const [employee, fromGroup, toGroup] = await Promise.all([
    prisma.employees.findUnique({ where: { id: employeeId } }),
    prisma.employeeGroup.findUnique({ where: { id: fromGroupId } }),
    prisma.employeeGroup.findUnique({ where: { id: toGroupId } }),
  ]);

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  if (!fromGroup) {
    throw new NotFoundError('From group not found');
  }

  if (!toGroup) {
    throw new NotFoundError('To group not found');
  }

  if (toGroup.status !== GroupStatus.ACTIVE) {
    throw new ValidationError('Cannot move employee to an inactive group');
  }

  const activeMembership = await prisma.employeeGroupMember.findFirst({
    where: { employeeId, groupId: fromGroupId, active: true },
  });

  if (!activeMembership) {
    throw new ValidationError('Employee is not currently an active member of the source group');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Close current membership
    await tx.employeeGroupMember.update({
      where: { id: activeMembership.id },
      data: {
        active: false,
        leftAt: new Date(),
      },
    });

    // 2. Open new membership
    const newMembership = await tx.employeeGroupMember.create({
      data: {
        employeeId,
        groupId: toGroupId,
        active: true,
      },
    });

    return newMembership;
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'GROUP_MEMBER_MOVED',
    entityType: 'EmployeeGroupMember',
    entityId: result.id,
    metadata: {
      employeeId,
      employeeNumber: employee.Employee_number,
      fromGroupId,
      fromGroupName: fromGroup.name,
      toGroupId,
      toGroupName: toGroup.name,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return result;
};


export const updateRotationOrder = async (
  groups: {
    id: string;
    rotationOrder: number;
  }[],
  effectiveDateStr: string,
  context: EmployeeGroupContext
) => {
  const effectiveDate = startOfDay(parseDateOnly(effectiveDateStr));

  return prisma.$transaction(async (tx) => {
    // Update the template (EmployeeGroup)
    for (const group of groups) {
      await tx.employeeGroup.update({
        where: {
          id: group.id,
        },
        data: {
          rotationOrder: group.rotationOrder,
        },
      });
    }

    // Rebuild schedule from effectiveDate onward
    await rebuildFutureSchedule(effectiveDate, tx);

    await createAuditLog({
      userId: context.AdminId,
      action: "EMPLOYEE_GROUP_UPDATED",
      entityType: "EmployeeGroup",
      entityId: "",
      metadata: {
        effectiveDate: effectiveDateStr,
        newOrder: groups,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  });
};

export const overrideSlot = async (
  dateStr: string,
  half: SlotHalf,
  groupId: string,
  context: EmployeeGroupContext
) => {
  const date = parseDateOnly(dateStr);
  const targetDate = startOfDay(date);

  const group = await prisma.employeeGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new NotFoundError('Employee group not found');
  }

  if (group.status !== GroupStatus.ACTIVE) {
    throw new ValidationError('Cannot schedule an inactive group');
  }

  if (targetDate < startOfDay(new Date())) {
    throw new ValidationError('Cannot modify past schedule');
  }

  const slot = await prisma.shiftSlot.upsert({
    where: {
      date_half: {
        date: targetDate,
        half,
      },
    },
    create: {
      date: targetDate,
      half,
      groupId,
      isOverride: true,
    },
    update: {
      groupId,
      isOverride: true,
    },
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'SHIFT_SLOT_OVERRIDDEN',
    entityType: 'ShiftSlot',
    entityId: slot.id,
    metadata: {
      date: dateStr,
      half,
      groupId,
      groupName: group.name,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return slot;
};

export const getSchedule = async (fromStr: string, toStr: string) => {
  console.log(fromStr)
  console.log(toStr)

  const from = parseDateOnlyUTC(fromStr);
  const to = parseDateOnlyUTC(toStr);

  console.log(from)
  console.log(to)

  // Ensure future schedule exists
  await ensureFutureSchedule();


  const slots =
    await prisma.shiftSlot.findMany({

      where: {
        date: {
          gte: startOfDayUtc(from),
          lte: startOfDayUtc(to)
        }
      },

      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }

    });

  console.log(slots)


  const result = [];


  const current = new Date(from);


  const slotMap = new Map(
    slots.map(slot => [
      `${toDateOnlyString(slot.date)}-${slot.half}`,
      slot,
    ])
  );

  while (current <= to) {
    const currentDate = toDateOnlyString(current);

    const first = slotMap.get(
      `${currentDate}-${SlotHalf.FIRST_HALF}`
    );

    const second = slotMap.get(
      `${currentDate}-${SlotHalf.SECOND_HALF}`
    );

    result.push({
      date: currentDate,
      firstHalf: {
        groupId: first?.groupId ?? null,
        groupName: first?.group.name ?? null,
        isOverride: first?.isOverride ?? false,
      },
      secondHalf: {
        groupId: second?.groupId ?? null,
        groupName: second?.group.name ?? null,
        isOverride: second?.isOverride ?? false,
      },
    });

    current.setDate(current.getDate() + 1);
  }

  return result;

}
