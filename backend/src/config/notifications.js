'use strict';

// Settings for the optional fee due-date email (FR-003.3).
// Notifications are on only when SMTP_HOST is set. Every other value has a default.
function getNotificationConfig(env = process.env) {
  const host = String(env.SMTP_HOST || '').trim();
  const port = Number.parseInt(env.SMTP_PORT, 10) || 587;
  const user = String(env.SMTP_USER || '').trim();
  const pass = String(env.SMTP_PASS || '');
  const from = String(env.SMTP_FROM || '').trim() || user || 'no-reply@hms.local';

  return {
    enabled: host !== '',
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from
  };
}

module.exports = { getNotificationConfig };
