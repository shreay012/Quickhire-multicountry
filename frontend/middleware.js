/**
 * Edge middleware: geo detection + locale/currency cookie bootstrap.
 *
 * Sources of truth (highest priority first):
 *   1. Existing `qh_locale` / `qh_currency` cookies (user's explicit choice)
 *   2. Cloudflare `CF-IPCountry` header → COUNTRY_REGIONS map
 *   3. Accept-Language header → first matching locale
 *   4. Defaults from config
 *
 * The cookies are read by the next-intl request handler and the Redux
 * region slice on the client.
 */
import { NextResponse } from "next/server";
import {
  LOCALE_CODES,
  CURRENCY_CODES,
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
  COUNTRY_REGIONS,
} from "./lib/i18n/config";

const COOKIE_OPTS = {
  path: "/",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

function pickLocaleFromAcceptLanguage(header) {
  if (!header) return null;
  // "en-US,en;q=0.9,hi;q=0.8" -> ["en-US", "en", "hi"]
  const tags = header
    .split(",")
    .map((t) => t.split(";")[0].trim())
    .filter(Boolean);
  for (const tag of tags) {
    if (LOCALE_CODES.includes(tag)) return tag;
    const base = tag.split("-")[0];
    if (LOCALE_CODES.includes(base)) return base;
  }
  return null;
}

export function middleware(request) {
  const res = NextResponse.next();
  const { cookies, headers } = request;

  const country =
    headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country") || null;
  const region =
    country && COUNTRY_REGIONS[country.toUpperCase()]
      ? COUNTRY_REGIONS[country.toUpperCase()]
      : null;

  // Country cookie (always refresh — not user-controlled)
  if (country) {
    res.cookies.set("qh_country", country.toUpperCase(), COOKIE_OPTS);
  }

  // Locale: cookie wins, else region, else Accept-Language, else default
  if (!cookies.get("qh_locale")) {
    const fromHeader = pickLocaleFromAcceptLanguage(headers.get("accept-language"));
    const next = region?.locale || fromHeader || DEFAULT_LOCALE;
    if (LOCALE_CODES.includes(next)) {
      res.cookies.set("qh_locale", next, COOKIE_OPTS);
    }
  }

  // Currency: cookie wins, else region, else default
  if (!cookies.get("qh_currency")) {
    const next = region?.currency || DEFAULT_CURRENCY;
    if (CURRENCY_CODES.includes(next)) {
      res.cookies.set("qh_currency", next, COOKIE_OPTS);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Run on all paths except next internals + static files
    "/((?!_next/|api/|.*\\..*).*)",
  ],
};
