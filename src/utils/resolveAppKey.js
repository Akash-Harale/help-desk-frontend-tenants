/**
 * resolveAppKey.js — Determines the correct app_key for this tab session.
 *
 * Priority (senior-dev pattern):
 *   1. URL query param  ?app_key=...   → set by the main ticketing frontend when
 *                                         opening Help Desk in a new tab
 *   2. sessionStorage   hd_app_key     → survives SPA navigation within the tab
 *   3. Build-time env   VITE_APP_KEY   → static deployment fallback
 *
 * Security notes:
 *   • sessionStorage is tab-scoped — it is NOT shared across tabs and is
 *     automatically cleared when the tab/window is closed. It never hits disk
 *     the way localStorage does.
 *   • After reading the key from the URL we immediately strip it from the
 *     address bar via history.replaceState so it doesn't appear in:
 *       - browser history entries
 *       - bookmarks
 *       - server-side access logs (since Vite serves locally, but good habit)
 *
 * This module runs at import time (top-level), so by the time React mounts
 * the resolved key is already available synchronously — zero flicker.
 */

function resolveAppKey() {
  const params  = new URLSearchParams(window.location.search);
  let changedUrl = false;

  // Capture user details if passed from main ticketing frontend
  const userId  = params.get('user_id');
  const name    = params.get('name');
  const email   = params.get('email');
  const orgName = params.get('org_name');
  const role    = params.get('role');

  if (userId || name || email) {
    const userData = {
      user_id:  userId  || null,
      name:     name    || '',
      email:    email   || '',
      org_name: orgName || '',
      role:     role    || ''
    };
    localStorage.setItem('hd_portal_user', JSON.stringify(userData));
    localStorage.setItem('hd_submitter', JSON.stringify(userData));

    params.delete('user_id');
    params.delete('name');
    params.delete('email');
    params.delete('org_name');
    params.delete('role');
    changedUrl = true;
  }

  const fromUrl = params.get('app_key');
  if (fromUrl) {
    // Persist for subsequent navigations within this tab
    sessionStorage.setItem('hd_app_key', fromUrl);
    params.delete('app_key');
    changedUrl = true;
  }

  if (changedUrl) {
    const cleanSearch = params.toString() ? '?' + params.toString() : '';
    window.history.replaceState(
      {},
      '',
      window.location.pathname + cleanSearch + window.location.hash,
    );
  }

  if (fromUrl) return fromUrl;

  const fromSession = sessionStorage.getItem('hd_app_key');
  if (fromSession) return fromSession;

  return import.meta.env.VITE_APP_KEY || '';
}

/** The resolved app_key for this tab — available synchronously at module load time. */
export const RESOLVED_APP_KEY = resolveAppKey();

/** True when a non-empty app_key was resolved; false means no key is configured. */
export const HAS_APP_KEY = Boolean(RESOLVED_APP_KEY);
