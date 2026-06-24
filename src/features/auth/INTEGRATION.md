/**
 * Auth module integration guide
 *
 * 1. Environment variables (.env)
 *
 * DATABASE_URL=postgresql://...
 * JWT_SECRET=your-access-secret
 * JWT_REFRESH_SECRET=your-refresh-secret
 * ACCESS_TOKEN_EXPIRES_IN=15m
 * REFRESH_TOKEN_EXPIRES_IN=7d
 * RESEND_API_KEY=re_...
 * RESEND_FROM_EMAIL=noreply@yourdomain.com
 * FRONTEND_URL=http://localhost:5173
 * SUPER_ADMIN_EMAIL=admin@example.com
 * SUPER_ADMIN_PASSWORD=SecurePass123!
 *
 * 2. Database setup
 *
 * npm run prisma:migrate:dev -- --name init_auth
 * npx tsx src/scripts/seed-super-admin.ts
 *
 * 3. Mount router (already wired in src/app.ts)
 *
 * app.use('/api/auth', authRouter);
 *
 * 4. Protect other feature routes
 *
 * import { authenticate } from './features/auth/middleware/authenticate.middleware.js';
 * import { authorize } from './features/auth/middleware/authorize.middleware.js';
 *
 * router.get('/invoices', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), listInvoices);
 *
 * 5. Frontend auth flow
 *
 * - Login: POST /api/auth/login -> store accessToken in memory, refreshToken is httpOnly cookie
 * - API calls: Authorization: Bearer <accessToken>
 * - Refresh: POST /api/auth/refresh-token with credentials: 'include'
 * - Logout: POST /api/auth/logout with credentials + Bearer access token
 *
 * 6. Example requests
 *
 * Invite (SUPER_ADMIN):
 * POST /api/auth/invite
 * Authorization: Bearer <accessToken>
 * { "email": "cashier@example.com", "role": "CASHIER" }
 *
 * Accept invitation:
 * POST /api/auth/accept-invitation
 * { "token": "<from-email>", "password": "SecurePass123!" }
 *
 * Login:
 * POST /api/auth/login
 * { "email": "admin@example.com", "password": "SecurePass123!" }
 */

export {};
