'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeAccountStore } = require('../test-support/fakeAccountStore');
const { createLoginService } = require('../src/services/loginService');
const { getAuthConfig } = require('../src/config/auth');

const config = { maxFailedLogins: 5, lockoutMinutes: 15, sessionTimeoutMinutes: 30 };

function setup() {
  const store = createFakeAccountStore();
  const student = store.addStudent({ usn: 'PES1UG24CS001', name: 'Ravi Kumar', email: 'student001@pes.edu', password: 'Pass@123' });
  const other = store.addStudent({ usn: 'PES1UG24CS010', name: 'Asha Rao', email: 'student010@pes.edu', password: 'Pass@123' });
  const admin = store.addAdmin({ email: 'admin@pes.edu', password: 'Admin@123' });
  const clock = { current: new Date('2026-10-20T10:00:00.000Z') };
  const service = createLoginService({ store, config, now: () => clock.current });
  return { store, student, other, admin, clock, service };
}

async function expectError(promise, status, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

test('login with a correct USN and password succeeds (UT-06)', async () => {
  const { service, student } = setup();
  const result = await service.login({ identifier: 'PES1UG24CS001', password: 'Pass@123' });
  assert.equal(result.user.id, student.id);
  assert.equal(result.user.role, 'student');
  assert.deepEqual(result.profile, { usn: 'PES1UG24CS001', name: 'Ravi Kumar' });

  const lower = await service.login({ identifier: 'pes1ug24cs001', password: 'Pass@123' });
  assert.equal(lower.user.id, student.id);
});

test('login with a correct email and password reaches the same student (UT-29)', async () => {
  const { service, student } = setup();
  const result = await service.login({ identifier: 'Student001@PES.edu', password: 'Pass@123' });
  assert.equal(result.user.id, student.id);
  assert.equal(result.profile.usn, 'PES1UG24CS001');
});

test('an admin can log in by email and has no student profile', async () => {
  const { service } = setup();
  const result = await service.login({ identifier: 'admin@pes.edu', password: 'Admin@123' });
  assert.equal(result.user.role, 'admin');
  assert.equal(result.profile, null);
});

test('a wrong password counts as one failed attempt (UT-07)', async () => {
  const { service, student } = setup();
  await expectError(service.login({ identifier: 'PES1UG24CS001', password: 'WrongPass1' }), 401, 'INVALID_CREDENTIALS');
  assert.equal(student.failedAttempts, 1);
});

test('an unknown user and a wrong password give the same error (IT-13)', async () => {
  const { service } = setup();
  const unknown = await service.login({ identifier: 'PES1UG24CS999', password: 'Pass@123' }).catch((error) => error);
  const wrong = await service.login({ identifier: 'PES1UG24CS001', password: 'WrongPass1' }).catch((error) => error);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.equal(unknown.code, wrong.code);
  assert.equal(unknown.message, wrong.message);
  assert.equal(unknown.message, 'Invalid credentials');
});

test('five failed logins lock the account and a correct password is then refused with 423 (IT-01)', async () => {
  const { service, other } = setup();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await expectError(service.login({ identifier: 'PES1UG24CS010', password: 'WrongPass1' }), 401, 'INVALID_CREDENTIALS');
  }
  assert.ok(other.lockUntil);

  await assert.rejects(service.login({ identifier: 'PES1UG24CS010', password: 'Pass@123' }), (error) => {
    assert.equal(error.status, 423);
    assert.equal(error.code, 'ACCOUNT_LOCKED');
    assert.equal(error.message, 'Account locked. Try again in 15 minute(s)');
    assert.equal(error.details.remainingMinutes, 15);
    return true;
  });
});

test('a locked account refuses every attempt and the lock is not extended (IT-02)', async () => {
  const { service, other, clock } = setup();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await service.login({ identifier: 'PES1UG24CS010', password: 'WrongPass1' }).catch(() => {});
  }
  const lockedUntil = other.lockUntil.getTime();
  const attemptsBefore = other.failedAttempts;

  clock.current = new Date(clock.current.getTime() + 30 * 1000);
  await expectError(service.login({ identifier: 'PES1UG24CS010', password: 'Pass@123' }), 423, 'ACCOUNT_LOCKED');
  await expectError(service.login({ identifier: 'PES1UG24CS010', password: 'WrongPass1' }), 423, 'ACCOUNT_LOCKED');
  assert.equal(other.lockUntil.getTime(), lockedUntil);
  assert.equal(other.failedAttempts, attemptsBefore);
});

test('after the lock expires a correct login succeeds and the counter resets (IT-12 part A)', async () => {
  const { service, other, clock } = setup();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await service.login({ identifier: 'PES1UG24CS010', password: 'WrongPass1' }).catch(() => {});
  }
  clock.current = new Date(clock.current.getTime() + 15 * 60000 + 1000);
  const result = await service.login({ identifier: 'PES1UG24CS010', password: 'Pass@123' });
  assert.equal(result.user.id, other.id);
  assert.equal(other.failedAttempts, 0);
  assert.equal(other.lockUntil, null);
});

test('a wrong password after the lock expired starts counting again from one', async () => {
  const { service, other, clock } = setup();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await service.login({ identifier: 'PES1UG24CS010', password: 'WrongPass1' }).catch(() => {});
  }
  clock.current = new Date(clock.current.getTime() + 15 * 60000 + 1000);
  await expectError(service.login({ identifier: 'PES1UG24CS010', password: 'WrongPass1' }), 401, 'INVALID_CREDENTIALS');
  assert.equal(other.failedAttempts, 1);
  assert.equal(other.lockUntil, null);
});

test('a successful login resets the counter so four failures twice never lock (IT-12 part B)', async () => {
  const { service, student } = setup();
  for (let round = 1; round <= 2; round += 1) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await service.login({ identifier: 'PES1UG24CS001', password: 'WrongPass1' }).catch(() => {});
    }
    const result = await service.login({ identifier: 'PES1UG24CS001', password: 'Pass@123' });
    assert.equal(result.user.id, student.id);
    assert.equal(student.failedAttempts, 0);
  }
  assert.equal(student.lockUntil, null);
});

test('the number of failures and the lock time follow the configuration', async () => {
  const store = createFakeAccountStore();
  const student = store.addStudent({ usn: 'PES1UG24CS013', name: 'Test', email: 'student013@pes.edu', password: 'Pass@123' });
  const current = new Date('2026-10-20T10:00:00.000Z');
  const service = createLoginService({
    store,
    config: { maxFailedLogins: 2, lockoutMinutes: 1 },
    now: () => current
  });
  await service.login({ identifier: 'PES1UG24CS013', password: 'x' }).catch(() => {});
  await service.login({ identifier: 'PES1UG24CS013', password: 'x' }).catch(() => {});
  assert.equal(student.lockUntil.getTime(), current.getTime() + 60000);
});

test('missing identifier or password is a 400 validation error', async () => {
  const { service } = setup();
  await expectError(service.login({ password: 'Pass@123' }), 400, 'VALIDATION_ERROR');
  await expectError(service.login({ identifier: '   ', password: 'Pass@123' }), 400, 'VALIDATION_ERROR');
  await expectError(service.login({ identifier: 'PES1UG24CS001' }), 400, 'VALIDATION_ERROR');
  await expectError(service.login(), 400, 'VALIDATION_ERROR');
});

test('describeUser returns the student name and null for an admin', async () => {
  const { service, student, admin } = setup();
  assert.deepEqual(
    await service.describeUser({ id: student.id, role: 'student', usn: 'PES1UG24CS001' }),
    { role: 'student', usn: 'PES1UG24CS001', name: 'Ravi Kumar' }
  );
  assert.deepEqual(
    await service.describeUser({ id: admin.id, role: 'admin', usn: null }),
    { role: 'admin', usn: null, name: null }
  );
});

test('the settings default to 5 attempts, 15 minutes and 30 minutes (NFR-05)', () => {
  const defaults = getAuthConfig({});
  assert.equal(defaults.maxFailedLogins, 5);
  assert.equal(defaults.lockoutMinutes, 15);
  assert.equal(defaults.sessionTimeoutMinutes, 30);

  const custom = getAuthConfig({ MAX_FAILED_LOGINS: '3', LOCKOUT_MINUTES: '1', SESSION_TIMEOUT_MINUTES: '2', SESSION_SECRET: 's' });
  assert.equal(custom.maxFailedLogins, 3);
  assert.equal(custom.lockoutMinutes, 1);
  assert.equal(custom.sessionTimeoutMinutes, 2);

  const invalid = getAuthConfig({ MAX_FAILED_LOGINS: 'abc', LOCKOUT_MINUTES: '-4', SESSION_TIMEOUT_MINUTES: '' });
  assert.equal(invalid.maxFailedLogins, 5);
  assert.equal(invalid.lockoutMinutes, 15);
  assert.equal(invalid.sessionTimeoutMinutes, 30);
});
