import { prisma } from '../libs/lib/prisma.js';
import { hashPassword } from '../features/auth/service/password.service.js';
import { UserRole, UserStatus } from '@prisma/client';
import { LoginInput } from '../features/auth/types/auth.types.js';
import { ConflictError } from '../errors/errors/apperror.js';

/**
 * One-time bootstrap script for the first SUPER_ADMIN account.
 * Run: npx tsx src/scripts/seed-super-admin.ts
 *
 * Required env:
 * - SUPER_ADMIN_EMAIL
 * - SUPER_ADMIN_PASSWORD
 */

export async function seedSuperAdmin(input :  LoginInput ): Promise<void> {
  if (!input.email || !input.password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  }

  // Check if any SUPER_ADMIN user already exists globally in the database
  const globalSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN }
  });

  if (globalSuperAdmin) {
    throw new ConflictError('A Super Admin is already registered in the system.');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    console.log(`Super admin already exists: ${input.email}`);
    return;
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.user.create({
    data: {
      email:input.email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Super admin created: ${input.email}`);
}

// seedSuperAdmin({ email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD })
//   .catch((error) => {
//     console.error('Failed to seed super admin', error);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
