const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createHealthRouter } = require('./routes/health');
const { createAuthRouter } = require('./routes/auth');
const { createRoomsRouter } = require('./routes/rooms');

function createApp({ getDatabaseStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected') } = {}) {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', createHealthRouter(getDatabaseStatus));
  app.use('/api/auth', createAuthRouter());
  app.use('/api/rooms', createRoomsRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Safe error format: no stack traces or internal details are sent to the client (SAD 3.b.4).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON', details: {} } });
    }
    console.error('Unhandled error:', err && err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again', details: {} } });
  });

  return app;
}

module.exports = { createApp };
