import axios from 'axios';
import { flattenI18nDeep, readActiveLocale } from '../i18n/flattenI18nDeep';

// QuickHire backend base URL. Uses NEXT_PUBLIC_API_URL when set and falls back to the local backend.
// Local backend routes are mounted at root, not under /api.
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000';

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

