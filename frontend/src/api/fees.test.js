
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFee,
  fetchFees,
  fetchStudents,
  recordFeePayment
} from './fees';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockResponse(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  });
}

describe('fees API', () => {
  it('fetches fee records with a status filter and credentials', async () => {
    globalThis.fetch = mockResponse(200, {
      success: true,
      data: [{ id: 'fee-1', status: 'Paid' }]
    });

    const result = await fetchFees('paid');

    expect(result).toEqual([{ id: 'fee-1', status: 'Paid' }]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/fees?status=paid'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('creates a fee with numeric amount', async () => {
    globalThis.fetch = mockResponse(201, {
      success: true,
      data: { id: 'fee-1', amountDue: 1000 }
    });

    await createFee({
      studentId: 'student-1',
      amountDue: '1000',
      dueDate: '2026-12-31'
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/fees'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          studentId: 'student-1',
          amountDue: 1000,
          dueDate: '2026-12-31'
        })
      })
    );
  });

  it('records a payment with a numeric amount and date', async () => {
    globalThis.fetch = mockResponse(200, {
      success: true,
      data: { id: 'fee-1', totalPaid: 250 }
    });

    await recordFeePayment('fee-1', {
      amount: '250',
      paidOn: '2026-10-28'
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/fees/fee-1/payments'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          amount: 250,
          paidOn: '2026-10-28'
        })
      })
    );
  });

  it('sends an encoded fee ID when recording a payment', async () => {
    globalThis.fetch = mockResponse(200, {
      success: true,
      data: {}
    });

    await recordFeePayment('fee/id', { amount: 10 });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/fees/fee%2Fid/payments'),
      expect.any(Object)
    );
  });

  it('shows a useful message when a duplicate fee is rejected', async () => {
    globalThis.fetch = mockResponse(409, {
      success: false,
      error: {
        code: 'FEE_EXISTS',
        message: 'Fee already exists'
      }
    });

    await expect(createFee({
      studentId: 'student-1',
      amountDue: 100,
      dueDate: '2026-12-31'
    })).rejects.toMatchObject({
      code: 'FEE_EXISTS',
      message: 'A fee record already exists for this student.'
    });
  });

  it('shows the overpayment error returned by the API', async () => {
    globalThis.fetch = mockResponse(400, {
      success: false,
      error: {
        code: 'PAYMENT_EXCEEDS_BALANCE',
        message: 'Too much'
      }
    });

    await expect(recordFeePayment('fee-1', { amount: 9999 }))
      .rejects.toMatchObject({
        code: 'PAYMENT_EXCEEDS_BALANCE',
        message: 'Payment exceeds the outstanding balance.'
      });
  });

  it('loads students using the authenticated session', async () => {
    globalThis.fetch = mockResponse(200, {
      success: true,
      data: [{ id: 'student-1', name: 'Test Student' }]
    });

    await expect(fetchStudents()).resolves.toEqual([
      { id: 'student-1', name: 'Test Student' }
    ]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/students'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('reports network failures clearly', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('offline'));

    await expect(fetchFees()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.'
    });
  });
});
