'use strict';

const bcrypt = require('bcryptjs');

// An in-memory stand-in for src/services/accountStore.js. It follows the same
// rules, so login tests need no database.

const USN_PATTERN = /^[A-Za-z0-9]{13}$/;

function createFakeAccountStore() {
  const records = [];

  function addStudent({ usn, name, email, password }) {
    const record = {
      id: `student-${records.length + 1}`,
      role: 'student',
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 4),
      failedAttempts: 0,
      lockUntil: null,
      profile: { usn: usn.toUpperCase(), name }
    };
    records.push(record);
    return record;
  }

  function addAdmin({ email, password }) {
    const record = {
      id: `admin-${records.length + 1}`,
      role: 'admin',
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 4),
      failedAttempts: 0,
      lockUntil: null,
      profile: null
    };
    records.push(record);
    return record;
  }

  const byId = (id) => records.find((record) => record.id === id);

  async function findAccountByIdentifier(identifier) {
    const record = USN_PATTERN.test(identifier)
      ? records.find((item) => item.profile && item.profile.usn === identifier.toUpperCase())
      : records.find((item) => item.email === identifier.toLowerCase());
    if (!record) {
      return null;
    }
    return {
      user: {
        id: record.id,
        role: record.role,
        passwordHash: record.passwordHash,
        failedAttempts: record.failedAttempts,
        lockUntil: record.lockUntil
      },
      profile: record.profile ? { ...record.profile } : null
    };
  }

  async function findProfileByUserId(userId) {
    const record = byId(userId);
    return record && record.profile ? { ...record.profile } : null;
  }

  async function recordFailedAttempt(userId, { maxFailedLogins, lockUntil }) {
    const record = byId(userId);
    record.failedAttempts += 1;
    if (record.failedAttempts >= maxFailedLogins && record.lockUntil === null) {
      record.lockUntil = lockUntil;
    }
  }

  async function resetFailures(userId) {
    const record = byId(userId);
    record.failedAttempts = 0;
    record.lockUntil = null;
  }

  return { addStudent, addAdmin, byId, findAccountByIdentifier, findProfileByUserId, recordFailedAttempt, resetFailures };
}

module.exports = { createFakeAccountStore };
