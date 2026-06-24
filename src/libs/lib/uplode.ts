

import { Request} from 'express';

import multer from "multer";

// Helper: normalize multer files
export function getUploadedFiles(req: Request): Express.Multer.File[] {
  const files = req.files;
  if (Array.isArray(files)) return files as Express.Multer.File[];
  if (files && typeof files === "object") {
    // handle multer.fields(...)
    return Object.values(files).flat() as Express.Multer.File[];
  }
  return [];
}



export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }

    cb(null, true);
  },
});