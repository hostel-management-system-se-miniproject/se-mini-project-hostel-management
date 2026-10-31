const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// GET /api/fees/{usn}. Resolves to the fee record, or null when the student has no fee record yet.
export async function fetchStudentFee(usn, { fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/fees/${encodeURIComponent(usn)}`, {
      credentials: 'include',
      signal,
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

  if (response.ok && body?.success && body.data) {
    return body.data;
  }
  if (response.status === 404 && body?.error?.code === 'NOT_FOUND') {
    return null;
  }
  if (response.status === 401) {
    throw createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }
  if (response.status === 403) {
    throw createError('You can only view your own fee details.', 'FORBIDDEN');
  }
  throw createError('Could not load your fee details. Please try again.', 'REQUEST_FAILED');
}
