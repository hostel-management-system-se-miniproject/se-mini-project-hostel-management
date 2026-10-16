const express = require('express');

function createHealthRouter(getDatabaseStatus) {
  const router = express.Router();

  router.get('/', (_req, res) => {
    const database = getDatabaseStatus();
    const healthy = database === 'connected';

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'unavailable',
      service: 'hms-api',
      database
    });
  });

  return router;
}

module.exports = { createHealthRouter };
