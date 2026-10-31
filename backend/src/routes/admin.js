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

  // POST /api/admin/notifications/run (admin): run the fee due-date job now.
  router.post('/notifications/run', requireAuth, requireRole(ROLES.ADMIN), async (_req, res, next) => {
    try {
      const notifier = options.getNotifier
        ? options.getNotifier()
        : require('../services/feeNotificationService').createFeeNotifier();

      if (!notifier.enabled) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'NOTIFICATIONS_DISABLED',
            message: 'Notifications are not configured',
            details: {}
          }
        });
      }

      const result = await notifier.run();
      return res.json({ success: true, data: { sent: result.sent } });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAdminRouter };
