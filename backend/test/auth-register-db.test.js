// Registration against a real MongoDB test database, so the duplicate checks use the real unique indexes.
// Needs backend/.env with MONGODB_URI_TEST pointing to a database whose name ends in _test (see README Section 7).
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');
const { User, Student } = require('../src/models');
const { connectTestDb, clearTestDb } = require('../test-support/db');

const valid = {
  usn: 'PES1UG23CS001',
  name: 'Ravi Kumar',
  email: 'ravi@pes.edu',
  phone: '9876543210',
  password: 'Pass@123'
};

test.before(async () => {
  await connectTestDb();
  await Promise.all([User.createIndexes(), Student.createIndexes()]);
});

test.beforeEach(async () => {
  await clearTestDb();
});

test.after(async () => {
  await mongoose.disconnect();
});

test('UT-01 (database) a valid registration creates a user and a linked student profile', async () => {
  const response = await request(createApp()).post('/api/auth/register').send(valid);

  assert.equal(response.status, 201);
  const user = await User.findOne({ email: 'ravi@pes.edu' });
  const student = await Student.findOne({ usn: 'PES1UG23CS001' });
  assert.ok(user && student);
  assert.equal(String(student.userId), String(user._id));
  assert.equal(user.role, 'student');
  assert.notEqual(user.passwordHash, 'Pass@123');
  assert.match(user.passwordHash, /^\$2[aby]\$/);
});

test('UT-02 (database) a duplicate USN is rejected by the unique index and leaves one user', async () => {
  const app = createApp();
  await request(app).post('/api/auth/register').send(valid);
  const response = await request(app).post('/api/auth/register').send({ ...valid, email: 'other@pes.edu' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'USN_EXISTS');
  assert.equal(await User.countDocuments(), 1);
  assert.equal(await Student.countDocuments(), 1);
});

test('UT-03 (database) a duplicate email is rejected by the unique index', async () => {
  const app = createApp();
  await request(app).post('/api/auth/register').send(valid);
  const response = await request(app).post('/api/auth/register').send({ ...valid, usn: 'PES1UG23CS002' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'EMAIL_EXISTS');
  assert.equal(await User.countDocuments(), 1);
});

test('two simultaneous registrations with the same USN create exactly one account', async () => {
  const app = createApp();
  const [a, b] = await Promise.all([
    request(app).post('/api/auth/register').send({ ...valid, email: 'a@pes.edu' }),
    request(app).post('/api/auth/register').send({ ...valid, email: 'b@pes.edu' })
  ]);

  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  assert.equal(await Student.countDocuments(), 1);
  assert.equal(await User.countDocuments(), 1);
});
