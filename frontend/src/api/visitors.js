const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function createError(message, code, fieldErrors = {}) {
  const error = new Error(message);
  error.code = code;
  error.fieldErrors = fieldErrors;
  return error;
}

function responseError(response, body) {
  const serverError = body?.error ?? {};
  const code = serverError.code;
  const fieldErrors = serverError.details && typeof serverError.details === 'object'
    ? { ...serverError.details }
    : {};

  if (response.status === 401) {
    return createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED', fieldErrors);
  }
  if (response.status === 403) {
    return createError('Only an admin can use the visitor log.', 'FORBIDDEN', fieldErrors);
  }
  if (response.status === 404 && code === 'NOT_FOUND') {
    const message = typeof serverError.message === 'string'
      ? serverError.message
      : 'The student or visitor could not be found.';
    return createError(message, code, fieldErrors);
  }
  if (response.status === 400) {
    return createError(
      typeof serverError.message === 'string'
        ? serverError.message
        : 'Something went wrong. Please try again.',
      code || 'BAD_REQUEST',
      fieldErrors,
    );
  }
  return createError('Something went wrong. Please try again.', code || 'REQUEST_FAILED', fieldErrors);
}

async function request(url, { fetchImpl = fetch, signal, ...options } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      ...options,
      credentials: 'include',
      signal,
    });
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
  throw responseError(response, body);
}

export async function fetchVisitors({ fetchImpl = fetch, signal } = {}) {
  const data = await request(`${API_BASE}/api/visitors`, { fetchImpl, signal });
  return Array.isArray(data) ? data : [];
}

export async function createVisitor(entry, { fetchImpl = fetch } = {}) {
  return request(`${API_BASE}/api/visitors`, {
    fetchImpl,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

export async function recordVisitorExit(id, exitTime, { fetchImpl = fetch } = {}) {
  return request(`${API_BASE}/api/visitors/${encodeURIComponent(id)}/exit`, {
    fetchImpl,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exitTime }),
  });
}
