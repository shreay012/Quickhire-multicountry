/**
 * Currency conversion + formatting helpers.
 * All prices in the app are stored as INR (the source of truth on the backend).
 * These helpers convert to the user's display currency at render time.
 */
import { CURRENCIES, DEFAULT_CURRENCY } from "./config";

/** Convert an INR amount to the target currency using static FX rates. */
export function convertFromINR(amountInr, targetCurrency = DEFAULT_CURRENCY) {
  const cur = CURRENCIES[targetCurrency] || CURRENCIES[DEFAULT_CURRENCY];
  return Number(amountInr || 0) * cur.fxFromINR;
}

/**
 * Format a price in the target currency using Intl.NumberFormat.
 * @param {number} amountInr  Amount in INR (canonical).
 * @param {string} currencyCode Target currency (INR, USD, EUR, ...).
 * @param {object} [opts]
 * @param {boolean} [opts.alreadyConverted] If true, skip FX conversion.
 * @param {number}  [opts.maxDigits] Max fraction digits (default 0).
 */
export function formatPrice(amountInr, currencyCode = DEFAULT_CURRENCY, opts = {}) {
  const cur = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  const value = opts.alreadyConverted
    ? Number(amountInr || 0)
    : convertFromINR(amountInr, cur.code);
  const maxDigits = typeof opts.maxDigits === "number" ? opts.maxDigits : 0;
  try {
    return new Intl.NumberFormat(cur.locale, {
      style: "currency",
      currency: cur.code,
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback (some currencies/locales may fail in older runtimes)
    const rounded = Number(value.toFixed(maxDigits)).toLocaleString(cur.locale);
    return `${cur.symbol}${rounded}`;
  }
}

/** Pretty-print an INR-only amount (legacy callers). */
export function formatINR(amountInr) {
  return formatPrice(amountInr, "INR");
}
