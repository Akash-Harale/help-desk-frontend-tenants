/**
 * UserContext.jsx
 *
 * Manages the end-user session (name, email, org info, role) stored in localStorage.
 * This is NOT a full auth flow — the end-user of the tenant portal just sets
 * their name/email so it can be embedded in the ticket's `createdBy` field.
 *
 * The `role` field is passed from the main ticketing system via URL param
 * (`?role=NSS_Admin` etc.) and stored here. `isAdmin` is derived from it:
 *   → true  : user sees ALL tickets in the tenant (nss_admin / pmu_admin / superadmin)
 *   → false : user only sees tickets where createdBy.user_id === their user_id
 *
 * For tenants that want real user accounts, this can be swapped for OAuth/SSO
 * without changing any other component — only this context needs updating.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const USER_KEY = 'hd_portal_user';

// Roles that grant access to all tickets within a tenant
const ADMIN_ROLES = ['superadmin', 'nss_admin', 'nss admin', 'pmu_admin', 'pmu admin'];

const UserContext = createContext(null);

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function UserProvider({ children }) {
  const [user, setUserState] = useState(readUser);

  const setUser = useCallback((userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUserState(userData);
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUserState(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUserState((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /**
   * isAdmin — true when the user's role grants access to ALL tenant tickets.
   * Checked case-insensitively against ADMIN_ROLES.
   */
  const isAdmin = useMemo(() => {
    const role = (user?.role || '').toLowerCase().trim();
    return ADMIN_ROLES.includes(role);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser, clearUser, updateUser, isAdmin }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
