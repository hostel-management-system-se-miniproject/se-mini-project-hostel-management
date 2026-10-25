// Client-side checks for the registration form. They mirror the server rules in
// backend/src/validation/registration.js (SRS FR-001.1). The server stays the
// authority; these checks only give the student quick feedback.

const USN_PATTERN = /^[A-Za-z0-9]{13}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

export const REGISTRATION_FIELDS = ['usn', 'name', 'email', 'phone', 'password'];

export function validateRegistration(values = {}) {
  const usn = (values.usn ?? '').trim();
  const name = (values.name ?? '').trim();
  const email = (values.email ?? '').trim();
  const phone = (values.phone ?? '').trim();
  const password = values.password ?? '';
  const errors = {};

  if (!usn) {
    errors.usn = 'USN is required';
  } else if (!USN_PATTERN.test(usn)) {
    errors.usn = 'Enter a valid USN (13 alphanumeric characters, for example PES1UG24CS924)';
  }

  if (!name) {
    errors.name = 'Name is required';
  } else if (name.length > 60) {
    errors.name = 'Name must be at most 60 characters';
  }

  if (!email) {
    errors.email = 'Email is required';
  } else if (email.length > 80 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!phone) {
    errors.phone = 'Phone number is required';
  } else if (!PHONE_PATTERN.test(phone)) {
    errors.phone = 'Enter a valid phone number';
  }

  if (password.trim().length === 0) {
    errors.password = 'Password is required';
  }

  return errors;
}