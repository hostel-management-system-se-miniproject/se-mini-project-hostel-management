const express = require('express');
const bcrypt = require('bcryptjs');
const { validateRegistration } = require('../validation/registration');

const BCRYPT_COST = 10;

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

// Which unique index rejected the insert? Mongo reports it in keyPattern (or only in the message on old servers).
function duplicateField(err) {
  if (!err || err.code !== 11000) {
    return null;
  }
  const keys = Object.keys(err.keyPattern || err.keyValue || {});
  if (keys.includes('usn')) return 'usn';
  if (keys.includes('email')) return 'email';
  const text = String(err.message || '');
  if (/usn/i.test(text)) return 'usn';
  if (/email/i.test(text)) return 'email';
  return 'unknown';
}

function mongooseFieldErrors(err) {
  const details = {};
  for (const [field, problem] of Object.entries(err.errors || {})) {
    details[field] = problem.message;
  }
  return details;
}

function createAuthRouter(options = {}) {
  const router = express.Router();
  const hashPassword = options.hashPassword || ((plain) => bcrypt.hash(plain, BCRYPT_COST));
  // Models are loaded lazily so the router can be tested with in-memory fakes.
  const getModels = () => {
    const models = require('../models');
    return { User: options.User || models.User, Student: options.Student || models.Student };
  };

  router.post('/register', async (req, res) => {
    const result = validateRegistration(req.body);
    if (!result.ok) {
      return res.status(400).json(errorBody(result.code, result.message, result.details));
    }

    const { usn, name, email, phone, password } = result.data;
    const { User, Student } = getModels();
    let createdUser = null;

    try {
      const passwordHash = await hashPassword(password);
      // The role is always student. Nothing from the request body can change it.
      createdUser = await User.create({ email, passwordHash, role: 'student' });
      await Student.create({ userId: createdUser._id, usn, name, email, phone });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { usn, name, email }
      });
    } catch (err) {
      // Compensating step: if the student profile could not be saved, remove the user so no orphan account remains.
      if (createdUser) {
        try {
          await User.deleteOne({ _id: createdUser._id });
        } catch (cleanupError) {
          console.error('register: could not remove user after a failed profile insert:', cleanupError.message);
        }
      }

      const duplicate = duplicateField(err);
      if (duplicate === 'usn') {
        return res.status(409).json(errorBody('USN_EXISTS', 'USN already registered', { usn: 'USN already registered' }));
      }
      if (duplicate === 'email') {
        return res.status(409).json(errorBody('EMAIL_EXISTS', 'Email already registered', { email: 'Email already registered' }));
      }
      if (err && err.name === 'ValidationError') {
        const details = mongooseFieldErrors(err);
        return res.status(400).json(errorBody('VALIDATION_ERROR', Object.values(details)[0] || 'Invalid registration data', details));
      }

      console.error('register failed:', err && err.message);
      return res.status(500).json(errorBody('INTERNAL_ERROR', 'Something went wrong. Please try again'));
    }
  });

  return router;
}

module.exports = { createAuthRouter };
