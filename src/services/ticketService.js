/**
 * ticketService.js — All ticket-related API calls
 *
 * Uses the shared `api` axios instance which already carries the app_key
 * header and user JWT on every request.
 */
import api from './api';

/**
 * Create a new support ticket.
 * Uses multipart/form-data to support optional file attachment.
 *
 * @param {object} payload
 * @param {string} payload.subject
 * @param {string} payload.description
 * @param {'issue'|'feedback'} payload.ticketType
 * @param {'low'|'medium'|'high'} payload.priority
 * @param {object} payload.createdBy  - { name, email }
 * @param {object} payload.orgInfo    - { org_name }
 * @param {File|null} payload.attachment
 */
export const createTicket = async (payload) => {
  const formData = new FormData();

  formData.append('subject',     payload.subject);
  formData.append('description', payload.description);
  formData.append('ticketType',  payload.ticketType);
  formData.append('priority',    payload.priority || 'low');

  // Inline user info
  formData.append('createdBy', JSON.stringify(payload.createdBy));
  formData.append('orgInfo',   JSON.stringify(payload.orgInfo || {}));

  if (payload.attachment) {
    formData.append('attachment', payload.attachment);
  }

  const { data } = await api.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

/**
 * Fetch list of tickets for the authenticated tenant/user.
 * Supports optional filter query params.
 *
 * @param {object} filters - { status, priority, type, search, startDate, endDate, user_id, is_admin }
 */
export const getTickets = async (filters = {}) => {
  const params = {};
  if (filters.status)    params.status    = filters.status;
  if (filters.priority)  params.priority  = filters.priority;
  if (filters.type)      params.type      = filters.type;
  if (filters.search)    params.search    = filters.search;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate)   params.endDate   = filters.endDate;
  // User-scoping: pass user_id so backend can filter by createdBy.user_id
  if (filters.user_id)   params.user_id   = filters.user_id;
  // is_admin=true tells the backend to skip user-scoping (show all tenant tickets)
  if (filters.is_admin)  params.is_admin  = 'true';

  const { data } = await api.get('/tickets', { params });
  return data;
};

/**
 * Fetch aging report tickets up to date.
 */
export const getAgingReport = async (dateStr, is_admin = true) => {
  const params = { date: dateStr };
  if (is_admin) params.is_admin = 'true';
  const { data } = await api.get('/tickets/aging-report', { params });
  return data;
};

/**
 * Fetch a single ticket by its MongoDB ObjectId.
 */
export const getTicketById = async (id) => {
  const { data } = await api.get(`/tickets/${id}`);
  return data;
};

/**
 * Update a ticket's status (admin only).
 * Appends a comment entry to the ticket's comments array in the backend.
 *
 * @param {string} id          - Ticket MongoDB _id
 * @param {string} status      - New status: 'open' | 'in_progress' | 'resolved' | 'closed'
 * @param {string} comment     - Admin comment/reason (optional but tied to the status change)
 * @param {object} adminInfo   - { name, role } of the admin making the change
 */
export const updateTicketStatus = async (id, status, comment = '', adminInfo = {}) => {
  const payload = {
    status,
    comment,
    admin_name: adminInfo.name || '',
    admin_role: adminInfo.role || '',
    resolvedBy: JSON.stringify({
      admin_id: adminInfo.user_id || '',
      name:     adminInfo.name    || '',
      email:    adminInfo.email   || ''
    })
  };
  const { data } = await api.patch(`/tickets/${id}/status`, payload);
  return data;
};
