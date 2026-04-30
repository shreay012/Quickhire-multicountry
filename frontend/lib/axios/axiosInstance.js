import axios from 'axios';

// QuickHire backend base URL. Uses NEXT_PUBLIC_API_URL when set and falls back to the local backend.
// Local backend routes are mounted at root, not under /api.
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000';

// --- i18n object flattener --------------------------------------------------
// Backend services may return { en, hi, ar, de, ... } objects for fields
// like name/description after the multi-country pricing rollout. React
// can't render those objects as children, so we recursively walk every
// API response and replace any i18n-shaped object with the locale string.
const I18N_KEYS = ['en', 'hi', 'ar', 'de', 'es', 'fr', 'ja', 'zh-CN'];

function readActiveLocale() {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)qh_locale=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : 'en';
}

function isI18nObject(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  // Heuristic: at least one i18n key AND every value that exists is a string.
  // This avoids misclassifying random nested objects that happen to have an
  // `en` field by accident.
  let hasI18nKey = false;
  for (const k of Object.keys(v)) {
    if (I18N_KEYS.includes(k)) {
      hasI18nKey = true;
      if (v[k] != null && typeof v[k] !== 'string') return false;
    }
  }
  return hasI18nKey;
}

function pickI18n(obj, locale) {
  return obj[locale] || obj.en || obj[Object.keys(obj)[0]] || '';
}

// Walk arbitrary JSON, returning a new structure where every i18n-shaped
// object is replaced with the locale-picked string. Skips circular refs.
function flattenI18nDeep(input, locale, seen = new WeakSet()) {
  if (input == null) return input;
  if (typeof input !== 'object') return input;
  if (seen.has(input)) return input;
  seen.add(input);
  if (Array.isArray(input)) {
    return input.map((v) => flattenI18nDeep(v, locale, seen));
  }
  if (isI18nObject(input)) {
    return pickI18n(input, locale);
  }
  const out = {};
  for (const k of Object.keys(input)) {
    out[k] = flattenI18nDeep(input[k], locale, seen);
  }
  return out;
}

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Token helpers (browser-safe) ----------------------------------------
function readToken() {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('guestToken') ||
    null
  );
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  ['token', 'user', 'userType', 'isNewUser', 'guestToken', 'guestData'].forEach(
    (k) => window.localStorage.removeItem(k),
  );
}

export const userAuth = {
  getToken: readToken,
  isAuthenticated: () => Boolean(readToken()),
  clear: clearAuthStorage,
};

// --- Request: attach Bearer + handle FormData ---------------------------
axiosInstance.interceptors.request.use(
  (config) => {
    const token = readToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers && 'Content-Type' in config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response: redirect to /login on 401 (except on public routes) ------
const PUBLIC_PREFIXES = [
  '/login',
  '/about-us',
  '/contact-us',
  '/how-it-works',
  '/faq',
  '/terms-and-conditions',
  '/cancellation-and-refund-policy',
  '/staff-login',
  '/admin',
  '/pm',
  '/resource',
  '/service-details',
];

axiosInstance.interceptors.response.use(
  (response) => {
    // Flatten any i18n-shaped objects in the payload to the active locale
    // so React components can render fields like service.name directly.
    try {
      if (response && response.data != null && typeof response.data === 'object') {
        response.data = flattenI18nDeep(response.data, readActiveLocale());
      }
    } catch {
      // Best-effort — never let normalization break a successful response.
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      const isPublic =
        path === '/' || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

      // On protected pages: clear auth and redirect to login
      // On public/booking pages: do NOT clear auth or redirect —
      // the booking flow handles login at step 4 (DetailsStep)
      if (!isPublic) {
        clearAuthStorage();
        window.location.replace(`/login?next=${encodeURIComponent(path)}`);
      }
      // Public page 401s are silently rejected — caller handles the error
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

