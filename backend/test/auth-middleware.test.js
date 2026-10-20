'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { ROLES, requireAuth, requireRole, selfOrAdmin } = require('../src/middleware/auth');

const student = { id: 's1', role: ROLES.STUDENT, usn: 'PES1UG24CS001' };
const admin = { id: 'a1', role: ROLES.ADMIN, usn: null };

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function run(middleware, req) {
  const res = fakeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

test('requireAuth rejects an anonymous request with 401 SESSION_EXPIRED', () => {
  const noSession = run(requireAuth, {});
  assert.equal(noSession.nextCalled, false);
  assert.equal(noSession.res.statusCode, 401);
  assert.equal(noSession.res.body.error.code, 'SESSION_EXPIRED');
  assert.equal(noSession.res.body.success, false);

  const emptySession = run(requireAuth, { session: {} });
  assert.equal(emptySession.res.statusCode, 401);
});

test('requireAuth lets a student and an admin through and sets req.user', () => {
  const studentReq = { session: { user: student } };
  assert.equal(run(requireAuth, studentReq).nextCalled, true);
  assert.deepEqual(studentReq.user, student);

  const adminReq = { session: { user: admin } };
  assert.equal(run(requireAuth, adminReq).nextCalled, true);
  assert.deepEqual(adminReq.user, admin);
});

test('requireRole returns 403 FORBIDDEN for the wrong role', () => {
  const { res, nextCalled } = run(requireRole(ROLES.ADMIN), { user: student });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('requireRole allows a listed role and returns 401 when nobody is logged in', () => {
  assert.equal(run(requireRole(ROLES.ADMIN), { user: admin }).nextCalled, true);
  assert.equal(run(requireRole(ROLES.STUDENT, ROLES.ADMIN), { user: student }).nextCalled, true);
  assert.equal(run(requireRole(ROLES.STUDENT, ROLES.ADMIN), { user: admin }).nextCalled, true);

  const anonymous = run(requireRole(ROLES.ADMIN), {});
  assert.equal(anonymous.res.statusCode, 401);
  assert.equal(anonymous.res.body.error.code, 'SESSION_EXPIRED');
});

test('requireRole needs at least one role', () => {
  assert.throws(() => requireRole(), /at least one role/);
});

test('selfOrAdmin lets a student use only their own USN', () => {
  const own = run(selfOrAdmin(), { user: student, params: { usn: 'PES1UG24CS001' } });
  assert.equal(own.nextCalled, true);

  const ownLower = run(selfOrAdmin(), { user: student, params: { usn: 'pes1ug24cs001' } });
  assert.equal(ownLower.nextCalled, true);

  const other = run(selfOrAdmin(), { user: student, params: { usn: 'PES1UG24CS002' } });
  assert.equal(other.nextCalled, false);
  assert.equal(other.res.statusCode, 403);
  assert.equal(other.res.body.error.code, 'FORBIDDEN');
});

test('selfOrAdmin lets an admin use any USN and blocks anonymous and incomplete users', () => {
  assert.equal(run(selfOrAdmin(), { user: admin, params: { usn: 'PES1UG24CS002' } }).nextCalled, true);

  const anonymous = run(selfOrAdmin(), { params: { usn: 'PES1UG24CS001' } });
  assert.equal(anonymous.res.statusCode, 401);

  const noUsn = run(selfOrAdmin(), { user: { id: 's9', role: ROLES.STUDENT, usn: null }, params: { usn: '' } });
  assert.equal(noUsn.res.statusCode, 403);

  const unknownRole = run(selfOrAdmin(), { user: { id: 'x', role: 'guest', usn: 'PES1UG24CS001' }, params: { usn: 'PES1UG24CS001' } });
  assert.equal(unknownRole.res.statusCode, 403);
});

test('selfOrAdmin can read the USN from a differently named path parameter', () => {
  const result = run(selfOrAdmin('studentUsn'), { user: student, params: { studentUsn: 'PES1UG24CS001' } });
  assert.equal(result.nextCalled, true);
});

// End-to-end check through Express. The test middleware stands in for
// express-session by reading the user from a header.
function buildApp() {
  const app = express();
  app.use((req, _res, next) => {
    const header = req.get('x-test-user');
    if (header) {
      req.session = { user: JSON.parse(header) };
    }
    next();
  });
  app.get('/any', requireAuth, (_req, res) => res.json({ ok: true }));
  app.get('/admin-only', requireAuth, requireRole(ROLES.ADMIN), (_req, res) => res.json({ ok: true }));
  app.get('/students/:usn/data', requireAuth, selfOrAdmin(), (_req, res) => res.json({ ok: true }));
  return app;
}

const as = (user) => JSON.stringify(user);

test('anonymous requests get 401 on every protected route', async () => {
  const app = buildApp();
  for (const path of ['/any', '/admin-only', '/students/PES1UG24CS001/data']) {
    const response = await request(app).get(path);
    assert.equal(response.status, 401, path);
    assert.equal(response.body.error.code, 'SESSION_EXPIRED', path);
  }
});

test('a student gets 403 on an admin route and 200 on their own data only', async () => {
  const app = buildApp();
  assert.equal((await request(app).get('/any').set('x-test-user', as(student))).status, 200);
  assert.equal((await request(app).get('/admin-only').set('x-test-user', as(student))).status, 403);
  assert.equal((await request(app).get('/students/PES1UG24CS001/data').set('x-test-user', as(student))).status, 200);
  assert.equal((await request(app).get('/students/PES1UG24CS002/data').set('x-test-user', as(student))).status, 403);
});

test('an admin gets 200 on admin routes and on any student data', async () => {
  const app = buildApp();
  assert.equal((await request(app).get('/admin-only').set('x-test-user', as(admin))).status, 200);
  assert.equal((await request(app).get('/students/PES1UG24CS002/data').set('x-test-user', as(admin))).status, 200);
});
