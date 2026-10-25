// Validation for POST /api/auth/register (SRS FR-001.1, SAD 3.b.3 and 3.b.4).
const USN_PATTERN = /^[A-Za-z0-9]{13}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

const USN_MESSAGE = 'Enter a valid USN (13 alphanumeric characters, for example PES1UG24CS924)';

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateRegistration(body) {
  const input = body && typeof body === 'object' ? body : {};
  const usn = asText(input.usn).toUpperCase();
  const name = asText(input.name);
  const email = asText(input.email).toLowerCase();
  const phone = asText(input.phone);
  // The password is checked for presence only and is never trimmed or logged.
  const password = typeof input.password === 'string' ? input.password : '';

  const details = {};

  if (!usn) {
    details.usn = 'USN is required';
  } else if (!USN_PATTERN.test(usn)) {
    details.usn = USN_MESSAGE;
  }

  if (!name) {
    details.name = 'Name is required';
  } else if (name.length > 60) {
    details.name = 'Name must be at most 60 characters';
  }

  if (!email) {
    details.email = 'Email is required';
  } else if (email.length > 80 || !EMAIL_PATTERN.test(email)) {
    details.email = 'Enter a valid email address';
  }

  if (!phone) {
    details.phone = 'Phone number is required';
  } else if (!PHONE_PATTERN.test(phone)) {
    details.phone = 'Enter a valid phone number';
  }

  if (password.trim().length === 0) {
    details.password = 'Password is required';
  }

  const fields = Object.keys(details);
  if (fields.length === 0) {
    return { ok: true, data: { usn, name, email, phone, password } };
  }

  // A malformed (not missing) USN on its own has its own error code.
  const onlyBadUsn = fields.length === 1 && fields[0] === 'usn' && usn.length > 0;
  return {
    ok: false,
    code: onlyBadUsn ? 'INVALID_USN' : 'VALIDATION_ERROR',
    message: details[fields[0]],
    details
  };
}

module.exports = { validateRegistration, USN_MESSAGE };
