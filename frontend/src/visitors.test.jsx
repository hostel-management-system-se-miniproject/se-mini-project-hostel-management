import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createVisitor,
  fetchVisitors,
  recordVisitorExit,
} from './api/visitors';
import {
  formatDateTime,
  applyExitResult,
  toIsoFromLocalInput,
  toLocalInputValue,
  VisitorForm,
  VisitorTable,
} from './pages/VisitorsPage';

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const entry = {
  usn: 'PES1UG24CS001',
  name: 'Ravi Kumar',
  contact: '9876543210',
  purpose: 'Meeting',
  entryTime: '2026-10-22T10:00:00.000Z',
};

describe('visitor API', () => {
  it('fetches visitors and sends credentials', async () => {
    const visitors = [{ id: 'v1', ...entry, studentName: 'Ravi', exitTime: null }];
    const fetchImpl = fakeFetch(200, { success: true, data: visitors });
    await expect(fetchVisitors({ fetchImpl })).resolves.toEqual(visitors);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/visitors');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('creates a visitor with a JSON body', async () => {
    const fetchImpl = fakeFetch(201, { success: true, data: entry });
    await expect(createVisitor(entry, { fetchImpl })).resolves.toEqual(entry);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  });

  it('records an exit with an encoded id and JSON body', async () => {
    const updated = { id: 'v/1', ...entry, exitTime: entry.entryTime };
    const fetchImpl = fakeFetch(200, { success: true, data: updated });
    await expect(recordVisitorExit('v/1', entry.entryTime, { fetchImpl })).resolves.toEqual(updated);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/visitors/v%2F1/exit');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      method: 'PUT',
      body: JSON.stringify({ exitTime: entry.entryTime }),
    });
  });

  it('maps status, field and network errors', async () => {
    for (const [status, body, message, code] of [
      [401, {}, 'Your session has expired. Please log in again.', 'SESSION_EXPIRED'],
      [403, {}, 'Only an admin can use the visitor log.', 'FORBIDDEN'],
      [404, { error: { code: 'NOT_FOUND', message: 'Visitor missing' } }, 'Visitor missing', 'NOT_FOUND'],
      [400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid entry', details: { usn: 'Required' } } }, 'Invalid entry', 'VALIDATION_ERROR'],
    ]) {
      await expect(fetchVisitors({ fetchImpl: fakeFetch(status, { success: false, ...body }) }))
        .rejects.toMatchObject({ message, code });
    }
    await expect(fetchVisitors({
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('network')),
    })).rejects.toMatchObject({
      message: 'Could not reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
    });
    await expect(createVisitor(entry, {
      fetchImpl: fakeFetch(400, {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid entry', details: { usn: 'Required' } },
      }),
    })).rejects.toMatchObject({ fieldErrors: { usn: 'Required' } });
  });

  it('passes AbortError through unchanged', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    await expect(fetchVisitors({ fetchImpl: vi.fn().mockRejectedValue(abortError) })).rejects.toBe(abortError);
  });
});

describe('visitor helpers', () => {
  it('formats local inputs and null dates', () => {
    const date = new Date(2026, 9, 22, 10, 0);
    expect(toIsoFromLocalInput('2026-10-22T10:00')).toBe(date.toISOString());
    expect(toIsoFromLocalInput('')).toBe('');
    expect(toIsoFromLocalInput('not a date')).toBe('');
    expect(toLocalInputValue(date.toISOString())).toBe('2026-10-22T10:00');
    expect(formatDateTime(null)).toBe('—');
  });

  it('merges an exit result without dropping student details or mutating rows', () => {
    const visitors = [
      { id: 'v1', usn: 'U1', studentName: 'Student One', exitTime: null },
      { id: 'v2', usn: 'U2', studentName: 'Student Two', exitTime: null },
    ];
    const updated = { id: 'v1', exitTime: '2026-10-22T12:00:00.000Z' };
    const result = applyExitResult(visitors, updated);

    expect(result).toEqual([
      { id: 'v1', usn: 'U1', studentName: 'Student One', exitTime: updated.exitTime },
      visitors[1],
    ]);
    expect(result).not.toBe(visitors);
    expect(result[0]).not.toBe(visitors[0]);
    expect(visitors[0].exitTime).toBeNull();
  });
});

describe('visitor components', () => {
  it('renders the controlled form fields, errors and submitting state', () => {
    const markup = renderToStaticMarkup(
      <VisitorForm
        values={{ ...entry, entryTime: '2026-10-22T10:00' }}
        fieldErrors={{ usn: 'USN is required' }}
        submitting
      />,
    );
    for (const label of ['Student USN', 'Visitor name', 'Contact number', 'Purpose', 'Entry time']) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('USN is required');
    expect(markup).toContain('disabled');
  });

  it('renders visitor states and student identity', () => {
    const inside = { id: 'v1', ...entry, studentName: 'Ravi Student', exitTime: null };
    const exited = { ...inside, id: 'v2', exitTime: '2026-10-22T12:00:00.000Z' };
    expect(renderToStaticMarkup(<VisitorTable visitors={[inside]} />)).toContain('Inside');
    expect(renderToStaticMarkup(<VisitorTable visitors={[inside]} />)).toContain('Record exit');
    expect(renderToStaticMarkup(<VisitorTable visitors={[exited]} />)).not.toContain('Record exit');
    expect(renderToStaticMarkup(<VisitorTable visitors={[exited]} />)).toContain('22 Oct 2026');
    const identity = renderToStaticMarkup(<VisitorTable visitors={[inside]} />);
    expect(identity).toContain('PES1UG24CS001');
    expect(identity).toContain('Ravi Student');
    expect(renderToStaticMarkup(<VisitorTable visitors={[]} />)).toContain('No visitors have been logged yet');
  });
});
