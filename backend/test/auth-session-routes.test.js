'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createLoginService } = require('../src/services/loginService');
const { createFakeAccountStore } = require('../test-support/fakeAccountStore');

function buildApp({ sessionTimeoutMinutes = 30 } = {}) {
  const store = createFakeAccountStore();
  store.addStudent({ usn: 'PES1UG24CS001', name: 'Ravi Kumar', email: 'student001@pes.edu', password: 'Pass@123' });
  store.addStudent({ usn: 'PES1UG24CS010', name: 'Asha Rao', email: 'student010@pes.edu', password: 'Pass@123' });
  store.addAdmin({ email: 'admin@pes.edu', password: 'Admin@123' });
  const authConfig = { maxFailedLogins: 5, lockoutMinutes: 15, sessionTimeoutMinutes, sessionSecret: 'test-secret' };
  const loginService = createLoginService({ store, config: authConfig });
  return createApp({ authConfig, loginService });
}

const studentLogin = { identifier: 'PES1UG24CS001', password: 'Pass@123' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('login returns the role, USN and name and sets an HttpOnly session cookie', async () => {
  const response = await request(buildApp()).post('/api/auth/login').send(studentLogin);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: 'Login successful',
    data: { role: 'student', usn: 'PES1UG24CS001', name: 'Ravi Kumar' }
  });
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /^hms\.sid=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test('an admin logs in by email and gets null for usn and name', async () => {
  const response = await request(buildApp()).post('/api/auth/login').send({ identifier: 'admin@pes.edu', password: 'Admin@123' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { role: 'admin', usn: null, name: null });
});

test('a wrong password and an unknown user return the same 401 body', async () => {
  const app = buildApp();
  const wrong = await request(app).post('/api/auth/login').send({ identifier: 'PES1UG24CS001', password: 'WrongPass1' });
  const unknown = await request(app).post('/api/auth/login').send({ identifier: 'PES1UG24CS999', password: 'Pass@123' });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  assert.deepEqual(wrong.body, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
  assert.equal(wrong.headers['set-cookie'], undefined);
});

test('the sixth login after five failures returns 423 and creates no session', async () => {
  const app = buildApp();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const failed = await request(app).post('/api/auth/login').send({ identifier: 'PES1UG24CS010', password: 'WrongPass1' });
    assert.equal(failed.status, 401);
  }
  const locked = await request(app).post('/api/auth/login').send({ identifier: 'PES1UG24CS010', password: 'Pass@123' });
  assert.equal(locked.status, 423);
  assert.equal(locked.body.error.code, 'ACCOUNT_LOCKED');
  assert.equal(locked.body.error.message, 'Account locked. Try again in 15 minute(s)');
  assert.equal(locked.body.error.details.remainingMinutes, 15);
  assert.equal(locked.headers['set-cookie'], undefined);
});

test('missing fields and a broken JSON body return 400 VALIDATION_ERROR', async () => {
  const app = buildApp();
  const missing = await request(app).post('/api/auth/login').send({ identifier: 'PES1UG24CS001' });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error.code, 'VALIDATION_ERROR');
  assert.equal(missing.body.error.message, 'Password is required');

  const broken = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"identifier":');
  assert.equal(broken.status, 400);
  assert.equal(broken.body.error.code, 'VALIDATION_ERROR');
});

test('GET /api/auth/me returns 401 without a session and the user with one', async () => {
  const app = buildApp();
  const anonymous = await request(app).get('/api/auth/me');
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.error.code, 'SESSION_EXPIRED');

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(studentLogin);
  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.deepEqual(me.body, { success: true, data: { role: 'student', usn: 'PES1UG24CS001', name: 'Ravi Kumar' } });
});

test('logout ends the session and the old cookie no longer works (UT-30)', async () => {
  const app = buildApp();
  const login = await request(app).post('/api/auth/login').send(studentLogin);
  const cookie = login.headers['set-cookie'][0].split(';')[0];

  const before = await request(app).get('/api/auth/me').set('Cookie', cookie);
  assert.equal(before.status, 200);

  const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
  assert.equal(logout.status, 200);
  assert.deepEqual(logout.body, { success: true, message: 'Logged out' });

  const after = await request(app).get('/api/auth/me').set('Cookie', cookie);
  assert.equal(after.status, 401);
  assert.equal(after.body.error.code, 'SESSION_EXPIRED');

  const logoutAgain = await request(app).post('/api/auth/logout').set('Cookie', cookie);
  assert.equal(logoutAgain.status, 401);
});

test('activity extends the session and inactivity ends it (NFR-03)', async () => {
  // A 3 second timeout stands in for 30 minutes. Cookie expiry is rounded to
  // whole seconds, so each pause is kept well away from the limit.
  const app = buildApp({ sessionTimeoutMinutes: 3 / 60 });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(studentLogin);

  await sleep(1500);
  assert.equal((await agent.get('/api/auth/me')).status, 200);
  await sleep(1500);
  assert.equal((await agent.get('/api/auth/me')).status, 200);

  await sleep(3800);
  const expired = await agent.get('/api/auth/me');
  assert.equal(expired.status, 401);
  assert.equal(expired.body.error.code, 'SESSION_EXPIRED');
});

test('the app still starts without session settings and /health works', async () => {
  const app = createApp({ getDatabaseStatus: () => 'connected' });
  assert.equal((await request(app).get('/health')).status, 200);
  assert.equal((await request(app).get('/api/auth/me')).status, 404);
});
