/**
 * App.jsx — Root application component
 *
 * The app_key in .env IS the authentication for this portal.
 * If the backend accepts it (branding loads), the user enters the portal
 * directly — NO separate login gate.
 *
 * Name / email are only collected inline on the Submit Ticket form.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { TenantProvider, useTenant } from './context/TenantContext';
import { UserProvider }              from './context/UserContext';

import Navbar            from './components/Navbar';
import HomePage          from './pages/HomePage';
import SubmitTicketPage  from './pages/SubmitTicketPage';
import MyTicketsPage     from './pages/MyTicketsPage';
import TicketDetailPage  from './pages/TicketDetailPage';

// ── App shell rendered after providers are ready ─────────────────────────────
function AppShell() {
  const { loading: tenantLoading, error: tenantError } = useTenant();

  // Full-page loader while we fetch branding via app_key
  if (tenantLoading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p>Connecting to Help Desk…</p>
      </div>
    );
  }

  // Hard failure — invalid app_key or backend down
  if (tenantError) {
    return (
      <div className="page-loader" style={{ gap: '0.75rem', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cannot Load Portal</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 420 }}>
          {tenantError}
        </p>
        <button
          className="btn btn-ghost"
          style={{ marginTop: '0.5rem' }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // ✅ app_key is valid → enter portal directly, no login needed
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/"            element={<HomePage />} />
            <Route path="/submit"      element={<SubmitTicketPage />} />
            <Route path="/tickets"     element={<MyTicketsPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

// ── Root: wrap in providers ──────────────────────────────────────────────────
export default function App() {
  return (
    <TenantProvider>
      <UserProvider>
        <AppShell />
      </UserProvider>
    </TenantProvider>
  );
}
