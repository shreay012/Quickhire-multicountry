import crypto from 'crypto';
import { getDb } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import * as bookingService from '../booking/booking.service.js';
import { autoAssignPm } from '../pm/pm.assign.js';

/**
 * Razorpay webhook. Mounted with raw body parser in app.js.
 * Idempotent: dedupes by event.id stored on payment doc.
 */
export async function paymentWebhookHandler(req, res) {
  try {
    const signature = req.header('x-razorpay-signature');
    if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST' } });
    }
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body) // raw Buffer
      .digest('hex');
    if (expected !== signature) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_SIGNATURE' } });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const db = getDb();
    const payments = db.collection('payments');

    const eventId = event.id;
    const type = event.event;
    const payload = event.payload || {};

    if (type === 'payment.captured' || type === 'order.paid') {
      const orderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;
      const paymentId = payload.payment?.entity?.id;
      if (!orderId) return res.json({ ok: true });

      const existing = await payments.findOne({ orderId });
      const already = existing?.rawWebhookEvents?.some(e => e.id === eventId);
      if (already) return res.json({ ok: true, dedup: true });

      const updated = await payments.findOneAndUpdate(
        { orderId },
        {
          $set: {
            paymentId,
            status: 'paid',
            updatedAt: new Date(),
          },
          $addToSet: { rawWebhookEvents: { id: eventId, type, at: new Date() } },
        },
        { returnDocument: 'after' },
      );

      const p = updated.value || updated;
      if (p?.bookingId) {
        try {
          await bookingService.transition(
            String(p.bookingId),
            'confirmed',
            { id: String(p.userId), role: 'user' },
            'webhook payment.captured',
          );
        } catch (e) {
          logger.info({ err: e?.code }, 'webhook transition skipped');
        }
      }
      // Trigger PM auto-assignment via jobId (primary path for v3 jobs flow).
      if (p?.jobId) {
        autoAssignPm(p.jobId).catch((e) => logger.warn({ err: e }, 'webhook autoAssignPm failed'));
      }
    } else if (type === 'payment.failed') {
      const orderId = payload.payment?.entity?.order_id;
      await payments.updateOne(
        { orderId },
        {
          $set: { status: 'failed', updatedAt: new Date() },
          $addToSet: { rawWebhookEvents: { id: eventId, type, at: new Date() } },
        },
      );
    }

    return res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, 'razorpay webhook error');
    return res.status(500).json({ success: false });
  }
}
