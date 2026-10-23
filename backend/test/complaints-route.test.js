const assert = require('node:assert/strict');
const { before, beforeEach, after, test } = require('node:test');
const express = require('express');
const request = require('supertest');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../test-support/db');
const { User, Student, Complaint } = require('../src/models');
const { createComplaintsRouter } = require('../src/routes/complaints');

before(async () => {
  await connectTestDb();
  await User.init();
  await Student.init();
  await Complaint.init();
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function buildAppForUser(userRole, userId, usn) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = {
      user: {
        id: userId,
        role: userRole,
        usn: usn || null
      }
    };
    next();
  });
  app.use('/api/complaints', createComplaintsRouter());
  return app;
}

test('student can submit a complaint and gets a 201 response', async () => {
  const user = await User.create({ email: 'student1@pes.edu', passwordHash: 'hash', role: 'student' });
  const student = await Student.create({ userId: user._id, usn: 'PES1UG24CS001', name: 'Student 001', email: user.email, phone: '9000000001' });
  const app = buildAppForUser('student', String(user._id), student.usn);

  const response = await request(app)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Fan not working' });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.category, 'Electrical');
  assert.equal(response.body.data.status, 'Open');
  assert.equal(response.body.data.isOpen, true);
  assert.equal(await Complaint.countDocuments(), 1);
});

test('student cannot create a second open complaint in the same category', async () => {
  const user = await User.create({ email: 'student2@pes.edu', passwordHash: 'hash', role: 'student' });
  const student = await Student.create({ userId: user._id, usn: 'PES1UG24CS002', name: 'Student 002', email: user.email, phone: '9000000002' });
  await Complaint.create({ studentId: student._id, category: 'Electrical', description: 'Broken light', status: 'Open', isOpen: true });
  const app = buildAppForUser('student', String(user._id), student.usn);

  const response = await request(app)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Another issue' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'COMPLAINT_CATEGORY_OPEN');
});

test('student can view only their own complaint history', async () => {
  const user = await User.create({ email: 'student3@pes.edu', passwordHash: 'hash', role: 'student' });
  const student = await Student.create({ userId: user._id, usn: 'PES1UG24CS003', name: 'Student 003', email: user.email, phone: '9000000003' });
  await Complaint.create({ studentId: student._id, category: 'Electrical', description: 'Broken switch', status: 'Open', isOpen: true });
  const app = buildAppForUser('student', String(user._id), student.usn);

  const response = await request(app).get('/api/complaints/mine');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].category, 'Electrical');
});

test('admin can list complaints and filter by status', async () => {
  const adminUser = await User.create({ email: 'admin@pes.edu', passwordHash: 'hash', role: 'admin' });
  const studentUser = await User.create({ email: 'student4@pes.edu', passwordHash: 'hash', role: 'student' });
  const student = await Student.create({ userId: studentUser._id, usn: 'PES1UG24CS004', name: 'Student 004', email: studentUser.email, phone: '9000000004' });
  await Complaint.create({ studentId: student._id, category: 'Electrical', description: 'Broken socket', status: 'Open', isOpen: true });
  const app = buildAppForUser('admin', String(adminUser._id), null);

  const response = await request(app).get('/api/complaints?status=Open');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].usn, student.usn);
});

test('admin can reject a complaint only with remarks', async () => {
  const adminUser = await User.create({ email: 'admin2@pes.edu', passwordHash: 'hash', role: 'admin' });
  const studentUser = await User.create({ email: 'student5@pes.edu', passwordHash: 'hash', role: 'student' });
  const student = await Student.create({ userId: studentUser._id, usn: 'PES1UG24CS005', name: 'Student 005', email: studentUser.email, phone: '9000000005' });
  const complaint = await Complaint.create({ studentId: student._id, category: 'Plumbing', description: 'Leaking tap', status: 'Open', isOpen: true });
  const app = buildAppForUser('admin', String(adminUser._id), null);

  const invalid = await request(app)
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'Rejected', remarks: '' });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');

  const valid = await request(app)
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'Rejected', remarks: 'Plumber assigned' });

  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.status, 'Rejected');
  assert.equal(valid.body.data.isOpen, false);
  assert.equal(valid.body.data.history.length, 1);
  assert.equal(valid.body.data.history[0].status, 'Rejected');
});
