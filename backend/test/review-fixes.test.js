'use strict';

const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../test-support/db');
const { User, Student, Fee, Complaint } = require('../src/models');
const { createFeesRouter, toFeeView } = require('../src/routes/fees');
const { createComplaintsRouter } = require('../src/routes/complaints');

const admin = { id: new mongoose.Types.ObjectId().toString(), role: 'admin', usn: null };

before(async () => {
  await connectTestDb();
  await Promise.all([User.init(), Student.init(), Fee.init(), Complaint.init()]);
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function buildApp(sessionUser) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/fees', createFeesRouter());
  app.use('/api/complaints', createComplaintsRouter());
  return app;
}

async function createStudent(number) {
  const user = await User.create({
    email: `review${number}@pes.edu`,
    passwordHash: 'hash',
    role: 'student'
  });
  const student = await Student.create({
    userId: user._id,
    usn: `PES1UG24CS${String(number).padStart(3, '0')}`,
    name: `Student ${number}`,
    email: user.email,
    phone: `90000000${String(number).padStart(2, '0')}`
  });
  return { user, student, sessionUser: { id: String(user._id), role: 'student', usn: student.usn } };
}

function utcDay(offsetDays) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
}

test('admin creates a fee by USN (API contract endpoint 12)', async () => {
  const { student } = await createStudent(1);
  const response = await request(buildApp(admin))
    .post('/api/fees')
    .send({ usn: student.usn, amountDue: 45000, dueDate: '2099-12-31' });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.amountDue, 45000);
  assert.equal(await Fee.countDocuments({ studentId: student._id }), 1);
});

test('fee creation rejects a malformed USN and reports an unknown USN as NOT_FOUND', async () => {
  const app = buildApp(admin);
  const bad = await request(app)
    .post('/api/fees')
    .send({ usn: 'bad usn', amountDue: 1000, dueDate: '2099-12-31' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'INVALID_USN');

  const unknown = await request(app)
    .post('/api/fees')
    .send({ usn: 'PES1UG24CS999', amountDue: 1000, dueDate: '2099-12-31' });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, 'NOT_FOUND');
});

test('a fee due today is not overdue, a fee due yesterday is', () => {
  const base = { amountDue: 1000, totalPaid: 0 };
  assert.equal(toFeeView({ ...base, dueDate: utcDay(0) }).status, 'Pending');
  assert.equal(toFeeView({ ...base, dueDate: utcDay(-1) }).status, 'Overdue');
  assert.equal(toFeeView({ ...base, totalPaid: 1000, dueDate: utcDay(-1) }).status, 'Paid');
});

test('the overdue filter agrees with the overdue status', async () => {
  const today = await createStudent(2);
  const late = await createStudent(3);
  await Fee.create({ studentId: today.student._id, amountDue: 1000, dueDate: utcDay(0) });
  await Fee.create({ studentId: late.student._id, amountDue: 1000, dueDate: utcDay(-1) });

  const response = await request(buildApp(admin)).get('/api/fees?status=overdue');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].usn, late.student.usn);
});

test('a closed complaint cannot be reopened or changed again', async () => {
  const { student, user } = await createStudent(4);
  const complaint = await Complaint.create({
    studentId: student._id,
    category: 'Plumbing',
    description: 'Leaking tap',
    status: 'Open',
    isOpen: true,
    history: [{ status: 'Open', remarks: null, at: new Date(), by: user._id }]
  });
  const app = buildApp(admin);

  const resolved = await request(app)
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'Resolved', remarks: 'Washer replaced' });
  assert.equal(resolved.status, 200);

  const reopened = await request(app)
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'In Progress', remarks: 'Trying to reopen' });
  assert.equal(reopened.status, 400);
  assert.equal(reopened.body.error.code, 'VALIDATION_ERROR');

  const stored = await Complaint.findById(complaint._id).lean();
  assert.equal(stored.status, 'Resolved');
  assert.equal(stored.isOpen, false);
  assert.equal(stored.history.length, 2);
});
