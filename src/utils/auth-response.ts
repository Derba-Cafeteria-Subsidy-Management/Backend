
import { User } from ".prisma/client/default.js";


import {
  generateAccessToken,
  generateRefreshToken,
} from "./jwt";

export const createAuthTokens = (
  user: User
) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken:
      generateAccessToken(payload),

    refreshToken:
      generateRefreshToken(payload),
  };
};