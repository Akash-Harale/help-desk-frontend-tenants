/**
 * MyTicketsPage.jsx — Paginated table view matching Ticketing System My Reports
 *
 * Access logic:
 *   • Admin (NSS_Admin / PMU_Admin / superadmin) → sees ALL tickets in the tenant
 *   • Regular user                               → sees only their own tickets
 *     (filtered server-side by createdBy.user_id)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, RefreshCw, PlusCircle, X, Loader2,
  FileText, MessageSquare, AlertCircle, CheckCircle2,
  Clock, XCircle, Hash, ChevronDown, ChevronUp,
  ShieldCheck, Send, MessageCircle, Paperclip
} from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { updateTicketStatus } from '../services/ticketService';
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3200';
const getAttachmentUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const statusMeta = {
  open: {
    label: 'Open',
    bg: 'var(--blue-bg)', text: 'var(--blue-text)', border: 'var(--blue-border)',
    icon: <AlertCircle size={12} />
  },
  in_progress: {
    label: 'In Progress',
    bg: 'var(--amber-bg)', text: 'var(--amber-text)', border: 'var(--amber-border)',
    icon: <Clock size={12} />
  },
  resolved: {
    label: 'Resolved',
    bg: 'var(--green-bg)', text: 'var(--green-text)', border: 'var(--green-border)',
    icon: <CheckCircle2 size={12} />
  },
  closed: {
    label: 'Closed',
    bg: 'var(--slate-bg)', text: 'var(--slate-text)', border: 'var(--slate-border)',
    icon: <XCircle size={12} />
  }
};

const StatusBadge = ({ status }) => {
  const meta = statusMeta[status] || statusMeta['open'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem',
      fontWeight: 600, background: meta.bg, color: meta.text,
      border: `1px solid ${meta.border}`
    }}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useUser();

  const currentType = new URLSearchParams(location.search).get('type') === 'feedback' ? 'feedback' : 'issue';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selected, setSelected] = useState(null);

  // Drawer – status update state (admin only)
  const [drawerStatus, setDrawerStatus] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const openDrawer = useCallback((ticket) => {
    setSelected(ticket);
    setDrawerStatus(ticket.status);
    setCommentText('');
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const closeDrawer = useCallback(() => {
    setSelected(null);
    setDrawerStatus('');
    setCommentText('');
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const filters = useMemo(() => ({
    type: currentType,
    ...(statusFilter && { status: statusFilter }),
    ...(search && { search }),
    // Admins get all tickets; regular users get only theirs
    ...(isAdmin
      ? { is_admin: true }
      : user?.user_id
        ? { user_id: user.user_id }
        : {}
    )
  }), [currentType, statusFilter, search, isAdmin, user?.user_id]);

  const { tickets, loading, error, refetch } = useTickets(filters);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [tickets, sortOrder]);

  const handleStatusUpdate = useCallback(async () => {
    if (!selected || !drawerStatus) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const result = await updateTicketStatus(
        selected._id,
        drawerStatus,
        commentText,
        {
          name: user?.name || user?.email || 'Admin',
          role: user?.role || '',
          user_id: user?.user_id || '',
          email: user?.email || ''
        }
      );
      const updated = result.data;
      setSelected(updated);
      setDrawerStatus(updated.status);
      setCommentText('');
      setSubmitSuccess('Status updated successfully.');
      refetch();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  }, [selected, drawerStatus, commentText, user, refetch]);

  const handleCreatorClose = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const result = await updateTicketStatus(
        selected._id,
        'closed',
        'Ticket marked as closed by ticket creator.',
        {
          name: user?.name || user?.email || 'Creator',
          role: 'creator',
          user_id: user?.user_id || '',
          email: user?.email || ''
        }
      );
      const updated = result.data;
      setSelected(updated);
      setDrawerStatus(updated.status);
      setSubmitSuccess('Ticket closed successfully.');
      refetch();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to close ticket.');
    } finally {
      setSubmitting(false);
    }
  }, [selected, user, refetch]);

  return (
    <div className="page-wrapper fade-up">
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '1rem',
        marginBottom: '1.5rem', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--r-md)',
            background: 'var(--brand-gradient)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-brand)'
          }}>
            {isAdmin
              ? <ShieldCheck size={20} />
              : currentType === 'feedback' ? <MessageSquare size={20} /> : <FileText size={20} />
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                {isAdmin
                  ? currentType === 'feedback' ? 'All Feedbacks' : 'All Tickets'
                  : currentType === 'feedback' ? 'My Feedbacks' : 'My Tickets'
                }
              </h1>
              {isAdmin && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem',
                  fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'var(--brand-color-muted)', color: 'var(--brand-color)',
                  border: '1px solid var(--border-accent)'
                }}>
                  <ShieldCheck size={11} /> Admin View
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              {loading
                ? 'Loading…'
                : isAdmin
                  ? `${sortedTickets.length} total ${currentType === 'feedback' ? 'feedback submission' : 'ticket'}${sortedTickets.length !== 1 ? 's' : ''} across all users`
                  : `${sortedTickets.length} ${currentType === 'feedback' ? 'feedback submission' : 'ticket'}${sortedTickets.length !== 1 ? 's' : ''} found`
              }
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={refetch} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh
          </button>
          <button
            className="btn btn-brand btn-sm"
            onClick={() => navigate(`/submit?type=${currentType}`)}
          >
            <PlusCircle size={14} /> {currentType === 'feedback' ? 'New Feedback' : 'New Ticket'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 4, background: 'var(--border)',
        padding: 4, borderRadius: 'var(--r-md)', width: 'fit-content',
        marginBottom: '1.25rem'
      }}>
        <button
          onClick={() => navigate('/tickets?type=issue')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.45rem 1rem', borderRadius: 8, border: 'none',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            background: currentType === 'issue' ? 'var(--bg-surface)' : 'transparent',
            color: currentType === 'issue' ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: currentType === 'issue' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <FileText size={15} /> Tickets
        </button>
        <button
          onClick={() => navigate('/tickets?type=feedback')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.45rem 1rem', borderRadius: 8, border: 'none',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            background: currentType === 'feedback' ? 'var(--bg-surface)' : 'transparent',
            color: currentType === 'feedback' ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: currentType === 'feedback' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          <MessageSquare size={15} /> Feedback
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="card card-sm" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            className="form-input"
            placeholder={currentType === 'issue' ? 'Search tickets…' : 'Search feedback…'}
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

        {currentType === 'issue' && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: 150 }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        )}

        <button
          onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>

        {(search || statusFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>
            Reset
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentType === 'issue' && <th style={{ padding: '0.85rem 1.25rem' }}>Ticket No.</th>}
                <th style={{ padding: '0.85rem 1.25rem' }}>Created Date</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Title</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Created By</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Organization</th>
                {currentType === 'issue' && (
                  <>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Priority</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={currentType === 'issue' ? 7 : 4} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 className="spin-icon" size={24} style={{ margin: '0 auto 0.5rem' }} />
                    <div>Loading {currentType === 'feedback' ? 'feedback' : 'tickets'}…</div>
                  </td>
                </tr>
              ) : sortedTickets.length === 0 ? (
                <tr>
                  <td colSpan={currentType === 'issue' ? 7 : 4} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                    <div>No {currentType === 'feedback' ? 'feedback' : 'tickets'} found.</div>
                  </td>
                </tr>
              ) : (
                sortedTickets.map(ticket => (
                  <tr
                    key={ticket._id}
                    onClick={() => openDrawer(ticket)}
                    style={{
                      borderTop: '1px solid var(--border)', cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-color-muted)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {currentType === 'issue' && (
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--brand-color)', fontFamily: 'monospace' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <Hash size={13} />
                          {ticket.ticketNumber || '—'}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {fmt(ticket.createdAt)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ticket.subject}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ticket.createdBy?.name || ticket.createdBy?.email || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ticket.createdBy?.email}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {ticket.orgInfo?.org_name || 'N/A'}
                    </td>
                    {currentType === 'issue' && (
                      <>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textTransform: 'capitalize', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {ticket.priority || 'low'}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Details Drawer ── */}
      {selected && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, backdropFilter: 'blur(3px)' }}
            onClick={closeDrawer}
          />
          <div className="ticket-full-panel">

            {/* Drawer header */}
            <div style={{ padding: '1.25rem 2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentType === 'issue' && (
                  <span style={{ background: 'var(--brand-color-muted)', color: 'var(--brand-color)', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    #{selected.ticketNumber || '—'}
                  </span>
                )}
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  {currentType === 'issue' ? 'Ticket Details' : 'Feedback Details'}
                </h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeDrawer}><X size={18} /></button>
            </div>

            {/* Drawer body */}
            <div className="ticket-panel-body-grid">
              {(() => {
                const isCreator = selected && (
                  (user?.user_id && String(selected.createdBy?.user_id) === String(user.user_id)) ||
                  (user?.email && String(selected.createdBy?.email).toLowerCase() === String(user.email).toLowerCase()) ||
                  (!isAdmin)
                );

                return (
                  <>
                    {/* Left Column: Core Content & Timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                      {/* Title */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Title</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{selected.subject}</div>
                      </div>

                      {/* Description */}
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                        <div style={{ background: 'var(--bg-base)', padding: '1.25rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          <div style={{ marginBottom: selected.attachment ? '1.25rem' : 0 }}>
                            {selected.description}
                          </div>
                          {selected.attachment && (() => {
                            const attUrl = getAttachmentUrl(selected.attachment);
                            const isImg = /\.(png|jpe?g|gif|webp)$/i.test(selected.attachment);
                            return (
                              <div style={{
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '1px dashed var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Paperclip size={13} color="var(--brand-color)" /> Attached File / Screenshot
                                </div>
                                {isImg && (
                                  <a href={attUrl} target="_blank" rel="noreferrer" style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                                    <img src={attUrl} alt="Attachment preview" style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain', display: 'block', background: 'rgba(0,0,0,0.2)' }} />
                                  </a>
                                )}
                                <a
                                  href={attUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '0.55rem 1rem',
                                    background: 'var(--brand-color-muted)',
                                    border: '1px solid var(--border-accent)',
                                    borderRadius: 'var(--r-sm)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: 'var(--brand-color)',
                                    textDecoration: 'none',
                                    width: 'fit-content'
                                  }}
                                >
                                  <Paperclip size={14} /> View / Download Attachment ↗
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Comments / Activity Timeline */}
                      {currentType === 'issue' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.85rem' }}>
                            <MessageCircle size={15} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Activity ({(selected.comments || []).length})
                            </span>
                          </div>

                          {(!selected.comments || selected.comments.length === 0) ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
                              No activity yet.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {[...(selected.comments || [])].reverse().map((c, i) => {
                                const meta = statusMeta[c.status] || statusMeta['open'];
                                return (
                                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: '1rem', position: 'relative' }}>
                                    {i < (selected.comments || []).length - 1 && (
                                      <div style={{ position: 'absolute', left: 15, top: 30, bottom: 0, width: 2, background: 'var(--border)' }} />
                                    )}
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: meta.bg, border: `2px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                                      <span style={{ color: meta.text, display: 'flex' }}>{meta.icon}</span>
                                    </div>
                                    <div style={{ flex: 1, paddingTop: 2 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                        <StatusBadge status={c.status} />
                                        {c.by?.name && (
                                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>by {c.by.name}</span>
                                        )}
                                        {c.by?.role && (
                                          <span style={{ fontSize: '0.7rem', color: 'var(--brand-color)', background: 'var(--brand-color-muted)', padding: '1px 7px', borderRadius: 99, border: '1px solid var(--border-accent)' }}>{c.by.role}</span>
                                        )}
                                      </div>
                                      {c.comment && (
                                        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0.6rem 0.85rem', fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: 4 }}>
                                          {c.comment}
                                        </div>
                                      )}
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {c.date ? new Date(c.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Status Controls & Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Status + Priority */}
                      {currentType === 'issue' && (
                        <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
                            <StatusBadge status={selected.status} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Priority</div>
                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selected.priority || 'Low'}</div>
                          </div>
                        </div>
                      )}

                      {/* Meta: created by / date / org */}
                      <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Created By</div>
                          <div style={{ fontWeight: 600 }}>{selected.createdBy?.name || selected.createdBy?.email}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selected.createdBy?.email}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Created Date</div>
                          <div style={{ fontWeight: 600 }}>{fmt(selected.createdAt)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Organization</div>
                          <div style={{ fontWeight: 600 }}>{selected.orgInfo?.org_name || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Creator: Close Ticket */}
                      {isCreator && currentType === 'issue' && selected.status !== 'closed' && (
                        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1.1rem', background: 'var(--bg-base)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Is your issue resolved?</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Only you as the ticket creator can mark this ticket as closed.</div>
                            </div>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--slate-bg)', color: 'var(--slate-text)', border: '1px solid var(--slate-border)', fontWeight: 600, width: '100%' }}
                              disabled={submitting}
                              onClick={handleCreatorClose}
                            >
                              <CheckCircle2 size={14} /> Close Ticket
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Admin: Update Status + Comment */}
                      {isAdmin && currentType === 'issue' && selected.status !== 'closed' && selected.status !== 'resolved' && (
                        <div style={{ border: '1px solid var(--border-accent)', borderRadius: 'var(--r-md)', padding: '1.1rem', background: 'var(--brand-color-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.85rem' }}>
                            <ShieldCheck size={15} color="var(--brand-color)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Status</span>
                          </div>

                          <select
                            value={drawerStatus}
                            onChange={e => { setDrawerStatus(e.target.value); setSubmitSuccess(''); setSubmitError(''); }}
                            className="form-input"
                            style={{ marginBottom: '0.75rem' }}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            {isCreator && <option value="closed">Closed</option>}
                          </select>

                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                            Comment (optional)
                          </label>
                          <textarea
                            className="form-textarea"
                            rows={3}
                            placeholder="Add a note or reason for this status change…"
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            style={{ marginBottom: '0.75rem', resize: 'vertical', minHeight: 80 }}
                          />

                          {submitError && <div className="alert alert-error" style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>{submitError}</div>}
                          {submitSuccess && <div className="alert alert-success" style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>{submitSuccess}</div>}

                          <button
                            className="btn btn-brand btn-sm"
                            style={{ width: '100%' }}
                            disabled={submitting || drawerStatus === selected.status}
                            onClick={handleStatusUpdate}
                          >
                            {submitting ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
                            {submitting ? 'Updating…' : 'Submit Status Update'}
                          </button>
                          {drawerStatus === selected.status && !submitSuccess && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>Select a different status to enable update.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}