'use strict';

const express = require('express');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

function createAdminRouter(options = {}) {
  const router = express.Router();
  const getAdminDashboard = options.getAdminDashboard
    || require('../services/adminDashboardService').getAdminDashboard;

  router.get('/dashboard', requireAuth, requireRole(ROLES.ADMIN), async (_req, res, next) => {
    try {
      const data = await getAdminDashboard();
      return res.json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAdminRouter };
