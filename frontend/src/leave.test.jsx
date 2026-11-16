import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { fetchMyLeaves, submitLeave } from './api/leaves';
import { formatLeaveDate, validateLeave } from './leaveFormat';
import { LeaveList, LeavePage } from './pages/LeavePage';

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('leave API helpers', () => {
  it('loads my leave requests with the session cookie', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [{ id: 'l1', startDate: '2026-11-01', endDate: '2026-11-05', reason: 'Family function', status: 'Pending' }] });

    const leaves = await fetchMyLeaves({ fetchImpl });

    expect(leaves).toHaveLength(1);
    expect(fetchImpl.mock.calls[0][0]).toMatch(/\/api\/leaves\/mine$/);
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('include');
  });

  it('submits a leave request and returns the created record', async () => {
    const created = { id: 'l2', startDate: '2026-11-01', endDate: '2026-11-01', reason: 'Exam', status: 'Pending' };
    const fetchImpl = fakeFetch(201, { success: true, data: created });

    const result = await submitLeave({ startDate: '2026-11-01', endDate: '2026-11-01', reason: 'Exam' }, { fetchImpl });

    expect(result).toEqual(created);
    expect(fetchImpl.mock.calls[0][0]).toMatch(/\/api\/leaves$/);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ startDate: '2026-11-01', endDate: '2026-11-01', reason: 'Exam' });
  });

  it('shows the server validation message', async () => {
    const fetchImpl = fakeFetch(400, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Reason is required' } });

    await expect(submitLeave({ startDate: '2026-11-01', endDate: '2026-11-02', reason: '' }, { fetchImpl })).rejects.toThrow('Reason is required');
  });

  it('reports an expired session', async () => {
    const fetchImpl = fakeFetch(401, { success: false, error: { code: 'SESSION_EXPIRED' } });

    await expect(fetchMyLeaves({ fetchImpl })).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('reports a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('offline'));

    await expect(fetchMyLeaves({ fetchImpl })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('leave form rules', () => {
  it('accepts a valid range and a one-day leave', () => {
    expect(validateLeave({ startDate: '2026-11-01', endDate: '2026-11-05', reason: 'Trip' })).toEqual({});
    expect(validateLeave({ startDate: '2026-11-01', endDate: '2026-11-01', reason: 'Trip' })).toEqual({});
  });

  it('rejects missing fields and a reversed range', () => {
    expect(validateLeave({ startDate: '', endDate: '', reason: '  ' })).toEqual({
      startDate: 'Start date is required',
      endDate: 'End date is required',
      reason: 'Reason is required',
    });
    expect(validateLeave({ startDate: '2026-11-05', endDate: '2026-11-01', reason: 'Trip' }).endDate)
      .toBe('End date cannot be before start date');
  });

  it('formats dates without a time zone shift', () => {
    expect(formatLeaveDate('2026-11-01')).toBe('1 Nov 2026');
    expect(formatLeaveDate(null)).toBe('—');
  });
});

describe('LeaveList and LeavePage', () => {
  it('shows an empty message when there are no requests', () => {
    expect(renderToStaticMarkup(<LeaveList leaves={[]} />)).toContain('No leave requests yet');
  });

  it('renders each request with its dates, reason and status', () => {
    const html = renderToStaticMarkup(
      <LeaveList leaves={[{ id: 'l1', startDate: '2026-11-01', endDate: '2026-11-05', reason: 'Family function', status: 'Approved', createdAt: '2026-10-20T09:30:00.000Z', decidedAt: '2026-10-21T10:00:00.000Z' }]} />,
    );

    expect(html).toContain('Family function');
    expect(html).toContain('Approved');
    expect(html).toContain('1 Nov 2026');
    expect(html).toContain('Decided');
  });

  it('renders the request form for a student', () => {
    const html = renderToStaticMarkup(<LeavePage role="student" />);

    expect(html).toContain('Request leave');
    expect(html).toContain('Start date');
    expect(html).toContain('Reason');
  });

  it('does not render the student form for an admin', () => {
    const html = renderToStaticMarkup(<LeavePage role="admin" />);

    expect(html).not.toContain('Request leave');
  });
});
