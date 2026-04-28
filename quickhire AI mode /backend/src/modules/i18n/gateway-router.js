/**
 * Payment Gateway Router  (Phase 4)
 *
 * Routes a payment to the correct gateway based on the user's country.
 * Country config is loaded from the `countries` collection (with in-memory cache).
 *
 *   IN  → Razorpay (UPI + cards)
 *   AE  → Stripe + Tabby (BNPL)
 *   US/EU → Stripe
 *   SG/SEA → Xendit (future)
 *   Fallback → Stripe
 */

const COUNTRY_GATEWAY_MAP = {
  IN: 'razorpay',
  AE: 'stripe',  // Tabby for BNPL handled separately
  SA: 'stripe',
  US: 'stripe',
  GB: 'stripe',
  EU: 'stripe',
  SG: 'xendit',
  MY: 'xendit',
  PH: 'xendit',
  ID: 'xendit',
};

const BNPL_COUNTRIES = new Set(['AE', 'SA', 'KW', 'BH', 'QA']);

export function resolveGateway(country = 'IN') {
  return COUNTRY_GATEWAY_MAP[country] || 'stripe';
}

export function supportsBnpl(country = 'IN') {
  return BNPL_COUNTRIES.has(country);
}

export function getGatewayOptions(country = 'IN', amount = 0) {
  const primary = resolveGateway(country);
  const options = [{ gateway: primary, type: 'standard' }];

  if (supportsBnpl(country)) {
    options.push({ gateway: 'tabby', type: 'bnpl', installments: [3, 4] });
  }

  return options;
}

/**
 * Tax Engine  (Phase 4)
 *
 * Computes tax based on country rules loaded from DB.
 * Supports:
 *  - India GST (18% on services, inclusive)
 *  - UAE VAT (5%, exclusive)
 *  - EU VAT (various rates, exclusive)
 *  - US Sales Tax (skipped at order level — handled by external service in future)
 */

const TAX_RULES = {
  IN: { type: 'gst', rate: 0.18, inclusive: true, name: 'GST' },
  AE: { type: 'vat', rate: 0.05, inclusive: false, name: 'VAT' },
  SA: { type: 'vat', rate: 0.15, inclusive: false, name: 'VAT' },
  GB: { type: 'vat', rate: 0.20, inclusive: false, name: 'VAT' },
  DE: { type: 'vat', rate: 0.19, inclusive: false, name: 'VAT' },
  FR: { type: 'vat', rate: 0.20, inclusive: false, name: 'VAT' },
  SG: { type: 'gst', rate: 0.09, inclusive: false, name: 'GST' },
  // US — no platform-level tax; add TaxJar/Avalara integration later
};

/**
 * Compute tax for a given amount and country.
 *
 * @returns {{ taxAmount, taxRate, taxName, taxType, netAmount, grossAmount }}
 *   netAmount  = pre-tax amount
 *   grossAmount = amount the customer pays (includes tax)
 */
export function computeTax(amount, country = 'IN') {
  const rule = TAX_RULES[country];
  if (!rule) {
    return { taxAmount: 0, taxRate: 0, taxName: 'None', taxType: 'none', netAmount: amount, grossAmount: amount };
  }

  let netAmount, taxAmount, grossAmount;

  if (rule.inclusive) {
    // Tax is already included in amount
    grossAmount = amount;
    taxAmount = Math.round(amount - amount / (1 + rule.rate));
    netAmount = amount - taxAmount;
  } else {
    // Tax added on top
    netAmount = amount;
    taxAmount = Math.round(amount * rule.rate);
    grossAmount = amount + taxAmount;
  }

  return {
    taxAmount,
    taxRate: rule.rate,
    taxName: rule.name,
    taxType: rule.type,
    netAmount,
    grossAmount,
  };
}

/**
 * Generate invoice line item breakdown for a booking.
 */
export function buildInvoiceBreakdown({ subtotal, discount = 0, country = 'IN', currency = 'INR' }) {
  const amountAfterDiscount = subtotal - discount;
  const tax = computeTax(amountAfterDiscount, country);

  return {
    subtotal,
    discount,
    amountAfterDiscount,
    tax: {
      amount: tax.taxAmount,
      rate: tax.taxRate,
      name: tax.taxName,
      type: tax.taxType,
      inclusive: TAX_RULES[country]?.inclusive ?? false,
    },
    total: tax.grossAmount,
    currency,
  };
}
