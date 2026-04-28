/**
 * next-intl request config (cookie-based locale, no URL routing).
 * Reads `qh_locale` cookie set by middleware, falls back to default.
 */
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_CODES, DEFAULT_LOCALE } from "./lib/i18n/config";

export default getRequestConfig(async () => {
  let locale = DEFAULT_LOCALE;
  try {
    const c = await cookies();
    const v = c.get("qh_locale")?.value;
    if (v && LOCALE_CODES.includes(v)) locale = v;
  } catch {
    // SSR contexts without cookies — fall through to default
  }

  let messages = {};
  try {
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`./messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return { locale, messages };
});
