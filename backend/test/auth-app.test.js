const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('malformed JSON returns a safe 400 without a stack trace', async () => {
  const app = createApp({ getDatabaseStatus: () => 'connected' });
  const response = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{"usn": ');

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(JSON.stringify(response.body).includes('at '), false);
});

test('an empty body is reported as missing fields, not a crash', async () => {
  const app = createApp({ getDatabaseStatus: () => 'connected' });
  const response = await request(app).post('/api/auth/register').send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(Object.keys(response.body.error.details).sort(), ['email', 'name', 'password', 'phone', 'usn']);
});

test('GET on the register route is not allowed to create anything and returns the JSON 404', async () => {
  const app = createApp({ getDatabaseStatus: () => 'connected' });
  const response = await request(app).get('/api/auth/register');

  assert.equal(response.status, 404);
});
