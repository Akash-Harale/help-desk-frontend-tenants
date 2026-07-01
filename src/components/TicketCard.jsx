/**
 * TicketCard.jsx — Compact ticket summary card for the list view
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Paperclip } from 'lucide-react';
import { StatusBadge, PriorityBadge, TypeBadge } from './StatusBadge';
import { timeAgo, truncate } from '../utils/helpers';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  return (
    <div
      className="card card-sm"
      onClick={() => navigate(`/tickets/${ticket._id}`)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'all 0.18s ease',
        borderLeft: `3px solid var(--brand-color-muted)`
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderLeftColor = 'var(--brand-color)';
        e.currentTarget.style.transform = 'translateX(3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderLeftColor = 'var(--brand-color-muted)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              #{ticket.ticketNumber}
            </span>
            <TypeBadge type={ticket.ticketType} />
            {ticket.ticketType !== 'feedback' && <PriorityBadge priority={ticket.priority} />}
          </div>
          <h3 style={{
            fontSize: '0.97rem', fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {ticket.subject}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {truncate(ticket.description, 90)}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {ticket.ticketType !== 'feedback' && <StatusBadge status={ticket.status} />}
          <ChevronRight size={16} color="var(--text-muted)" />
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        fontSize: '0.78rem', color: 'var(--text-muted)',
        flexWrap: 'wrap'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} /> {timeAgo(ticket.createdAt)}
        </span>
        {ticket.attachment && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Paperclip size={12} /> Attachment
          </span>
        )}
        {ticket.statusDescription && (
          <span style={{ color: 'var(--green-text)', fontStyle: 'italic' }}>
            Note: {truncate(ticket.statusDescription, 40)}
          </span>
        )}
      </div>
    </div>
  );
}
