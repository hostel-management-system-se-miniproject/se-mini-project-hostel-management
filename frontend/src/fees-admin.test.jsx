import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeeTable, FeesPage, displayDate, money } from './pages/FeesPage';

const fees = [
  {
    id: 'fee-1',
    studentName: 'Asha Rao',
    usn: 'PES1UG24CS001',
    amountDue: 50000,
    totalPaid: 20000,
    balance: 30000,
    dueDate: '2026-11-30T00:00:00.000Z',
    status: 'Partial',
    payments: [{ amount: 20000, paidOn: '2026-10-20T00:00:00.000Z' }],
  },
  {
    id: 'fee-2',
    studentName: 'Ravi Kumar',
    usn: 'PES1UG24CS002',
    amountDue: 10000,
    totalPaid: 10000,
    balance: 0,
    dueDate: '2026-10-01T00:00:00.000Z',
    status: 'Paid',
    payments: [],
  },
  {
    id: 'fee-3',
    studentName: null,
    usn: null,
    amountDue: 8000,
    totalPaid: 0,
    balance: 8000,
    dueDate: '2026-09-01T00:00:00.000Z',
    status: 'Overdue',
    payments: [],
  },
];

function table(props = {}) {
  return renderToStaticMarkup(
    <FeeTable
      fees={fees}
      onToggle={() => {}}
      onAmountChange={() => {}}
      onDateChange={() => {}}
      onPayment={() => {}}
      {...props}
    />
  );
}

describe('fee table (admin)', () => {
  it('lists each fee with amounts, due date and a status pill', () => {
    const markup = table();
    expect(markup).toContain('Asha Rao');
    expect(markup).toContain('PES1UG24CS001');
    expect(markup).toContain('₹50,000.00');
    expect(markup).toContain('₹30,000.00');
    expect(markup).toContain('Partially Paid');
    expect(markup).toContain('pill-partially-paid');
    expect(markup).toContain('pill-paid');
  });

  it('shows the Overdue status with its own style (D-16, D-20)', () => {
    const markup = table();
    expect(markup).toContain('pill-overdue');
    expect(markup).toContain('>Overdue<');
  });

  it('shows "Unknown student" when the record has no student name', () => {
    expect(table()).toContain('Unknown student');
  });

  it('keeps history closed until a row is expanded', () => {
    const markup = table();
    expect(markup).not.toContain('Payment history');
    expect(markup).toContain('>History<');
  });

  it('expands one row to show its payments and the payment form for a balance', () => {
    const markup = table({ expandedId: 'fee-1' });
    expect(markup).toContain('Hide history');
    expect(markup).toContain('Payment history');
    expect(markup).toContain('₹20,000.00');
    expect(markup).toContain('Record payment');
    expect(markup).toContain('max="30000"');
  });

  it('says a fully paid fee is fully paid and shows no payment form', () => {
    const markup = table({ expandedId: 'fee-2' });
    expect(markup).toContain('No payments recorded yet.');
    expect(markup).toContain('This fee is fully paid.');
    expect(markup).not.toContain('Record payment');
  });

  it('fills the payment form from the typed values and disables the button while saving', () => {
    const markup = table({
      expandedId: 'fee-3',
      paymentAmounts: { 'fee-3': '500' },
      paymentDates: { 'fee-3': '2026-11-02' },
      submitting: true,
    });
    expect(markup).toContain('value="500"');
    expect(markup).toContain('value="2026-11-02"');
    expect(markup).toContain('disabled=""');
  });

  it('treats a missing payments list like an empty one', () => {
    const noPayments = [{ ...fees[0], payments: undefined }];
    expect(table({ fees: noPayments, expandedId: 'fee-1' })).toContain('No payments recorded yet.');
  });
});

describe('fee page', () => {
  it('shows the create form, the status filter and a loading state first', () => {
    const markup = renderToStaticMarkup(<FeesPage />);
    expect(markup).toContain('Fee management');
    expect(markup).toContain('Create fee record');
    expect(markup).toContain('Choose a student');
    expect(markup).toContain('Filter by status');
    for (const label of ['All statuses', 'Due', 'Partially paid', 'Paid', 'Overdue']) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('Loading fee records');
  });
});

describe('fee page formatting', () => {
  it('formats rupees and dates, and shows a dash for a missing or bad date', () => {
    expect(money(1234.5)).toContain('1,234.50');
    expect(money('abc')).toContain('0.00');
    expect(displayDate('2026-11-30T00:00:00.000Z')).toMatch(/2026/);
    expect(displayDate(null)).toBe('—');
    expect(displayDate('not a date')).toBe('—');
  });
});
