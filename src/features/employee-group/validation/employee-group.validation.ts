import { z } from 'zod';
import { GroupStatus, SlotHalf } from '@prisma/client';

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  rotationOrder: z.number().int().min(0, 'Rotation order must be a non-negative integer'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name cannot be empty').max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  rotationOrder: z.number().int().min(0, 'Rotation order must be a non-negative integer').optional(),
  status: z.nativeEnum(GroupStatus).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const assignMemberSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  groupId: z.string().uuid('Invalid group ID format'),
});

export const moveMemberSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  fromGroupId: z.string().uuid('Invalid from group ID format'),
  toGroupId: z.string().uuid('Invalid to group ID format'),
});

export const overrideSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  half: z.nativeEnum(SlotHalf, { message: 'half must be FIRST_HALF or SECOND_HALF' }),
  groupId: z.string().uuid('Invalid group ID format'),
});

export const listGroupsSchema = z.object({
  status: z.nativeEnum(GroupStatus).optional(),
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1)),
});
