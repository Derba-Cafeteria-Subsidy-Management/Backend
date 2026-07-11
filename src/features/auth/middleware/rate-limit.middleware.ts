import type { Request, Response, NextFunction } from 'express';
import { redis } from '../../../libs/lib/redis.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10000;

const cleanupExpired = (): void => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
  if (store.size > MAX_STORE_SIZE) {
    const keysToEvict = Array.from(store.keys()).slice(0, store.size - MAX_STORE_SIZE);
    for (const key of keysToEvict) {
      store.delete(key);
    }
  }
};

export const createRateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    
    // Check if Redis is ready/connected
    const isRedisReady = redis.status === 'ready';

    if (isRedisReady) {
      try {
        const currentCount = await redis.incr(key);
        if (currentCount === 1) {
          await redis.pexpire(key, options.windowMs);
        }

        if (currentCount > options.maxRequests) {
          res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
          });
          return;
        }

        next();
        return;
      } catch (redisError) {
        console.error('Redis rate limit error, falling back to memory:', redisError);
        // Fallback to memory-based limit
      }
    }

    cleanupExpired();

    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
      });
      return;
    }

    existing.count += 1;
    store.set(key, existing);
    next();
  };
};

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'login',
});

export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'forgot-password',
});
