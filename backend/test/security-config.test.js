'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');

const FRONTEND = 'https://app.example.edu';

function buildApp(options = {}) {
  const loginService = {
    login: async () => ({ user: { id: 'u1', role: 'student' }, profile: { usn: 'PES1UG24CS001', name: 'Ravi Kumar' } }),
    describeUser: async () => ({ role: 'student', usn: 'PES1UG24CS001', name: 'Ravi Kumar' })
  };
  const authConfig = { sessionSecret: 'test-secret', sessionTimeoutMinutes: 30 };
  return createApp({
    getDatabaseStatus: () => 'connected',
    authConfig,
    loginService,
    frontendOrigin: FRONTEND,
    ...options
  });
}

const credentials = { identifier: 'PES1UG24CS001', password: 'Pass@123' };

test('security headers from helmet are present and the server does not announce Express', async () => {
  const response = await request(buildApp()).get('/health');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.ok(response.headers['content-security-policy']);
  assert.ok(response.headers['strict-transport-security']);
  assert.ok(response.headers['x-frame-options']);
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('CORS names only the configured frontend origin, never * and never another site', async () => {
  const app = buildApp();

  // The cors package answers with the one configured origin. A browser on any
  // other site sees a mismatch and blocks the response.
  const allowed = await request(app).get('/health').set('Origin', FRONTEND);
  assert.equal(allowed.headers['access-control-allow-origin'], FRONTEND);
  assert.equal(allowed.headers['access-control-allow-credentials'], 'true');

  const other = await request(app).get('/health').set('Origin', 'https://evil.example.com');
  assert.equal(other.headers['access-control-allow-origin'], FRONTEND);
  assert.notEqual(other.headers['access-control-allow-origin'], 'https://evil.example.com');

  const preflight = await request(app)
    .options('/api/auth/login')
    .set('Origin', 'https://evil.example.com')
    .set('Access-Control-Request-Method', 'POST');
  assert.equal(preflight.headers['access-control-allow-origin'], FRONTEND);
  assert.notEqual(preflight.headers['access-control-allow-origin'], '*');
});

test('the session cookie is HttpOnly and has no Secure flag over plain HTTP', async () => {
  const response = await request(buildApp()).post('/api/auth/login').send(credentials);
  assert.equal(response.status, 200);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.doesNotMatch(cookie, /;\s*Secure/i);
});

test('behind an HTTPS proxy with TRUST_PROXY set, the session cookie is Secure', async () => {
  const response = await request(buildApp({ trustProxy: '1' }))
    .post('/api/auth/login')
    .set('X-Forwarded-Proto', 'https')
    .send(credentials);
  assert.equal(response.status, 200);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /;\s*Secure/i);
});

test('without TRUST_PROXY a forwarded HTTPS header is ignored, so nobody can fake it', async () => {
  const response = await request(buildApp({ trustProxy: '' }))
    .post('/api/auth/login')
    .set('X-Forwarded-Proto', 'https')
    .send(credentials);
  assert.doesNotMatch(response.headers['set-cookie'][0], /;\s*Secure/i);
});

test('an unexpected error returns a generic 500 with no message, path or stack', async () => {
  const secretMessage = 'connect ECONNREFUSED mongodb://admin:hunter2@db.internal:27017 at /srv/app/db.js:10:5';
  const app = buildApp({
    loginService: {
      login: async () => {
        throw new Error(secretMessage);
      },
      describeUser: async () => ({})
    }
  });
  const originalError = console.error;
  console.error = () => {};
  let response;
  try {
    response = await request(app).post('/api/auth/login').send(credentials);
  } finally {
    console.error = originalError;
  }

  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.equal(response.body.error.message, 'Something went wrong. Please try again');
  const text = JSON.stringify(response.body);
  assert.doesNotMatch(text, /hunter2|ECONNREFUSED|\/srv\/app|\bat\b.*:\d+:\d+|stack/i);
});

// .env.example must list every environment variable the backend reads, with
// placeholders only (HMS-22).
function backendSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return backendSourceFiles(fullPath);
    }
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function readEnvExample() {
  const text = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) {
      values.set(match[1], match[2]);
    }
  }
  return values;
}

test('.env.example lists every environment variable the backend source reads', () => {
  const listed = readEnvExample();
  const used = new Set();
  for (const file of backendSourceFiles(path.join(__dirname, '..', 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\benv\.([A-Z][A-Z0-9_]*)\b/g)) {
      used.add(match[1]);
    }
  }
  assert.ok(used.size >= 8, 'the scan should find the backend variables');
  const missing = [...used].filter((name) => !listed.has(name));
  assert.deepEqual(missing, []);
});

test('.env.example holds placeholders only, never a real credential', () => {
  const listed = readEnvExample();
  for (const name of ['SESSION_SECRET']) {
    assert.match(listed.get(name), /change-me|<.+>/i, `${name} must be a placeholder`);
  }
  for (const [name, value] of listed) {
    const hasCredentials = /\/\/[^/\s:@<]+:[^/\s@<]+@/.test(value);
    assert.equal(hasCredentials, false, `${name} must not contain a user and password`);
  }
});
