'use strict';

const express = require('express');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

// Accepts only real calendar dates written as YYYY-MM-DD. Returns a Date at
// 00:00 UTC, or null when the text is not a valid date.
function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }
  const text = value.trim();
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    return null;
  }
  return date;
}

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function toLeaveView(leave) {
  const doc = leave && leave.toObject ? leave.toObject() : leave;
  return {
    id: String(doc._id),
    startDate: dateOnly(doc.startDate),
    endDate: dateOnly(doc.endDate),
    reason: doc.reason,
    status: doc.status,
    createdAt: doc.createdAt,
    decidedAt: doc.decidedAt ?? null
  };
}

function createLeavesRouter(options = {}) {
  const router = express.Router();
  const getModels = () => {
    const models = require('../models');
    return {
      Leave: options.Leave || models.Leave,
      Student: options.Student || models.Student
    };
  };

  // POST /api/leaves (student): submit a new leave request, status Pending.
  router.post('/', requireAuth, requireRole(ROLES.STUDENT), async (req, res, next) => {
    try {
      const { Leave, Student } = getModels();
      const body = req.body || {};
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      const startDate = parseDateOnly(body.startDate);
      const endDate = parseDateOnly(body.endDate);

      if (!startDate) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Start date is required (YYYY-MM-DD)', { startDate: 'Start date is required (YYYY-MM-DD)' }));
      }
      if (!endDate) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'End date is required (YYYY-MM-DD)', { endDate: 'End date is required (YYYY-MM-DD)' }));
      }
      // A one-day leave (end date equal to start date) is allowed.
      if (endDate < startDate) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'End date cannot be before start date', { endDate: 'End date cannot be before start date' }));
      }
      if (!reason) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Reason is required', { reason: 'Reason is required' }));
      }

      const student = await Student.findOne({ userId: req.user.id }).lean();
      if (!student) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Student profile not found', {}));
      }

      const leave = await Leave.create({
        studentId: student._id,
        startDate,
        endDate,
        reason,
        status: 'Pending'
      });

      const view = toLeaveView(leave);
      return res.status(201).json({
        success: true,
        data: {
          id: view.id,
          startDate: view.startDate,
          endDate: view.endDate,
          reason: view.reason,
          status: view.status
        }
      });
    } catch (error) {
      if (error && error.name === 'ValidationError') {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Check the leave details and try again', {}));
      }
      return next(error);
    }
  });

  // GET /api/leaves/mine (student): the logged-in student's requests, newest first.
  router.get('/mine', requireAuth, requireRole(ROLES.STUDENT), async (req, res, next) => {
    try {
      const { Leave, Student } = getModels();
      const student = await Student.findOne({ userId: req.user.id }).lean();
      if (!student) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Student profile not found', {}));
      }

      const leaves = await Leave.find({ studentId: student._id }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: leaves.map(toLeaveView) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createLeavesRouter, toLeaveView, parseDateOnly };
