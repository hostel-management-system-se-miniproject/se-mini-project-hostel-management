const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { AllocationError } = require('../src/services/allocationService');
const { createAllocationsRouter } = require('../src/routes/allocations');

const admin = { id: 'admin', role: 'admin', usn: null };
const student = { id: 'student', role: 'student', usn: 'PES1UG24CS001' };

function buildApp(sessionUser, options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/allocations', createAllocationsRouter(options));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again', details: {} }
    });
  });
  return app;
}

function assertError(response, status, code, details) {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
  if (details) assert.deepEqual(response.body.error.details, details);
}

test('reallocate and vacate routes require admin before validation', async () => {
  const id = new mongoose.Types.ObjectId().toString();
  for (const sessionUser of [null, student]) {
    const app = buildApp(sessionUser);
    const expected = sessionUser ? [403, 'FORBIDDEN'] : [401, 'SESSION_EXPIRED'];
    assertError(await request(app).put(`/api/allocations/${id}/reallocate`).send({}), ...expected);
    assertError(await request(app).post(`/api/allocations/${id}/vacate`).send({}), ...expected);
  }
});

test('routes pass params and bodies to injectable services and map errors', async () => {
  const id = new mongoose.Types.ObjectId().toString();
  const calls = [];
  const app = buildApp(admin, {
    reallocateAllocation: async (input) => {
      calls.push(['reallocate', input]);
      return { id: 'new-id', usn: student.usn, room: 'A-205', status: 'active' };
    },
    vacateAllocation: async (input) => {
      calls.push(['vacate', input]);
      return { id, usn: student.usn, status: 'inactive' };
    }
  });

  const reallocated = await request(app)
    .put(`/api/allocations/${id}/reallocate`)
    .send({ roomId: '507f1f77bcf86cd799439011' });
  assert.equal(reallocated.status, 200);
  assert.equal(reallocated.body.success, true);
  assert.equal(reallocated.body.data.status, 'active');
  const vacated = await request(app).post(`/api/allocations/${id}/vacate`).send({ confirm: true });
  assert.equal(vacated.status, 200);
  assert.equal(vacated.body.data.status, 'inactive');
  assert.deepEqual(calls, [
    ['reallocate', { allocationId: id, roomId: '507f1f77bcf86cd799439011' }],
    ['vacate', { allocationId: id, confirm: true }]
  ]);

  const errorApp = buildApp(admin, {
    vacateAllocation: async () => {
      throw new AllocationError('CONFIRMATION_REQUIRED', 400, 'Confirmation is required');
    }
  });
  assertError(
    await request(errorApp).post(`/api/allocations/${id}/vacate`).send({}),
    400,
    'CONFIRMATION_REQUIRED',
    {}
  );
});
