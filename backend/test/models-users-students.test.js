const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { User, Student } = require('../src/models');

before(async () => {
  await connectTestDb();
  await User.init();
  await Student.init();
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function createStudent(overrides = {}) {
  return new Student({
    userId: new mongoose.Types.ObjectId(),
    usn: 'PES1UG24CS001',
    name: 'Test Student',
    email: 'student@example.com',
    phone: '9876543210',
    ...overrides
  });
}

test('saves a valid user with the expected defaults and timestamp', async () => {
  const user = await User.create({
    email: 'user@example.com',
    passwordHash: 'hash'
  });

  assert.equal(user.role, 'student');
  assert.equal(user.failedAttempts, 0);
  assert.equal(user.lockUntil, null);
  assert.ok(user.createdAt instanceof Date);
  assert.equal(user.updatedAt, undefined);
});

test('rejects users missing email, passwordHash, or with an invalid role', async () => {
  await assert.rejects(
    () => User.create({ passwordHash: 'hash' }),
    (error) => error instanceof mongoose.Error.ValidationError
  );
  await assert.rejects(
    () => User.create({ email: 'missing-password@example.com' }),
    (error) => error instanceof mongoose.Error.ValidationError
  );
  await assert.rejects(
    () => User.create({ email: 'invalid-role@example.com', passwordHash: 'hash', role: 'manager' }),
    (error) => error instanceof mongoose.Error.ValidationError
  );
});

test('rejects duplicate emails case-insensitively', async () => {
  await User.create({ email: 'A@x.com', passwordHash: 'hash' });

  await assert.rejects(
    () => User.create({ email: 'a@x.com', passwordHash: 'hash' }),
    (error) => error.name === 'MongoServerError' && error.code === 11000
  );
});

test('saves a valid student and stores a lowercase USN in uppercase', async () => {
  const student = await createStudent({ usn: 'pes1ug24cs001' }).save();

  assert.equal(student.usn, 'PES1UG24CS001');
});

test('rejects invalid USN lengths and characters with validation errors', async () => {
  for (const usn of ['PES1UG24CS01', 'PES1UG24CS0001', 'PES1UG24CS9-4']) {
    await assert.rejects(
      () => createStudent({ usn }).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }
});

test('rejects duplicate USNs case-insensitively', async () => {
  await createStudent({ usn: 'pes1ug24cs001' }).save();

  await assert.rejects(
    () => createStudent({
      usn: 'PES1UG24CS001',
      userId: new mongoose.Types.ObjectId(),
      email: 'another@example.com'
    }).save(),
    (error) => error.name === 'MongoServerError' && error.code === 11000
  );
});

test('rejects duplicate student userIds', async () => {
  const userId = new mongoose.Types.ObjectId();
  await createStudent({ userId }).save();

  await assert.rejects(
    () => createStudent({ userId, usn: 'PES1UG24CS002', email: 'another@example.com' }).save(),
    (error) => error.name === 'MongoServerError' && error.code === 11000
  );
});

test('declares unique indexes on user email, student USN, and student userId', async () => {
  const userIndexes = await User.collection.indexes();
  const studentIndexes = await Student.collection.indexes();

  assert.ok(userIndexes.some((index) => index.unique && index.key.email === 1));
  assert.ok(studentIndexes.some((index) => index.unique && index.key.usn === 1));
  assert.ok(studentIndexes.some((index) => index.unique && index.key.userId === 1));
});
