const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const { createHealthRouter } = require('./routes/health');
const { createSessionRouter } = require('./routes/authSession');
const { SESSION_COOKIE_NAME } = require('./config/auth');

function createApp({
  getDatabaseStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'),
  authConfig,
  loginService,
  sessionStore
} = {}) {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', createHealthRouter(getDatabaseStatus));

  // Sessions and login are mounted only when they are configured. server.js
  // refuses to start without SESSION_SECRET.
  if (authConfig && authConfig.sessionSecret && loginService) {
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
        secure: 'auto',
        maxAge: Math.round(authConfig.sessionTimeoutMinutes * 60000)
      }
    }));
    app.use('/api/auth', createSessionRouter({ loginService, cookieName: SESSION_COOKIE_NAME }));
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' }
      });
    }
    console.error(error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again' }
    });
  });

  return app;
}

module.exports = { createApp };
