'use strict';

const bcrypt = require('bcryptjs');

// Login rules (SAD 3.b.1): the same 401 for an unknown user and a wrong
// password, a lock after N failed attempts, 423 while the lock is active, and
// a counter that resets after a good login or when the lock has expired.

class AuthError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Compared against when the user does not exist, so that an unknown user
// takes about as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function invalidCredentials() {
  return new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
}

function accountLocked(lockUntil, current) {
  const remainingMinutes = Math.max(1, Math.ceil((lockUntil.getTime() - current.getTime()) / 60000));
  return new AuthError(
    423,
    'ACCOUNT_LOCKED',
    `Account locked. Try again in ${remainingMinutes} minute(s)`,
    { remainingMinutes }
  );
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AuthError(400, 'VALIDATION_ERROR', `${label} is required`);
  }
  return value;
}

function createLoginService({ store, config, now = () => new Date(), comparePassword = bcrypt.compare }) {
  async function login({ identifier, password } = {}) {
    const cleanIdentifier = requireText(identifier, 'Identifier').trim();
    requireText(password, 'Password');

    const account = await store.findAccountByIdentifier(cleanIdentifier);
    if (!account) {
      await comparePassword(password, DUMMY_HASH);
      throw invalidCredentials();
    }

    const { user, profile } = account;
    const current = now();
    let hadFailures = user.failedAttempts > 0;

    if (user.lockUntil) {
      if (user.lockUntil.getTime() > current.getTime()) {
        throw accountLocked(user.lockUntil, current);
      }
      await store.resetFailures(user.id);
      hadFailures = false;
    }

    const matches = await comparePassword(password, user.passwordHash);
    if (!matches) {
      await store.recordFailedAttempt(user.id, {
        maxFailedLogins: config.maxFailedLogins,
        lockUntil: new Date(current.getTime() + config.lockoutMinutes * 60000)
      });
      throw invalidCredentials();
    }

    if (hadFailures) {
      await store.resetFailures(user.id);
    }
    return { user: { id: user.id, role: user.role }, profile };
  }

  // Used by GET /api/auth/me. The session holds id, role and usn; the name
  // comes from the student profile. An admin has no profile, so name is null.
  async function describeUser(sessionUser) {
    let name = null;
    if (sessionUser.role === 'student') {
      const profile = await store.findProfileByUserId(sessionUser.id);
      name = profile ? profile.name : null;
    }
    return { role: sessionUser.role, usn: sessionUser.usn || null, name };
  }

  return { login, describeUser };
}

module.exports = { AuthError, createLoginService };
