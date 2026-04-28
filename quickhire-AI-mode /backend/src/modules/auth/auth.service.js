import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './auth.repository.js';

// ---------------------------------------------------------------------------
// In-memory Redis fallback (dev only)
// Used automatically when the Redis connection is unavailable so that the
// OTP flow still works locally without a running Redis instance.
// ---------------------------------------------------------------------------
const memStore = new Map(); // key → { value, expiresAt }

function memGet(key) {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.value;
}
function memSet(key, value, ttlSeconds) {
  memStore.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}
function memIncr(key) {
  const cur = Number(memGet(key) ?? 0) + 1;
  const prev = memStore.get(key);
  // preserve existing TTL when bumping the counter
  memStore.set(key, { value: String(cur), expiresAt: prev?.expiresAt ?? null });
  return cur;
}
function memExpire(key, ttlSeconds) {
  const entry = memStore.get(key);
  if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
}
function memDel(key) { memStore.delete(key); }

async function isRedisAlive() {
  try { await redis.ping(); return true; } catch { return false; }
}

async function kv_incr(key) {
  if (await isRedisAlive()) return redis.incr(key);
  return memIncr(key);
}
async function kv_expire(key, ttl) {
  if (await isRedisAlive()) return redis.expire(key, ttl);
  memExpire(key, ttl);
}
async function kv_set(key, value, ...args) {
  if (await isRedisAlive()) return redis.set(key, value, ...args);
  // parse EX ttl from args: ['EX', seconds]
  const exIdx = args.findIndex(a => String(a).toUpperCase() === 'EX');
  const ttl = exIdx !== -1 ? Number(args[exIdx + 1]) : null;
  memSet(key, value, ttl);
}
async function kv_get(key) {
  if (await isRedisAlive()) return redis.get(key);
  return memGet(key);
}
async function kv_del(key) {
  if (await isRedisAlive()) return redis.del(key);
  memDel(key);
}

function genOtp(len = env.OTP_LENGTH) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

async function sendSms(mobile, body) {
  if (env.SMS_PROVIDER === 'mock') {
    logger.info({ mobile, body }, '[MOCK SMS]');
    return;
  }

  if (env.SMS_PROVIDER === 'msg91') {
    if (!env.MSG91_AUTH_KEY) {
      logger.warn('MSG91_AUTH_KEY not set — OTP not sent');
      return;
    }

    const mobile91 = `91${mobile}`;
    const message = encodeURIComponent(body);

    // Using MSG91 Send HTTP API (route 4 = transactional, no template needed)
    const url = `https://api.msg91.com/api/sendhttp.php?authkey=${env.MSG91_AUTH_KEY}&mobiles=${mobile91}&message=${message}&route=4&country=91&unicode=0`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000), // 8s timeout
      });
      const text = await res.text();
      if (res.ok && !text.toLowerCase().includes('error')) {
        logger.info({ mobile }, 'MSG91 SMS sent');
      } else {
        logger.warn({ mobile, response: text }, 'MSG91 SMS failed');
      }
    } catch (e) {
      logger.error({ err: e.message, mobile }, 'MSG91 request error');
    }
    return;
  }
}

function signAccessToken({ userId, role, sessionId }) {
  return jwt.sign(
    { sub: userId, role, sessionId },
    env.JWT_PRIVATE_KEY,
    {
      algorithm: env.JWT_ALGORITHM,
      expiresIn: env.JWT_ACCESS_TTL,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );
}

function refreshTtlMs() {
  // crude parser: support Nd / Nh
  const m = env.JWT_REFRESH_TTL.match(/^(\d+)([dh])$/);
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return m[2] === 'd' ? n * 86400_000 : n * 3600_000;
}

export async function sendOtp({ mobile, role }) {
  const limitKey = `otp:rate:${mobile}`;
  const count = await kv_incr(limitKey);
  if (count === 1) await kv_expire(limitKey, 60);
  if (count > 5) throw new AppError('RATE_LIMITED', 'Too many OTP requests', 429);

  const otp = genOtp();
  const hash = await bcrypt.hash(otp, 8);
  await kv_set(`otp:${role}:${mobile}`, hash, 'EX', env.OTP_TTL_SECONDS);
  await sendSms(mobile, `Your QuickHire OTP is ${otp}. Valid for 5 minutes.`);
  logger.info({ mobile, otp }, '[DEV OTP]'); // visible in backend console for local testing
  return { success: true };
}

export async function verifyOtp({ mobile, otp, fcmToken, role = 'user', ip, ua }) {
  const key = `otp:${role}:${mobile}`;

  // Dev master OTP — bypass store when matched (only if env var is set)
  const masterOtp = env.DEV_MASTER_OTP;
  if (masterOtp && otp === masterOtp) {
    await kv_del(key).catch(() => {});
  } else {
    const hash = await kv_get(key);
    if (!hash) throw new AppError('AUTH_INVALID_OTP', 'OTP expired or not requested', 400);
    const ok = await bcrypt.compare(otp, hash);
    if (!ok) throw new AppError('AUTH_INVALID_OTP', 'Invalid OTP', 400);
    await kv_del(key);
  }

  const user = await repo.upsertUser({ mobile, role, fcmToken });
  const userId = String(user._id);

  const refreshToken = nanoid(48);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + refreshTtlMs());
  const session = await repo.createSession({ userId, refreshTokenHash, ip, ua, expiresAt });

  const token = signAccessToken({ userId, role: user.role, sessionId: String(session._id) });

  return {
    token,
    refreshToken,
    user: sanitizeUser(user),
    isNewUser: !user.meta?.isProfileComplete,
  };
}

export async function guestAccess() {
  const guestId = `guest_${nanoid(16)}`;
  const token = jwt.sign(
    { sub: guestId, role: 'guest' },
    env.JWT_PRIVATE_KEY,
    {
      algorithm: env.JWT_ALGORITHM,
      expiresIn: '7d',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );
  return { token };
}

export async function logout({ sessionId, accessTokenExpSec }) {
  if (!sessionId) return;
  await repo.revokeSession(sessionId);
  // Block the access token until it would naturally expire
  const ttl = Math.max(60, accessTokenExpSec || 7 * 24 * 60 * 60);
  await redis.set(`blocklist:${sessionId}`, '1', 'EX', ttl);
}

export async function refresh({ refreshToken, sessionId }) {
  if (!sessionId) throw new AppError('AUTH_TOKEN_INVALID', 'Missing session', 401);
  const session = await repo.findSession(sessionId);
  if (!session || session.revoked) throw new AppError('AUTH_TOKEN_REVOKED', 'Session revoked', 401);
  if (session.expiresAt < new Date()) throw new AppError('AUTH_TOKEN_EXPIRED', 'Refresh expired', 401);

  const ok = await bcrypt.compare(refreshToken, session.refreshTokenHash);
  if (!ok) throw new AppError('AUTH_TOKEN_INVALID', 'Invalid refresh token', 401);

  const user = await repo.findUserById(session.userId);
  if (!user) throw new AppError('RESOURCE_NOT_FOUND', 'User not found', 404);

  const token = signAccessToken({ userId: String(user._id), role: user.role, sessionId });
  return { token, user: sanitizeUser(user) };
}

export function sanitizeUser(u) {
  if (!u) return null;
  const { fcmTokens, ...rest } = u;
  return rest;
}
