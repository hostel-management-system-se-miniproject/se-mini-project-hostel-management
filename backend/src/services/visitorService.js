'use strict';

const mongoose = require('mongoose');

class VisitorError extends Error {
  constructor(code, status, message, details = {}) {
    super(message);
    this.name = 'VisitorError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function validationError(message, details) {
  return new VisitorError('VALIDATION_ERROR', 400, message, details);
}

function parseIsoDateTime(value) {
  if (typeof value !== 'string' || !value.includes('T') || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return new Date(value);
}

function validateEntry(body) {
  const source = body && typeof body === 'object' ? body : {};
  const fields = [
    ['usn', 'Student USN is required'],
    ['name', 'Name is required'],
    ['contact', 'Contact is required'],
    ['purpose', 'Purpose is required'],
    ['entryTime', 'Entry time is required']
  ];
  const details = {};

  for (const [field, message] of fields) {
    if (typeof source[field] !== 'string' || source[field].trim() === '') {
      details[field] = message;
    }
  }
  if (Object.keys(details).length > 0) {
    throw validationError(details[fields.find(([field]) => details[field])[0]], details);
  }

  const usn = source.usn.trim().toUpperCase();
  const name = source.name.trim();
  const contact = source.contact.trim();
  const purpose = source.purpose.trim();
  const entryTime = parseIsoDateTime(source.entryTime.trim());

  if (!/^\d{1,15}$/.test(contact)) {
    throw validationError(
      'Contact must contain digits only (maximum 15 characters)',
      { contact: 'Contact must contain digits only (maximum 15 characters)' }
    );
  }
  if (!entryTime) {
    throw validationError('Enter a valid entry time', { entryTime: 'Enter a valid entry time' });
  }
  if (!/^[A-Z0-9]{13}$/.test(usn)) {
    throw new VisitorError(
      'INVALID_USN',
      400,
      'Enter a valid USN (13 alphanumeric characters, for example PES1UG24CS924)'
    );
  }

  return { value: { usn, name, contact, purpose, entryTime } };
}

function visitorRecord(visitor, usn = null, studentName) {
  const record = {
    id: String(visitor._id),
    usn,
    name: visitor.name,
    contact: visitor.contact,
    purpose: visitor.purpose,
    entryTime: visitor.entryTime,
    exitTime: visitor.exitTime || null
  };
  if (arguments.length >= 3) {
    record.studentName = studentName;
  }
  return record;
}

async function recordEntry(body, recordedById, models) {
  const { value } = validateEntry(body);
  const student = await models.Student.findOne({ usn: value.usn });
  if (!student) {
    throw new VisitorError('NOT_FOUND', 404, 'Student not found');
  }

  const visitor = await models.Visitor.create({
    studentId: student._id,
    name: value.name,
    contact: value.contact,
    purpose: value.purpose,
    entryTime: value.entryTime,
    recordedBy: recordedById
  });
  return visitorRecord(visitor, student.usn);
}

async function listVisitors(models) {
  const visitors = await models.Visitor.find().sort({ entryTime: -1, _id: -1 });
  const studentIds = [...new Set(visitors.map((visitor) => String(visitor.studentId)))];
  const students = studentIds.length > 0
    ? await models.Student.find({ _id: { $in: studentIds } })
    : [];
  const studentsById = new Map(students.map((student) => [String(student._id), student]));

  return visitors.map((visitor) => {
    const student = studentsById.get(String(visitor.studentId));
    return visitorRecord(
      visitor,
      student ? student.usn : null,
      student ? student.name : null
    );
  });
}

async function recordExit(id, body, models) {
  if (!mongoose.isValidObjectId(id)) {
    throw new VisitorError('NOT_FOUND', 404, 'Visitor not found');
  }

  const exitTimeValue = body && typeof body.exitTime === 'string'
    ? body.exitTime.trim()
    : body && body.exitTime;
  const exitTime = parseIsoDateTime(exitTimeValue);
  if (!exitTime) {
    throw validationError('Enter a valid exit time', { exitTime: 'Enter a valid exit time' });
  }

  const visitor = await models.Visitor.findById(id);
  if (!visitor) {
    throw new VisitorError('NOT_FOUND', 404, 'Visitor not found');
  }
  if (!(exitTime > visitor.entryTime)) {
    throw validationError(
      'Exit time must be after entry time',
      { exitTime: 'Exit time must be after entry time' }
    );
  }

  visitor.exitTime = exitTime;
  await visitor.save();
  const student = await models.Student.findById(visitor.studentId);
  return visitorRecord(visitor, student ? student.usn : null);
}

module.exports = {
  VisitorError,
  validateEntry,
  recordEntry,
  listVisitors,
  recordExit
};
