/**
 * Sidebar.jsx — Help Desk Tenant Portal sidebar
 *
 * Mirrors the visual design of the main ticketing system's sidebar.
 * This portal IS the Help Desk, so the sidebar contains only Help Desk
 * navigation items (Home, Submit Ticket, My Tickets).
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Headphones,
  Home,
  PlusCircle,
  TicketCheck,
  MessageSquare,
  Shield,
  X,
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useUser } from '../context/UserContext';

export default function Sidebar({ isOpen, onClose }) {
  const { theme, organization_name } = useTenant();
  const { isAdmin } = useUser();
  const location = useLocation();

  const navItems = [
    { label: 'Home',            to: '/',                      icon: Home          },
    { label: 'Admin Dashboard', to: '/admin',                 icon: Shield        },
    { label: 'Create Ticket',   to: '/submit?type=issue',     icon: PlusCircle    },
    { label: 'Submit Feedback', to: '/submit?type=feedback',  icon: MessageSquare },
    { label: 'My Tickets',      to: '/tickets?type=issue',    icon: TicketCheck   },
    { label: 'My Feedbacks',    to: '/tickets?type=feedback', icon: MessageSquare },
  ];

  const displayName = theme?.brand_name || organization_name || 'Help Desk';
  const logoUrl     = theme?.logo_url   || '';

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
        {/* Logo — visible on mobile only (desktop has header) */}
        <div className="sidebar-logo-row">
          <Link to="/" className="sidebar-brand" onClick={onClose}>
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="sidebar-logo-img" />
            ) : (
              <div className="sidebar-logo-fallback">
                {displayName.charAt(0).toUpperCase() || '🎫'}
              </div>
            )}
            <span className="sidebar-brand-name">{displayName}</span>
          </Link>
          {/* Close button — mobile */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section label */}
        <div className="sidebar-section-label">
          <Headphones size={11} />
          <span>Help Desk</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ label, to, icon: Icon }) => {
            const path = to.split('?')[0];
            const paramType = new URLSearchParams(to.split('?')[1] || '').get('type');
            const currentType = new URLSearchParams(location.search).get('type');

            const isActive =
              to === '/'
                ? location.pathname === '/'
                : location.pathname === path &&
                  (currentType === paramType || (!currentType && paramType === 'issue'));

            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`sidebar-nav-item${isActive ? ' active' : ''}`}
              >
                <Icon
                  size={16}
                  className={`sidebar-nav-icon${isActive ? ' active' : ''}`}
                />
                <span>{label}</span>
                {isActive && <span className="sidebar-nav-dot" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer branding */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-inner">
            <div className="sidebar-footer-icon">
              <Headphones size={14} />
            </div>
            <div className="sidebar-footer-text">
              <p className="sidebar-footer-title">{displayName}</p>
              <p className="sidebar-footer-sub">Tenant Support Portal</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
