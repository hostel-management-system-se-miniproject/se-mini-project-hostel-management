'use strict';

// Builds the function that sends one email through the configured SMTP server.
// nodemailer is loaded only here, and only when notifications are enabled, so the
// rest of the app starts and runs even when the package or the settings are missing.
function createSendMail(config, { createTransport } = {}) {
  const buildTransport = createTransport || require('nodemailer').createTransport;
  const transport = buildTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined
  });

  return async function sendMail({ to, subject, text }) {
    await transport.sendMail({ from: config.from, to, subject, text });
  };
}

module.exports = { createSendMail };
