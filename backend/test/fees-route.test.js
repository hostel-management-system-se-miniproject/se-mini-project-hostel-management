
'use strict';

const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../test-support/db');
const { User, Student, Fee } = require('../src/models');
const { createFeesRouter } = require('../src/routes/fees');

const admin = {
  id: new mongoose.Types.ObjectId().toString(),
  role: 'admin',
  usn: null
};

before(async () => {
  await connectTestDb();
  await Promise.all([User.init(), Student.init(), Fee.init()]);
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function buildApp(sessionUser, options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/fees', createFeesRouter(options));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: {} }
    });
  });
  return app;
}

function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
}

async function createStudent(number) {
  const user = await User.create({
    email: `fee-student${number}@pes.edu`,
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

  return {
    user,
    student,
    sessionUser: { id: String(user._id), role: 'student', usn: student.usn }
  };
}

async function createFee(student, amountDue = 1000) {
  return Fee.create({
    studentId: student._id,
    amountDue,
    dueDate: new Date('2026-12-31T00:00:00.000Z')
  });
}

test('fee endpoints require a session', async () => {
  const app = buildApp(null);
  const id = new mongoose.Types.ObjectId().toString();

  assertError(await request(app).get('/api/fees'), 401, 'SESSION_EXPIRED');
  assertError(
    await request(app).post('/api/fees').send({}),
    401,
    'SESSION_EXPIRED'
  );
  assertError(
    await request(app).post(`/api/fees/${id}/payments`).send({ amount: 10 }),
    401,
    'SESSION_EXPIRED'
  );
});

test('only admins can create fees, list all fees, and record payments', async () => {
  const student = await createStudent(1);
  const fee = await createFee(student.student);
  const app = buildApp(student.sessionUser);

  assertError(
    await request(app).post('/api/fees').send({
      studentId: String(student.student._id),
      amountDue: 1000,
      dueDate: '2026-12-31'
    }),
    403,
    'FORBIDDEN'
  );
  assertError(await request(app).get('/api/fees'), 403, 'FORBIDDEN');
  assertError(
    await request(app).post(`/api/fees/${fee._id}/payments`).send({ amount: 10 }),
    403,
    'FORBIDDEN'
  );
});

test('admin creates a fee and duplicate student fees return FEE_EXISTS', async () => {
  const student = await createStudent(2);
  const app = buildApp(admin);
  const payload = {
    studentId: String(student.student._id),
    amountDue: 1000,
    dueDate: '2026-12-31'
  };

  const created = await request(app).post('/api/fees').send(payload);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.amountDue, 1000);
  assert.equal(created.body.data.totalPaid, 0);
  assert.equal(created.body.data.balance, 1000);
  assert.equal(created.body.data.status, 'Pending');

  const duplicate = await request(app).post('/api/fees').send(payload);
  assertError(duplicate, 409, 'FEE_EXISTS');
  assert.equal(await Fee.countDocuments({ studentId: student.student._id }), 1);
});

test('student can read only their own fee record', async () => {
  const owner = await createStudent(3);
  const other = await createStudent(4);
  const fee = await createFee(owner.student);

  const ownResponse = await request(buildApp(owner.sessionUser))
    .get(`/api/fees/${fee._id}`);
  assert.equal(ownResponse.status, 200);
  assert.equal(ownResponse.body.data.studentId, String(owner.student._id));

  assertError(
    await request(buildApp(other.sessionUser)).get(`/api/fees/${fee._id}`),
    403,
    'FORBIDDEN'
  );
});

test('rejects zero and negative payment amounts without changing the fee', async () => {
  const student = await createStudent(5);
  const fee = await createFee(student.student);
  const app = buildApp(admin);

  for (const amount of [0, -1]) {
    assertError(
      await request(app).post(`/api/fees/${fee._id}/payments`).send({ amount }),
      400,
      'VALIDATION_ERROR'
    );
  }

  const stored = await Fee.findById(fee._id).lean();
  assert.equal(stored.totalPaid, 0);
  assert.equal(stored.payments.length, 0);
});

test('accepts exact-balance payments and records payment history', async () => {
  const student = await createStudent(6);
  const fee = await createFee(student.student, 500);
  const response = await request(buildApp(admin))
    .post(`/api/fees/${fee._id}/payments`)
    .send({ amount: 500, paidOn: '2026-10-28' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.totalPaid, 500);
  assert.equal(response.body.data.balance, 0);
  assert.equal(response.body.data.status, 'Paid');
  assert.equal(response.body.data.payments.length, 1);
  assert.equal(response.body.data.payments[0].amount, 500);
  assert.equal(response.body.data.payments[0].recordedBy, admin.id);
});

test('rejects payments exceeding the balance without changing the fee', async () => {
  const student = await createStudent(7);
  const fee = await createFee(student.student, 500);
  const response = await request(buildApp(admin))
    .post(`/api/fees/${fee._id}/payments`)
    .send({ amount: 501 });

  assertError(response, 400, 'PAYMENT_EXCEEDS_BALANCE');

  const stored = await Fee.findById(fee._id).lean();
  assert.equal(stored.totalPaid, 0);
  assert.equal(stored.payments.length, 0);
});

test('fee list supports status filters', async () => {
  const paidStudent = await createStudent(8);
  const pendingStudent = await createStudent(9);
  const paidFee = await createFee(paidStudent.student, 200);
  await createFee(pendingStudent.student, 300);

  await Fee.updateOne(
    { _id: paidFee._id },
    { $set: { totalPaid: 200 } }
  );

  const app = buildApp(admin);
  const paid = await request(app).get('/api/fees?status=paid');
  const pending = await request(app).get('/api/fees?status=pending');

  assert.equal(paid.status, 200);
  assert.equal(paid.body.data.length, 1);
  assert.equal(paid.body.data[0].status, 'Paid');
  assert.equal(pending.status, 200);
  assert.equal(pending.body.data.length, 1);
  assert.equal(pending.body.data[0].status, 'Pending');
});

test('fee records cannot be deleted through the API', async () => {
  const response = await request(buildApp(admin))
    .delete(`/api/fees/${new mongoose.Types.ObjectId()}`);

  assert.equal(response.status, 404);
});
