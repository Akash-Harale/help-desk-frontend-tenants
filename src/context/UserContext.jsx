/**
 * UserContext.jsx
 *
 * Manages the end-user session (name, email, org info) stored in localStorage.
 * This is NOT a full auth flow — the end-user of the tenant portal just sets
 * their name/email so it can be embedded in the ticket's `createdBy` field.
 *
 * For tenants that want real user accounts, this can be swapped for OAuth/SSO
 * without changing any other component — only this context needs updating.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const USER_KEY = 'hd_portal_user';

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

  return (
    <UserContext.Provider value={{ user, setUser, clearUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
