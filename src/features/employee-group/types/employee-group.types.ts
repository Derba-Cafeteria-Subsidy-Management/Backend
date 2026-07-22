import { GroupStatus, SlotHalf } from '@prisma/client';
import { RequestContext } from '../../auth/types/auth.types';

export interface EmployeeGroupContext extends RequestContext {
  AdminId: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string | null;
  rotationOrder: number;
  effectiveDate?: string;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
  rotationOrder?: number;
  status?: GroupStatus;
  effectiveDate?: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  rotationOrder: number;
  status: GroupStatus;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    members: number;
  };
}

export interface AssignMemberInput {
  employeeId: string;
  groupId: string;
}

export interface MoveMemberInput {
  employeeId: string;
  fromGroupId: string;
  toGroupId: string;
}

export interface OverrideSlotInput {
  date: string; // YYYY-MM-DD
  half: SlotHalf;
  groupId: string;
}

export interface GroupListQuery {
  status?: GroupStatus;
  page?: number;
  limit?: number;
}
