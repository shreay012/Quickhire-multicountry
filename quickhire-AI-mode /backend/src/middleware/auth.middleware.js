import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { setSentryUser } from '../config/sentry.js';

const PUBLIC_PATHS = new Set([
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/guest-access',
    '/auth/refresh',
    '/miscellaneous/contact-us',
    '/payments/webhook',
    '/healthz',
    '/readyz',
    '/metrics',
    '/i18n/geo',
    '/i18n/countries',
    '/i18n/currencies',
    '/chatbot/suggested',
    '/chatbot/message',
    '/promo/validate',
    '/jobs/pricing',
    // Geo-pricing public endpoints (shown on service detail + checkout before auth)
    '/geo-pricing/checkout-preview',
  ]);

const PUBLIC_PREFIXES = [
    '/services',
    '/cms',
    '/i18n/translations',
    '/search/articles',
    '/reviews/user',
    '/reviews/booking',
    '/legal/doc',         // legal documents are publicly readable (shown pre-login)
    '/geo-pricing/price', // per-service pricing (shown on service detail pages)
  ];

export async function authMiddleware(req, _res, next) {
    if (PUBLIC_PATHS.has(req.path)) return next();
    if (req.method === 'GET' && PUBLIC_PREFIXES.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
          return next();
    }

  const header = req.header('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new AppError('AUTH_TOKEN_MISSING', 'Missing auth token', 401));

  try {
        const claims = jwt.verify(token, env.JWT_PUBLIC_KEY, {
                algorithms: [env.JWT_ALGORITHM],
                issuer: env.JWT_ISSUER,
                audience: env.JWT_AUDIENCE,
        });
        if (claims.sessionId) {
                const blocked = await redis.get(`blocklist:${claims.sessionId}`);
                if (blocked) throw new AppError('AUTH_TOKEN_REVOKED', 'Session revoked', 401);
        }
        req.user = {
                id: claims.sub,
                role: claims.role,
                sessionId: claims.sessionId,
        };
        setSentryUser(req.user);
        next();
  } catch (e) {
        if (e instanceof AppError) return next(e);
        return next(new AppError('AUTH_TOKEN_INVALID', 'Invalid or expired token', 401));
  }
}
