/**
 * UserIdentityModal.jsx
 *
 * A modal/drawer that captures the end-user's name, email, and org name
 * before they can submit or view tickets. Stored in UserContext + localStorage.
 * Shown automatically when `user` is null.
 */
import React, { useState } from 'react';
import { User, Mail, Building2, ArrowRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTenant } from '../context/TenantContext';

export default function UserIdentityModal() {
  const { setUser }  = useUser();
  const { theme, organization_name } = useTenant();

  const [form, setForm] = useState({ name: '', email: '', org_name: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setUser({
      name:     form.name.trim(),
      email:    form.email.trim().toLowerCase(),
      org_name: form.org_name.trim() || organization_name || 'N/A'
    });
  };

  const change = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: '' }));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--brand-gradient)',
            boxShadow: 'var(--shadow-brand)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <User size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome to {theme?.brand_name || organization_name || 'Help Desk'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {theme?.tagline || "We're here to help. Please tell us who you are."}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">
              <User size={11} style={{ display: 'inline', marginRight: 5 }} />
              Your Name *
            </label>
            <input
              id="user-name"
              type="text"
              className="form-input"
              placeholder="John Smith"
              value={form.name}
              onChange={change('name')}
              autoFocus
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">
              <Mail size={11} style={{ display: 'inline', marginRight: 5 }} />
              Email Address *
            </label>
            <input
              id="user-email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={form.email}
              onChange={change('email')}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          {/* Org */}
          <div className="form-group">
            <label className="form-label">
              <Building2 size={11} style={{ display: 'inline', marginRight: 5 }} />
              Organization / Department
            </label>
            <input
              id="user-org"
              type="text"
              className="form-input"
              placeholder="e.g. Engineering, Sales…"
              value={form.org_name}
              onChange={change('org_name')}
            />
          </div>

          <button type="submit" className="btn btn-brand btn-full btn-lg" style={{ marginTop: '0.5rem' }}>
            Continue to Help Desk
            <ArrowRight size={16} />
          </button>
        </form>

        {theme?.support_email && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Need urgent help? Email us at{' '}
            <a href={`mailto:${theme.support_email}`} style={{ color: 'var(--brand-color)' }}>
              {theme.support_email}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
