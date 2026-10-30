
const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function createError(message, code = 'REQUEST_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function request(path, options = {}) {
  const { fetchImpl = fetch, signal, ...requestOptions } = options;
  let response;

  try {
    response = await fetchImpl(`${API_BASE}/api/fees${path}`, {
      ...requestOptions,
      credentials: 'include',
      signal
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

  if (response.ok && body?.success) return body.data;

  const code = body?.error?.code;
  const messages = {
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    FORBIDDEN: 'You do not have permission to do that.',
    FEE_EXISTS: 'A fee record already exists for this student.',
    PAYMENT_EXCEEDS_BALANCE: 'Payment exceeds the outstanding balance.',
    VALIDATION_ERROR: body?.error?.message ?? 'Check the fee details and try again.',
    NOT_FOUND: 'The fee or student record could not be found.'
  };

  throw createError(
    response.status === 401
      ? messages.SESSION_EXPIRED
      : response.status === 403
        ? messages.FORBIDDEN
        : messages[code] ?? 'Something went wrong. Please try again.',
    code ?? 'REQUEST_FAILED'
  );
}

export async function fetchFees(status = '', options = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await request(query, options);
  return Array.isArray(data) ? data : [];
}

export async function createFee({ studentId, amountDue, dueDate }, options = {}) {
  return request('', {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, amountDue: Number(amountDue), dueDate })
  });
}

export async function recordFeePayment(feeId, { amount, paidOn }, options = {}) {
  return request(`/${encodeURIComponent(feeId)}/payments`, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Number(amount),
      ...(paidOn ? { paidOn } : {})
    })
  });
}

export async function fetchStudents(options = {}) {
  const { fetchImpl = fetch, signal } = options;
  let response;

  try {
    response = await fetchImpl(`${API_BASE}/api/students`, {
      credentials: 'include',
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not load students. Check your connection and try again.', 'NETWORK_ERROR');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success || !Array.isArray(body.data)) {
    throw createError(
      body?.error?.message ?? 'Could not load students. Please try again.',
      body?.error?.code ?? 'REQUEST_FAILED'
    );
  }

  return body.data;
}
