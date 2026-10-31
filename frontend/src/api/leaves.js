const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function createError(message, code = 'REQUEST_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function responseError(response, body) {
  if (response.status === 401) {
    return createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }
  if (response.status === 403) {
    return createError('You do not have permission to do that.', 'FORBIDDEN');
  }
  if (response.status === 400) {
    return createError(body?.error?.message ?? 'Check the leave details and try again.', 'VALIDATION_ERROR');
  }
  if (response.status === 404) {
    return createError('Your student record could not be found.', 'NOT_FOUND');
  }
  return createError(body?.error?.message ?? 'Something went wrong. Please try again.', 'REQUEST_FAILED');
}

async function readBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function send(url, init, fetchImpl) {
  try {
    return await fetchImpl(url, { credentials: 'include', ...init });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }
}

// GET /api/leaves/mine (student). Resolves to an array, newest first.
export async function fetchMyLeaves({ fetchImpl = fetch, signal } = {}) {
  const response = await send(`${API_BASE}/api/leaves/mine`, { method: 'GET', signal }, fetchImpl);
  const body = await readBody(response);
  if (response.ok && body?.success && Array.isArray(body.data)) {
    return body.data;
  }
  throw responseError(response, body);
}

// POST /api/leaves (student). Resolves to the created request.
export async function submitLeave({ startDate, endDate, reason }, { fetchImpl = fetch, signal } = {}) {
  const response = await send(
    `${API_BASE}/api/leaves`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, reason }),
      signal,
    },
    fetchImpl,
  );
  const body = await readBody(response);
  if (response.ok && body?.success && body.data) {
    return body.data;
  }
  throw responseError(response, body);
}
