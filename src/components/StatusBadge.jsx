/**
 * StatusBadge.jsx — Reusable ticket status / priority / type badge
 */
import React from 'react';
import { STATUS_META, PRIORITY_META, TYPE_META } from '../utils/helpers';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'slate' };
  return (
    <span className={`badge badge-${meta.color}`}>
      ● {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || { label: priority, color: 'slate' };
  return (
    <span className={`badge badge-${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function TypeBadge({ type }) {
  const meta = TYPE_META[type] || { label: type, emoji: '📋' };
  return (
    <span className="badge badge-slate">
      {meta.emoji} {meta.label}
    </span>
  );
}
