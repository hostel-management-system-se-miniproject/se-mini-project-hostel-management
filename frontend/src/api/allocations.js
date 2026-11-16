import { fetchRooms } from './rooms';

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

const ERROR_MESSAGES = {
  ROOM_FULL: 'This room has just become full. Please choose another room.',
  ALREADY_ALLOCATED: 'This student already has a room.',
  NOT_FOUND: 'The student or the room could not be found. Refresh the page and try again.',
  INVALID_USN: null,
  VALIDATION_ERROR: null,
};

function createError(message, code) {
  const error = new Error(message);
  if (code) error.code = code;
  return error;
}

function mapResponseError(response, body) {
  const code = body?.error?.code;
  if (response.status === 401) {
    return createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }
  if (response.status === 403) {
    return createError('Only an admin can allocate rooms.', 'FORBIDDEN');
  }
  if (ERROR_MESSAGES[code]) {
    return createError(ERROR_MESSAGES[code], code);
  }
  if (code === 'INVALID_USN' || code === 'VALIDATION_ERROR') {
    return createError(body?.error?.message ?? 'Something went wrong. Please try again.', code);
  }
  return createError('Something went wrong. Please try again.', code);
}

function mapAllocationActionError(response, body) {
  const code = body?.error?.code;
  if (response.status === 401) {
    return createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }
  if (response.status === 403) {
    return createError('Only an admin can allocate rooms.', 'FORBIDDEN');
  }
  if (code === 'ROOM_FULL') {
    return createError(ERROR_MESSAGES.ROOM_FULL, code);
  }
  if (code === 'NOT_FOUND') {
    return createError('This allocation is no longer active. Refresh the list.', code);
  }
  if (code === 'VALIDATION_ERROR' || code === 'CONFIRMATION_REQUIRED') {
    return createError(body?.error?.message ?? 'Something went wrong. Please try again.', code);
  }
  return createError('Something went wrong. Please try again.', code);
}

async function request(url, options) {
  const { fetchImpl, ...requestOptions } = options;
  let response;
  try {
    response = await fetchImpl(url, {
      ...requestOptions,
      credentials: 'include',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok && body?.success) {
    return body.data;
  }

  throw mapResponseError(response, body);
}

async function allocationActionRequest(url, options) {
  const { fetchImpl, ...requestOptions } = options;
  let response;
  try {
    response = await fetchImpl(url, {
      ...requestOptions,
      credentials: 'include',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok && body?.success) {
    return body.data;
  }
  throw mapAllocationActionError(response, body);
}

export async function fetchUnallocatedStudents(search = '', { fetchImpl = fetch, signal } = {}) {
  const params = new URLSearchParams({ unallocated: 'true' });
  const trimmedSearch = search.trim();
  if (trimmedSearch) params.set('search', trimmedSearch);
  const data = await request(`${API_BASE}/api/students?${params.toString()}`, {
    fetchImpl,
    signal,
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchAvailableRooms({ fetchImpl = fetch, signal } = {}) {
  try {
    const rooms = await fetchRooms({ available: true }, { fetchImpl, signal });
    return rooms.filter((room) => Number(room.vacancy) > 0);
  } catch (error) {
    if (error?.message === 'Only an admin can view room availability.') {
      throw createError('Only an admin can allocate rooms.', 'FORBIDDEN');
    }
    throw error;
  }
}

export async function allocateRoom({ usn, roomId }, { fetchImpl = fetch, signal } = {}) {
  return request(`${API_BASE}/api/allocations`, {
    fetchImpl,
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usn, roomId }),
  });
}

export async function fetchActiveAllocations({ fetchImpl = fetch, signal } = {}) {
  const data = await request(`${API_BASE}/api/allocations?active=true`, {
    fetchImpl,
    signal,
  });
  return Array.isArray(data) ? data : [];
}

export async function reallocateAllocation(id, roomId, { fetchImpl = fetch, signal } = {}) {
  return allocationActionRequest(`${API_BASE}/api/allocations/${encodeURIComponent(id)}/reallocate`, {
    fetchImpl,
    signal,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId }),
  });
}

export async function vacateAllocation(id, { fetchImpl = fetch, signal } = {}) {
  return allocationActionRequest(`${API_BASE}/api/allocations/${encodeURIComponent(id)}/vacate`, {
    fetchImpl,
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
}
