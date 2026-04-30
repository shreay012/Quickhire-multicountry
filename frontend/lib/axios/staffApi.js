// Real backend client for staff portals (admin / pm / resource).
// Separate from the user-facing mock axiosInstance so we don't break existing flows.
import axios from 'axios';
import { flattenI18nDeep, readActiveLocale } from '../i18n/flattenI18nDeep';

// ✅ QuickHire Backend URL — backend listens on :4000 and mounts routes at root in local dev.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'qh_staff_token';
const USER_KEY = 'qh_staff_user';

export const staffAuth = {
  setSession({ token, user }) {
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const staffApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

staffApi.interceptors.request.use((config) => {
  const token = staffAuth.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

staffApi.interceptors.response.use(
  (res) => {
    try {
      if (res && res.data != null && typeof res.data === 'object') {
        res.data = flattenI18nDeep(res.data, readActiveLocale());
      }
    } catch {
      /* never let normalization break a successful response */
    }
    return res;
  },
  (err) => {
    if (err?.response?.status === 401 && typeof window !== 'undefined') {
      staffAuth.clear();
      if (!window.location.pathname.endsWith('/staff-login')) {
        window.location.href = '/staff-login';
      }
    }
    return Promise.reject(err);
  },
);

export default staffApi;
