const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { test } = require('node:test');
const { createApp } = require('../src/app');
const { createAdminRouter } = require('../src/routes/admin');

const admin = { id: 'admin', role: 'admin', usn: null };
const student = { id: 'student', role: 'student', usn: 'PES1UG24CS001' };

function buildApp(sessionUser, options = {}) {
  const app = express();
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/admin', createAdminRouter(options));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again',
        details: {}
      }
    });
  });
  return app;
}

test('returns 401 without a session', async () => {
  const response = await request(buildApp()).get('/api/admin/dashboard');
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'SESSION_EXPIRED');
});

test('returns 403 for a student before calling the dashboard service', async () => {
  let queried = false;
  const response = await request(buildApp(student, {
    getAdminDashboard: async () => {
      queried = true;
      return {};
    }
  })).get('/api/admin/dashboard');
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
  assert.equal(queried, false);
});

test('returns injected dashboard data in the standard envelope', async () => {
  const data = { totalOccupancy: 2, totalCapacity: 4 };
  const response = await request(buildApp(admin, {
    getAdminDashboard: async () => data
  })).get('/api/admin/dashboard');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data });
});

test('passes service errors to the safe 500 handler', async () => {
  const response = await request(buildApp(admin, {
    getAdminDashboard: async () => {
      throw new Error('internal secret');
    }
  })).get('/api/admin/dashboard');
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again',
      details: {}
    }
  });
  assert.equal(JSON.stringify(response.body).includes('internal secret'), false);
});

test('the real app mounts and protects the admin dashboard route', async () => {
  const response = await request(createApp()).get('/api/admin/dashboard');
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'SESSION_EXPIRED');
});
