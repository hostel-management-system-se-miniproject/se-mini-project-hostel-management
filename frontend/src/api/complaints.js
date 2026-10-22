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
  if (response.status === 409) {
    return createError(body?.error?.message ?? 'You already have an open complaint in this category.', 'COMPLAINT_CATEGORY_OPEN');
  }
  if (response.status === 400) {
    return createError(body?.error?.message ?? 'Check the complaint details and try again.', 'VALIDATION_ERROR');
  }
  if (response.status === 404) {
    return createError('Your complaint record could not be found.', 'NOT_FOUND');
  }
  return createError(body?.error?.message ?? 'Could not load complaints. Please try again.', 'REQUEST_FAILED');
}

async function readBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchMyComplaints({ fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/complaints/mine`, {
      method: 'GET',
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  const body = await readBody(response);
  if (response.ok && body?.success && Array.isArray(body.data)) {
    return body.data;
  }

  throw responseError(response, body);
}

export async function submitComplaint({ category, description }, { fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/complaints`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  const body = await readBody(response);
  if (response.ok && body?.success) {
    return body.data;
  }

  throw responseError(response, body);
}

export async function fetchComplaints(filters = {}, { fetchImpl = fetch, signal } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);

  const query = params.toString() ? `?${params.toString()}` : '';

  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/complaints${query}`, {
      method: 'GET',
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  const body = await readBody(response);
  if (response.ok && body?.success && Array.isArray(body.data)) {
    return body.data;
  }

  throw responseError(response, body);
}
