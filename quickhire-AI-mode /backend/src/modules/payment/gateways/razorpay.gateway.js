/**
 * Razorpay Gateway Implementation
 *
 * Used for India (INR). Wraps the Razorpay Node SDK.
 * Loaded lazily so the app starts fine even without the npm package installed
 * (though `razorpay` is already in package.json).
 */
import crypto from 'crypto';
import { env } from '../../../config/env.js';
import { AppError } from '../../../utils/AppError.js';
import { logger } from '../../../config/logger.js';

let _client = null;

async function getClient() {
  if (_client) return _client;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('CONFIG_ERROR', 'Razorpay keys not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)', 500);
  }
  const Razorpay = (await import('razorpay')).default;
  _client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return _client;
}

export class RazorpayGateway {
  /** @param {{ currency: string }} opts */
  constructor({ currency = 'INR' } = {}) {
    this.currency = currency;
    this.name = 'razorpay';
  }

  /**
   * Create a Razorpay order.
   *
   * @param {{ jobId: string, amount: number, currency: string, userId: string, metadata?: object }}
   * @returns {Promise<import('./types.js').GatewayOrderResult>}
   */
  async createOrder({ jobId, amount, currency, userId, metadata = {} }) {
    const client = await getClient();
    const order = await client.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: currency || this.currency,
      receipt: `job_${jobId}`,
      notes: { jobId, userId, ...metadata },
    });

    logger.info({ orderId: order.id, amount, currency, jobId }, 'razorpay order created');

    return {
      orderId: order.id,
      paymentId: null,
      amount: order.amount,
      currency: order.currency,
      gatewayName: 'razorpay',
      clientSecret: null,
      keyId: env.RAZORPAY_KEY_ID,
      mock: false,
    };
  }

  /**
   * Verify Razorpay signature after client-side payment.
   *
   * @param {{ orderId: string, paymentId: string, signature: string }}
   * @returns {Promise<boolean>}
   */
  async verifyPayment({ orderId, paymentId, signature }) {
    if (!env.RAZORPAY_KEY_SECRET) {
      throw new AppError('CONFIG_ERROR', 'Razorpay secret not configured', 500);
    }
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    try {
      return expected.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Issue a refund against a Razorpay payment.
   *
   * @param {string} paymentId   Razorpay payment ID (pay_xxx)
   * @param {number} amount      Refund amount in major currency units (₹, not paise)
   * @param {string} [reason]    Human-readable reason stored in Razorpay notes
   * @returns {Promise<{ gatewayRefundId: string, status: 'completed' }>}
   */
  async createRefund(paymentId, amount, reason = '') {
    const client = await getClient();
    const refund = await client.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // paise
      notes: { reason },
    });
    logger.info({ paymentId, refundId: refund.id, amount }, 'razorpay refund created');
    return { gatewayRefundId: refund.id, status: 'completed' };
  }

  /**
   * Parse and verify a Razorpay webhook payload.
   *
   * @param {Buffer} rawBody
   * @param {string} signature  Value of x-razorpay-signature header
   * @returns {{ event: string, data: object }}
   */
  buildWebhookEvent(rawBody, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError('CONFIG_ERROR', 'Razorpay webhook secret not configured', 500);
    }
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    let valid = false;
    try {
      valid = expected.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch { valid = false; }

    if (!valid) throw new AppError('WEBHOOK_INVALID_SIGNATURE', 'Razorpay webhook signature mismatch', 400);

    const body = JSON.parse(rawBody.toString());
    return { event: body.event, data: body.payload };
  }
}
