import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  ACCESS_SECRET: process.env.JWT_SECRET ?? process.env.JWT_ACCESS_SECRET ?? '',
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? '',

  ACCESS_EXPIRES_IN:
    process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',

  REFRESH_EXPIRES_IN:
    process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  invitationExpiresHours: Number(process.env.INVITATION_EXPIRES_HOURS ?? 24),
  passwordResetExpiresHours: Number(process.env.PASSWORD_RESET_EXPIRES_HOURS ?? 1),

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@yourdomain.com',

  isdev: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  adminUsernames: (process.env.ADMIN_USERNAMES ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  Bot_token: process.env.BOT_TOKEN || '',
};


if (!config.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set. Set it in your environment.');
}

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET || '',
});

export { cloudinary };