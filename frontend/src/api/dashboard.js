const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function responseError(response) {
  if (response.status === 401) {
    return createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }
  if (response.status === 403) {
    return createError('You can only view your own dashboard.', 'FORBIDDEN');
  }
  if (response.status === 404) {
    return createError('Your student record could not be found.', 'NOT_FOUND');
  }
  return createError('Something went wrong. Please try again.', 'REQUEST_FAILED');
}

export async function fetchStudentDashboard(usn, { fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(
      `${API_BASE}/api/students/${encodeURIComponent(usn)}/dashboard`,
      { credentials: 'include', signal },
    );
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError(
      'Could not reach the server. Check your connection and try again.',
      'NETWORK_ERROR',
    );
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

  throw responseError(response);
}
