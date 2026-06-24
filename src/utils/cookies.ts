import { Response } from "express";

export const setRefreshCookie = (
  res: Response,
  token: string
) => {
  res.cookie(
    "refreshToken",
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "strict",
      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,
    }
  );
};

export const clearRefreshCookie = (
  res: Response
) => {
  res.clearCookie(
    "refreshToken"
  );
};