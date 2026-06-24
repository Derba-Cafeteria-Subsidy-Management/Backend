import { config } from '../../../config.js';

export const getRefreshTokenExpiryDate = (): Date => {
  const expiresIn = config.REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(expiresIn);

  if (!match) {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }

  const value = Number(match[1]);
  const unit = match[2];
  const date = new Date();

  switch (unit) {
    case 's':
      date.setSeconds(date.getSeconds() + value);
      break;
    case 'm':
      date.setMinutes(date.getMinutes() + value);
      break;
    case 'h':
      date.setHours(date.getHours() + value);
      break;
    case 'd':
      date.setDate(date.getDate() + value);
      break;
    default:
      date.setDate(date.getDate() + 7);
  }

  return date;
};

export const getInvitationExpiryDate = (): Date => {
  const date = new Date();
  date.setHours(date.getHours() + config.invitationExpiresHours);
  return date;
};

export const getPasswordResetExpiryDate = (): Date => {
  const date = new Date();
  date.setHours(date.getHours() + config.passwordResetExpiresHours);
  return date;
};

export const isExpired = (expiresAt: Date): boolean => {
  return expiresAt.getTime() <= Date.now();
};
