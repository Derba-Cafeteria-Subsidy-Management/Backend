import { prisma } from '../libs/lib/prisma.js';
import { hashPassword } from '../features/auth/service/password.service.js';
import { UserRole, UserStatus } from '@prisma/client';
import { LoginInput } from '../features/auth/types/auth.types.js';

/**
 * One-time bootstrap script for the first SUPER_ADMIN account.
 * Run: npx tsx src/scripts/seed-super-admin.ts
 *
 * Required env:
 * - SUPER_ADMIN_EMAIL
 * - SUPER_ADMIN_PASSWORD
 */

export async function seedSuperAdmin(input :  LoginInput ): Promise<void> {
  // const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  // const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!input.email || !input.password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
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
