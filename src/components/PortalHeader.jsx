/**
 * PortalHeader.jsx — Sticky top navigation bar for the Help Desk tenant portal.
 *
 * Visually mirrors the main ticketing system's header:
 *   • Left:   Hamburger (mobile) + Tenant logo/brand
 *   • Center: Portal title
 *   • Right:  "Powered by Help Desk" badge
 *
 * No login/logout controls — authentication is implicit via app_key.
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Headphones } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export default function PortalHeader({ onMenuClick }) {
  const { theme, organization_name } = useTenant();

  const displayName = theme?.brand_name || organization_name || 'Help Desk';
  const logoUrl     = theme?.logo_url   || '';

  return (
    <header className="portal-header">
      {/* Left: hamburger + brand */}
      <div className="portal-header-left">
        {/* Mobile menu toggle */}
        <button
          id="btn-portal-menu"
          className="portal-header-menu-btn"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <NavLink to="/" className="portal-header-brand">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="portal-header-logo" />
          ) : (
            <div className="portal-header-logo-fallback">
              {displayName.charAt(0).toUpperCase() || '🎫'}
            </div>
          )}
          <span className="portal-header-brand-name">{displayName}</span>
        </NavLink>
      </div>

      {/* Center: Portal name */}
      <div className="portal-header-center">
        <h1 className="portal-header-title">Help Desk Portal</h1>
      </div>

      {/* Right: powered-by pill */}
      <div className="portal-header-right">
        <div className="portal-powered-pill">
          <Headphones size={13} />
          <span>Support Portal</span>
        </div>
      </div>
    </header>
  );
}
