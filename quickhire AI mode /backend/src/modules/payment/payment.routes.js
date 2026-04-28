import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { roleGuard } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { getDb } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { toObjectId } from '../../utils/oid.js';
import * as bookingService from '../booking/booking.service.js';
import { autoAssignPm } from '../pm/pm.assign.js';
import { paginate, buildMeta } from '../../utils/pagination.js';
import { idempotencyGetOrSet } from '../../utils/idempotency.js';
import { sqs } from '../../config/aws.js';
import { SendMessageCommand } from '@aws-sdk/client-sqs';

const r = Router();
const col = () => getDb().collection('payments');
const jobsCol = () => getDb().collection('jobs');

// Lazy razorpay import — keeps tests/dev runnable without keys
let _rzp;
async function rzp() {
  if (_rzp) return _rzp;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('CONFIG_ERROR', 'Razorpay keys not configured', 500);
  }
  const Razorpay = (await import('razorpay')).default;
  _rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return _rzp;
}

const createOrderSchema = z.object({
  jobId: z.string().regex(/^[0-9a-f]{24}$/),
  amount: z.number().positive(),
});

const verifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
});

r.post('/create-order', roleGuard(['user']), validate(createOrderSchema), asyncHandler(async (req, res) => {
  const { jobId, amount } = req.body;
  const job = await jobsCol().findOne({ _id: toObjectId(jobId, 'jobId') });
  if (!job) throw new AppError('RESOURCE_NOT_FOUND', 'Job not found', 404);

  // Dev mock: when Razorpay keys are missing, fabricate an order id and mark
  // payment paid. Frontend's Razorpay handler still gets a valid-looking object.
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    const fakeOrderId = `order_dev_${Date.now()}`;
    const fakePaymentId = `pay_dev_${Date.now()}`;
    await col().insertOne({
      userId: new ObjectId(req.user.id),
      jobId: new ObjectId(jobId),
      bookingId: job.bookingId,
      provider: 'mock',
      orderId: fakeOrderId,
      paymentId: fakePaymentId,
      amount,
      currency: 'INR',
      status: 'paid',
      mock: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await jobsCol().updateOne({ _id: job._id }, { $set: { status: 'paid', updatedAt: new Date() } });
    // Trigger admin notification + auto-assign PM (mock dev path)
    autoAssignPm(job._id).catch((e) => logger.warn({ err: e }, 'autoAssignPm (mock) failed'));
    return res.json({
      success: true,
      data: {
        orderId: fakeOrderId,
        razorpayOrderId: fakeOrderId,
        paymentId: fakePaymentId,
        keyId: 'rzp_test_mock',
        key: 'rzp_test_mock',
        amount: Math.round(amount * 100),
        currency: 'INR',
        mock: true,
      },
    });
  }

  const client = await rzp();
  const order = await client.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `job_${jobId}`,
    notes: { jobId, userId: req.user.id },
  });

  await col().insertOne({
    userId: new ObjectId(req.user.id),
    jobId: new ObjectId(jobId),
    bookingId: job.bookingId,
    provider: 'razorpay',
    orderId: order.id,
    amount,
    currency: 'INR',
    status: 'created',
    createdAt: new Date(), updatedAt: new Date(),
  });

  res.json({
    success: true,
    data: {
      orderId: order.id,
      razorpayOrderId: order.id,
      keyId: env.RAZORPAY_KEY_ID,
      key: env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
    },
  });
}));

r.post('/verify', roleGuard(['user']), validate(verifySchema), asyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  // Idempotency: if same key already processed, return prior result.
  const idemKey = req.header('Idempotency-Key') || `${razorpay_order_id}:${razorpay_payment_id}`;
  const cached = await idempotencyGetOrSet(`pay-verify:${req.user.id}:${idemKey}`);
  if (cached) return res.json({ success: true, data: cached, idempotent: true });

  // Mock mode (no real Razorpay configured): skip signature check.
  if (!env.RAZORPAY_KEY_SECRET) {
    logger.warn('verify: razorpay secret missing, accepting mock signature');
  } else {
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    let valid = false;
    try {
      valid = expected.length === razorpay_signature.length
        && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    } catch { valid = false; }
    if (!valid) throw new AppError('PAYMENT_VERIFICATION_FAILED', 'Invalid signature', 400);
  }

  const updated = await col().findOneAndUpdate(
    { orderId: razorpay_order_id },
    { $set: {
        paymentId: razorpay_payment_id,
        signatureValid: true,
        status: 'paid',
        updatedAt: new Date(),
      } },
    { returnDocument: 'after' },
  );
  const payment = updated.value || updated;
  if (!payment) throw new AppError('RESOURCE_NOT_FOUND', 'Order not found', 404);

  // Move booking to confirmed
  if (payment.bookingId) {
    try {
      await bookingService.transition(String(payment.bookingId), 'confirmed', { id: String(payment.userId), role: 'user' }, 'payment verified');
    } catch (e) {
      // already confirmed via webhook etc; ignore invalid transitions silently
      logger.warn({ err: e, bookingId: payment.bookingId }, 'verify transition skipped');
    }
  }

  // Mark the underlying job as paid + auto-assign PM + notify admins
  if (payment.jobId) {
    try {
      await jobsCol().updateOne(
        { _id: payment.jobId },
        { $set: { status: 'paid', paidAt: new Date(), updatedAt: new Date() } },
      );
      autoAssignPm(payment.jobId).catch((e) => logger.warn({ err: e }, 'autoAssignPm failed'));
    } catch (e) {
      logger.warn({ err: e, jobId: payment.jobId }, 'job paid update failed');
    }
  }

  // Enqueue invoice generation
  if (env.SQS_INVOICE_URL) {
    await sqs.send(new SendMessageCommand({
      QueueUrl: env.SQS_INVOICE_URL,
      MessageBody: JSON.stringify({ paymentId: razorpay_payment_id, jobId: String(payment.jobId) }),
    })).catch(e => logger.error({ err: e }, 'invoice enqueue failed'));
  }

  const out = { paymentId: razorpay_payment_id, status: 'paid' };
  await idempotencyGetOrSet(`pay-verify:${req.user.id}:${idemKey}`, out, 86400);
  res.json({ success: true, data: out });
}));

r.get('/status/:paymentId', roleGuard(['user', 'admin']), asyncHandler(async (req, res) => {
  const p = await col().findOne({ paymentId: req.params.paymentId });
  if (!p) throw new AppError('RESOURCE_NOT_FOUND', 'Payment not found', 404);
  res.json({ success: true, data: p });
}));

r.get('/history', roleGuard(['user']), asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const filter = { userId: new ObjectId(req.user.id) };
  const [items, total] = await Promise.all([
    col().find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).toArray(),
    col().countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: buildMeta({ page: p.page, pageSize: p.pageSize, total }) });
}));

// Returns a PDF blob (FE asks with responseType:'blob'). For real S3-hosted invoices,
// you'd 302-redirect or stream from S3; in mock mode we synthesize a minimal PDF.
r.post('/invoice/download/:jobId', roleGuard(['user', 'admin']), asyncHandler(async (req, res) => {
  const p = await col().findOne({ jobId: toObjectId(req.params.jobId, 'jobId'), status: 'paid' });
  if (!p) throw new AppError('RESOURCE_NOT_FOUND', 'No paid invoice for this job', 404);
  if (p.invoice?.url) {
    return res.json({ success: true, data: { url: p.invoice.url } });
  }
  // Minimal one-page PDF (hand-built; no external dep).
  const text = `Invoice\nJob: ${req.params.jobId}\nAmount: INR ${p.amount}\nPayment: ${p.paymentId || p.orderId}\nStatus: ${p.status}`;
  const lines = text.split('\n');
  const stream = lines.map((l, i) => `BT /F1 12 Tf 50 ${760 - i * 18} Td (${l.replace(/[()\\]/g, '')}) Tj ET`).join('\n');
  const objs = [];
  objs.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objs.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objs.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj');
  const content = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  objs.push(`4 0 obj ${content} endobj`);
  objs.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const o of objs) { offsets.push(Buffer.byteLength(pdf)); pdf += o + '\n'; }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const buf = Buffer.from(pdf, 'binary');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_${req.params.jobId}.pdf`);
  return res.end(buf);
}));

export default r;
