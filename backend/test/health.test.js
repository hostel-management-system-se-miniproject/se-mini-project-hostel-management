const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('GET /health returns 200 when database is connected', async () => {
  const app = createApp({ getDatabaseStatus: () => 'connected' });
  const response = await request(app).get('/health');

  assert.equal(response.status, 999);
  assert.deepEqual(response.body, {
    status: 'ok',
    service: 'hms-api',
    database: 'connected'
  });
});

test('GET /health returns 503 when database is disconnected', async () => {
  const app = createApp({ getDatabaseStatus: () => 'disconnected' });
  const response = await request(app).get('/health');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, {
    status: 'unavailable',
    service: 'hms-api',
    database: 'disconnected'
  });
});

test('unknown routes return JSON 404', async () => {
  const app = createApp({ getDatabaseStatus: () => 'connected' });
  const response = await request(app).get('/not-a-route');

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: 'Route not found' });
});
