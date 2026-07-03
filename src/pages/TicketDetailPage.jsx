/**
 * TicketDetailPage.jsx — Single ticket detail view
 *
 * Shows full ticket info: subject, description, status timeline,
 * resolution note, submitter info, and attachment download link.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Paperclip, User, Building2, Calendar,
  Clock, MessageSquare, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { getTicketById } from '../services/ticketService';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/StatusBadge';
import { formatDate, timeAgo } from '../utils/helpers';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3200';
const getAttachmentUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

const STATUS_FLOW = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'];

export default function TicketDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [ticket,  setTicket]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true); setError('');
      try {
        const data = await getTicketById(id);
        if (!cancelled) setTicket(data.success ? data.data : null);
        if (!data.success) setError(data.message || 'Ticket not found.');
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load ticket.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--r-md)' }} />)}
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Ticket Not Found</h3>
          <p>{error || 'The ticket you are looking for does not exist.'}</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => navigate('/tickets')}>
            <ArrowLeft size={15} /> Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_FLOW.indexOf(ticket.status);

  return (
    <div className="page-wrapper fade-up">

      {/* ── Back + title bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Ticket #{ticket.ticketNumber}
            </span>
            <TypeBadge type={ticket.ticketType} />
            {ticket.ticketType !== 'feedback' && <PriorityBadge priority={ticket.priority} />}
            {ticket.ticketType !== 'feedback' && <StatusBadge status={ticket.status} />}
          </div>
          <h1 style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            fontWeight: 700, marginTop: '0.3rem',
            letterSpacing: '-0.02em'
          }}>
            {ticket.subject}
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth >= 1024 ? 'minmax(0, 1fr) 360px' : '1fr', gap: '2rem', alignItems: 'start' }}>

        {/* ── Left: main content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Description */}
          <div className="card">
            <h2 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} /> Description
            </h2>
            <div style={{ marginBottom: ticket.attachment ? '1.25rem' : 0 }}>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {ticket.description}
              </p>
            </div>

            {ticket.attachment && (() => {
              const attUrl = getAttachmentUrl(ticket.attachment);
              const isImg = /\.(png|jpe?g|gif|webp)$/i.test(ticket.attachment);
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
                      <img src={attUrl} alt="Attachment preview" style={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain', display: 'block', background: 'rgba(0,0,0,0.2)' }} />
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

          {/* Resolution note */}
          {ticket.statusDescription && (
            <div className="card" style={{ borderLeft: '3px solid var(--green-text)' }}>
              <h2 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color="var(--green-text)" /> Agent Note
              </h2>
              <p style={{ fontSize: '0.93rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {ticket.statusDescription}
              </p>
              {ticket.resolvedBy?.name && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  — {ticket.resolvedBy.name}
                  {ticket.statusUpdatedAt && ` · ${timeAgo(ticket.statusUpdatedAt)}`}
                </p>
              )}
            </div>
          )}

          {/* Status Timeline */}
          {ticket.ticketType !== 'feedback' && (
            <div className="card">
              <h2 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
                Status Timeline
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {STATUS_FLOW.map((step, idx) => {
                  const done   = idx <= currentStep;
                  const active = idx === currentStep;
                  const label  = step.replace('_', ' ');
                  return (
                    <React.Fragment key={step}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: idx < STATUS_FLOW.length - 1 ? '0 0 auto' : 1 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: done ? 'var(--brand-gradient)' : 'var(--bg-glass)',
                          border: `2px solid ${active ? 'var(--brand-color)' : done ? 'transparent' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: active ? 'var(--shadow-brand)' : 'none',
                          flexShrink: 0
                        }}>
                          {done ? <CheckCircle2 size={14} color="#fff" /> :
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)' }} />}
                        </div>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: active ? 700 : 400,
                          color: active ? 'var(--brand-color)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                          textTransform: 'capitalize', whiteSpace: 'nowrap'
                        }}>{label}</span>
                      </div>
                      {idx < STATUS_FLOW.length - 1 && (
                        <div style={{
                          flex: 1, height: 2, marginBottom: 22,
                          background: idx < currentStep ? 'var(--brand-gradient)' : 'var(--border)'
                        }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar: meta ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Submitter */}
          <div className="card card-sm">
            <h3 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} /> Submitted By
            </h3>
            <p style={{ fontWeight: 600, marginBottom: 2 }}>{ticket.createdBy?.name}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{ticket.createdBy?.email}</p>
            {ticket.orgInfo?.org_name && ticket.orgInfo.org_name !== 'N/A' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <Building2 size={12} /> {ticket.orgInfo.org_name}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="card card-sm">
            <h3 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
              Timestamps
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: Calendar, label: 'Submitted',     value: formatDate(ticket.createdAt) },
                { icon: Clock,    label: 'Last Updated',  value: formatDate(ticket.updatedAt) },
                ...(ticket.statusUpdatedAt ? [{ icon: CheckCircle2, label: 'Status Changed', value: formatDate(ticket.statusUpdatedAt) }] : [])
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <row.icon size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.label}</div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500 }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolved by */}
          {ticket.resolvedBy?.name && (
            <div className="card card-sm" style={{ borderLeft: '3px solid var(--green-text)' }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                Handled By
              </h3>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>{ticket.resolvedBy.name}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{ticket.resolvedBy.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
