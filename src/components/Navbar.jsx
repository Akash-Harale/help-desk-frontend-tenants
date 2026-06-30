/**
 * Navbar.jsx — Sticky top navigation bar
 *
 * Shows tenant logo/brand name and nav links.
 * No user identity pill — the app_key is the only auth needed.
 */
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TicketCheck, PlusCircle, Home, Menu, X } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { initials } from '../utils/helpers';

const NAV_ITEMS = [
  { to: '/',        label: 'Home',       icon: Home        },
  { to: '/tickets', label: 'My Tickets', icon: TicketCheck },
  { to: '/submit',  label: 'New Ticket', icon: PlusCircle  }
];

export default function Navbar() {
  const { theme, organization_name } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = theme?.brand_name || organization_name || 'Help Desk';
  const logoUrl     = theme?.logo_url   || '';

  return (
    <header className="navbar">
      {/* Brand */}
      <NavLink to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
        {logoUrl ? (
          <img src={logoUrl} alt={displayName} className="brand-logo" />
        ) : (
          <div className="brand-logo-fallback">
            {initials(displayName).charAt(0) || '🎫'}
          </div>
        )}
        <span className="brand-name">{displayName}</span>
      </NavLink>

      {/* Desktop nav */}
      <nav className="navbar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile toggle */}
      <button
        className="btn btn-ghost btn-sm mobile-menu-btn"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: 4,
          zIndex: 199
        }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
