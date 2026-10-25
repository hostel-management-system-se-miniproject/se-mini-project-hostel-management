'use strict';

// Login and session settings (HMS-05). Each value can be set in the
// environment. The defaults are the SRS values: 5 failed logins, a lockout of
// 15 minutes and a session timeout of 30 minutes.

const SESSION_COOKIE_NAME = 'hms.sid';

const DEFAULTS = Object.freeze({
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  sessionTimeoutMinutes: 30
});

function readPositiveNumber(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAuthConfig(env = process.env) {
  return {
    maxFailedLogins: Math.max(1, Math.floor(readPositiveNumber(env.MAX_FAILED_LOGINS, DEFAULTS.maxFailedLogins))),
    lockoutMinutes: readPositiveNumber(env.LOCKOUT_MINUTES, DEFAULTS.lockoutMinutes),
    sessionTimeoutMinutes: readPositiveNumber(env.SESSION_TIMEOUT_MINUTES, DEFAULTS.sessionTimeoutMinutes),
    sessionSecret: env.SESSION_SECRET
  };
}

function assertAuthConfig(config) {
  if (!config.sessionSecret) {
    throw new Error('SESSION_SECRET is not set. Add it to backend/.env (see backend/.env.example).');
  }
}

module.exports = { SESSION_COOKIE_NAME, DEFAULTS, getAuthConfig, assertAuthConfig };
