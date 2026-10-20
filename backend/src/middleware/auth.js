'use strict';

// Access control middleware (HMS-06).
//
// Session shape, set by login (HMS-05):
//   req.session.user = { id, role, usn }
// role is 'student' or 'admin'. usn is null for an admin account.
//
// Use the three functions in this order on a protected route:
//   requireAuth, then requireRole(...), then selfOrAdmin() where the path has a USN.

const ROLES = Object.freeze({ STUDENT: 'student', ADMIN: 'admin' });

function sendError(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}

function sessionExpired(res) {
  return sendError(res, 401, 'SESSION_EXPIRED', 'Session expired');
}

function forbidden(res) {
  return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
}

// No valid session gives 401. A valid session puts the user on req.user.
function requireAuth(req, res, next) {
  const user = req.session && req.session.user;
  if (!user || !user.role) {
    return sessionExpired(res);
  }
  req.user = user;
  return next();
}

// A logged-in user with a role that is not listed gets 403.
function requireRole(...roles) {
  if (roles.length === 0) {
    throw new Error('requireRole needs at least one role');
  }
  return function checkRole(req, res, next) {
    if (!req.user) {
      return sessionExpired(res);
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res);
    }
    return next();
  };
}

// An admin may use any USN. A student may use only their own USN.
function selfOrAdmin(paramName = 'usn') {
  return function checkSelfOrAdmin(req, res, next) {
    const user = req.user;
    if (!user) {
      return sessionExpired(res);
    }
    if (user.role === ROLES.ADMIN) {
      return next();
    }
    const requested = String((req.params && req.params[paramName]) || '').toUpperCase();
    const own = String(user.usn || '').toUpperCase();
    if (user.role === ROLES.STUDENT && own !== '' && requested === own) {
      return next();
    }
    return forbidden(res);
  };
}

module.exports = { ROLES, requireAuth, requireRole, selfOrAdmin };
