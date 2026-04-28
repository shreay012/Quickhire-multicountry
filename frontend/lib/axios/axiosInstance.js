import axios from 'axios';

// QuickHire backend base URL. Uses NEXT_PUBLIC_API_URL when set (e.g.
// http://localhost:4000/api in dev) and falls back to the local backend.
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000/api';

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
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      const isPublic =
        path === '/' || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

      // Any 401 means the stored token is invalid/expired/revoked. Clear it and
      // (for non-public pages) bounce the user to /login so they can re-auth
      // instead of being stuck behind a generic "something failed" alert.
      clearAuthStorage();
      if (!isPublic) {
        window.location.replace(`/login?next=${encodeURIComponent(path)}`);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

