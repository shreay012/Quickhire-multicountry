import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { setSentryUser } from '../config/sentry.js';

const PUBLIC_PATHS = new Set([
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/guest-access',
  '/api/auth/refresh',
  '/api/miscellaneous/contact-us',
  '/api/payments/webhook',
  '/healthz',
  '/readyz',
  '/metrics',
  // i18n public endpoints
  '/api/i18n/geo',
  '/api/i18n/countries',
  '/api/i18n/currencies',
  // Chatbot — rate-limited by IP inside the handler, no auth needed
  '/api/chatbot/suggested',
  '/api/chatbot/message',
  // Promo validation (guest users need to validate codes at checkout)
  '/api/promo/validate',
]);

const PUBLIC_PREFIXES = [
  '/api/services',
  '/api/cms',
  // i18n translations loader (frontend needs before auth)
  '/api/i18n/translations',
  // Public article search (help centre, SEO pages)
  '/api/search/articles',
  // Public review profiles (readable without login, like Upwork)
  '/api/reviews/user',
  '/api/reviews/booking',
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
      algorithms: ['RS256'],
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
