'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { AuthError } = require('../services/loginService');

// POST /api/auth/login, POST /api/auth/logout and GET /api/auth/me (HMS-05).
// Registration (HMS-04) is a separate router on the same /api/auth path.

function sendAuthError(res, error) {
  const body = { success: false, error: { code: error.code, message: error.message } };
  if (error.details) {
    body.error.details = error.details;
  }
  return res.status(error.status).json(body);
}

function createSessionRouter({ loginService, cookieName }) {
  const router = express.Router();

  router.post('/login', async (req, res, next) => {
    try {
      const { user, profile } = await loginService.login(req.body || {});
      // A new session id for every login, so an old id cannot be reused.
      req.session.regenerate((regenerateError) => {
        if (regenerateError) {
          return next(regenerateError);
        }
        req.session.user = { id: user.id, role: user.role, usn: profile ? profile.usn : null };
        return req.session.save((saveError) => {
          if (saveError) {
            return next(saveError);
          }
          return res.json({
            success: true,
            message: 'Login successful',
            data: { role: user.role, usn: profile ? profile.usn : null, name: profile ? profile.name : null }
          });
        });
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(res, error);
      }
      return next(error);
    }
  });

  router.post('/logout', requireAuth, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        return next(error);
      }
      res.clearCookie(cookieName);
      return res.json({ success: true, message: 'Logged out' });
    });
  });

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const data = await loginService.describeUser(req.user);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createSessionRouter };
