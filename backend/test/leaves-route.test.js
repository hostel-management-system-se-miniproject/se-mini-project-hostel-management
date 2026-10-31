const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const request = require('supertest');
const { createLeavesRouter, parseDateOnly } = require('../src/routes/leaves');

// These tests use small fake models, so they need no database.
const studentUser = { id: 'user-1', role: 'student', usn: 'PES1UG24CS001' };
const otherUser = { id: 'user-2', role: 'student', usn: 'PES1UG24CS002' };
const adminUser = { id: 'admin-1', role: 'admin', usn: null };

function createFakeModels(students = { 'user-1': 's1', 'user-2': 's2' }) {
  const leaves = [];
  const Student = {
    findOne: ({ userId }) => ({
      lean: async () => (students[userId] ? { _id: students[userId], userId } : null)
    })
  };
  const Leave = {
    leaves,
    create: async (data) => {
      const leave = { _id: `leave-${leaves.length + 1}`, createdAt: new Date(2026, 9, 20 + leaves.length), decidedAt: null, ...data };
      leaves.push(leave);
      return leave;
    },
    find: (filter) => ({
      sort: () => ({
        lean: async () => leaves
          .filter((item) => item.studentId === filter.studentId)
          .sort((a, b) => b.createdAt - a.createdAt)
      })
    })
  };
  return { Leave, Student };
}

function buildApp(sessionUser, models) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/leaves', createLeavesRouter(models));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again', details: {} } });
  });
  return app;
}

const validBody = { startDate: '2026-11-01', endDate: '2026-11-05', reason: 'Family function' };

test('parseDateOnly accepts real dates and rejects everything else', () => {
  assert.equal(parseDateOnly('2026-11-01').toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(parseDateOnly('2026-02-30'), null);
  assert.equal(parseDateOnly('01-11-2026'), null);
  assert.equal(parseDateOnly(''), null);
  assert.equal(parseDateOnly(undefined), null);
  assert.equal(parseDateOnly(20261101), null);
});

test('leave endpoints return 401 without a session', async () => {
  const app = buildApp(null, createFakeModels());
  assert.equal((await request(app).post('/api/leaves').send(validBody)).status, 401);
  assert.equal((await request(app).get('/api/leaves/mine')).status, 401);
});

test('leave endpoints return 403 for an admin', async () => {
  const app = buildApp(adminUser, createFakeModels());
  assert.equal((await request(app).post('/api/leaves').send(validBody)).status, 403);
  assert.equal((await request(app).get('/api/leaves/mine')).status, 403);
});

test('a student can submit a leave request and it starts as Pending', async () => {
  const models = createFakeModels();
  const response = await request(buildApp(studentUser, models)).post('/api/leaves').send(validBody);

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.deepEqual(
    { ...response.body.data, id: undefined },
    { id: undefined, startDate: '2026-11-01', endDate: '2026-11-05', reason: 'Family function', status: 'Pending' }
  );
  assert.equal(models.Leave.leaves[0].studentId, 's1');
});

test('a one-day leave is allowed and the reason is trimmed', async () => {
  const models = createFakeModels();
  const response = await request(buildApp(studentUser, models))
    .post('/api/leaves')
    .send({ startDate: '2026-11-01', endDate: '2026-11-01', reason: '  Exam  ' });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.reason, 'Exam');
});

test('an end date before the start date returns 400 and saves nothing', async () => {
  const models = createFakeModels();
  const response = await request(buildApp(studentUser, models))
    .post('/api/leaves')
    .send({ ...validBody, startDate: '2026-11-05', endDate: '2026-11-01' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.message, 'End date cannot be before start date');
  assert.equal(models.Leave.leaves.length, 0);
});

test('a missing or blank reason returns 400', async () => {
  const app = buildApp(studentUser, createFakeModels());
  for (const reason of [undefined, '', '   ', 42]) {
    const response = await request(app).post('/api/leaves').send({ ...validBody, reason });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    assert.equal(response.body.error.message, 'Reason is required');
  }
});

test('missing or malformed dates return 400', async () => {
  const app = buildApp(studentUser, createFakeModels());
  for (const body of [
    { ...validBody, startDate: undefined },
    { ...validBody, startDate: '01/11/2026' },
    { ...validBody, endDate: undefined },
    { ...validBody, endDate: '2026-13-01' }
  ]) {
    const response = await request(app).post('/api/leaves').send(body);
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
});

test('a student without a profile gets 404', async () => {
  const app = buildApp(studentUser, createFakeModels({}));
  const response = await request(app).post('/api/leaves').send(validBody);
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('GET /mine returns only the caller leaves, newest first', async () => {
  const models = createFakeModels();
  await models.Leave.create({ studentId: 's1', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-02'), reason: 'First', status: 'Approved', decidedAt: new Date('2026-10-30T10:00:00.000Z') });
  await models.Leave.create({ studentId: 's2', startDate: new Date('2026-11-03'), endDate: new Date('2026-11-04'), reason: 'Someone else', status: 'Pending' });
  await models.Leave.create({ studentId: 's1', startDate: new Date('2026-12-01'), endDate: new Date('2026-12-03'), reason: 'Second', status: 'Pending' });

  const response = await request(buildApp(studentUser, models)).get('/api/leaves/mine');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data.map((item) => item.reason), ['Second', 'First']);
  assert.equal(response.body.data[0].decidedAt, null);
  assert.equal(response.body.data[1].decidedAt, '2026-10-30T10:00:00.000Z');
  assert.equal(response.body.data[1].startDate, '2026-11-01');

  const other = await request(buildApp(otherUser, models)).get('/api/leaves/mine');
  assert.deepEqual(other.body.data.map((item) => item.reason), ['Someone else']);
});
