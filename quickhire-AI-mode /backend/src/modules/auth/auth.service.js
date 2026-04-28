import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './auth.repository.js';

function genOtp(len = env.OTP_LENGTH) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

if (env.SMS_PROVIDER === 'msg91') {
    const authKey = env.MSG91_AUTH_KEY;
    if (!authKey) throw new AppError('CONFIG_ERROR', 'MSG91_AUTH_KEY not set', 500);
    const mobile91 = mobile.length === 10 ? '91' + mobile : mobile.replace('+', '');
    const otpMatch = body.match(/\b(\d{4,6})\b/);
    const otp = otpMatch ? otpMatch[1] : '';
    const url = `https://control.msg91.com/api/v5/otp?otp=${otp}&sender=QHIRE&message=${encodeURIComponent(body)}&mobile=${mobile91}`;
    const resp = await fetch(url, { method: 'POST', headers: { authkey: authKey, 'content-type': 'application/json' } });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.type === 'error') throw new AppError('SMS_FAILED', 'Failed to send OTP', 500);
    logger.info({ mobile }, 'MSG91 OTP sent');
    return;
  }
}

function signAccessToken({ userId, role, sessionId }) {
  return jwt.sign(
    { sub: userId, role, sessionId },
    env.JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
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
  const count = await redis.incr(limitKey);
  if (count === 1) await redis.expire(limitKey, 60);
  if (count > 3) throw new AppError('RATE_LIMITED', 'Too many OTP requests', 429);

  const otp = genOtp();
  const hash = await bcrypt.hash(otp, 8);
  await redis.set(`otp:${role}:${mobile}`, hash, 'EX', env.OTP_TTL_SECONDS);
  await sendSms(mobile, `Your QuickHire OTP is ${otp}. Valid for 5 minutes.`);
  return { success: true };
}

export async function verifyOtp({ mobile, otp, fcmToken, role = 'user', ip, ua }) {
  const key = `otp:${role}:${mobile}`;

  // Dev master OTP — bypass Redis when matched (only if env var is set)
  const masterOtp = env.DEV_MASTER_OTP;
  if (masterOtp && otp === masterOtp) {
    await redis.del(key).catch(() => {});
  } else {
    const hash = await redis.get(key);
    if (!hash) throw new AppError('AUTH_INVALID_OTP', 'OTP expired or not requested', 400);
    const ok = await bcrypt.compare(otp, hash);
    if (!ok) throw new AppError('AUTH_INVALID_OTP', 'Invalid OTP', 400);
    await redis.del(key);
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
      algorithm: 'RS256',
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
