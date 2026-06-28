import { UserRole, UserStatus } from '@prisma/client';

export interface UserListQuery {
  role?: UserRole;
  status?: UserStatus;
  page: number;
  limit: number;
}

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  invitedBy: string | null;
}

export interface UserListResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}