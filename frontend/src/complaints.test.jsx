import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { fetchMyComplaints, submitComplaint } from './api/complaints';
import { ComplaintError, ComplaintsPage } from './pages/ComplaintsPage';

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('complaint API helpers', () => {
  it('loads the current student complaint list with the session cookie', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [{ id: 'c1', category: 'Electrical', description: 'Broken fan', status: 'Open', remarks: null, createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z' }] });

    const complaints = await fetchMyComplaints({ fetchImpl });

    expect(complaints).toHaveLength(1);
    expect(fetchImpl.mock.calls[0][0]).toMatch(/\/api\/complaints\/mine$/);
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('include');
  });

  it('submits a complaint and returns the created record', async () => {
    const created = { id: 'c2', category: 'Plumbing', description: 'Leaking tap', status: 'Open' };
    const fetchImpl = fakeFetch(201, { success: true, data: created });

    const result = await submitComplaint({ category: 'Plumbing', description: 'Leaking tap' }, { fetchImpl });

    expect(result).toEqual(created);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ category: 'Plumbing', description: 'Leaking tap' });
  });

  it('reports the duplicate complaint message clearly', async () => {
    const fetchImpl = fakeFetch(409, {
      success: false,
      error: { code: 'COMPLAINT_CATEGORY_OPEN', message: 'You already have an open complaint in this category' },
    });

    await expect(submitComplaint({ category: 'Electrical', description: 'Broken light' }, { fetchImpl })).rejects.toThrow('open complaint');
  });
});

describe('ComplaintsPage', () => {
  it('renders a load failure in the complaints card', () => {
    const html = renderToStaticMarkup(
      <ComplaintError title="Could not load complaints" message="Request failed" />,
    );

    expect(html).toContain('Could not load complaints');
  });

  it('renders submit failures with the submit error title', () => {
    const html = renderToStaticMarkup(
      <ComplaintError title="Could not submit complaint" message="Request failed" />,
    );

    expect(html).toContain('Could not submit complaint');
  });

  it('renders exactly the contract complaint categories', () => {
    const html = renderToStaticMarkup(<ComplaintsPage role="student" />);
    expect(html).toContain('Raise a complaint');
    expect(html).toContain('Your complaints');
    expect(html).toContain('name="category"');
    expect(html).toContain('name="description"');
    expect(html.match(/<option\b/g)).toHaveLength(3);
    expect(html).toContain('>Electrical</option>');
    expect(html).toContain('>Plumbing</option>');
    expect(html).toContain('>Furniture</option>');
    expect(html).not.toContain('>Other</option>');
  });
});
