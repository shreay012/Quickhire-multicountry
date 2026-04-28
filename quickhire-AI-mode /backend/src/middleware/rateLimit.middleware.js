import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Sliding-window per-key rate limit using Redis INCR + EXPIRE.
 */
export function rateLimit({ limit = env.RATE_LIMIT_PER_MIN, windowSec = 60, keyFn } = {}) {
  return async (req, _res, next) => {
    try {
      const key = `rl:${keyFn ? keyFn(req) : req.user?.id || req.ip}:${req.path}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);
      if (count > limit) {
        return next(new AppError('RATE_LIMITED', 'Too many requests', 429, { limit, windowSec }));
      }
      next();
    } catch {
      // fail-open on redis hiccup
      next();
    }
  };
}
