/**
 * api.js — Axios instance for the Help Desk Microservice
 *
 * The app_key is read from the .env file at build time (VITE_APP_KEY).
 * Every request automatically carries it in the `app_key` header so the
 * backend can identify which tenant the traffic belongs to.
 *
 * Auth JWT (for actions that need user identity) is attached separately via
 * the `setAuthToken` helper and stored in the request interceptor.
 */
import axios from 'axios';
import { RESOLVED_APP_KEY } from '../utils/resolveAppKey';

const APP_KEY   = RESOLVED_APP_KEY;
const BASE_URL  = import.meta.env.VITE_API_BASE_URL || '/api';

// ── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'app_key': APP_KEY          // sent on every request — identifies the tenant
  }
});

// ── Request interceptor: attach JWT when present ────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hd_user_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: normalise errors ──────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hd_user_token');
      localStorage.removeItem('hd_user');
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Helper: inject/remove user JWT ─────────────────────────────────────────
export const setAuthToken  = (token) => { api.defaults.headers['Authorization'] = `Bearer ${token}`; };
export const clearAuthToken = ()     => { delete api.defaults.headers['Authorization']; };

// ── Convenience config accessor ─────────────────────────────────────────────
export const APP_KEY_VALUE = APP_KEY;
