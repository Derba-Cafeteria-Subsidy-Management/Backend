import { Request, Response, NextFunction } from "express";
import { getAuthenticationSettings, updateAuthenticationSettings } from "../service/system-settings.service.js";
import { updateAuthenticationSettingsSchema } from "../validation/system-settings.validation";


export const getAuthenticationSettingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getAuthenticationSettings();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};



export const updateAuthenticationSettingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = updateAuthenticationSettingsSchema.parse(req.body);

    const data = await updateAuthenticationSettings(
      input,
      req.user!.userId
    );

    res.status(200).json({
      success: true,
      message: "Authentication settings updated successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};