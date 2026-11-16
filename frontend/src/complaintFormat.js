// Small helpers shared by the student and admin complaint pages.

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function statusClass(status) {
  return `complaint-status complaint-status-${String(status).toLowerCase().replace(/\s+/g, '-')}`;
}

export const ADMIN_STATUSES = ['In Progress', 'Resolved', 'Rejected'];
export const FILTER_STATUSES = ['Open', 'In Progress', 'Resolved', 'Rejected'];
export const COMPLAINT_CATEGORIES = ['Electrical', 'Plumbing', 'Furniture'];

// Mirrors the server rules for PUT /api/complaints/{id} (API contract endpoint 20).
export function validateStatusUpdate({ status, remarks }) {
  const errors = {};
  if (!ADMIN_STATUSES.includes(status)) {
    errors.status = 'Choose In Progress, Resolved or Rejected';
  }
  if (!String(remarks ?? '').trim()) {
    errors.remarks = 'Remarks are required';
  }
  return errors;
}
