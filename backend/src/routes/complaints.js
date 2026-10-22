'use strict';

const express = require('express');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

function toComplaintView(complaint) {
  const doc = complaint && complaint.toObject ? complaint.toObject() : complaint;
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    category: doc.category,
    description: doc.description,
    status: doc.status,
    remarks: doc.remarks ?? null,
    isOpen: Boolean(doc.isOpen),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    history: (doc.history || []).map((entry) => ({
      status: entry.status,
      remarks: entry.remarks ?? null,
      at: entry.at,
      by: entry.by ? String(entry.by) : null
    }))
  };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createComplaintsRouter(options = {}) {
  const router = express.Router();
  const getModels = () => {
    const models = require('../models');
    return {
      Complaint: options.Complaint || models.Complaint,
      Student: options.Student || models.Student
    };
  };

  async function getStudentForUser(userId, Student) {
    return Student.findOne({ userId }).lean();
  }

  async function ensureStudentAccess(studentId, user, Student) {
    if (user.role === ROLES.ADMIN) {
      return true;
    }

    const student = await Student.findOne({ userId: user.id }).lean();
    if (!student) {
      return false;
    }

    return String(student._id) === String(studentId);
  }

  router.post('/', requireAuth, requireRole(ROLES.STUDENT), async (req, res, next) => {
    try {
      const { Complaint, Student } = getModels();
      const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';

      if (!category) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Category is required', { category: 'Category is required' }));
      }

      if (!description) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Description is required', { description: 'Description is required' }));
      }

      const student = await getStudentForUser(req.user.id, Student);
      if (!student) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Student profile not found', {}));
      }

      const existingOpen = await Complaint.exists({ studentId: student._id, category, isOpen: true });
      if (existingOpen) {
        return res.status(409).json(errorBody('COMPLAINT_CATEGORY_OPEN', 'You already have an open complaint in this category', { category }));
      }

      const complaint = await Complaint.create({
        studentId: student._id,
        category,
        description,
        status: 'Open',
        isOpen: true,
        remarks: null,
        history: []
      });

      return res.status(201).json({ success: true, data: toComplaintView(complaint) });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/mine', requireAuth, requireRole(ROLES.STUDENT), async (req, res, next) => {
    try {
      const { Complaint, Student } = getModels();
      const student = await getStudentForUser(req.user.id, Student);
      if (!student) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Student profile not found', {}));
      }

      const complaints = await Complaint.find({ studentId: student._id }).sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: complaints.map((item) => toComplaintView(item)) });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const { Complaint, Student } = getModels();
      const filter = {};

      if (typeof req.query.status === 'string' && req.query.status.trim() !== '') {
        filter.status = req.query.status.trim();
      }

      if (typeof req.query.category === 'string' && req.query.category.trim() !== '') {
        filter.category = { $regex: `^${escapeRegex(req.query.category.trim())}$`, $options: 'i' };
      }

      const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
      const studentIds = complaints.map((item) => item.studentId).filter(Boolean);
      const students = await Student.find({ _id: { $in: studentIds } }).select('_id usn name').lean();
      const studentMap = new Map(students.map((student) => [String(student._id), student]));

      const data = complaints.map((complaint) => {
        const student = studentMap.get(String(complaint.studentId));
        return {
          ...toComplaintView(complaint),
          usn: student ? student.usn : null,
          studentName: student ? student.name : null
        };
      });

      return res.json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const { Complaint, Student } = getModels();
      const complaint = await Complaint.findById(req.params.id).lean();
      if (!complaint) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Complaint not found', {}));
      }

      if (req.user.role !== ROLES.ADMIN) {
        const allowed = await ensureStudentAccess(complaint.studentId, req.user, Student);
        if (!allowed) {
          return res.status(403).json(errorBody('FORBIDDEN', 'You do not have permission to perform this action', {}));
        }
      }

      const student = await Student.findById(complaint.studentId).select('usn name').lean();
      return res.json({
        success: true,
        data: {
          ...toComplaintView(complaint),
          usn: student ? student.usn : null,
          studentName: student ? student.name : null
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  router.put('/:id', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const { Complaint } = getModels();
      const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
      const remarks = typeof req.body?.remarks === 'string' ? req.body.remarks.trim() : '';
      const validStatuses = ['Open', 'In Progress', 'Resolved', 'Rejected'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Invalid complaint status', { status: 'Status must be Open, In Progress, Resolved or Rejected' }));
      }

      if (status === 'Rejected' && remarks === '') {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Remarks are required when rejecting a complaint', { remarks: 'Remarks are required when rejecting a complaint' }));
      }

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Complaint not found', {}));
      }

      const nextRemarks = status === 'Rejected' || status === 'Resolved' ? remarks : complaint.remarks ?? null;
      const nextHistoryEntry = {
        status,
        remarks: remarks !== '' ? remarks : null,
        at: new Date(),
        by: req.user.id
      };

      complaint.status = status;
      complaint.remarks = nextRemarks;
      complaint.isOpen = status !== 'Resolved' && status !== 'Rejected';
      complaint.history.push(nextHistoryEntry);
      const saved = await complaint.save();

      return res.json({ success: true, data: toComplaintView(saved) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createComplaintsRouter, toComplaintView };
