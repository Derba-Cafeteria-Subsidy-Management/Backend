import jwt from "jsonwebtoken";
import { config } from "../config";
import { JwtPayload } from "../types/types/jwt.js";

export const generateAccessToken = (
  payload: JwtPayload
) => {
  return jwt.sign(
    payload,
    config.ACCESS_SECRET as jwt.Secret,
    {
      expiresIn: config.ACCESS_EXPIRES_IN,
    } as jwt.SignOptions
  );
};

export const generateRefreshToken = (
  payload: JwtPayload
) => {
  return jwt.sign(
    payload,
    config.REFRESH_SECRET as jwt.Secret,
    {
      expiresIn: config.REFRESH_EXPIRES_IN,
    } as jwt.SignOptions
  );
};

export const verifyAccessToken = (
  token: string
) => {
  return jwt.verify(
    token,
    config.ACCESS_SECRET as jwt.Secret
  ) as JwtPayload;
};

export const verifyRefreshToken = (
  token: string
) => {
  return jwt.verify(
    token,
    config.REFRESH_SECRET as jwt.Secret
  ) as JwtPayload;
};