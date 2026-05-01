# 10 — Payment Gateway Abstraction Layer

---

## Design Philosophy

Product code is 100% gateway-agnostic. There is no `if country === 'IN' { razorpay... }` anywhere in business logic. The payment service exposes a unified API; the abstraction layer routes to the correct gateway, normalizes responses, and handles webhooks uniformly.

---

## Gateway Assignment by Country

| Country | Primary Gateway | Fallback | Payout Method |
|---|---|---|---|
| India (IN) | Razorpay | PayU | Razorpay Payouts → NEFT/IMPS/UPI |
| UAE (AE) | Stripe | Telr / PayTabs | Stripe → Wise / Bank Transfer |
| Germany (DE) | Stripe (SEPA) | — | Stripe → SEPA Transfer |
| USA (US) | Stripe | Braintree | Stripe → ACH |
| Australia (AU) | Stripe | Pin Payments | Stripe → BSB Transfer |

---

## Unified Gateway Interface

```typescript
// payment-service/src/gateways/gateway.interface.ts

export interface CreateOrderParams {
  amount: number;          // In smallest unit (paise, fils, cents)
  currency: string;        // 'INR', 'AED', 'EUR', 'USD', 'AUD'
  country: CountryCode;
  bookingId: string;
  clientId: string;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}

export interface OrderResponse {
  gatewayOrderId: string;
  clientSecret?: string;   // Stripe payment intent client secret
  checkoutUrl?: string;    // For redirect-based gateways
  amount: number;
  currency: string;
  expiresAt?: Date;
  raw: unknown;            // Full gateway response for storage
}

export interface CaptureParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  amount: number;
  currency: string;
  country: CountryCode;
}

export interface CaptureResponse {
  success: boolean;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  paidAt: Date;
  raw: unknown;
}

export interface RefundParams {
  gatewayPaymentId: string;
  amount: number;             // Partial or full
  currency: string;
  reason: string;
  country: CountryCode;
  idempotencyKey: string;
}

export interface PayoutParams {
  amount: number;
  currency: string;
  country: CountryCode;
  recipientId: string;        // Freelancer's gateway recipient/linked account ID
  description: string;
  idempotencyKey: string;
}

export interface NormalizedWebhookEvent {
  type: 'payment.captured' | 'payment.failed' | 'refund.created' | 'payout.paid' | 'payout.failed';
  eventId: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  raw: unknown;
}

export interface PaymentGateway {
  name: string;
  countries: CountryCode[];

  createOrder(params: CreateOrderParams): Promise<OrderResponse>;
  capturePayment(params: CaptureParams): Promise<CaptureResponse>;
  createRefund(params: RefundParams): Promise<{ refundId: string }>;
  createPayout(params: PayoutParams): Promise<{ payoutId: string }>;
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;
  normalizeWebhook(raw: unknown): NormalizedWebhookEvent;
}
```

---

## Gateway Implementations

### Razorpay (India)

```typescript
// gateways/razorpay.gateway.ts

@Injectable()
export class RazorpayGateway implements PaymentGateway {
  name = 'razorpay';
  countries: CountryCode[] = ['IN'];
  private client: Razorpay;

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const order = await this.client.orders.create({
      amount: params.amount,                    // Already in paise
      currency: params.currency,                // 'INR'
      receipt: params.bookingId,
      notes: params.metadata,
    });
    return {
      gatewayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      raw: order,
    };
  }

  async capturePayment(params: CaptureParams): Promise<CaptureResponse> {
    // Razorpay: verify HMAC-SHA256 signature
    const expected = crypto
      .createHmac('sha256', this.config.keySecret)
      .update(`${params.gatewayOrderId}|${params.gatewayPaymentId}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.gatewaySignature!))) {
      throw new PaymentSignatureError('Invalid Razorpay signature');
    }

    return {
      success: true,
      gatewayPaymentId: params.gatewayPaymentId,
      amount: params.amount,
      currency: params.currency,
      paidAt: new Date(),
      raw: params,
    };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  normalizeWebhook(raw: RazorpayWebhookEvent): NormalizedWebhookEvent {
    const typeMap = {
      'payment.captured': 'payment.captured',
      'order.paid': 'payment.captured',
      'payment.failed': 'payment.failed',
      'refund.created': 'refund.created',
    };
    return {
      type: typeMap[raw.event] as any,
      eventId: raw.payload.payment?.entity?.id,
      gatewayOrderId: raw.payload.payment?.entity?.order_id,
      gatewayPaymentId: raw.payload.payment?.entity?.id,
      amount: raw.payload.payment?.entity?.amount,
      currency: raw.payload.payment?.entity?.currency,
      raw,
    };
  }
}
```

### Stripe (UAE, DE, US, AU)

```typescript
// gateways/stripe.gateway.ts

@Injectable()
export class StripeGateway implements PaymentGateway {
  name = 'stripe';
  countries: CountryCode[] = ['AE', 'DE', 'US', 'AU'];
  private client: Stripe;

  async createOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const paymentIntent = await this.client.paymentIntents.create({
      amount: params.amount,                    // Smallest unit (cents, fils, etc.)
      currency: params.currency.toLowerCase(),
      metadata: {
        bookingId: params.bookingId,
        clientId: params.clientId,
        country: params.country,
        ...params.metadata,
      },
      automatic_payment_methods: { enabled: true },
      idempotency_key: params.idempotencyKey,
    });
    return {
      gatewayOrderId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,   // Stripe uses client_secret flow
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      raw: paymentIntent,
    };
  }

  // For SEPA (Germany):
  async createSepaOrder(params: CreateOrderParams): Promise<OrderResponse> {
    const paymentIntent = await this.client.paymentIntents.create({
      amount: params.amount,
      currency: 'eur',
      payment_method_types: ['sepa_debit'],
      mandate_data: { customer_acceptance: { type: 'online', online: { ... } } },
      idempotency_key: params.idempotencyKey,
    });
    return { gatewayOrderId: paymentIntent.id, clientSecret: paymentIntent.client_secret!, ... };
  }

  normalizeWebhook(raw: Stripe.Event): NormalizedWebhookEvent {
    const typeMap: Record<string, NormalizedWebhookEvent['type']> = {
      'payment_intent.succeeded': 'payment.captured',
      'payment_intent.payment_failed': 'payment.failed',
      'charge.refunded': 'refund.created',
      'transfer.paid': 'payout.paid',
      'transfer.failed': 'payout.failed',
    };
    const pi = raw.data.object as Stripe.PaymentIntent;
    return {
      type: typeMap[raw.type],
      eventId: raw.id,
      gatewayOrderId: pi.id,
      gatewayPaymentId: pi.latest_charge as string,
      amount: pi.amount_received ?? pi.amount,
      currency: pi.currency.toUpperCase(),
      raw,
    };
  }
}
```

---

## Payment Service — Business Logic Layer

```typescript
// payment-service/src/payment.service.ts

@Injectable()
export class PaymentService {
  constructor(
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly taxService: TaxService,
    private readonly invoiceService: InvoiceService,
    private readonly eventBus: EventBus,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
  ) {}

  async initiatePayment(dto: InitiatePaymentDto): Promise<InitiatePaymentResponse> {
    const gateway = this.gatewayFactory.forCountry(dto.country);

    // Calculate tax
    const tax = await this.taxService.calculate({
      amount: dto.amount,
      currency: dto.currency,
      country: dto.country,
      state: dto.state,          // For US state-level tax via TaxJar
    });

    const totalAmount = dto.amount + tax.amount;
    const amountInSmallestUnit = this.toSmallestUnit(totalAmount, dto.currency);

    // Create gateway order
    const order = await gateway.createOrder({
      amount: amountInSmallestUnit,
      currency: dto.currency,
      country: dto.country,
      bookingId: dto.bookingId,
      clientId: dto.clientId,
      description: dto.description,
      metadata: dto.metadata,
      idempotencyKey: dto.idempotencyKey,
    });

    // Persist transaction record
    await this.txRepo.save({
      bookingId: dto.bookingId,
      payerId: dto.clientId,
      gateway: gateway.name,
      gatewayOrderId: order.gatewayOrderId,
      status: 'created',
      amount: dto.amount,
      taxAmount: tax.amount,
      currency: dto.currency,
      countryCode: dto.country,
      idempotencyKey: dto.idempotencyKey,
      gatewayRaw: order.raw,
    });

    return {
      orderId: order.gatewayOrderId,
      clientSecret: order.clientSecret,    // Stripe
      checkoutUrl: order.checkoutUrl,      // Some gateways
      amount: totalAmount,
      currency: dto.currency,
      tax: tax,
      gateway: gateway.name,              // Frontend needs this to load correct SDK
    };
  }

  async capturePayment(dto: CapturePaymentDto): Promise<void> {
    // Idempotency check
    const cached = await this.redis.get(`pay-capture:${dto.idempotencyKey}`);
    if (cached) return JSON.parse(cached);

    const tx = await this.txRepo.findOne({ where: { gatewayOrderId: dto.gatewayOrderId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    const gateway = this.gatewayFactory.forCountry(tx.countryCode);
    const result = await gateway.capturePayment(dto);

    // Update transaction
    await this.txRepo.update(tx.id, {
      status: 'paid',
      gatewayPaymentId: result.gatewayPaymentId,
      paidAt: result.paidAt,
      platformFee: this.calculatePlatformFee(tx.amount, tx.countryCode),
      freelancerAmount: this.calculateFreelancerAmount(tx),
    });

    // Emit event
    await this.eventBus.publish({
      type: 'payment.captured',
      country: tx.countryCode,
      payload: { transactionId: tx.id, bookingId: tx.bookingId },
    });

    // Generate invoice asynchronously
    await this.queueService.enqueue('invoice.generate', { transactionId: tx.id });

    // Cache result for idempotency (24h)
    await this.redis.setex(`pay-capture:${dto.idempotencyKey}`, 86400, JSON.stringify({ success: true }));
  }
}
```

---

## Webhook Handler (Unified)

```typescript
// POST /v1/payments/webhook/:gateway

@Post('webhook/:gateway')
async handleWebhook(
  @Param('gateway') gatewayName: string,
  @Req() req: Request,
  @Headers() headers: Record<string, string>,
  @RawBody() rawBody: Buffer,
) {
  const gateway = this.gatewayFactory.byName(gatewayName);

  // Gateway-specific signature header
  const sigHeader = {
    razorpay:   'x-razorpay-signature',
    stripe:     'stripe-signature',
    telr:       'x-telr-signature',
  }[gatewayName];

  const isValid = gateway.verifyWebhookSignature(
    rawBody.toString(),
    headers[sigHeader],
    this.config.webhookSecret(gatewayName),
  );
  if (!isValid) throw new BadRequestException('Invalid webhook signature');

  const event = gateway.normalizeWebhook(JSON.parse(rawBody.toString()));

  // Dedup by eventId
  const isDuplicate = await this.dedup.check(`webhook:${event.eventId}`);
  if (isDuplicate) return { ok: true, duplicate: true };

  await this.paymentService.processWebhookEvent(event);
  await this.dedup.mark(`webhook:${event.eventId}`, 86400 * 7);

  return { ok: true };
}
```

---

## Invoice Generation (Country-Specific Templates)

```
Invoice templates are stored in CMS per country.
Variables: {{ client_name }}, {{ freelancer_name }}, {{ amount }},
           {{ tax_rate }}, {{ tax_label }}, {{ tax_amount }},
           {{ invoice_number }}, {{ booking_id }}, {{ date }},
           {{ platform_name }}, {{ platform_address }}

Country-specific required fields:
IN:  GST number, HSN code, GSTIN, PAN
AE:  TRN (Tax Registration Number), VAT breakdown
DE:  USt-IdNr., Steuernummer, Leistungsdatum
US:  EIN (if B2B), itemized breakdown
AU:  ABN, GST breakdown
```

---

## Currency Conversion (Display Only)

Exchange rates are used **only for display** — actual payments are always charged in the country's native currency. Rates are fetched every 30 minutes and cached:

```typescript
// Rates source: European Central Bank (for EUR base) + Wise API
// Update frequency: 30 minutes
// Cache: Redis key `fx-rates:{baseCurrency}` TTL 1800s

async displayInCurrency(amount: number, from: string, to: string): Promise<{
  amount: number;
  currency: string;
  rateUsed: number;
  rateTimestamp: Date;
  disclaimer: string;  // "Exchange rate is indicative. Payment charged in {from}"
}> { ... }
```
