import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EMPTY_FILTERS, buildRoomsQuery, fetchRooms, hasActiveFilters } from './api/rooms';
import { RoomsResults } from './pages/RoomsPage';

const room = {
  id: 'r1', roomNo: 'A-102', block: 'A', floor: 1, sharingType: 'double', capacity: 2, occupancy: 0, vacancy: 2,
};

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('room filter query', () => {
  it('has no query string when no filter is set', () => {
    expect(buildRoomsQuery(EMPTY_FILTERS)).toBe('');
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('includes only the filters that are filled in', () => {
    const query = buildRoomsQuery({ block: ' A ', floor: '2', sharing: '', available: true });
    expect(query).toBe('?block=A&floor=2&available=true');
  });

  it('treats floor 0 as a real filter', () => {
    expect(buildRoomsQuery({ ...EMPTY_FILTERS, floor: '0' })).toBe('?floor=0');
  });
});

describe('fetchRooms', () => {
  it('sends the session cookie and returns the room list', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [room] });
    const rooms = await fetchRooms({ ...EMPTY_FILTERS, block: 'A' }, { fetchImpl });

    expect(rooms).toEqual([room]);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain('/api/rooms?block=A');
    expect(options.credentials).toBe('include');
  });

  it('gives a clear message for 403 and 401', async () => {
    await expect(fetchRooms(EMPTY_FILTERS, { fetchImpl: fakeFetch(403, { success: false }) })).rejects.toThrow(
      'Only an admin',
    );
    await expect(fetchRooms(EMPTY_FILTERS, { fetchImpl: fakeFetch(401, { success: false }) })).rejects.toThrow(
      'session has expired',
    );
  });

  it('reports a network failure in plain words', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchRooms(EMPTY_FILTERS, { fetchImpl })).rejects.toThrow('Could not reach the server');
  });
});

describe('RoomsResults', () => {
  it('shows a table with capacity, occupancy and vacancy', () => {
    const html = renderToStaticMarkup(<RoomsResults rooms={[room]} filtered={false} />);
    expect(html).toContain('A-102');
    expect(html).toContain('Vacancy');
    expect(html).toContain('1 room');
  });

  it('shows a clear message when a filter matches nothing', () => {
    const html = renderToStaticMarkup(<RoomsResults rooms={[]} filtered />);
    expect(html).toContain('No rooms match these filters');
    expect(html).not.toContain('<table');
  });

  it('shows a different message when there are no rooms at all', () => {
    const html = renderToStaticMarkup(<RoomsResults rooms={[]} filtered={false} />);
    expect(html).toContain('No rooms have been added yet');
  });
});
