'use strict';

const express = require('express');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const {
  VisitorError,
  recordEntry,
  listVisitors,
  recordExit
} = require('../services/visitorService');

function errorBody(error) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details
    }
  };
}

function createVisitorsRouter(options = {}) {
  const router = express.Router();
  const getModels = () => {
    const models = require('../models');
    return {
      Visitor: options.Visitor || models.Visitor,
      Student: options.Student || models.Student
    };
  };

  router.post('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const data = await recordEntry(req.body || {}, req.user.id, getModels());
      return res.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof VisitorError) {
        return res.status(error.status).json(errorBody(error));
      }
      return next(error);
    }
  });

  router.get('/', requireAuth, requireRole(ROLES.ADMIN), async (_req, res, next) => {
    try {
      const data = await listVisitors(getModels());
      return res.json({ success: true, data });
    } catch (error) {
      if (error instanceof VisitorError) {
        return res.status(error.status).json(errorBody(error));
      }
      return next(error);
    }
  });

  router.put('/:id/exit', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const data = await recordExit(req.params.id, req.body || {}, getModels());
      return res.json({ success: true, data });
    } catch (error) {
      if (error instanceof VisitorError) {
        return res.status(error.status).json(errorBody(error));
      }
      return next(error);
    }
  });

  return router;
}

module.exports = { createVisitorsRouter };
