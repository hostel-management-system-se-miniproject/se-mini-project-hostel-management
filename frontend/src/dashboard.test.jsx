import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchStudentDashboard } from './api/dashboard';
import { DashboardView, formatDueDate, formatMoney } from './pages/StudentDashboardPage';

const student = {
  usn: 'PES1UG24CS001',
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  phone: '9876543210',
};

const dashboard = {
  student,
  room: { roomNo: 'A-205', block: 'A', floor: 2, sharingType: 'Triple' },
  fee: {
    amountDue: 50000,
    dueDate: '2026-11-30',
    totalPaid: 25000,
    balance: 25000,
    status: 'Partially Paid',
  },
  complaints: { open: 2, total: 5 },
  leaves: { pending: 1, total: 3 },
};

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('student dashboard API', () => {
  it('builds the encoded URL, sends credentials and returns data', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: dashboard });
    await expect(fetchStudentDashboard('PES 1/UG', { fetchImpl })).resolves.toEqual(dashboard);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/students/PES%201%2FUG/dashboard');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('maps response and network failures to safe messages', async () => {
    const cases = [
      [401, 'Your session has expired. Please log in again.', 'SESSION_EXPIRED'],
      [403, 'You can only view your own dashboard.', 'FORBIDDEN'],
      [404, 'Your student record could not be found.', 'NOT_FOUND'],
      [500, 'Something went wrong. Please try again.', 'REQUEST_FAILED'],
    ];
    for (const [status, message, code] of cases) {
      await expect(fetchStudentDashboard(student.usn, {
        fetchImpl: fakeFetch(status, { success: false }),
      })).rejects.toMatchObject({ message, code });
    }
    await expect(fetchStudentDashboard(student.usn, {
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('network')),
    })).rejects.toMatchObject({
      message: 'Could not reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
    });
  });
});

describe('student dashboard formatting', () => {
  it('formats due dates without timezone shifts and formats Indian currency', () => {
    expect(formatDueDate('2026-11-30')).toBe('30 Nov 2026');
    expect(formatMoney(50000)).toBe('₹50,000');
    expect(formatMoney(0)).toBe('₹0');
    expect(formatMoney(125000)).toBe('₹1,25,000');
  });
});

describe('student dashboard view', () => {
  it('renders profile, room, fee, complaint and leave details', () => {
    const markup = renderToStaticMarkup(<DashboardView data={dashboard} />);
    for (const text of [
      'Ravi Kumar', student.usn, student.email, student.phone,
      'Room A-205', 'Block', 'A', 'Floor', '2', 'Triple',
      'Amount due', '₹50,000', 'Paid', '₹25,000', 'Balance',
      '30 Nov 2026', 'Partially Paid', '2 open of 5 total', '1 pending of 3 total',
    ]) {
      expect(markup).toContain(text);
    }
  });

  it('renders empty room and fee states', () => {
    const markup = renderToStaticMarkup(
      <DashboardView data={{ ...dashboard, room: null, fee: null }} />,
    );
    expect(markup).toContain('No room allocated yet. The hostel office will allocate one.');
    expect(markup).toContain('No fee record yet.');
  });

  it.each([
    ['Due', '₹25,000'],
    ['Partially Paid', '₹25,000'],
    ['Paid', '₹0'],
  ])('renders %s status as text with its balance', (status, balance) => {
    const markup = renderToStaticMarkup(
      <DashboardView data={{ ...dashboard, fee: { ...dashboard.fee, status, balance: status === 'Paid' ? 0 : 25000 } }} />,
    );
    expect(markup).toContain(status);
    expect(markup).toContain(balance);
  });
});
