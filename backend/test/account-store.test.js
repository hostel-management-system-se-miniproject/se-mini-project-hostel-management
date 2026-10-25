'use strict';

const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { User, Student } = require('../src/models');
const { createAccountStore } = require('../src/services/accountStore');

const store = createAccountStore();

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

async function createStudentAccount() {
  const user = await User.create({ email: 'student001@pes.edu', passwordHash: 'hash', role: 'student' });
  await Student.create({ userId: user._id, usn: 'PES1UG24CS001', name: 'Ravi Kumar', email: 'student001@pes.edu', phone: '9876543210' });
  return user;
}

test('findAccountByIdentifier finds a student by USN in any case and by email', async () => {
  const user = await createStudentAccount();

  const byUsn = await store.findAccountByIdentifier('pes1ug24cs001');
  assert.equal(byUsn.user.id, String(user._id));
  assert.equal(byUsn.user.role, 'student');
  assert.deepEqual(byUsn.profile, { usn: 'PES1UG24CS001', name: 'Ravi Kumar' });

  const byEmail = await store.findAccountByIdentifier('Student001@PES.edu');
  assert.equal(byEmail.user.id, String(user._id));
  assert.equal(byEmail.profile.usn, 'PES1UG24CS001');
});

test('findAccountByIdentifier returns null for an unknown USN or email', async () => {
  await createStudentAccount();
  assert.equal(await store.findAccountByIdentifier('PES1UG24CS999'), null);
  assert.equal(await store.findAccountByIdentifier('nobody@pes.edu'), null);
});

test('an admin is found by email and has no profile', async () => {
  await User.create({ email: 'admin@pes.edu', passwordHash: 'hash', role: 'admin' });
  const account = await store.findAccountByIdentifier('admin@pes.edu');
  assert.equal(account.user.role, 'admin');
  assert.equal(account.profile, null);
});

test('recordFailedAttempt counts attempts and sets the lock once at the limit', async () => {
  const user = await createStudentAccount();
  const firstLock = new Date('2026-10-20T10:15:00.000Z');
  const laterLock = new Date('2026-10-20T10:30:00.000Z');

  await store.recordFailedAttempt(user._id, { maxFailedLogins: 3, lockUntil: firstLock });
  await store.recordFailedAttempt(user._id, { maxFailedLogins: 3, lockUntil: firstLock });
  let saved = await User.findById(user._id);
  assert.equal(saved.failedAttempts, 2);
  assert.equal(saved.lockUntil, null);

  await store.recordFailedAttempt(user._id, { maxFailedLogins: 3, lockUntil: firstLock });
  saved = await User.findById(user._id);
  assert.equal(saved.failedAttempts, 3);
  assert.equal(saved.lockUntil.getTime(), firstLock.getTime());

  await store.recordFailedAttempt(user._id, { maxFailedLogins: 3, lockUntil: laterLock });
  saved = await User.findById(user._id);
  assert.equal(saved.lockUntil.getTime(), firstLock.getTime());
});

test('resetFailures clears the counter and the lock', async () => {
  const user = await createStudentAccount();
  await store.recordFailedAttempt(user._id, { maxFailedLogins: 1, lockUntil: new Date('2026-10-20T10:15:00.000Z') });
  await store.resetFailures(String(user._id));
  const saved = await User.findById(user._id);
  assert.equal(saved.failedAttempts, 0);
  assert.equal(saved.lockUntil, null);
});

test('findProfileByUserId returns the student profile or null', async () => {
  const user = await createStudentAccount();
  assert.deepEqual(await store.findProfileByUserId(String(user._id)), { usn: 'PES1UG24CS001', name: 'Ravi Kumar' });
  const admin = await User.create({ email: 'admin@pes.edu', passwordHash: 'hash', role: 'admin' });
  assert.equal(await store.findProfileByUserId(String(admin._id)), null);
});
