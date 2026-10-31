
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireRole, selfOrAdmin, ROLES } = require('../middleware/auth');

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

function toFeeView(fee, student = null) {
  const doc = fee && typeof fee.toObject === 'function'
    ? fee.toObject()
    : fee;

  if (!doc) return null;

  const amountDue = Number(doc.amountDue);
  const totalPaid = Number(doc.totalPaid || 0);
  const balance = Math.max(0, amountDue - totalPaid);
  const overdue = balance > 0 && new Date(doc.dueDate) < new Date();

  let status = 'Pending';
  if (balance === 0) {
    status = 'Paid';
  } else if (overdue) {
    status = 'Overdue';
  } else if (totalPaid > 0) {
    status = 'Partial';
  }

  return {
    id: String(doc._id),
    studentId: String(doc.studentId),
    studentName: student?.name ?? null,
    usn: student?.usn ?? null,
    amountDue,
    totalPaid,
    balance,
    dueDate: doc.dueDate,
    status,
    payments: (doc.payments || []).map((payment) => ({
      amount: payment.amount,
      paidOn: payment.paidOn,
      recordedBy: payment.recordedBy ? String(payment.recordedBy) : null,
      recordedAt: payment.recordedAt
    }))
  };
}

function createFeesRouter(options = {}) {
  const router = express.Router();

  const getModels = () => {
    const models = require('../models');
    return {
      Fee: options.Fee || models.Fee,
      Student: options.Student || models.Student
    };
  };

  async function getStudentForFee(Student, studentId) {
    return Student.findById(studentId)
      .select('_id usn name')
      .lean();
  }

  async function feeViewWithStudent(Fee, Student, fee) {
    if (!fee) return null;
    const student = await getStudentForFee(Student, fee.studentId);
    return toFeeView(fee, student);
  }

  // Admin: create one fee record for a student.
  router.post(
    '/',
    requireAuth,
    requireRole(ROLES.ADMIN),
    async (req, res, next) => {
      try {
        const { Fee, Student } = getModels();
        const { studentId, amountDue, dueDate } = req.body || {};

        if (
          typeof studentId !== 'string' ||
          !mongoose.isValidObjectId(studentId) ||
          typeof amountDue !== 'number' ||
          !Number.isFinite(amountDue) ||
          amountDue <= 0 ||
          typeof dueDate !== 'string' ||
          Number.isNaN(Date.parse(dueDate))
        ) {
          return res.status(400).json(errorBody(
            'VALIDATION_ERROR',
            'Provide a valid student, positive fee amount, and due date'
          ));
        }

        const student = await Student.findById(studentId).lean();
        if (!student) {
          return res.status(404).json(errorBody('NOT_FOUND', 'Student not found'));
        }

        try {
          const fee = await Fee.create({
            studentId: student._id,
            amountDue,
            dueDate: new Date(dueDate),
            totalPaid: 0,
            payments: []
          });

          return res.status(201).json({
            success: true,
            data: toFeeView(fee, student)
          });
        } catch (error) {
          if (error?.code === 11000) {
            return res.status(409).json(errorBody(
              'FEE_EXISTS',
              'A fee record already exists for this student'
            ));
          }
          throw error;
        }
      } catch (error) {
        return next(error);
      }
    }
  );

  // Admin: list fee records, optionally filtered by status.
  router.get(
    '/',
    requireAuth,
    requireRole(ROLES.ADMIN),
    async (req, res, next) => {
      try {
        const { Fee, Student } = getModels();
        const status = typeof req.query.status === 'string'
          ? req.query.status.trim().toLowerCase()
          : '';

        if (status && !['paid', 'pending', 'partial', 'overdue'].includes(status)) {
          return res.status(400).json(errorBody(
            'VALIDATION_ERROR',
            'Invalid fee status'
          ));
        }

        const now = new Date();
        const filter = {};

        if (status === 'paid') {
          filter.$expr = { $gte: ['$totalPaid', '$amountDue'] };
        } else if (status === 'pending') {
          filter.totalPaid = 0;
          filter.$expr = { $gt: ['$amountDue', 0] };
          filter.dueDate = { $gte: now };
        } else if (status === 'partial') {
          filter.$expr = {
            $and: [
              { $gt: ['$totalPaid', 0] },
              { $lt: ['$totalPaid', '$amountDue'] },
              { $gte: ['$dueDate', now] }
            ]
          };
        } else if (status === 'overdue') {
          filter.$expr = {
            $and: [
              { $lt: ['$totalPaid', '$amountDue'] },
              { $lt: ['$dueDate', now] }
            ]
          };
        }

        const fees = await Fee.find(filter).sort({ dueDate: 1 }).lean();
        const studentIds = fees.map((fee) => fee.studentId);

        const students = studentIds.length
          ? await Student.find({ _id: { $in: studentIds } })
            .select('_id usn name')
            .lean()
          : [];

        const studentMap = new Map(
          students.map((student) => [String(student._id), student])
        );

        return res.json({
          success: true,
          data: fees.map((fee) => toFeeView(
            fee,
            studentMap.get(String(fee.studentId)) || null
          ))
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  // GET /api/fees/{usn} (API contract endpoint 15, HMS-11).
  // A student may read only their own USN (403 otherwise); an admin may read any.
  // An unknown student, or a student with no fee record, returns 404 NOT_FOUND.
  // The USN pattern keeps this apart from the older /:id route below.
  router.get('/:usn([A-Za-z0-9]{13})', requireAuth, selfOrAdmin('usn'), async (req, res, next) => {
    try {
      const { Fee, Student } = getModels();
      const usn = String(req.params.usn).toUpperCase();

      const student = await Student.findOne({ usn }).select('_id usn name').lean();
      if (!student) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Student not found'));
      }

      const fee = await Fee.findOne({ studentId: student._id }).lean();
      if (!fee) {
        return res.status(404).json(errorBody('NOT_FOUND', 'No fee record exists for this student'));
      }

      return res.json({ success: true, data: toFeeView(fee, student) });
    } catch (error) {
      return next(error);
    }
  });

  // Students can read their own fee record; admins can read any record.
  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const { Fee, Student } = getModels();

      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Fee record not found'));
      }

      const fee = await Fee.findById(req.params.id).lean();
      if (!fee) {
        return res.status(404).json(errorBody('NOT_FOUND', 'Fee record not found'));
      }

      const student = await getStudentForFee(Student, fee.studentId);

      if (req.user.role !== ROLES.ADMIN) {
        const ownStudent = await Student.findOne({ userId: req.user.id }).lean();

        if (
          !ownStudent ||
          String(ownStudent._id) !== String(fee.studentId)
        ) {
          return res.status(403).json(errorBody(
            'FORBIDDEN',
            'You do not have permission to view this fee record'
          ));
        }
      }

      return res.json({
        success: true,
        data: toFeeView(fee, student)
      });
    } catch (error) {
      return next(error);
    }
  });

  // Admin: record a payment atomically to prevent concurrent overpayments.
  router.post(
    '/:id/payments',
    requireAuth,
    requireRole(ROLES.ADMIN),
    async (req, res, next) => {
      try {
        const { Fee, Student } = getModels();
        const amount = req.body?.amount;
        const paidOn = req.body?.paidOn
          ? new Date(req.body.paidOn)
          : new Date();

        if (
          typeof amount !== 'number' ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          Number.isNaN(paidOn.getTime())
        ) {
          return res.status(400).json(errorBody(
            'VALIDATION_ERROR',
            'Provide a positive payment amount and valid payment date'
          ));
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(404).json(errorBody(
            'NOT_FOUND',
            'Fee record not found'
          ));
        }

        // The conditional update succeeds only if the resulting total
        // remains at or below the amount due.
        const updated = await Fee.findOneAndUpdate(
          {
            _id: req.params.id,
            $expr: {
              $lte: [
                { $add: ['$totalPaid', amount] },
                '$amountDue'
              ]
            }
          },
          {
            $inc: { totalPaid: amount },
            $push: {
              payments: {
                amount,
                paidOn,
                recordedBy: req.user.id,
                recordedAt: new Date()
              }
            }
          },
          { new: true, runValidators: true }
        );

        if (!updated) {
          const exists = await Fee.exists({ _id: req.params.id });

          if (!exists) {
            return res.status(404).json(errorBody(
              'NOT_FOUND',
              'Fee record not found'
            ));
          }

          return res.status(400).json(errorBody(
            'PAYMENT_EXCEEDS_BALANCE',
            'Payment exceeds the outstanding balance'
          ));
        }

        const data = await feeViewWithStudent(Fee, Student, updated);

        return res.json({ success: true, data });
      } catch (error) {
        return next(error);
      }
    }
  );

  return router;
}

module.exports = { createFeesRouter, toFeeView };
