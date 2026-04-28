import 'dotenv/config';
import PDFDocument from 'pdfkit';
import { ObjectId } from 'mongodb';
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sqs, s3 } from '../config/aws.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { connectDb, closeDb, getDb } from '../config/db.js';

async function generate({ paymentId, jobId }) {
  const db = getDb();
  const payment = await db.collection('payments').findOne({ paymentId });
  if (!payment) throw new Error('payment not found');
  const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId) });

  const buffers = [];
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.on('data', (b) => buffers.push(b));
  const done = new Promise((resolve) => doc.on('end', resolve));

  doc.fontSize(20).text('QuickHire — Tax Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice for payment ${paymentId}`);
  doc.text(`Order ID: ${payment.orderId}`);
  doc.text(`Date: ${new Date(payment.updatedAt).toLocaleString()}`);
  doc.moveDown();
  doc.text(`Job: ${job?.title || jobId}`);
  doc.text(`Amount: ₹${payment.amount.toFixed(2)} ${payment.currency}`);
  doc.text(`Status: ${payment.status}`);
  doc.end();
  await done;

  const buffer = Buffer.concat(buffers);
  const key = `invoices/${payment.userId}/${jobId}.pdf`;
  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET_INVOICES,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  }));

  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: env.S3_BUCKET_INVOICES, Key: key,
  }), { expiresIn: 7 * 24 * 60 * 60 });

  await db.collection('payments').updateOne(
    { paymentId },
    { $set: { invoice: { key, url, generatedAt: new Date() }, updatedAt: new Date() } },
  );
  logger.info({ paymentId, key }, 'invoice generated');
}

async function loop() {
  if (!env.SQS_INVOICE_URL) {
    logger.warn('SQS_INVOICE_URL not set; worker idle');
    return;
  }
  while (true) {
    try {
      const { Messages = [] } = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: env.SQS_INVOICE_URL,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 120,
      }));
      await Promise.all(Messages.map(async (m) => {
        try {
          await generate(JSON.parse(m.Body));
          await sqs.send(new DeleteMessageCommand({
            QueueUrl: env.SQS_INVOICE_URL, ReceiptHandle: m.ReceiptHandle,
          }));
        } catch (e) {
          logger.error({ err: e, body: m.Body }, 'invoice failed');
        }
      }));
    } catch (e) {
      logger.error({ err: e }, 'invoice sqs receive failed');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

(async () => {
  await connectDb();
  process.on('SIGTERM', async () => { await closeDb(); process.exit(0); });
  await loop();
})();
