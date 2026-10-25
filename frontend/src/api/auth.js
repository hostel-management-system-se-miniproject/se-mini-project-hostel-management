const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

// An error from the login endpoints. The message is safe to show to the user.
export class AuthRequestError extends Error {
  constructor(message, { status = null, code = null, details = null } = {}) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';

async function readBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorFromResponse(response, body, fallback) {
  return new AuthRequestError(body?.error?.message ?? fallback, {
    status: response.status,
    code: body?.error?.code ?? null,
    details: body?.error?.details ?? null,
  });
}

async function send(path, options, fetchImpl) {
  try {
    return await fetchImpl(`${API_BASE}${path}`, { credentials: 'include', ...options });
  } catch {
    throw new AuthRequestError(NETWORK_MESSAGE);
  }
}

// POST /api/auth/login. Resolves to { role, usn, name } or throws AuthRequestError.
export async function login(identifier, password, { fetchImpl = fetch } = {}) {
  const response = await send(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    },
    fetchImpl,
  );
  const body = await readBody(response);

  if (response.ok && body?.success && body.data) {
    return body.data;
  }
  throw errorFromResponse(response, body, 'Login failed. Please try again.');
}

// GET /api/auth/me. Resolves to { role, usn, name }, or null when nobody is logged in.
export async function fetchCurrentUser({ fetchImpl = fetch } = {}) {
  const response = await send('/api/auth/me', {}, fetchImpl);
  if (response.status === 401) {
    return null;
  }
  const body = await readBody(response);
  if (response.ok && body?.success && body.data) {
    return body.data;
  }
  throw errorFromResponse(response, body, 'Could not check your session. Please try again.');
}

// POST /api/auth/logout. A 401 means the session was already over, which is fine.
export async function logout({ fetchImpl = fetch } = {}) {
  const response = await send('/api/auth/logout', { method: 'POST' }, fetchImpl);
  if (response.ok || response.status === 401) {
    return;
  }
  const body = await readBody(response);
  throw errorFromResponse(response, body, 'Could not log out. Please try again.');
}

// Picks the title and style of the message shown on the login page.
export function describeLoginError(error) {
  if (error?.status === 423 || error?.code === 'ACCOUNT_LOCKED') {
    return { variant: 'warning', title: 'Account locked' };
  }
  if (error?.status === 401) {
    return { variant: 'error', title: 'Login failed' };
  }
  if (error?.status === 400 || error?.code === 'VALIDATION_ERROR') {
    return { variant: 'error', title: 'Check your details' };
  }
  if (error?.status == null) {
    return { variant: 'error', title: 'Cannot log in' };
  }
  return { variant: 'error', title: 'Something went wrong' };
}
