const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../test-support/db');
const { User, Student, Complaint } = require('../src/models');
const { createComplaintsRouter } = require('../src/routes/complaints');

const admin = { id: new mongoose.Types.ObjectId().toString(), role: 'admin', usn: null };

before(async () => {
  await connectTestDb();
  await Promise.all([User.init(), Student.init(), Complaint.init()]);
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function buildApp(sessionUser, options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/complaints', createComplaintsRouter(options));
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

function assertError(response, status, code, message) {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
  if (message) {
    assert.equal(response.body.error.message, message);
  }
}

async function createStudent(number) {
  const user = await User.create({
    email: `student${number}@pes.edu`,
    passwordHash: 'hash',
    role: 'student'
  });
  const student = await Student.create({
    userId: user._id,
    usn: `PES1UG24CS${String(number).padStart(3, '0')}`,
    name: `Student ${number}`,
    email: user.email,
    phone: `90000000${String(number).padStart(2, '0')}`
  });
  return {
    user,
    student,
    sessionUser: { id: String(user._id), role: 'student', usn: student.usn }
  };
}

test('protected complaint endpoints return SESSION_EXPIRED without a session', async () => {
  const app = buildApp(null);
  const id = new mongoose.Types.ObjectId().toString();
  const responses = await Promise.all([
    request(app).post('/api/complaints').send({ category: 'Electrical', description: 'Broken fan' }),
    request(app).get('/api/complaints/mine'),
    request(app).get('/api/complaints'),
    request(app).get(`/api/complaints/${id}`),
    request(app).put(`/api/complaints/${id}`).send({ status: 'Resolved', remarks: 'Fixed' })
  ]);

  for (const response of responses) {
    assertError(response, 401, 'SESSION_EXPIRED');
  }
});

test('role checks return FORBIDDEN before validation', async () => {
  const student = await createStudent(1);
  const adminApp = buildApp(admin);
  const studentApp = buildApp(student.sessionUser);

  assertError(
    await request(adminApp).post('/api/complaints').send({}),
    403,
    'FORBIDDEN'
  );
  assertError(await request(adminApp).get('/api/complaints/mine'), 403, 'FORBIDDEN');
  assertError(await request(studentApp).get('/api/complaints'), 403, 'FORBIDDEN');
  assertError(
    await request(studentApp)
      .put(`/api/complaints/${new mongoose.Types.ObjectId()}`)
      .send({}),
    403,
    'FORBIDDEN'
  );
});

test('a student can read their own complaint but not another student complaint', async () => {
  const owner = await createStudent(2);
  const other = await createStudent(3);
  const complaint = await Complaint.create({
    studentId: owner.student._id,
    category: 'Electrical',
    description: 'Broken switch',
    status: 'Open',
    isOpen: true,
    history: [{
      status: 'Open',
      remarks: null,
      at: new Date(),
      by: owner.user._id
    }]
  });

  const otherResponse = await request(buildApp(other.sessionUser))
    .get(`/api/complaints/${complaint._id}`);
  assertError(otherResponse, 403, 'FORBIDDEN');

  const ownerResponse = await request(buildApp(owner.sessionUser))
    .get(`/api/complaints/${complaint._id}`);
  assert.equal(ownerResponse.status, 200);
  assert.equal(ownerResponse.body.data.id, String(complaint._id));
});

test('category validation is canonical, rejects invalid values, and prevents open duplicates', async () => {
  const student = await createStudent(4);
  const app = buildApp(student.sessionUser);

  const invalid = await request(app)
    .post('/api/complaints')
    .send({ category: 'Other', description: 'Broken fan' });
  assertError(invalid, 400, 'VALIDATION_ERROR', 'Select a valid category');
  assert.deepEqual(invalid.body.error.details, { category: 'Select a valid category' });
  assert.equal(await Complaint.countDocuments(), 0);

  const created = await request(app)
    .post('/api/complaints')
    .send({ category: 'electrical', description: 'Broken fan' });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.category, 'Electrical');
  assert.equal(created.body.data.history[0].status, 'Open');
  assert.equal(created.body.data.history[0].by, String(student.user._id));

  const duplicate = await request(app)
    .post('/api/complaints')
    .send({ category: 'ELECTRICAL', description: 'Another issue' });
  assertError(duplicate, 409, 'COMPLAINT_CATEGORY_OPEN');
  assert.deepEqual(duplicate.body.error.details, {
    category: 'Electrical'
  });
  assert.equal(await Complaint.countDocuments(), 1);
});

test('UT-19 allows a student to open complaints in different categories', async () => {
  const student = await createStudent(9);
  const app = buildApp(student.sessionUser);

  const electrical = await request(app)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Broken light' });
  const plumbing = await request(app)
    .post('/api/complaints')
    .send({ category: 'Plumbing', description: 'Leaking tap' });

  assert.equal(electrical.status, 201);
  assert.equal(plumbing.status, 201);
  assert.equal(await Complaint.countDocuments({ studentId: student.student._id }), 2);
});

test('IT-20 blocks a duplicate while In Progress and allows one after Rejected', async () => {
  const student = await createStudent(10);
  const studentApp = buildApp(student.sessionUser);
  const adminApp = buildApp(admin);

  const created = await request(studentApp)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Fan not working' });
  assert.equal(created.status, 201);
  const complaintId = created.body.data.id;

  const inProgress = await request(adminApp)
    .put(`/api/complaints/${complaintId}`)
    .send({ status: 'In Progress', remarks: 'Technician assigned' });
  assert.equal(inProgress.status, 200);

  const duplicate = await request(studentApp)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Another fan issue' });
  assertError(duplicate, 409, 'COMPLAINT_CATEGORY_OPEN');

  const rejected = await request(adminApp)
    .put(`/api/complaints/${complaintId}`)
    .send({ status: 'Rejected', remarks: 'Duplicate issue report' });
  assert.equal(rejected.status, 200);

  const replacement = await request(studentApp)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Another fan issue' });
  assert.equal(replacement.status, 201);
});

test('UT-20 records the complete complaint status history through resolution', async () => {
  const student = await createStudent(11);
  const studentApp = buildApp(student.sessionUser);
  const adminApp = buildApp(admin);

  const created = await request(studentApp)
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Fan not working' });
  const complaintId = created.body.data.id;

  const inProgress = await request(adminApp)
    .put(`/api/complaints/${complaintId}`)
    .send({ status: 'In Progress', remarks: 'Technician assigned' });
  const resolved = await request(adminApp)
    .put(`/api/complaints/${complaintId}`)
    .send({ status: 'Resolved', remarks: 'Fan replaced' });

  assert.equal(inProgress.status, 200);
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.data.status, 'Resolved');
  assert.equal(resolved.body.data.isOpen, false);
  assert.deepEqual(
    resolved.body.data.history.map((entry) => [entry.status, entry.remarks]),
    [
      ['Open', null],
      ['In Progress', 'Technician assigned'],
      ['Resolved', 'Fan replaced']
    ]
  );
  for (const entry of resolved.body.data.history) {
    assert.ok(entry.at);
    assert.equal(Number.isNaN(new Date(entry.at).getTime()), false);
  }
});

test('UT-36 and UT-37 reject blank remarks and invalid statuses without changing the complaint', async () => {
  const student = await createStudent(12);
  const created = await request(buildApp(student.sessionUser))
    .post('/api/complaints')
    .send({ category: 'Plumbing', description: 'Leaking tap' });
  const complaintId = created.body.data.id;

  for (const remarks of ['', '   ']) {
    const response = await request(buildApp(admin))
      .put(`/api/complaints/${complaintId}`)
      .send({ status: 'Rejected', remarks });
    assertError(response, 400, 'VALIDATION_ERROR', 'Remarks are required');
  }

  for (const status of ['Closed', 'done']) {
    const response = await request(buildApp(admin))
      .put(`/api/complaints/${complaintId}`)
      .send({ status, remarks: 'Invalid update' });
    assertError(response, 400, 'VALIDATION_ERROR', 'Invalid status');
  }

  const stored = await Complaint.findById(complaintId).lean();
  assert.equal(stored.status, 'Open');
  assert.equal(stored.isOpen, true);
  assert.equal(stored.history.length, 1);
  assert.equal(stored.history[0].status, 'Open');
});

test('GET /api/complaints/mine returns only the student complaints newest first', async () => {
  const firstStudent = await createStudent(13);
  const secondStudent = await createStudent(14);
  const now = Date.now();
  await Complaint.create([
    {
      studentId: firstStudent.student._id,
      category: 'Electrical',
      description: 'Older complaint',
      status: 'Open',
      isOpen: true,
      createdAt: new Date(now - 2000),
      updatedAt: new Date(now - 2000)
    },
    {
      studentId: secondStudent.student._id,
      category: 'Plumbing',
      description: 'Other student complaint',
      status: 'Open',
      isOpen: true,
      createdAt: new Date(now - 1000),
      updatedAt: new Date(now - 1000)
    },
    {
      studentId: firstStudent.student._id,
      category: 'Furniture',
      description: 'Newer complaint',
      status: 'Open',
      isOpen: true,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }
  ]);

  const response = await request(buildApp(firstStudent.sessionUser))
    .get('/api/complaints/mine');

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.data.map((complaint) => complaint.description),
    ['Newer complaint', 'Older complaint']
  );
  assert.equal(response.body.data.length, 2);
});

test('GET /api/complaints lists student details and supports status and category filters', async () => {
  const firstStudent = await createStudent(15);
  const secondStudent = await createStudent(16);
  await Complaint.create([
    {
      studentId: firstStudent.student._id,
      category: 'Electrical',
      description: 'Electrical issue',
      status: 'In Progress',
      isOpen: true
    },
    {
      studentId: firstStudent.student._id,
      category: 'Plumbing',
      description: 'Plumbing issue',
      status: 'Resolved',
      isOpen: false
    },
    {
      studentId: secondStudent.student._id,
      category: 'Electrical',
      description: 'Second electrical issue',
      status: 'Open',
      isOpen: true
    }
  ]);
  const app = buildApp(admin);

  const all = await request(app).get('/api/complaints');
  assert.equal(all.status, 200);
  assert.equal(all.body.data.length, 3);
  assert.deepEqual(
    all.body.data
      .map((complaint) => [complaint.usn, complaint.studentName])
      .sort((left, right) => left[0].localeCompare(right[0])),
    [
      [firstStudent.student.usn, firstStudent.student.name],
      [firstStudent.student.usn, firstStudent.student.name],
      [secondStudent.student.usn, secondStudent.student.name]
    ]
  );

  const inProgress = await request(app)
    .get('/api/complaints?status=In%20Progress');
  assert.equal(inProgress.status, 200);
  assert.equal(inProgress.body.data.length, 1);
  assert.equal(inProgress.body.data[0].description, 'Electrical issue');

  const electrical = await request(app)
    .get('/api/complaints?category=electrical');
  assert.equal(electrical.status, 200);
  assert.equal(electrical.body.data.length, 2);
  assert.ok(electrical.body.data.every((complaint) => complaint.category === 'Electrical'));
});

test('blank descriptions retain the required description validation', async () => {
  const student = await createStudent(5);
  const response = await request(buildApp(student.sessionUser))
    .post('/api/complaints')
    .send({ category: 'Electrical', description: '  ' });

  assertError(response, 400, 'VALIDATION_ERROR', 'Description is required');
  assert.deepEqual(response.body.error.details, { description: 'Description is required' });
});

test('admin updates require an allowed status and non-blank remarks', async () => {
  const student = await createStudent(6);
  const complaint = await Complaint.create({
    studentId: student.student._id,
    category: 'Plumbing',
    description: 'Leaking tap',
    status: 'Open',
    isOpen: true,
    history: [{
      status: 'Open',
      remarks: null,
      at: new Date(),
      by: student.user._id
    }]
  });
  const app = buildApp(admin);

  const open = await request(app)
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'Open', remarks: 'Still open' });
  assertError(open, 400, 'VALIDATION_ERROR', 'Invalid status');
  assert.deepEqual(open.body.error.details, { status: 'Invalid status' });

  const missingRemarks = await request(app)
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'In Progress' });
  assertError(missingRemarks, 400, 'VALIDATION_ERROR', 'Remarks are required');
  assert.deepEqual(missingRemarks.body.error.details, { remarks: 'Remarks are required' });
});

test('resolving a complaint closes it and allows a new complaint in the same category', async () => {
  const student = await createStudent(7);
  const complaint = await Complaint.create({
    studentId: student.student._id,
    category: 'Furniture',
    description: 'Broken chair',
    status: 'Open',
    isOpen: true,
    history: [{
      status: 'Open',
      remarks: null,
      at: new Date(),
      by: student.user._id
    }]
  });

  const resolved = await request(buildApp(admin))
    .put(`/api/complaints/${complaint._id}`)
    .send({ status: 'Resolved', remarks: 'Chair replaced' });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.data.isOpen, false);
  assert.equal(resolved.body.data.remarks, 'Chair replaced');

  const created = await request(buildApp(student.sessionUser))
    .post('/api/complaints')
    .send({ category: 'fUrNiTuRe', description: 'Another broken chair' });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.category, 'Furniture');
});

test('malformed complaint ids return NOT_FOUND before querying', async () => {
  const app = buildApp(admin);
  const getResponse = await request(app).get('/api/complaints/not-an-object-id');
  assertError(getResponse, 404, 'NOT_FOUND', 'Complaint not found');

  const putResponse = await request(app)
    .put('/api/complaints/not-an-object-id')
    .send({ status: 'Resolved', remarks: 'Fixed' });
  assertError(putResponse, 404, 'NOT_FOUND', 'Complaint not found');
});

test('duplicate-key errors from create and save return COMPLAINT_CATEGORY_OPEN', async () => {
  const student = await createStudent(8);
  const createError = Object.assign(new Error('duplicate'), { code: 11000 });
  const createModel = {
    exists: async () => false,
    create: async () => { throw createError; }
  };
  const postResponse = await request(buildApp(student.sessionUser, { Complaint: createModel }))
    .post('/api/complaints')
    .send({ category: 'Electrical', description: 'Broken light' });
  assertError(postResponse, 409, 'COMPLAINT_CATEGORY_OPEN');

  const saveError = Object.assign(new Error('duplicate'), { code: 11000 });
  const complaint = {
    category: 'Electrical',
    remarks: null,
    history: [],
    save: async () => { throw saveError; }
  };
  const saveModel = { findById: async () => complaint };
  const putResponse = await request(buildApp(admin, { Complaint: saveModel }))
    .put(`/api/complaints/${new mongoose.Types.ObjectId()}`)
    .send({ status: 'In Progress', remarks: 'Assigned' });
  assertError(putResponse, 409, 'COMPLAINT_CATEGORY_OPEN');
  assert.deepEqual(putResponse.body.error.details, { category: 'Electrical' });
});

test('unexpected model errors return the safe internal error response', async () => {
  const app = buildApp(admin, {
    Complaint: {
      find: () => {
        throw new Error('internal secret');
      }
    }
  });
  const response = await request(app).get('/api/complaints');
  assertError(response, 500, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response.body).includes('internal secret'), false);
});

test('the real app mounts and protects the complaint route', async () => {
  const response = await request(createApp()).get('/api/complaints');
  assertError(response, 401, 'SESSION_EXPIRED');
});
