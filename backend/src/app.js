const express = require('express');
const { createFeesRouter } = require('./routes/fees');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const mongoose = require('mongoose');
const { createHealthRouter } = require('./routes/health');
const { createAuthRouter } = require('./routes/auth');
const { createSessionRouter } = require('./routes/authSession');
const { createRoomsRouter } = require('./routes/rooms');
const { createStudentsRouter } = require('./routes/students');
const { createAllocationsRouter } = require('./routes/allocations');
const { createVisitorsRouter } = require('./routes/visitors');
const { createComplaintsRouter } = require('./routes/complaints');
const { SESSION_COOKIE_NAME } = require('./config/auth');

// TRUST_PROXY is the number of reverse proxies in front of the API (0 or empty
// means none). Behind an HTTPS proxy it must be set (for example to 1), or
// Express cannot tell the request was HTTPS and the session cookie would not
// get the Secure flag.
function parseTrustProxy(value) {
  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

function createApp({
  getDatabaseStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'),
  authConfig,
  loginService,
  sessionStore,
  frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  trustProxy = process.env.TRUST_PROXY
} = {}) {
  const app = express();

  const proxyHops = parseTrustProxy(trustProxy);
  if (proxyHops) {
    app.set('trust proxy', proxyHops);
  }

  // Security headers (helmet) and CORS limited to the one frontend origin.
  app.use(helmet());
  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', createHealthRouter(getDatabaseStatus));

  const sessionsEnabled = Boolean(authConfig && authConfig.sessionSecret && loginService);

  if (sessionsEnabled) {
    app.use('/api', session({
      name: SESSION_COOKIE_NAME,
      secret: authConfig.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        // 'auto' sets Secure when the request arrived over HTTPS (see TRUST_PROXY).
        secure: 'auto',
        maxAge: Math.round(authConfig.sessionTimeoutMinutes * 60000)
      }
    }));
  }

  app.use('/api/auth', createAuthRouter());
  if (sessionsEnabled) {
    app.use('/api/auth', createSessionRouter({ loginService, cookieName: SESSION_COOKIE_NAME }));
  }
  app.use('/api/rooms', createRoomsRouter());
  app.use('/api/students', createStudentsRouter());
  app.use('/api/allocations', createAllocationsRouter());
  app.use('/api/visitors', createVisitorsRouter());
  app.use('/api/complaints', createComplaintsRouter());
  app.use('/api/fees', createFeesRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err, _req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be valid JSON',
          details: {}
        }
      });
    }

    if (err) {
      console.error('Unhandled error:', err && err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again',
          details: {}
        }
      });
    }

    return next();
  });

  return app;
}

module.exports = { createApp };
