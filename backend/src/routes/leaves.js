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

// The admin and detail views add who the request belongs to.
function toAdminLeaveView(leave, student) {
  return {
    ...toLeaveView(leave),
    usn: student ? student.usn : null,
    studentName: student ? student.name : null
  };
}

const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];
const DECISIONS = ['Approved', 'Rejected'];
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

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

  // GET /api/leaves (admin): every request, newest first. Optional ?status=Pending|Approved|Rejected.
  router.get('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const { Leave, Student } = getModels();
      const filter = {};
      const rawStatus = req.query.status;

      if (rawStatus !== undefined && rawStatus !== '') {
        if (typeof rawStatus !== 'string' || !LEAVE_STATUSES.includes(rawStatus)) {
          return res.status(400).json(errorBody('VALIDATION_ERROR', 'Status must be Pending, Approved or Rejected', { status: 'Status must be Pending, Approved or Rejected' }));
        }
        filter.status = rawStatus;
      }

      const leaves = await Leave.find(filter).sort({ createdAt: -1 }).lean();
      const studentIds = [...new Set(leaves.map((leave) => String(leave.studentId)))];
      const students = studentIds.length
        ? await Student.find({ _id: { $in: studentIds } }).select('_id usn name').lean()
        : [];
      const byId = new Map(students.map((student) => [String(student._id), student]));

      return res.json({
        success: true,
        data: leaves.map((leave) => toAdminLeaveView(leave, byId.get(String(leave.studentId))))
      });
    } catch (error) {
      return next(error);
    }
  });

  // GET /api/leaves/{id} (owner or admin): one request.
  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const { Leave, Student } = getModels();
      if (!OBJECT_ID_PATTERN.test(req.params.id)) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Leave request not found', {}));
      }

      const leave = await Leave.findById(req.params.id).lean();
      if (!leave) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Leave request not found', {}));
      }

      if (req.user.role !== ROLES.ADMIN) {
        const own = await Student.findOne({ userId: req.user.id }).lean();
        if (!own || String(own._id) !== String(leave.studentId)) {
          return res.status(403).json(errorBody('FORBIDDEN', 'You do not have permission to perform this action', {}));
        }
      }

      const owner = await Student.findById(leave.studentId).select('_id usn name').lean();
      return res.json({ success: true, data: toAdminLeaveView(leave, owner) });
    } catch (error) {
      return next(error);
    }
  });

  // PUT /api/leaves/{id}/decision (admin): approve or reject a Pending request, once only.
  // The status check and the write are one conditional update, so two admins deciding at the
  // same moment cannot both win: the second one finds the request no longer Pending (409).
  router.put('/:id/decision', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const { Leave } = getModels();
      const decision = typeof req.body?.decision === 'string' ? req.body.decision.trim() : '';

      if (!DECISIONS.includes(decision)) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Decision must be Approved or Rejected', { decision: 'Decision must be Approved or Rejected' }));
      }
      if (!OBJECT_ID_PATTERN.test(req.params.id)) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Leave request not found', {}));
      }

      const updated = await Leave.findOneAndUpdate(
        { _id: req.params.id, status: 'Pending' },
        { $set: { status: decision, decidedBy: req.user.id, decidedAt: new Date() } },
        { new: true }
      ).lean();

      if (!updated) {
        const existing = await Leave.findById(req.params.id).lean();
        if (!existing) {
          return res.status(404).json(errorBody('NOT_FOUND', 'Leave request not found', {}));
        }
        return res.status(409).json(errorBody('ALREADY_DECIDED', 'This leave request has already been decided', {}));
      }

      return res.json({
        success: true,
        data: { id: String(updated._id), status: updated.status, decidedAt: updated.decidedAt }
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createLeavesRouter, toLeaveView, parseDateOnly };
