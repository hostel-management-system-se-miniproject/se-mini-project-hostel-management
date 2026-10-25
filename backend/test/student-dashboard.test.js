const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const {
  Student,
  Room,
  Allocation,
  Fee,
  Complaint,
  Leave
} = require('../src/models');
const { createStudentsRouter } = require('../src/routes/students');
const { deriveFeeSummary } = require('../src/services/dashboardService');

const admin = { id: 'admin', role: 'admin', usn: null };
const studentAUser = { id: 'student-a', role: 'student', usn: 'PES1UG24CS001' };

before(async () => {
  await connectTestDb();
  await Promise.all([
    Student.init(),
    Room.init(),
    Allocation.init(),
    Fee.init(),
    Complaint.init(),
    Leave.init()
  ]);
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
    name: 'Ravi Kumar',
    email: 'ravi@example.com',
    phone: '9876543210',
    ...overrides
  });
}

function createRoom(overrides = {}) {
  return new Room({
    roomNo: 'A-204',
    block: 'A',
    floor: 2,
    sharingType: 'Triple',
    capacity: 3,
    ...overrides
  });
}

function createAllocation(studentId, roomId, overrides = {}) {
  return new Allocation({
    studentId,
    roomId,
    ...overrides
  });
}

function createFee(studentId, overrides = {}) {
  return new Fee({
    studentId,
    amountDue: 50000,
    dueDate: new Date('2026-11-30T00:00:00.000Z'),
    totalPaid: 0,
    ...overrides
  });
}

function createComplaint(studentId, category, status) {
  return new Complaint({
    studentId,
    category,
    description: `${category} issue`,
    status,
    isOpen: status === 'Open' || status === 'In Progress',
    history: []
  });
}

function createLeave(studentId, status) {
  return new Leave({
    studentId,
    startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDate: new Date('2026-11-02T00:00:00.000Z'),
    reason: `${status} leave`,
    status
  });
}

function buildApp(sessionUser, options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/students', createStudentsRouter(options));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    console.error('Unhandled error:', err.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again',
        details: {}
      }
    });
  });
  return app;
}

function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
}

test('deriveFeeSummary handles missing, due, partial, and paid fees', () => {
  assert.equal(deriveFeeSummary(null), null);
  assert.deepEqual(deriveFeeSummary({
    amountDue: 50000,
    dueDate: new Date('2026-11-30T23:00:00.000Z'),
    totalPaid: 0
  }), {
    amountDue: 50000,
    dueDate: '2026-11-30',
    totalPaid: 0,
    balance: 50000,
    status: 'Due'
  });
  assert.equal(deriveFeeSummary({
    amountDue: 50000,
    dueDate: new Date('2026-11-30T00:00:00.000Z'),
    totalPaid: 20000
  }).status, 'Partially Paid');
  assert.deepEqual(deriveFeeSummary({
    amountDue: 50000,
    dueDate: new Date('2026-11-30T00:00:00.000Z'),
    totalPaid: 50000
  }), {
    amountDue: 50000,
    dueDate: '2026-11-30',
    totalPaid: 50000,
    balance: 0,
    status: 'Paid'
  });
});

test('dashboard access control protects ownership and supports admins', async () => {
  const student = await createStudent().save();
  await createStudent({
    usn: 'PES1UG24CS002',
    name: 'Asha Rao',
    email: 'asha@example.com'
  }).save();

  assertError(
    await request(buildApp(null)).get(`/api/students/${student.usn}/dashboard`),
    401,
    'SESSION_EXPIRED'
  );

  const own = await request(buildApp(studentAUser)).get('/api/students/pes1ug24cs001/dashboard');
  assert.equal(own.status, 200);
  assert.equal(own.body.data.student.usn, 'PES1UG24CS001');

  const forbidden = await request(buildApp(studentAUser))
    .get('/api/students/PES1UG24CS002/dashboard');
  assertError(forbidden, 403, 'FORBIDDEN');
  assert.equal(JSON.stringify(forbidden.body).includes('Asha Rao'), false);
  assertError(
    await request(buildApp(studentAUser)).get('/api/students/PES1UG24CS999/dashboard'),
    403,
    'FORBIDDEN'
  );
  assert.equal(
    (await request(buildApp(admin)).get('/api/students/PES1UG24CS002/dashboard')).status,
    200
  );
  assertError(
    await request(buildApp(admin)).get('/api/students/PES1UG24CS999/dashboard'),
    404,
    'NOT_FOUND'
  );
  assertError(
    await request(buildApp(admin)).get('/api/students/not-a-valid-usn/dashboard'),
    404,
    'NOT_FOUND'
  );
});

test('dashboard returns room, fee, complaint, leave, and student summaries without leakage', async () => {
  const student = await createStudent().save();
  const other = await createStudent({
    usn: 'PES1UG24CS002',
    name: 'Other Student',
    email: 'other@example.com'
  }).save();
  const room = await createRoom().save();
  await createAllocation(student._id, room._id).save();
  await createFee(student._id, { totalPaid: 20000 }).save();
  await Promise.all([
    createComplaint(student._id, 'Electrical', 'Open').save(),
    createComplaint(student._id, 'Plumbing', 'In Progress').save(),
    createComplaint(student._id, 'Furniture', 'Resolved').save(),
    createComplaint(student._id, 'Other', 'Rejected').save(),
    createComplaint(other._id, 'Electrical', 'Open').save(),
    createLeave(student._id, 'Pending').save(),
    createLeave(student._id, 'Approved').save(),
    createLeave(student._id, 'Rejected').save(),
    createLeave(other._id, 'Pending').save(),
    createFee(other._id, { totalPaid: 50000 }).save()
  ]);

  const response = await request(buildApp(admin))
    .get(`/api/students/${student.usn}/dashboard`);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body.data).sort(), [
    'complaints', 'fee', 'leaves', 'room', 'student'
  ]);
  assert.deepEqual(response.body.data.student, {
    usn: student.usn,
    name: student.name,
    email: student.email,
    phone: student.phone
  });
  assert.deepEqual(response.body.data.room, {
    roomNo: room.roomNo,
    block: room.block,
    floor: room.floor,
    sharingType: room.sharingType
  });
  assert.deepEqual(response.body.data.fee, {
    amountDue: 50000,
    dueDate: '2026-11-30',
    totalPaid: 20000,
    balance: 30000,
    status: 'Partially Paid'
  });
  assert.deepEqual(response.body.data.complaints, { open: 2, total: 4 });
  assert.deepEqual(response.body.data.leaves, { pending: 1, total: 3 });
  assert.deepEqual(Object.keys(response.body.data.student).sort(), [
    'email', 'name', 'phone', 'usn'
  ]);
});

test('dashboard returns null room for inactive or missing allocations and fee', async () => {
  const inactiveStudent = await createStudent().save();
  const noAllocationStudent = await createStudent({
    usn: 'PES1UG24CS002',
    email: 'none@example.com'
  }).save();
  const room = await createRoom().save();
  await createAllocation(inactiveStudent._id, room._id, { status: 'inactive' }).save();

  for (const student of [inactiveStudent, noAllocationStudent]) {
    const response = await request(buildApp(admin))
      .get(`/api/students/${student.usn}/dashboard`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.room, null);
    assert.equal(response.body.data.fee, null);
  }
});

test('dashboard derives paid and due fee statuses', async () => {
  const due = await createStudent().save();
  const partial = await createStudent({
    usn: 'PES1UG24CS002',
    email: 'partial@example.com'
  }).save();
  const paid = await createStudent({
    usn: 'PES1UG24CS003',
    email: 'paid@example.com'
  }).save();
  await Promise.all([
    createFee(due._id, { totalPaid: 0 }).save(),
    createFee(partial._id, { totalPaid: 20000 }).save(),
    createFee(paid._id, { totalPaid: 50000 }).save()
  ]);

  for (const [student, status] of [[due, 'Due'], [partial, 'Partially Paid'], [paid, 'Paid']]) {
    const response = await request(buildApp(admin))
      .get(`/api/students/${student.usn}/dashboard`);
    assert.equal(response.body.data.fee.status, status);
  }
});

test('dashboard forwards unexpected service errors to the safe error handler', async () => {
  const response = await request(buildApp(admin, {
    Student: {
      findOne: () => {
        throw new Error('internal secret');
      }
    }
  })).get('/api/students/PES1UG24CS001/dashboard');
  assertError(response, 500, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response.body).includes('internal secret'), false);
  assert.equal(JSON.stringify(response.body).includes('stack'), false);
});

test('the real app mounts and protects the dashboard route', async () => {
  const response = await request(createApp())
    .get('/api/students/PES1UG24CS001/dashboard');
  assertError(response, 401, 'SESSION_EXPIRED');
});
