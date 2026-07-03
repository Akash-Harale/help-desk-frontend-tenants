/**
 * App.jsx — Root application component
 *
 * The app_key is resolved at runtime via (priority order):
 *   1. ?app_key=... URL query param (passed by main ticketing frontend on new-tab open)
 *   2. sessionStorage hd_app_key (survives SPA navigation within the same tab)
 *   3. VITE_APP_KEY env variable (static deployment fallback)
 *
 * If the backend accepts the key (branding loads), the user enters the portal
 * directly — NO separate login gate.
 *
 * Layout mirrors the main Ticketing System frontend:
 *   Header (top, sticky) + Sidebar (left, fixed) + Main content (right)
 */
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { TenantProvider, useTenant } from './context/TenantContext';
import { UserProvider }              from './context/UserContext';

import Sidebar          from './components/Sidebar';
import PortalHeader     from './components/PortalHeader';
import HomePage         from './pages/HomePage';
import SubmitTicketPage from './pages/SubmitTicketPage';
import MyTicketsPage    from './pages/MyTicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// ── App shell rendered after providers are ready ─────────────────────────────
function AppShell() {
  const { loading: tenantLoading, error: tenantError, noAppKey } = useTenant();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── 1. No app_key configured at all ─────────────────────────────────────
  if (noAppKey) {
    return (
      <div className="no-key-screen">
        <div className="no-key-card">
          <div className="no-key-icon">🔑</div>
          <h1 className="no-key-title">No App Key Configured</h1>
          <p className="no-key-desc">
            This Help Desk portal requires a valid <code>app_key</code> to load
            tenant branding and connect to the backend. No key was found in any
            of the supported sources:
          </p>
          <ul className="no-key-sources">
            <li>
              <span className="no-key-badge">URL</span>
              <code>?app_key=hd_live_…</code> query parameter
            </li>
            <li>
              <span className="no-key-badge">Session</span>
              <code>sessionStorage → hd_app_key</code>
            </li>
            <li>
              <span className="no-key-badge">Env</span>
              <code>VITE_APP_KEY</code> in <code>.env</code>
            </li>
          </ul>
          <div className="no-key-hint">
            <strong>How to fix:</strong> Add your tenant's app key to the{' '}
            <code>.env</code> file and restart the dev server:
            <pre className="no-key-code">VITE_APP_KEY=hd_live_your_key_here</pre>
            Or open the portal with the key in the URL:
            <pre className="no-key-code">http://localhost:5174/?app_key=hd_live_…</pre>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Loading branding from backend ────────────────────────────────────
  if (tenantLoading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p>Connecting to Help Desk…</p>
      </div>
    );
  }

  // ── 3. Hard failure — invalid app_key or backend down ───────────────────
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

  // ── 4. ✅ app_key is valid → enter portal with full sidebar layout ────────
  return (
    <BrowserRouter>
      <div className="portal-root">
        {/* Sticky top header (matches ticketing system's header bar) */}
        <PortalHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="portal-body">
          {/* Sidebar */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Main content — offset for sidebar on desktop */}
          <main className="portal-main">
            <div className="portal-content">
              <Routes>
                <Route path="/"            element={<HomePage />} />
                <Route path="/admin"       element={<AdminDashboardPage />} />
                <Route path="/dashboard"   element={<AdminDashboardPage />} />
                <Route path="/submit"      element={<SubmitTicketPage />} />
                <Route path="/tickets"     element={<MyTicketsPage />} />
                <Route path="/tickets/:id" element={<TicketDetailPage />} />
                <Route path="*"            element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
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
