// HMS-11 (IT-06): GET /api/fees/{usn}. Uses in-memory fakes, so no MongoDB is needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createFeesRouter } = require('../src/routes/fees');

const OWN = { _id: 'stu-1', usn: 'PES1UG24CS001', name: 'Asha Rao' };
const OTHER = { _id: 'stu-2', usn: 'PES1UG24CS002', name: 'Ravi Kumar' };
const NO_FEE = { _id: 'stu-3', usn: 'PES1UG24CS003', name: 'Meena Iyer' };

function buildModels(feeOverrides = {}) {
  const students = [OWN, OTHER, NO_FEE];
  const fees = [
    {
      _id: 'fee-1',
      studentId: 'stu-1',
      amountDue: 50000,
      totalPaid: 20000,
      dueDate: new Date('2099-11-30T00:00:00.000Z'),
      payments: [
        { amount: 12000, paidOn: new Date('2026-10-05T00:00:00.000Z'), recordedBy: 'a1', recordedAt: new Date('2026-10-05T08:00:00.000Z') },
        { amount: 8000, paidOn: new Date('2026-10-20T00:00:00.000Z'), recordedBy: 'a1', recordedAt: new Date('2026-10-20T08:00:00.000Z') }
      ],
      ...feeOverrides
    },
    {
      _id: 'fee-2',
      studentId: 'stu-2',
      amountDue: 30000,
      totalPaid: 0,
      dueDate: new Date('2099-11-30T00:00:00.000Z'),
      payments: []
    }
  ];

  const chain = (value) => ({ select() { return this; }, lean: () => Promise.resolve(value) });
  return {
    Student: { findOne: (filter) => chain(students.find((item) => item.usn === filter.usn) || null) },
    Fee: { findOne: (filter) => chain(fees.find((item) => item.studentId === filter.studentId) || null) }
  };
}

function buildApp(sessionUser, feeOverrides) {
  const app = express();
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/fees', createFeesRouter(buildModels(feeOverrides)));
  return app;
}

const student = { id: 'u1', role: 'student', usn: 'PES1UG24CS001' };
const admin = { id: 'a1', role: 'admin', usn: null };

test('IT-06 a student reads their own fee: amount due, paid, balance, due date, status and payment history', async () => {
  const response = await request(buildApp(student)).get('/api/fees/PES1UG24CS001');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  const data = response.body.data;
  assert.equal(data.usn, 'PES1UG24CS001');
  assert.equal(data.studentName, 'Asha Rao');
  assert.equal(data.amountDue, 50000);
  assert.equal(data.totalPaid, 20000);
  assert.equal(data.balance, 30000);
  assert.ok(data.dueDate);
  assert.ok(data.status);
  assert.equal(data.payments.length, 2);
  assert.equal(data.payments[0].amount, 12000);
});

test('the USN in the path is case-insensitive', async () => {
  const response = await request(buildApp(student)).get('/api/fees/pes1ug24cs001');

  assert.equal(response.status, 200);
  assert.equal(response.body.data.usn, 'PES1UG24CS001');
});

test('a student cannot read another student fee page (403)', async () => {
  const response = await request(buildApp(student)).get('/api/fees/PES1UG24CS002');

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
  assert.equal(response.body.data, undefined);
});

test('an admin can read any student fee', async () => {
  const response = await request(buildApp(admin)).get('/api/fees/PES1UG24CS002');

  assert.equal(response.status, 200);
  assert.equal(response.body.data.usn, 'PES1UG24CS002');
  assert.deepEqual(response.body.data.payments, []);
});

test('a student with no fee record gets 404 NOT_FOUND with a clear message', async () => {
  const response = await request(buildApp({ id: 'u3', role: 'student', usn: 'PES1UG24CS003' })).get('/api/fees/PES1UG24CS003');

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
  assert.match(response.body.error.message, /No fee record/);
});

test('an admin asking for an unknown USN gets 404', async () => {
  const response = await request(buildApp(admin)).get('/api/fees/PES1UG24CS999');

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('no session returns 401 SESSION_EXPIRED', async () => {
  const response = await request(buildApp(null)).get('/api/fees/PES1UG24CS001');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'SESSION_EXPIRED');
});

test('the status and balance reflect a payment that brings the fee to zero', async () => {
  const paidUp = await request(buildApp(student, { totalPaid: 50000 })).get('/api/fees/PES1UG24CS001');

  assert.equal(paidUp.body.data.balance, 0);
  assert.equal(paidUp.body.data.status, 'Paid');
});
