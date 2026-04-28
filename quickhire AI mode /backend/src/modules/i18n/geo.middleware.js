/**
 * Geo-detection middleware  (Phase 4)
 *
 * Priority order:
 *  1. Cloudflare CF-IPCountry header
 *  2. X-Country override header (set by frontend from cookie/profile)
 *  3. Accept-Language header (browser default)
 *  4. Default: IN
 *
 * Attaches req.geo = { country, currency, lang, timezone } to every request.
 * The countries collection (loaded once and cached) provides per-country config.
 */
import { redis } from '../../config/redis.js';
import { getDb } from '../../config/db.js';
import { logger } from '../../config/logger.js';

// Fallback map when DB is unavailable
const COUNTRY_DEFAULTS = {
  IN: { currency: 'INR', lang: 'en', timezone: 'Asia/Kolkata', gateways: ['razorpay'] },
  AE: { currency: 'AED', lang: 'en', timezone: 'Asia/Dubai', gateways: ['stripe', 'tabby'] },
  US: { currency: 'USD', lang: 'en', timezone: 'America/New_York', gateways: ['stripe'] },
  GB: { currency: 'GBP', lang: 'en', timezone: 'Europe/London', gateways: ['stripe'] },
  SG: { currency: 'SGD', lang: 'en', timezone: 'Asia/Singapore', gateways: ['xendit'] },
  SA: { currency: 'SAR', lang: 'ar', timezone: 'Asia/Riyadh', gateways: ['stripe', 'tabby'] },
};
const DEFAULT_COUNTRY = 'IN';

let countryConfigCache = null;
let cacheExpiry = 0;

async function loadCountryConfigs() {
  const now = Date.now();
  if (countryConfigCache && now < cacheExpiry) return countryConfigCache;

  try {
    const docs = await getDb().collection('countries').find({ active: true }).toArray();
    const map = {};
    for (const d of docs) map[d.code] = d;
    if (Object.keys(map).length > 0) {
      countryConfigCache = map;
      cacheExpiry = now + 5 * 60 * 1000; // 5 min in-process cache
    }
  } catch (err) {
    logger.warn({ err }, 'failed to load country configs from DB, using hardcoded defaults');
  }

  return countryConfigCache || {};
}

function extractLangFromAcceptLanguage(header = '') {
  // 'en-GB,en;q=0.9,hi;q=0.8' → 'en'
  const first = header.split(',')[0]?.split(';')[0]?.trim();
  return first ? first.slice(0, 2).toLowerCase() : 'en';
}

export async function geoMiddleware(req, _res, next) {
  try {
    // 1. Cloudflare
    let country = req.header('CF-IPCountry');
    // 2. Explicit override (from frontend cookie stored after user selects)
    const override = req.header('X-Country') || req.query._country;
    if (override && /^[A-Z]{2}$/.test(override)) country = override;
    // 3. Default
    if (!country || country === 'XX') country = DEFAULT_COUNTRY;
    country = country.toUpperCase();

    const configs = await loadCountryConfigs();
    const config = configs[country] || COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS[DEFAULT_COUNTRY];

    // Language: from X-Lang header or Accept-Language
    const langOverride = req.header('X-Lang');
    const lang = langOverride || extractLangFromAcceptLanguage(req.header('Accept-Language')) || config.lang || 'en';

    req.geo = {
      country,
      currency: config.currency || 'INR',
      lang,
      timezone: config.timezone || 'Asia/Kolkata',
      gateways: config.gateways || ['razorpay'],
      countryConfig: config,
    };
  } catch (err) {
    logger.warn({ err }, 'geo middleware error, using defaults');
    req.geo = { country: DEFAULT_COUNTRY, currency: 'INR', lang: 'en', timezone: 'Asia/Kolkata', gateways: ['razorpay'] };
  }
  next();
}
