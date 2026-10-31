// Helpers for showing a student's fee. The fee endpoint and the dashboard use slightly
// different status words, so the student pages show one set of names.

const STATUS_NAMES = {
  Pending: 'Due',
  Due: 'Due',
  Partial: 'Partially Paid',
  'Partially Paid': 'Partially Paid',
  Paid: 'Paid',
  Overdue: 'Overdue',
};

export function normalizeFeeStatus(status) {
  return STATUS_NAMES[status] ?? String(status ?? 'Due');
}

export function feeStatusClass(status) {
  return `pill pill-${normalizeFeeStatus(status).toLowerCase().replace(/\s+/g, '-')}`;
}

export function formatRupees(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `₹${number.toLocaleString('en-IN')}`;
}

export function formatFeeDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

// Newest payment first.
export function sortPayments(payments = []) {
  return [...payments].sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn));
}
