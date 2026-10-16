const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createHealthRouter } = require('./routes/health');

function createApp({ getDatabaseStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected') } = {}) {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', createHealthRouter(getDatabaseStatus));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
}

module.exports = { createApp };
