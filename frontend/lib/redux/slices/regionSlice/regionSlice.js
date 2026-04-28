import { createSlice } from "@reduxjs/toolkit";
import {
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
  LOCALE_CODES,
  CURRENCY_CODES,
} from "@/lib/i18n/config";

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; samesite=lax`;
}

const initialState = {
  country: null,
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
  hydrated: false,
};

const regionSlice = createSlice({
  name: "region",
  initialState,
  reducers: {
    hydrateFromCookies(state) {
      const c = readCookie("qh_country");
      const l = readCookie("qh_locale");
      const cur = readCookie("qh_currency");
      if (c) state.country = c;
      if (l && LOCALE_CODES.includes(l)) state.locale = l;
      if (cur && CURRENCY_CODES.includes(cur)) state.currency = cur;
      state.hydrated = true;
    },
    setLocale(state, action) {
      const next = action.payload;
      if (LOCALE_CODES.includes(next)) {
        state.locale = next;
        writeCookie("qh_locale", next);
      }
    },
    setCurrency(state, action) {
      const next = action.payload;
      if (CURRENCY_CODES.includes(next)) {
        state.currency = next;
        writeCookie("qh_currency", next);
      }
    },
  },
});

export const { hydrateFromCookies, setLocale, setCurrency } = regionSlice.actions;
export default regionSlice.reducer;

// Selectors
export const selectLocale = (s) => s.region?.locale || DEFAULT_LOCALE;
export const selectCurrency = (s) => s.region?.currency || DEFAULT_CURRENCY;
export const selectCountry = (s) => s.region?.country || null;

import { COUNTRY_REGIONS, FALLBACK_REGION } from "@/lib/i18n/config";
export const selectTaxInfo = (s) => {
  const country = s.region?.country;
  const region = country ? (COUNTRY_REGIONS[country] || FALLBACK_REGION) : FALLBACK_REGION;
  return { taxRate: region.taxRate, taxLabel: region.taxLabel };
};
