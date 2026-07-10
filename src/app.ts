import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { authRouter } from './features/auth/router/auth.router.js';
import { transactionRouter } from './features/Transaction/router/transaction.router.js';
import { syncRouter } from './features/sync/router/sync.router.js';
import { correctionRouter } from './features/correction/router/correction.router.js';
import { subsidyRouter } from './features/subsidy/router/subsidy.router.js';
import { errorHandler, notFoundHandler } from './errors/errors/apperror.js';
import { menuRouter } from './features/menu/router/menu.router.js';
import { employeeRouter } from './features/employee/router/employee.route.js';
import { auditRouter } from './features/auth/router/audit.router.js';

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import { userManagementRouter } from './features/user/routers/user-managment.route.js';
import { reportRouter } from './features/report/routers/report.router.js';
import { systemrouter } from './features/system-settings/routers/system-settings.routes.js';



export const app = express();

app.set('trust proxy', 1);

// app.use(cors({
//   origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
//     callback(null, true);
//   },
//    credentials: true,
// }));

app.use(cors({
  origin: true,
  credentials:true,
}));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);


app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));


app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/sync', syncRouter);
app.use('/api/corrections', correctionRouter);
app.use('/api/subsidy', subsidyRouter);
app.use('/api/menus', menuRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/users', userManagementRouter);
app.use('/api/reports', reportRouter);
app.use('/api/system-settings', systemrouter);

app.use(notFoundHandler);
app.use(errorHandler);
