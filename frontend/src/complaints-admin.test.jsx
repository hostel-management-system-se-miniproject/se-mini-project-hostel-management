import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchComplaints, updateComplaint } from './api/complaints';
import { formatDateTime, validateStatusUpdate } from './complaintFormat';
import { AdminComplaintList } from './pages/AdminComplaintsPage';
import { ComplaintList } from './pages/ComplaintsPage';

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

const complaint = {
  id: 'c1',
  category: 'Electrical',
  description: 'Fan not working',
  status: 'Open',
  remarks: null,
  usn: 'PES1UG24CS001',
  studentName: 'Asha Rao',
  createdAt: '2026-10-20T09:30:00.000Z',
  updatedAt: '2026-10-20T09:30:00.000Z',
};

describe('validateStatusUpdate (mirrors PUT /api/complaints/{id})', () => {
  it('accepts an allowed status with remarks', () => {
    expect(validateStatusUpdate({ status: 'Resolved', remarks: 'Fixed the fan' })).toEqual({});
  });

  it('requires remarks for every status, including Rejected', () => {
    for (const status of ['In Progress', 'Resolved', 'Rejected']) {
      expect(validateStatusUpdate({ status, remarks: '   ' }).remarks).toBe('Remarks are required');
    }
  });

  it('rejects Open and unknown statuses', () => {
    expect(validateStatusUpdate({ status: 'Open', remarks: 'x' }).status).toBeTruthy();
    expect(validateStatusUpdate({ status: 'Done', remarks: 'x' }).status).toBeTruthy();
  });
});

describe('complaint admin API helpers', () => {
  it('sends status and remarks as a PUT with the session cookie', async () => {
    const updated = { ...complaint, status: 'Resolved', remarks: 'Fixed' };
    const fetchImpl = fakeFetch(200, { success: true, data: updated });

    const result = await updateComplaint('c1', { status: 'Resolved', remarks: 'Fixed' }, { fetchImpl });

    expect(result.status).toBe('Resolved');
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/api\/complaints\/c1$/);
    expect(options.method).toBe('PUT');
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body)).toEqual({ status: 'Resolved', remarks: 'Fixed' });
  });

  it('shows the server message for 400, a clear message for 403 and 404', async () => {
    const invalid = fakeFetch(400, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Remarks are required' } });
    await expect(updateComplaint('c1', { status: 'Resolved', remarks: '' }, { fetchImpl: invalid })).rejects.toThrow('Remarks are required');

    const forbidden = fakeFetch(403, { success: false, error: { code: 'FORBIDDEN' } });
    await expect(updateComplaint('c1', { status: 'Resolved', remarks: 'x' }, { fetchImpl: forbidden })).rejects.toThrow('permission');

    const missing = fakeFetch(404, { success: false, error: { code: 'NOT_FOUND' } });
    await expect(updateComplaint('c1', { status: 'Resolved', remarks: 'x' }, { fetchImpl: missing })).rejects.toThrow('could not be found');
  });

  it('sends the status and category filters when listing', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [complaint] });
    await fetchComplaints({ status: 'Open', category: 'Electrical' }, { fetchImpl });

    expect(fetchImpl.mock.calls[0][0]).toMatch(/\/api\/complaints\?status=Open&category=Electrical$/);
  });
});

describe('AdminComplaintList', () => {
  it('shows student, category, status, description and an update form for each complaint', () => {
    const html = renderToStaticMarkup(<AdminComplaintList complaints={[complaint]} filtered={false} onUpdated={() => {}} />);

    expect(html).toContain('Asha Rao');
    expect(html).toContain('PES1UG24CS001');
    expect(html).toContain('Electrical');
    expect(html).toContain('Fan not working');
    expect(html).toContain('Remarks (required)');
    expect(html).toContain('Resolved');
    expect(html).toContain('Rejected');
  });

  it('shows a clear empty message, different for filtered and unfiltered lists', () => {
    const filteredHtml = renderToStaticMarkup(<AdminComplaintList complaints={[]} filtered onUpdated={() => {}} />);
    const emptyHtml = renderToStaticMarkup(<AdminComplaintList complaints={[]} filtered={false} onUpdated={() => {}} />);

    expect(filteredHtml).toContain('No complaints match these filters');
    expect(emptyHtml).toContain('No complaints have been submitted yet');
  });
});

describe('student complaint history (IT-08)', () => {
  it('lists each status change with remarks and a date and time', () => {
    const withHistory = {
      ...complaint,
      status: 'Resolved',
      remarks: 'Fan replaced',
      history: [
        { status: 'Open', remarks: null, at: '2026-10-20T09:30:00.000Z' },
        { status: 'In Progress', remarks: 'Electrician assigned', at: '2026-10-21T10:00:00.000Z' },
        { status: 'Resolved', remarks: 'Fan replaced', at: '2026-10-22T11:15:00.000Z' },
      ],
    };
    const html = renderToStaticMarkup(<ComplaintList complaints={[withHistory]} />);

    expect(html).toContain('Status history');
    expect(html).toContain('Electrician assigned');
    expect(html).toContain('Fan replaced');
    expect(html).toContain(formatDateTime('2026-10-21T10:00:00.000Z'));
    expect(html).toMatch(/\d{1,2}:\d{2}/);
  });

  it('still renders a complaint that has no history', () => {
    const html = renderToStaticMarkup(<ComplaintList complaints={[complaint]} />);
    expect(html).toContain('Fan not working');
    expect(html).not.toContain('Status history');
  });
});
