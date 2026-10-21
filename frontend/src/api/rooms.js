const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

export const EMPTY_FILTERS = { block: '', floor: '', sharing: '', available: false };

// Builds the query string for GET /api/rooms. Blank filters are left out.
export function buildRoomsQuery(filters = EMPTY_FILTERS) {
  const params = new URLSearchParams();
  const block = (filters.block ?? '').trim();
  const floor = String(filters.floor ?? '').trim();
  const sharing = (filters.sharing ?? '').trim();

  if (block) params.set('block', block);
  if (floor) params.set('floor', floor);
  if (sharing) params.set('sharing', sharing);
  if (filters.available) params.set('available', 'true');

  const text = params.toString();
  return text ? `?${text}` : '';
}

export function hasActiveFilters(filters = EMPTY_FILTERS) {
  return buildRoomsQuery(filters) !== '';
}

// Resolves to an array of rooms, or throws an Error with a readable message.
export async function fetchRooms(filters, { fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/rooms${buildRoomsQuery(filters)}`, {
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok && body?.success && Array.isArray(body.data)) {
    return body.data;
  }
  if (response.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }
  if (response.status === 403) {
    throw new Error('Only an admin can view room availability.');
  }
  throw new Error(body?.error?.message ?? 'Could not load rooms. Please try again.');
}
