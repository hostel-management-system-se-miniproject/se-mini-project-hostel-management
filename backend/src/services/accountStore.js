'use strict';

const { User, Student } = require('../models');

// Database access for login. The login rules live in loginService.js.

const USN_PATTERN = /^[A-Za-z0-9]{13}$/;

function toAccount(user, profile) {
  return {
    user: {
      id: String(user._id),
      role: user.role,
      passwordHash: user.passwordHash,
      failedAttempts: user.failedAttempts,
      lockUntil: user.lockUntil
    },
    profile: profile ? { usn: profile.usn, name: profile.name } : null
  };
}

function createAccountStore() {
  // A 13 character alphanumeric identifier is a USN. Anything else is an email.
  async function findAccountByIdentifier(identifier) {
    if (USN_PATTERN.test(identifier)) {
      const profile = await Student.findOne({ usn: identifier.toUpperCase() });
      if (!profile) {
        return null;
      }
      const user = await User.findById(profile.userId);
      return user ? toAccount(user, profile) : null;
    }

    const user = await User.findOne({ email: identifier.toLowerCase() });
    if (!user) {
      return null;
    }
    const profile = user.role === 'student' ? await Student.findOne({ userId: user._id }) : null;
    return toAccount(user, profile);
  }

  async function findProfileByUserId(userId) {
    const profile = await Student.findOne({ userId });
    return profile ? { usn: profile.usn, name: profile.name } : null;
  }

  // The counter is increased in one atomic update. The lock is set once, when
  // the counter reaches the limit.
  async function recordFailedAttempt(userId, { maxFailedLogins, lockUntil }) {
    const updated = await User.findByIdAndUpdate(userId, { $inc: { failedAttempts: 1 } }, { new: true });
    if (updated && updated.failedAttempts >= maxFailedLogins) {
      await User.updateOne({ _id: userId, lockUntil: null }, { $set: { lockUntil } });
    }
  }

  async function resetFailures(userId) {
    await User.updateOne({ _id: userId }, { $set: { failedAttempts: 0, lockUntil: null } });
  }

  return { findAccountByIdentifier, findProfileByUserId, recordFailedAttempt, resetFailures };
}

module.exports = { createAccountStore };
