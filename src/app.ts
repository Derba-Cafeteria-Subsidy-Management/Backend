import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { authRouter } from './features/auth/router/auth.router.js';
import { errorHandler, notFoundHandler } from './errors/errors/apperror.js';

export const app = express();

app.set('trust proxy', 1);

if (config.isdev) {
  app.use(cors({
    origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) =>
      callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));
} else {
  app.use(cors({
    origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  }));
}

app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.use('/api/auth', authRouter);

app.use(notFoundHandler);
app.use(errorHandler);
