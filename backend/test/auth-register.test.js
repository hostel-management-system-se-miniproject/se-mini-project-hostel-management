// Registration endpoint tests that need no database: the models are replaced by in-memory fakes that
// behave like the unique indexes (duplicate-key error 11000). Covers UT-01 to UT-05 and UT-28 for the API layer.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createAuthRouter } = require('../src/routes/auth');

function duplicateKeyError(field) {
  const error = new Error(`E11000 duplicate key error index: ${field}_1`);
  error.code = 11000;
  error.keyPattern = { [field]: 1 };
  return error;
}

function createFakes({ failStudentWith, failDeleteWith } = {}) {
  const users = [];
  const students = [];
  let nextId = 1;
  const User = {
    async create(doc) {
      if (users.some((u) => u.email === doc.email)) throw duplicateKeyError('email');
      const user = { _id: String(nextId++), ...doc };
      users.push(user);
      return user;
    },
    async deleteOne({ _id }) {
      if (failDeleteWith) throw failDeleteWith;
      const index = users.findIndex((u) => u._id === _id);
      if (index >= 0) users.splice(index, 1);
    }
  };
  const Student = {
    async create(doc) {
      if (failStudentWith) throw failStudentWith;
      if (students.some((s) => s.usn === doc.usn)) throw duplicateKeyError('usn');
      students.push({ ...doc });
      return doc;
    }
  };
  return { User, Student, users, students };
}

function makeApp(fakes) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ User: fakes.User, Student: fakes.Student }));
  return app;
}

const valid = {
  usn: 'PES1UG23CS001',
  name: 'Ravi Kumar',
  email: 'ravi@pes.edu',
  phone: '9876543210',
  password: 'Pass@123'
};

test('UT-01 registers a student with all valid fields and links the profile to the user', async () => {
  const fakes = createFakes();
  const response = await request(makeApp(fakes)).post('/api/auth/register').send(valid);

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    success: true,
    message: 'Registration successful',
    data: { usn: 'PES1UG23CS001', name: 'Ravi Kumar', email: 'ravi@pes.edu' }
  });
  assert.equal(fakes.users.length, 1);
  assert.equal(fakes.students.length, 1);
  assert.equal(fakes.students[0].userId, fakes.users[0]._id);
});

test('the password is stored only as a bcrypt hash and never returned', async () => {
  const fakes = createFakes();
  const response = await request(makeApp(fakes)).post('/api/auth/register').send(valid);

  const stored = fakes.users[0].passwordHash;
  assert.notEqual(stored, valid.password);
  assert.match(stored, /^\$2[aby]\$/);
  assert.equal(await bcrypt.compare(valid.password, stored), true);
  assert.equal(JSON.stringify(response.body).includes(valid.password), false);
  assert.equal(JSON.stringify(response.body).includes(stored), false);
});

test('the role is always student and is never taken from the request', async () => {
  const fakes = createFakes();
  await request(makeApp(fakes)).post('/api/auth/register').send({ ...valid, role: 'admin' });

  assert.equal(fakes.users[0].role, 'student');
});

test('the USN is stored in upper case', async () => {
  const fakes = createFakes();
  const response = await request(makeApp(fakes)).post('/api/auth/register').send({ ...valid, usn: 'pes1ug23cs001' });

  assert.equal(response.status, 201);
  assert.equal(fakes.students[0].usn, 'PES1UG23CS001');
});

test('UT-02 a duplicate USN returns 409 USN_EXISTS and leaves no orphan user', async () => {
  const fakes = createFakes();
  const app = makeApp(fakes);
  await request(app).post('/api/auth/register').send(valid);
  const response = await request(app).post('/api/auth/register').send({ ...valid, email: 'other@pes.edu' });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'USN_EXISTS');
  assert.equal(response.body.error.message, 'USN already registered');
  assert.equal(fakes.users.length, 1, 'the user created before the failed profile insert must be removed');
  assert.equal(fakes.students.length, 1);
});

test('UT-03 a duplicate email returns 409 EMAIL_EXISTS', async () => {
  const fakes = createFakes();
  const app = makeApp(fakes);
  await request(app).post('/api/auth/register').send(valid);
  const response = await request(app).post('/api/auth/register').send({ ...valid, usn: 'PES1UG23CS002' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'EMAIL_EXISTS');
  assert.equal(response.body.error.message, 'Email already registered');
  assert.equal(fakes.users.length, 1);
  assert.equal(fakes.students.length, 1);
});

test('UT-04 a missing phone number returns 400 with a field message', async () => {
  const fakes = createFakes();
  const withoutPhone = { ...valid };
  delete withoutPhone.phone;
  const response = await request(makeApp(fakes)).post('/api/auth/register').send(withoutPhone);

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.message, 'Phone number is required');
  assert.deepEqual(response.body.error.details, { phone: 'Phone number is required' });
  assert.equal(fakes.users.length, 0);
});

test('UT-04 a blank field counts as missing and every problem is reported', async () => {
  const fakes = createFakes();
  const response = await request(makeApp(fakes)).post('/api/auth/register').send({ usn: '', name: '   ', email: '', phone: '', password: '' });

  assert.equal(response.status, 400);
  assert.deepEqual(Object.keys(response.body.error.details).sort(), ['email', 'name', 'password', 'phone', 'usn']);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('UT-05 an invalid email returns 400 with a field message', async () => {
  const fakes = createFakes();
  const response = await request(makeApp(fakes)).post('/api/auth/register').send({ ...valid, email: 'ravi.pes.edu' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.message, 'Enter a valid email address');
  assert.equal(fakes.users.length, 0);
});

test('UT-28 a USN that is not 13 alphanumeric characters returns 400 INVALID_USN', async () => {
  for (const usn of ['PES1UG23CS01', 'PES1UG23CS0012', 'PES1UG23CS0-1']) {
    const fakes = createFakes();
    const response = await request(makeApp(fakes)).post('/api/auth/register').send({ ...valid, usn });

    assert.equal(response.status, 400, usn);
    assert.equal(response.body.error.code, 'INVALID_USN', usn);
    assert.match(response.body.error.message, /13 alphanumeric characters/);
    assert.equal(fakes.users.length, 0);
  }
});

test('a phone number with letters is rejected', async () => {
  const response = await request(makeApp(createFakes())).post('/api/auth/register').send({ ...valid, phone: '98765abc10' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.details.phone, 'Enter a valid phone number');
});

test('non-string values are rejected instead of crashing', async () => {
  const response = await request(makeApp(createFakes())).post('/api/auth/register')
    .send({ usn: 12345, name: ['x'], email: { a: 1 }, phone: 9876543210, password: 123456 });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('if the student profile insert fails the created user is removed', async () => {
  const fakes = createFakes({ failStudentWith: new Error('connection lost') });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await request(makeApp(fakes)).post('/api/auth/register').send(valid);

    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
    assert.equal(response.body.error.message, 'Something went wrong. Please try again');
    assert.equal(JSON.stringify(response.body).includes('connection lost'), false, 'internal details must not leak');
    assert.equal(fakes.users.length, 0, 'no orphan user may remain');
  } finally {
    console.error = originalError;
  }
});

test('a failed clean-up is logged and the request still gets a clear error', async () => {
  const fakes = createFakes({ failStudentWith: new Error('connection lost'), failDeleteWith: new Error('delete failed') });
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try {
    const response = await request(makeApp(fakes)).post('/api/auth/register').send(valid);

    assert.equal(response.status, 500);
    assert.ok(logged.some((line) => line.includes('could not remove user')));
  } finally {
    console.error = originalError;
  }
});
