import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  ALLOWED_ORIGINS: z.string().default('*'),

  MONGO_URI: z.string(),
  MONGO_DB: z.string().default('quickhire'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_ISSUER: z.string().default('quickhire.services'),
  JWT_AUDIENCE: z.string().default('quickhire-api'),

  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET_CHAT: z.string().optional(),
  S3_BUCKET_INVOICES: z.string().optional(),
  SQS_NOTIFICATION_URL: z.string().optional(),
  SQS_INVOICE_URL: z.string().optional(),
  SQS_EMAIL_URL: z.string().optional(),
  SES_FROM: z.string().default('no-reply@quickhire.services'),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  OTP_LENGTH: z.coerce.number().default(4),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  SMS_PROVIDER: z.enum(['mock', 'msg91', 'sns']).default('mock'),
  MSG91_AUTH_KEY: z.string().optional(),

  LOG_LEVEL: z.string().default('info'),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(120),

  SENTRY_DSN: z.string().optional(),
  APP_VERSION: z.string().default('0.0.0'),
  ANTHROPIC_API_KEY: z.string().optional(),
  MEILISEARCH_URL: z.string().default('http://localhost:7700'),
  MEILISEARCH_KEY: z.string().optional(),

  // Dev-only: if set, this OTP is always accepted (skip Redis/bcrypt check).
  // Should be empty/unset in production.
  DEV_MASTER_OTP: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
// Replace literal \n in PEM keys (common when set via .env)
env.JWT_PRIVATE_KEY = env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
env.JWT_PUBLIC_KEY = env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

// Safety: DEV_MASTER_OTP must never be set in production.
if (env.NODE_ENV === 'production' && env.DEV_MASTER_OTP) {
  console.error('❌ FATAL: DEV_MASTER_OTP is set in production. Remove it immediately.');
  process.exit(1);
}
