import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
      }
    }

    interface Request {
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
  namespace Express {
    interface UserPayload {
      userId: string;
      email: string;
      role: UserRole;
    }
    

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
