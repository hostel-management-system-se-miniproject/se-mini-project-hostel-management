import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchStudentFee } from './api/studentFees';
import { formatRupees, normalizeFeeStatus, sortPayments } from './feeFormat';
import { FeeDetails, PaymentHistory } from './pages/StudentFeesPage';
import { RecentPayments } from './components/FeeHistoryMini';
import { NAV_ITEMS, filterMenuItemsByRole } from './navigation';

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

const fee = {
  usn: 'PES1UG24CS001',
  studentName: 'Asha Rao',
  amountDue: 50000,
  totalPaid: 20000,
  balance: 30000,
  dueDate: '2026-11-30T00:00:00.000Z',
  status: 'Partial',
  payments: [
    { amount: 12000, paidOn: '2026-10-05T00:00:00.000Z' },
    { amount: 8000, paidOn: '2026-10-20T00:00:00.000Z' },
  ],
};

describe('fetchStudentFee (GET /api/fees/{usn})', () => {
  it('requests the USN with the session cookie and returns the fee', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: fee });
    const result = await fetchStudentFee('PES1UG24CS001', { fetchImpl });

    expect(result.balance).toBe(30000);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/api\/fees\/PES1UG24CS001$/);
    expect(options.credentials).toBe('include');
  });

  it('returns null when the student has no fee record (404 NOT_FOUND)', async () => {
    const fetchImpl = fakeFetch(404, { success: false, error: { code: 'NOT_FOUND' } });
    expect(await fetchStudentFee('PES1UG24CS003', { fetchImpl })).toBeNull();
  });

  it('shows a clear message for 403, 401 and a network failure', async () => {
    await expect(fetchStudentFee('PES1UG24CS002', { fetchImpl: fakeFetch(403, { success: false }) })).rejects.toThrow('only view your own');
    await expect(fetchStudentFee('PES1UG24CS001', { fetchImpl: fakeFetch(401, { success: false }) })).rejects.toThrow('session has expired');
    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchStudentFee('PES1UG24CS001', { fetchImpl: down })).rejects.toThrow('Could not reach the server');
  });
});

describe('fee formatting', () => {
  it('uses one set of status names for both endpoints', () => {
    expect(normalizeFeeStatus('Pending')).toBe('Due');
    expect(normalizeFeeStatus('Partial')).toBe('Partially Paid');
    expect(normalizeFeeStatus('Partially Paid')).toBe('Partially Paid');
    expect(normalizeFeeStatus('Paid')).toBe('Paid');
  });

  it('formats rupees and sorts payments newest first', () => {
    expect(formatRupees(30000)).toBe('₹30,000');
    expect(sortPayments(fee.payments).map((payment) => payment.amount)).toEqual([8000, 12000]);
  });
});

describe('student fee page content', () => {
  it('shows status, amount due, paid, balance, due date and the payment history', () => {
    const html = renderToStaticMarkup(<FeeDetails fee={fee} />);

    expect(html).toContain('Partially Paid');
    expect(html).toContain('₹50,000');
    expect(html).toContain('₹20,000');
    expect(html).toContain('₹30,000');
    expect(html).toContain('30 Nov 2026');
    expect(html).toContain('Payment history');
    expect(html).toContain('₹12,000');
    expect(html).toContain('₹8,000');
  });

  it('shows a clear message when the student has no fee record', () => {
    const html = renderToStaticMarkup(<FeeDetails fee={null} />);

    expect(html).toContain('No fee record has been created for you yet');
    expect(html).not.toContain('<table');
  });

  it('says so when a fee has no payments yet', () => {
    const html = renderToStaticMarkup(<PaymentHistory payments={[]} />);
    expect(html).toContain('No payments recorded yet');
  });

  it('shows a Paid fee with zero balance', () => {
    const html = renderToStaticMarkup(<FeeDetails fee={{ ...fee, totalPaid: 50000, balance: 0, status: 'Paid' }} />);
    expect(html).toContain('Paid');
    expect(html).toContain('₹0');
  });
});

describe('dashboard payment list and navigation', () => {
  it('shows only the three latest payments on the dashboard', () => {
    const many = [1, 2, 3, 4].map((day) => ({ amount: day * 1000, paidOn: `2026-10-0${day}T00:00:00.000Z` }));
    const html = renderToStaticMarkup(<RecentPayments payments={many} />);

    expect(html).toContain('₹4,000');
    expect(html).toContain('₹2,000');
    expect(html).not.toContain('₹1,000');
  });

  it('gives students a Fees menu item', () => {
    const labels = filterMenuItemsByRole(NAV_ITEMS, 'student').map((item) => item.label);
    expect(labels).toContain('Fees');
  });
});
