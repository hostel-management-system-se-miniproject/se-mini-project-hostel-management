const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

// Thrown when registration fails. fieldErrors maps form fields to messages.
export class RegistrationError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.name = 'RegistrationError';
    this.fieldErrors = fieldErrors;
  }
}

const FIELDS = ['usn', 'name', 'email', 'phone', 'password'];

function pickFieldErrors(details) {
  const result = {};
  if (details && typeof details === 'object') {
    for (const field of FIELDS) {
      if (typeof details[field] === 'string') result[field] = details[field];
    }
  }
  return result;
}

// POST /api/auth/register. Resolves to the created { usn, name, email }.
export async function registerStudent(values, { fetchImpl = fetch } = {}) {
  const payload = {
    usn: values.usn.trim(),
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    password: values.password,
  };

  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new RegistrationError('Could not reach the server. Check your connection and try again.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 201 && body?.success) {
    return body.data;
  }

  const error = body?.error;
  const fieldErrors = pickFieldErrors(error?.details);
  if (error?.code === 'USN_EXISTS' && !fieldErrors.usn) fieldErrors.usn = 'USN already registered';
  if (error?.code === 'EMAIL_EXISTS' && !fieldErrors.email) fieldErrors.email = 'Email already registered';
  if (error?.code === 'INVALID_USN' && !fieldErrors.usn) fieldErrors.usn = error.message;

  const message =
    Object.keys(fieldErrors).length > 0
      ? 'Please correct the highlighted fields.'
      : (error?.message ?? 'Registration failed. Please try again.');
  throw new RegistrationError(message, fieldErrors);
}
