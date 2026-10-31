'use strict';

const express = require('express');
const PDFDocument = require('pdfkit');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

const REPORT_TYPES = Object.freeze({
  student: 'student',
  fee: 'fee',
  complaint: 'complaint'
});

const REPORT_FORMATS = Object.freeze({
  csv: 'csv',
  pdf: 'pdf'
});

const REPORT_COLUMNS = Object.freeze({
  student: ['usn', 'name', 'email', 'phone', 'roomNo', 'block', 'floor'],
  fee: ['usn', 'studentName', 'amountDue', 'totalPaid', 'balance', 'dueDate', 'status'],
  complaint: ['complaintId', 'usn', 'studentName', 'category', 'status', 'description', 'remarks', 'createdAt']
});

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

function normalizeType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeFormat(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function escapeCsvCell(value) {
  const text = `${value ?? ''}`;
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvCell(column)).join(',');
  const lines = [header];
  for (const row of rows) {
    const record = columns.map((column) => escapeCsvCell(row[column] ?? '')).join(',');
    lines.push(record);
  }
  return `${lines.join('\n')}\n`;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildPdf(type, columns, rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const reportTitle = `${titleCase(type)} report`;
    const generatedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    doc.fontSize(20).text(reportTitle, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${generatedAt}`);
    doc.moveDown(1.5);

    const tableWidths = columns.map((column) => {
      const values = rows.map((row) => String(row[column] ?? ''));
      return Math.max(column.length, ...values.map((value) => value.length), 8);
    });

    const renderRow = (values) => {
      const line = values
        .map((value, index) => String(value ?? '').padEnd(tableWidths[index], ' '))
        .join(' | ');
      doc.fontSize(9).text(line);
    };

    renderRow(columns.map((column) => titleCase(column)));
    doc.moveDown(0.25);

    if (rows.length === 0) {
      doc.text('No records available for this report.');
    } else {
      for (const row of rows) {
        renderRow(columns.map((column) => row[column] ?? ''));
      }
    }

    doc.end();
  });
}

async function getStudentRows({ Student, Allocation, Room }) {
  const students = await Student.find({}).sort({ usn: 1 }).lean();
  const allocations = await Allocation.find({ status: 'active' }).lean();
  const roomMap = new Map();

  for (const allocation of allocations) {
    const room = await Room.findById(allocation.roomId).lean();
    if (room) {
      roomMap.set(String(allocation.studentId), room);
    }
  }

  return students.map((student) => {
    const room = roomMap.get(String(student._id));
    return {
      usn: student.usn,
      name: student.name,
      email: student.email,
      phone: student.phone,
      roomNo: room ? room.roomNo : '',
      block: room ? room.block : '',
      floor: room ? room.floor : ''
    };
  });
}

async function getFeeRows({ Fee, Student }) {
  const feeDocs = await Fee.find({}).sort({ dueDate: 1 }).lean();
  const studentIds = feeDocs.map((fee) => fee.studentId).filter(Boolean);
  const students = await Student.find({ _id: { $in: studentIds } }).lean();
  const studentMap = new Map(students.map((student) => [String(student._id), student]));

  return feeDocs.map((fee) => {
    const student = studentMap.get(String(fee.studentId));
    const amountDue = Number(fee.amountDue || 0);
    const totalPaid = Number(fee.totalPaid || 0);
    const balance = amountDue - totalPaid;
    const status = totalPaid === 0 ? 'Due' : (balance > 0 ? 'Partially Paid' : 'Paid');

    return {
      usn: student ? student.usn : '',
      studentName: student ? student.name : '',
      amountDue: amountDue.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      balance: balance.toFixed(2),
      dueDate: formatDate(fee.dueDate),
      status
    };
  });
}

async function getComplaintRows({ Complaint, Student }) {
  const complaints = await Complaint.find({}).sort({ createdAt: -1 }).lean();
  const studentIds = complaints.map((complaint) => complaint.studentId).filter(Boolean);
  const students = await Student.find({ _id: { $in: studentIds } }).lean();
  const studentMap = new Map(students.map((student) => [String(student._id), student]));

  return complaints.map((complaint) => {
    const student = studentMap.get(String(complaint.studentId));
    return {
      complaintId: String(complaint._id),
      usn: student ? student.usn : '',
      studentName: student ? student.name : '',
      category: complaint.category,
      status: complaint.status,
      description: complaint.description,
      remarks: complaint.remarks || '',
      createdAt: formatDate(complaint.createdAt)
    };
  });
}

function createReportsRouter(options = {}) {
  const router = express.Router();
  const getModels = () => {
    const models = require('../models');
    return {
      Student: options.Student || models.Student,
      Allocation: options.Allocation || models.Allocation,
      Room: options.Room || models.Room,
      Fee: options.Fee || models.Fee,
      Complaint: options.Complaint || models.Complaint
    };
  };

  const fetchRowsByType = async (type, models) => {
    if (type === REPORT_TYPES.student) {
      return getStudentRows(models);
    }
    if (type === REPORT_TYPES.fee) {
      return getFeeRows(models);
    }
    if (type === REPORT_TYPES.complaint) {
      return getComplaintRows(models);
    }
    return null;
  };

  router.get('/:type/:format?', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const type = normalizeType(req.params.type);
      const format = normalizeFormat(req.query.format || req.params.format || 'csv');

      if (!REPORT_TYPES[type]) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Unknown report type', { type: 'Unknown report type' }));
      }

      if (!REPORT_FORMATS[format]) {
        return res.status(400).json(errorBody('VALIDATION_ERROR', 'Unknown report format', { format: 'Unknown report format' }));
      }

      const models = getModels();
      const rows = await fetchRowsByType(type, models);
      const columns = REPORT_COLUMNS[type];
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === REPORT_FORMATS.csv) {
        const csv = toCsv(columns, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${timestamp}.csv"`);
        return res.send(csv);
      }

      const pdfBuffer = await buildPdf(type, columns, rows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${timestamp}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createReportsRouter, REPORT_TYPES, REPORT_FORMATS, REPORT_COLUMNS, toCsv, buildPdf };

""" ,{"content":"const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const mongoose = require('mongoose');
const { createHealthRouter } = require('./routes/health');
const { createAuthRouter } = require('./routes/auth');
const { createSessionRouter } = require('./routes/authSession');
const { createRoomsRouter } = require('./routes/rooms');
const { createStudentsRouter } = require('./routes/students');
const { createAllocationsRouter } = require('./routes/allocations');
const { createVisitorsRouter } = require('./routes/visitors');
const { createComplaintsRouter } = require('./routes/complaints');
const { createReportsRouter } = require('./routes/reports');
const { SESSION_COOKIE_NAME } = require('./config/auth');

function parseTrustProxy(value) {
  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

function createApp({
  getDatabaseStatus = () => (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'),
  authConfig,
  loginService,
  sessionStore,
  frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  trustProxy = process.env.TRUST_PROXY
} = {}) {
  const app = express();

  const proxyHops = parseTrustProxy(trustProxy);
  if (proxyHops) {
    app.set('trust proxy', proxyHops);
  }

  app.use(helmet());
  app.use(cors({ origin: frontendOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', createHealthRouter(getDatabaseStatus));

  const sessionsEnabled = Boolean(authConfig && authConfig.sessionSecret && loginService);

  if (sessionsEnabled) {
    app.use('/api', session({
      name: SESSION_COOKIE_NAME,
      secret: authConfig.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: 'auto',
        maxAge: Math.round(authConfig.sessionTimeoutMinutes * 60000)
      }
    }));
  }

  app.use('/api/auth', createAuthRouter());
  if (sessionsEnabled) {
    app.use('/api/auth', createSessionRouter({ loginService, cookieName: SESSION_COOKIE_NAME }));
  }
  app.use('/api/rooms', createRoomsRouter());
  app.use('/api/students', createStudentsRouter());
  app.use('/api/allocations', createAllocationsRouter());
  app.use('/api/visitors', createVisitorsRouter());
  app.use('/api/complaints', createComplaintsRouter());
  app.use('/api/reports', createReportsRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err, _req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be valid JSON',
          details: {}
        }
      });
    }

    if (err) {
      console.error('Unhandled error:', err && err.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again',
          details: {}
        }
      });
    }

    return next();
  });

  return app;
}

module.exports = { createApp };
""""} ,{"path":"backend/src/app.js"} ]
