/**
 * SubmitTicketPage.jsx — End-user ticket submission form
 *
 * No separate login required — submitter name/email are collected
 * inline in the form. Values are remembered in localStorage so
 * returning users don't have to re-enter them.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Paperclip, X, ChevronDown, AlertCircle,
  CheckCircle2, RefreshCw, User, Mail, Building2
} from 'lucide-react';
import { createTicket } from '../services/ticketService';

const PRIORITIES = [
  { value: 'low',    label: '🟢 Low'    },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high',   label: '🔴 High'   }
];

const TYPES = [
  { value: 'issue',    label: '🐛 Issue — Something is broken or not working'  },
  { value: 'feedback', label: '💬 Feedback — Suggestion or general feedback'    }
];

const SUBMITTER_KEY = 'hd_submitter';

function readSubmitter() {
  try { return JSON.parse(localStorage.getItem(SUBMITTER_KEY) || 'null'); }
  catch { return null; }
}

const INITIAL_FORM = {
  subject: '', description: '', ticketType: 'issue', priority: 'medium'
};

export default function SubmitTicketPage() {
  const navigate = useNavigate();
  const fileRef  = useRef();

  // Submitter info — pre-filled from localStorage if available
  const saved = readSubmitter();
  const [submitter, setSubmitter] = useState({
    name:     saved?.name     || '',
    email:    saved?.email    || '',
    org_name: saved?.org_name || ''
  });

  const [form,       setForm]       = useState(INITIAL_FORM);
  const [attachment, setAttachment] = useState(null);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(null);
  const [apiError,   setApiError]   = useState('');

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!submitter.name.trim())  e.name        = 'Your name is required';
    if (!submitter.email.trim()) e.email       = 'Your email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter.email))
                                 e.email       = 'Enter a valid email';
    if (!form.subject.trim())    e.subject     = 'Subject is required';
    if (!form.description.trim()) e.description = 'Please describe your issue';
    return e;
  };

  // ── Field helpers ────────────────────────────────────────────────────────────
  const changeForm = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: '' }));
  };

  const changeSubmitter = (field) => (e) => {
    setSubmitter(s => ({ ...s, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: '' }));
  };

  // ── File pick ────────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setApiError('Attachment must be ≤ 5 MB'); return; }
    setAttachment(file);
    setApiError('');
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Persist submitter info for next visit
    localStorage.setItem(SUBMITTER_KEY, JSON.stringify(submitter));

    setSubmitting(true);
    setApiError('');
    try {
      const result = await createTicket({
        ...form,
        createdBy: {
          name:  submitter.name.trim(),
          email: submitter.email.trim().toLowerCase()
        },
        orgInfo: { org_name: submitter.org_name.trim() || 'N/A' },
        attachment
      });

      if (result.success) {
        setSubmitted(result.data);
        setForm(INITIAL_FORM);
        setAttachment(null);
      } else {
        setApiError(result.message || 'Failed to submit ticket.');
      }
    } catch (err) {
      setApiError(err.response?.data?.message || 'Cannot connect to backend. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="page-wrapper fade-up" style={{ maxWidth: 580, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--green-bg)', border: '2px solid var(--green-border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <CheckCircle2 size={36} color="var(--green-text)" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Ticket Submitted!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
            Ticket{' '}
            <strong style={{ color: 'var(--brand-color)' }}>
              #{submitted.ticketNumber}
            </strong>{' '}
            has been created. We'll respond to{' '}
            <strong>{submitted.createdBy?.email}</strong>.
          </p>

          {/* Summary card */}
          <div style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', padding: '1rem 1.5rem',
            textAlign: 'left', marginBottom: '1.75rem'
          }}>
            {[
              { label: 'Ticket #',   value: `#${submitted.ticketNumber}` },
              { label: 'Subject',    value: submitted.subject },
              { label: 'Priority',   value: submitted.priority },
              { label: 'Status',     value: submitted.status  }
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                fontSize: '0.88rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-brand" onClick={() => navigate(`/tickets/${submitted._id}`)}>
              View Ticket
            </button>
            <button className="btn btn-ghost" onClick={() => setSubmitted(null)}>
              Submit Another
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/tickets')}>
              All Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrapper fade-up" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          Submit a Ticket
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem' }}>
          Fill in the details below and our team will get back to you shortly.
        </p>
      </div>

      {apiError && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {apiError}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Submitter section ── */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{
              fontSize: '0.82rem', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <User size={13} /> Your Information
            </h2>

            <div className="grid-2">
              {/* Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="submitter-name">
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }} />
                  <input
                    id="submitter-name"
                    type="text"
                    className="form-input"
                    placeholder="John Smith"
                    value={submitter.name}
                    onChange={changeSubmitter('name')}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="submitter-email">
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }} />
                  <input
                    id="submitter-email"
                    type="email"
                    className="form-input"
                    placeholder="you@company.com"
                    value={submitter.email}
                    onChange={changeSubmitter('email')}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>
            </div>

            {/* Org / dept */}
            <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <label className="form-label" htmlFor="submitter-org">
                Organization / Department
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={14} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }} />
                <input
                  id="submitter-org"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Engineering, Sales, HR…"
                  value={submitter.org_name}
                  onChange={changeSubmitter('org_name')}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            {saved?.name && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                ✓ Details remembered from your last submission.{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--brand-color)', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
                  onClick={() => {
                    localStorage.removeItem(SUBMITTER_KEY);
                    setSubmitter({ name: '', email: '', org_name: '' });
                  }}
                >
                  Clear
                </button>
              </p>
            )}
          </div>

          <div className="divider" />

          {/* ── Ticket details section ── */}
          <h2 style={{
            fontSize: '0.82rem', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '1rem', marginTop: '0.25rem',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            🎫 Ticket Details
          </h2>

          {/* Ticket type */}
          <div className="form-group">
            <label className="form-label">Ticket Type *</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <label key={t.value} style={{
                  flex: 1, minWidth: 180,
                  padding: '0.85rem 1rem',
                  border: `2px solid ${form.ticketType === t.value ? 'var(--brand-color)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-sm)',
                  background: form.ticketType === t.value ? 'var(--brand-color-muted)' : 'var(--bg-glass)',
                  cursor: 'pointer', fontSize: '0.88rem',
                  fontWeight: form.ticketType === t.value ? 600 : 400,
                  color: form.ticketType === t.value ? 'var(--brand-color)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <input
                    type="radio" name="ticketType" value={t.value}
                    checked={form.ticketType === t.value}
                    onChange={changeForm('ticketType')}
                    style={{ display: 'none' }}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            {errors.ticketType && <p className="form-error">{errors.ticketType}</p>}
          </div>

          {/* Subject */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-subject">Subject *</label>
            <input
              id="ticket-subject"
              type="text"
              className="form-input"
              placeholder="Brief description of the issue"
              value={form.subject}
              onChange={changeForm('subject')}
              maxLength={120}
            />
            {errors.subject && <p className="form-error">{errors.subject}</p>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-description">Description *</label>
            <textarea
              id="ticket-description"
              className="form-textarea"
              placeholder="Please provide as much detail as possible — steps to reproduce, expected vs actual behaviour, error messages, etc."
              value={form.description}
              onChange={changeForm('description')}
              style={{ minHeight: 130 }}
            />
            {errors.description && <p className="form-error">{errors.description}</p>}
          </div>

          {/* Priority */}
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-priority">Priority</label>
            <div style={{ position: 'relative' }}>
              <select
                id="ticket-priority"
                className="form-select form-input"
                value={form.priority}
                onChange={changeForm('priority')}
                style={{ paddingRight: '2.5rem' }}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <ChevronDown size={16} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none', color: 'var(--text-muted)'
              }} />
            </div>
          </div>

          {/* Attachment */}
          <div className="form-group">
            <label className="form-label">Attachment (optional, max 5 MB)</label>
            <input
              ref={fileRef} type="file" id="ticket-file"
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.log"
              onChange={handleFile}
            />
            {attachment ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: '0.65rem 1rem',
                fontSize: '0.88rem'
              }}>
                <Paperclip size={14} color="var(--brand-color)" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attachment.name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {(attachment.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button" className="btn btn-ghost btn-sm"
                  onClick={() => { setAttachment(null); fileRef.current.value = ''; }}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileRef.current.click()}
                style={{ width: '100%', justifyContent: 'center', border: '1px dashed var(--border)' }}
              >
                <Paperclip size={15} /> Attach a file
              </button>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: '0.75rem' }}>
            <button type="submit" disabled={submitting} className="btn btn-brand btn-lg" style={{ flex: 1 }}>
              {submitting
                ? <><RefreshCw size={16} className="spin-icon" /> Submitting…</>
                : <><Send size={16} /> Submit Ticket</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
