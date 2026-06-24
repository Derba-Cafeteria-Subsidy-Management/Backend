import jwt from 'jsonwebtoken';
import { config } from '../../../config.js';
import type { JwtPayload } from '../../../types/types/jwt.js';

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.ACCESS_SECRET, {
    expiresIn: config.ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.REFRESH_SECRET, {
    expiresIn: config.REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.REFRESH_SECRET) as JwtPayload;
};

export const createAuthTokens = (payload: JwtPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};
