import type { AuditAction, UserRole, UserStatus } from '@prisma/client';

export type { UserRole, UserStatus, AuditAction };

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuditLogInput {
  userId?: string | undefined;
  action: AuditAction;
  entityType?: string | undefined;
  entityId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface InviteUserInput {
  email: string;
  role: Exclude<UserRole, 'SUPER_ADMIN'>;
}

export interface AcceptInvitationInput {
  token: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}
