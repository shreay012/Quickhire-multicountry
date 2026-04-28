import { z } from 'zod';

// FE sends "customer" (per platform contract); internal canonical role is "user".
// Accept both, normalize to "user" before downstream code.
const role = z.preprocess(
  (v) => (v === 'customer' ? 'user' : v),
  z.enum(['user', 'pm', 'admin', 'resource', 'super_admin', 'ops', 'finance', 'support', 'growth', 'viewer']).default('user'),
);

export const sendOtpSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'mobile must be 10 digits'),
  role,
});

export const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,6}$/),
  fcmToken: z.string().optional().default(''),
  role,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
