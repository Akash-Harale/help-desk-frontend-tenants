/**
 * helpers.js — Pure utility functions shared across the app
 */

/** Format ISO date string to "DD MMM YYYY, HH:MM" */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/** Short relative time, e.g. "3 days ago" */
export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Map ticket status → { label, color class suffix } */
export const STATUS_META = {
  open:        { label: 'Open',        color: 'blue'   },
  in_progress: { label: 'In Progress', color: 'amber'  },
  resolved:    { label: 'Resolved',    color: 'green'  },
  closed:      { label: 'Closed',      color: 'slate'  }
};

/** Map ticket priority → { label, color class suffix } */
export const PRIORITY_META = {
  low:    { label: 'Low',    color: 'slate' },
  medium: { label: 'Medium', color: 'amber' },
  high:   { label: 'High',   color: 'red'   }
};

/** Map ticket type → emoji + label */
export const TYPE_META = {
  issue:    { label: 'Issue',    emoji: '🐛' },
  feedback: { label: 'Feedback', emoji: '💬' }
};

/** Truncate a string to maxLen characters */
export function truncate(str, maxLen = 80) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/** Generate initials from a name string */
export function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}
