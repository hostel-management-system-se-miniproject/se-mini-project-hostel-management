import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { decideLeave, fetchLeaves } from './api/leaves';
import { AdminLeaveList } from './pages/AdminLeavePage';

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

const pending = {
  id: 'l1', studentName: 'Asha Rao', usn: 'PES1UG24CS001', startDate: '2026-11-01', endDate: '2026-11-05',
  reason: 'Family function', status: 'Pending', createdAt: '2026-10-20T09:00:00.000Z', decidedAt: null,
};
const approved = { ...pending, id: 'l2', status: 'Approved', decidedAt: '2026-10-21T10:00:00.000Z' };

describe('fetchLeaves (GET /api/leaves)', () => {
  it('lists with the session cookie and sends the status filter', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [pending] });
    const result = await fetchLeaves({ status: 'Pending' }, { fetchImpl });

    expect(result).toHaveLength(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/api\/leaves\?status=Pending$/);
    expect(options.credentials).toBe('include');
  });

  it('sends no query string when there is no filter', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [] });
    await fetchLeaves({}, { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toMatch(/\/api\/leaves$/);
  });

  it('gives a clear message for 403', async () => {
    await expect(fetchLeaves({}, { fetchImpl: fakeFetch(403, { success: false }) })).rejects.toThrow('permission');
  });
});

describe('decideLeave (PUT /api/leaves/{id}/decision)', () => {
  it('sends the decision as a PUT and returns the new status', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: { id: 'l1', status: 'Approved', decidedAt: '2026-10-21T10:00:00.000Z' } });
    const result = await decideLeave('l1', 'Approved', { fetchImpl });

    expect(result.status).toBe('Approved');
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/api\/leaves\/l1\/decision$/);
    expect(options.method).toBe('PUT');
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body)).toEqual({ decision: 'Approved' });
  });

  it('explains 409 ALREADY_DECIDED, 404 and 403 in plain words', async () => {
    const conflict = fakeFetch(409, { success: false, error: { code: 'ALREADY_DECIDED' } });
    await expect(decideLeave('l1', 'Rejected', { fetchImpl: conflict })).rejects.toMatchObject({ code: 'ALREADY_DECIDED' });
    await expect(decideLeave('l1', 'Rejected', { fetchImpl: conflict })).rejects.toThrow('already been decided');

    await expect(decideLeave('l1', 'Approved', { fetchImpl: fakeFetch(404, { success: false }) })).rejects.toThrow('could not be found');
    await expect(decideLeave('l1', 'Approved', { fetchImpl: fakeFetch(403, { success: false }) })).rejects.toThrow('permission');
  });

  it('reports a network failure', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(decideLeave('l1', 'Approved', { fetchImpl: down })).rejects.toThrow('Could not reach the server');
  });
});

describe('AdminLeaveList', () => {
  it('shows the student, dates, reason, status and Approve and Reject for a Pending request', () => {
    const html = renderToStaticMarkup(<AdminLeaveList leaves={[pending]} filtered={false} onDecide={() => {}} />);

    expect(html).toContain('Asha Rao');
    expect(html).toContain('PES1UG24CS001');
    expect(html).toContain('1 Nov 2026 to 5 Nov 2026');
    expect(html).toContain('Family function');
    expect(html).toContain('Pending');
    expect(html).toContain('>Approve<');
    expect(html).toContain('>Reject<');
  });

  it('hides Approve and Reject once a request has been decided', () => {
    const html = renderToStaticMarkup(<AdminLeaveList leaves={[approved]} filtered={false} onDecide={() => {}} />);

    expect(html).toContain('Approved');
    expect(html).not.toContain('>Approve<');
    expect(html).not.toContain('>Reject<');
  });

  it('shows a row-level error message next to the buttons', () => {
    const html = renderToStaticMarkup(
      <AdminLeaveList leaves={[pending]} filtered={false} onDecide={() => {}} errors={{ l1: 'This request has already been decided.' }} />,
    );
    expect(html).toContain('already been decided');
  });

  it('shows a clear message when there is nothing to list', () => {
    const filtered = renderToStaticMarkup(<AdminLeaveList leaves={[]} filtered onDecide={() => {}} />);
    const empty = renderToStaticMarkup(<AdminLeaveList leaves={[]} filtered={false} onDecide={() => {}} />);

    expect(filtered).toContain('No leave requests match this filter');
    expect(empty).toContain('No leave requests have been submitted yet');
  });
});
