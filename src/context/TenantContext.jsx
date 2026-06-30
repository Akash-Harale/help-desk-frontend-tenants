/**
 * TenantContext.jsx
 *
 * Provides tenant branding (logo, brand_color, org name, tagline) fetched
 * from the backend on app boot using the VITE_APP_KEY env variable.
 *
 * Once loaded, the context also injects CSS custom properties onto :root so
 * every component can reference `var(--brand-color)` and friends — this is
 * the "painting" mechanism for per-tenant theming.
 *
 * No Redux. Clean React context + useReducer pattern.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import api from '../services/api';

// ── Default fallback theme ──────────────────────────────────────────────────
const DEFAULT_THEME = {
  brand_color:   '#6366f1',
  logo_url:      '',
  brand_name:    'Help Desk',
  support_email: 'support@helpdesk.io',
  tagline:       "We're here to help. Submit a ticket and we'll get back to you."
};

// ── State shape ─────────────────────────────────────────────────────────────
const initialState = {
  loading:         true,
  error:           null,
  tenant_id:       '',
  organization_name: '',
  theme:           DEFAULT_THEME
};

// ── Reducer ─────────────────────────────────────────────────────────────────
function tenantReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading:           false,
        error:             null,
        tenant_id:         action.payload.tenant_id,
        organization_name: action.payload.organization_name,
        theme:             { ...DEFAULT_THEME, ...action.payload.theme }
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// ── Inject CSS variables onto :root ─────────────────────────────────────────
function applyThemeToCssVars(theme) {
  const root = document.documentElement;
  const color = theme.brand_color || '#6366f1';

  // Derive glow and muted variant from brand_color
  root.style.setProperty('--brand-color',      color);
  root.style.setProperty('--brand-color-glow', hexToRgba(color, 0.25));
  root.style.setProperty('--brand-color-muted', hexToRgba(color, 0.12));
  root.style.setProperty('--brand-gradient',
    `linear-gradient(135deg, ${color} 0%, ${lighten(color, 30)} 100%)`
  );
}

// ── Utility: hex → rgba ─────────────────────────────────────────────────────
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Utility: lighten hex color ───────────────────────────────────────────────
function lighten(hex, amount) {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── Context ──────────────────────────────────────────────────────────────────
const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [state, dispatch] = useReducer(tenantReducer, initialState);

  const fetchBranding = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const { data } = await api.get('/branding');
      if (data.success) {
        dispatch({ type: 'FETCH_SUCCESS', payload: data.data });
        applyThemeToCssVars(data.data.theme);
      } else {
        dispatch({ type: 'FETCH_ERROR', payload: data.message });
        applyThemeToCssVars(DEFAULT_THEME);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot connect to Help Desk backend.';
      dispatch({ type: 'FETCH_ERROR', payload: msg });
      applyThemeToCssVars(DEFAULT_THEME);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return (
    <TenantContext.Provider value={{ ...state, refetchBranding: fetchBranding }}>
      {children}
    </TenantContext.Provider>
  );
}

// ── Custom hook ──────────────────────────────────────────────────────────────
export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}
