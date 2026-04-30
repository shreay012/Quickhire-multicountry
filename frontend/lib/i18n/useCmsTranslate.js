"use client";

import { useLocale } from "next-intl";
import { useEffect, useState, useMemo } from "react";

// Cache loaded CMS maps per locale to avoid re-fetching across components.
const CMS_CACHE = {};

async function loadCmsMap(locale) {
  if (CMS_CACHE[locale]) return CMS_CACHE[locale];
  try {
    const mod = await import(`@/messages/cms/${locale}.json`);
    CMS_CACHE[locale] = mod.default || mod;
  } catch {
    try {
      const mod = await import(`@/messages/cms/en.json`);
      CMS_CACHE[locale] = mod.default || mod;
    } catch {
      CMS_CACHE[locale] = {};
    }
  }
  return CMS_CACHE[locale];
}

/**
 * Translates a known English CMS string (from backend cms.defaults.js) into the
 * active locale via messages/cms/{locale}.json. Falls back to the original text
 * when no mapping exists. Lives outside next-intl's namespace so keys can
 * contain dots, periods, or any free-form English text.
 */
export function useCmsTranslate() {
  const locale = useLocale();
  const [map, setMap] = useState(CMS_CACHE[locale] || {});

  useEffect(() => {
    let alive = true;
    loadCmsMap(locale).then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [locale]);

  return useMemo(() => {
    return (text) => {
      if (text == null || text === "") return text;
      const v = map?.[text];
      return typeof v === "string" && v.length > 0 ? v : text;
    };
  }, [map]);
}
