// Small helpers for the student leave page.

// Mirrors the server rules for POST /api/leaves (API contract endpoint 21).
export function validateLeave({ startDate, endDate, reason }) {
  const errors = {};
  if (!startDate) {
    errors.startDate = 'Start date is required';
  }
  if (!endDate) {
    errors.endDate = 'End date is required';
  }
  if (startDate && endDate && endDate < startDate) {
    errors.endDate = 'End date cannot be before start date';
  }
  if (!String(reason ?? '').trim()) {
    errors.reason = 'Reason is required';
  }
  return errors;
}

// Leave dates arrive as YYYY-MM-DD. Format without time zone shifts.
export function formatLeaveDate(value) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return String(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function leaveStatusClass(status) {
  return `complaint-status complaint-status-${String(status).toLowerCase().replace(/\s+/g, '-')}`;
}
