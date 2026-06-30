/**
 * MyTicketsPage.jsx — Paginated ticket list with filters
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, PlusCircle, X } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import TicketCard from '../components/TicketCard';

const STATUS_OPTIONS   = ['', 'open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high'];
const TYPE_OPTIONS     = ['', 'issue', 'feedback'];

const LABEL = (val) => val ? val.replace('_', ' ') : 'All';

export default function MyTicketsPage() {
  const navigate = useNavigate();

  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [priority, setPriority] = useState('');
  const [type,     setType]     = useState('');

  const filters = useMemo(() => ({
    ...(status   && { status }),
    ...(priority && { priority }),
    ...(type     && { type }),
    ...(search   && { search })
  }), [status, priority, type, search]);

  const { tickets, loading, error, refetch } = useTickets(filters);

  const hasActiveFilter = status || priority || type || search;

  const clearFilters = () => {
    setSearch(''); setStatus(''); setPriority(''); setType('');
  };

  return (
    <div className="page-wrapper fade-up">

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '1rem',
        marginBottom: '2rem', flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            My Tickets
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {loading ? 'Loading…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={refetch} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh
          </button>
          <button className="btn btn-brand btn-sm" onClick={() => navigate('/submit')}>
            <PlusCircle size={14} /> New Ticket
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="card card-sm" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)'
          }} />
          <input
            id="ticket-search"
            type="text"
            className="form-input"
            placeholder="Search tickets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          {search && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: '0.2rem 0.4rem' }}
              onClick={() => setSearch('')}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Chips row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />

          {/* Status */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s} className={`btn btn-sm ${status === s ? 'btn-brand' : 'btn-ghost'}`}
                onClick={() => setStatus(s)}>
                {LABEL(s) || 'All Status'}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Priority */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} className={`btn btn-sm ${priority === p ? 'btn-brand' : 'btn-ghost'}`}
                onClick={() => setPriority(p)}>
                {LABEL(p) || 'All Priority'}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Type */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t} className={`btn btn-sm ${type === t ? 'btn-brand' : 'btn-ghost'}`}
                onClick={() => setType(t)}>
                {t ? (t === 'issue' ? '🐛 Issue' : '💬 Feedback') : 'All Types'}
              </button>
            ))}
          </div>

          {hasActiveFilter && (
            <>
              <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
              <button className="btn btn-sm btn-danger" onClick={clearFilters}>
                <X size={12} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>{hasActiveFilter ? 'No tickets match your filters' : 'No tickets yet'}</h3>
          <p>{hasActiveFilter ? 'Try adjusting the filters above.' : 'Submit a ticket and it will appear here.'}</p>
          {!hasActiveFilter && (
            <button
              className="btn btn-brand"
              style={{ marginTop: '1.25rem' }}
              onClick={() => navigate('/submit')}
            >
              <PlusCircle size={15} /> Submit First Ticket
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tickets.map(t => <TicketCard key={t._id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}
