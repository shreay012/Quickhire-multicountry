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

async function sendSms(mobile, body) {
  if (env.SMS_PROVIDER === 'mock') {
    logger.info({ mobile, body }, '[MOCK SMS]');
    return;
  }
  if (env.SMS_PROVIDER === 'msg91') {
    const authKey = env.MSG91_AUTH_KEY;
    if (!authKey) throw new AppError('CONFIG_ERROR', 'MSG91_AUTH_KEY not set', 500);
    const mobile91 = mobile.startsWith('+')
      ? mobile.replace('+', '')
      : mobile.length === 10
        ? '91' + mobile
        : mobile;
    const otpMatch = body.match(/\b(\d{4,6})\b/);
    const otp = otpMatch ? otpMatch[1] : '';
    const url = `https://control.msg91.com/api/v5/otp?otp=${otp}&sender=QHIRE&message=${encodeURIComponent(body)}&mobile=${mobile91}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { authkey: authKey, 'content-type': 'application/json' },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.type === 'error') {
      logger.error({ mobile, data }, 'MSG91 send failed');
      throw new AppError('SMS_FAILED', 'Failed to send OTP via MSG91', 500);
    }
    logger.info({ mobile, msgId: data.request_id }, 'MSG91 OTP sent');
    return;
  }
  logger.warn({ mobile }, 'SMS_PROVIDER not configured');
}
