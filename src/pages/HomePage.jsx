/**
 * HomePage.jsx — Landing / hero page of the tenant portal
 *
 * Shows:
 *  - Branded hero with org name, tagline, brand gradient
 *  - Quick action cards (Submit, My Tickets)
 *  - Stats strip (total / open / in-progress / resolved)
 *  - Recent tickets preview
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, TicketCheck, Inbox, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useUser } from '../context/UserContext';
import { useTickets } from '../hooks/useTickets';
import TicketCard from '../components/TicketCard';
import { STATUS_META } from '../utils/helpers';

export default function HomePage() {
  const navigate = useNavigate();
  const { theme, organization_name } = useTenant();
  const { user }                      = useUser();
  const { tickets, loading }          = useTickets({}, true);

  const stats = {
    total:       tickets.length,
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => ['resolved','closed'].includes(t.status)).length
  };

  const recent = tickets.slice(0, 3);

  return (
    <div className="page-wrapper fade-up">

      {/* ── Hero ── */}
      <section style={{
        borderRadius: 'var(--r-xl)',
        background: 'var(--brand-gradient)',
        padding: '3rem 2.5rem',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -30,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {theme?.logo_url && (
            <img
              src={theme.logo_url}
              alt={organization_name}
              style={{ height: 48, objectFit: 'contain', marginBottom: '1.25rem', borderRadius: 8 }}
            />
          )}
          <h1 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            marginBottom: '0.6rem',
            lineHeight: 1.2
          }}>
            {theme?.brand_name || organization_name || 'Help Desk'}
            <br />
            <span style={{ opacity: 0.85, fontWeight: 500, fontSize: '0.6em' }}>Support Center</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '1rem', maxWidth: 520, marginBottom: '2rem' }}>
            {theme?.tagline || "We're here to help. Submit a ticket and we'll get back to you shortly."}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => navigate('/submit')} style={{
              background: '#fff',
              color: 'var(--brand-color)',
              fontWeight: 700,
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem'
            }}>
              <PlusCircle size={18} /> Submit a Ticket
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/tickets')} style={{
              borderColor: 'rgba(255,255,255,0.4)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem'
            }}>
              <TicketCheck size={18} /> View My Tickets
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Tickets', value: stats.total,       icon: Inbox,        color: 'brand' },
          { label: 'Open',          value: stats.open,        icon: AlertCircle,  color: 'blue'  },
          { label: 'In Progress',   value: stats.in_progress, icon: Clock,        color: 'amber' },
        ].map(s => (
          <div key={s.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: s.color === 'brand' ? 'var(--brand-color-muted)'
                        : s.color === 'blue'  ? 'var(--blue-bg)'
                        : 'var(--amber-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <s.icon size={20}
                color={s.color === 'brand' ? 'var(--brand-color)'
                      : s.color === 'blue'  ? 'var(--blue-text)'
                      : 'var(--amber-text)'}
              />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>
                {loading ? '—' : s.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent tickets ── */}
      <section>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.25rem'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Tickets</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/tickets')}
          >
            View All
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-md)' }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🎫</div>
            <h3>No tickets yet</h3>
            <p>Submit your first support ticket above and we'll get right on it.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recent.map(t => <TicketCard key={t._id} ticket={t} />)}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer style={{
        marginTop: '3rem', paddingTop: '1.5rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        fontSize: '0.8rem', color: 'var(--text-muted)'
      }}>
        {theme?.support_email && (
          <p>
            Need direct help?{' '}
            <a href={`mailto:${theme.support_email}`}>
              {theme.support_email}
            </a>
          </p>
        )}
        <p style={{ marginTop: 6 }}>
          Powered by <strong style={{ color: 'var(--brand-color)' }}>Help Desk Microservice</strong>
        </p>
      </footer>
    </div>
  );
}
