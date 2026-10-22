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
const { Student, Visitor } = require('../src/models');
const { createVisitorsRouter } = require('../src/routes/visitors');
const { validateEntry } = require('../src/services/visitorService');

const admin = { id: new mongoose.Types.ObjectId().toString(), role: 'admin', usn: null };
const studentUser = { id: new mongoose.Types.ObjectId().toString(), role: 'student', usn: 'PES1UG24CS001' };

before(async () => {
  await connectTestDb();
  await Promise.all([Student.init(), Visitor.init()]);
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

function buildApp(sessionUser, options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/visitors', createVisitorsRouter(options));
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

function validEntry(overrides = {}) {
  return {
    usn: 'pes1ug24cs001',
    name: ' Suresh Rao ',
    contact: '9988776655',
    purpose: ' Meeting ',
    entryTime: '2026-10-22T10:00:00.000Z',
    ...overrides
  };
}

test('validateEntry collects required fields and normalises valid input', () => {
  assert.throws(
    () => validateEntry(),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.deepEqual(error.details, {
        usn: 'Student USN is required',
        name: 'Name is required',
        contact: 'Contact is required',
        purpose: 'Purpose is required',
        entryTime: 'Entry time is required'
      });
      return true;
    }
  );
  assert.throws(
    () => validateEntry(validEntry({ name: '   ' })),
    (error) => error.details.name === 'Name is required'
  );
  assert.throws(
    () => validateEntry(validEntry({ contact: 'abc123' })),
    (error) => error.details.contact === 'Contact must contain digits only (maximum 15 characters)'
  );
  assert.throws(
    () => validateEntry(validEntry({ contact: '1234567890123456' })),
    (error) => error.details.contact === 'Contact must contain digits only (maximum 15 characters)'
  );
  assert.throws(
    () => validateEntry(validEntry({ entryTime: '2026-10-22 10:00:00' })),
    (error) => error.details.entryTime === 'Enter a valid entry time'
  );
  assert.throws(
    () => validateEntry(validEntry({ usn: 'PES1UG24CS01!' })),
    (error) => error.code === 'INVALID_USN'
  );
  const { value } = validateEntry(validEntry());
  assert.deepEqual(value, {
    usn: 'PES1UG24CS001',
    name: 'Suresh Rao',
    contact: '9988776655',
    purpose: 'Meeting',
    entryTime: new Date('2026-10-22T10:00:00.000Z')
  });
});

test('visitor routes require an admin before validation or database work', async () => {
  const routes = [
    request(buildApp(null)).post('/api/visitors').send({}),
    request(buildApp(null)).get('/api/visitors'),
    request(buildApp(null)).put(`/api/visitors/${new mongoose.Types.ObjectId()}/exit`).send({}),
    request(buildApp(studentUser)).post('/api/visitors').send({}),
    request(buildApp(studentUser)).get('/api/visitors'),
    request(buildApp(studentUser)).put(`/api/visitors/${new mongoose.Types.ObjectId()}/exit`).send({})
  ];
  const responses = await Promise.all(routes);
  for (const response of responses.slice(0, 3)) {
    assertError(response, 401, 'SESSION_EXPIRED');
  }
  for (const response of responses.slice(3)) {
    assertError(response, 403, 'FORBIDDEN');
  }
});

test('admin can create and list a visitor entry', async () => {
  const student = await createStudent().save();
  const response = await request(buildApp(admin))
    .post('/api/visitors')
    .send(validEntry());

  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(response.body.data).sort(), [
    'contact', 'entryTime', 'exitTime', 'id', 'name', 'purpose', 'usn'
  ]);
  assert.equal(response.body.data.usn, student.usn);
  assert.equal(response.body.data.exitTime, null);
  const stored = await Visitor.findById(response.body.data.id);
  assert.equal(String(stored.recordedBy), admin.id);

  const listed = await request(buildApp(admin)).get('/api/visitors');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.length, 1);
  assert.equal(listed.body.data[0].studentName, student.name);
});

test('invalid entries are rejected without creating visitors', async () => {
  await createStudent().save();
  for (const body of [
    validEntry({ name: '' }),
    validEntry({ contact: 'abc123' })
  ]) {
    const response = await request(buildApp(admin)).post('/api/visitors').send(body);
    assertError(response, 400, 'VALIDATION_ERROR');
    assert.equal(await Visitor.countDocuments(), 0);
  }
});

test('unknown students and malformed USNs return the contract errors', async () => {
  const unknownStudent = await request(buildApp(admin))
    .post('/api/visitors')
    .send(validEntry({ usn: 'PES1UG24CS999' }));
  assertError(unknownStudent, 404, 'NOT_FOUND');

  const malformed = await request(buildApp(admin))
    .post('/api/visitors')
    .send(validEntry({ usn: 'bad-usn' }));
  assertError(malformed, 400, 'INVALID_USN');
});

test('GET returns newest entries first and nulls missing students', async () => {
  const student = await createStudent().save();
  await Visitor.create([
    {
      studentId: student._id,
      name: 'Older',
      contact: '111',
      purpose: 'Visit',
      entryTime: new Date('2026-10-22T09:00:00.000Z'),
      recordedBy: admin.id
    },
    {
      studentId: new mongoose.Types.ObjectId(),
      name: 'Newer',
      contact: '222',
      purpose: 'Visit',
      entryTime: new Date('2026-10-22T11:00:00.000Z'),
      recordedBy: admin.id
    }
  ]);

  const response = await request(buildApp(admin)).get('/api/visitors');
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body.data[0]).sort(), [
    'contact', 'entryTime', 'exitTime', 'id', 'name', 'purpose', 'studentName', 'usn'
  ]);
  assert.equal(response.body.data[0].name, 'Newer');
  assert.equal(response.body.data[0].usn, null);
  assert.equal(response.body.data[0].studentName, null);
  assert.equal(response.body.data[1].studentName, student.name);

  await Visitor.deleteMany({});
  const empty = await request(buildApp(admin)).get('/api/visitors');
  assert.deepEqual(empty.body.data, []);
});

test('PUT records an exit on the same visitor and overwrites an existing exit', async () => {
  const student = await createStudent().save();
  const visitor = await Visitor.create({
    studentId: student._id,
    name: 'Suresh Rao',
    contact: '9988776655',
    purpose: 'Meeting',
    entryTime: new Date('2026-10-22T10:00:00.000Z'),
    exitTime: new Date('2026-10-22T11:00:00.000Z'),
    recordedBy: admin.id
  });
  const response = await request(buildApp(admin))
    .put(`/api/visitors/${visitor._id}/exit`)
    .send({ exitTime: '2026-10-22T12:00:00.000Z' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, String(visitor._id));
  assert.equal(response.body.data.usn, student.usn);
  assert.equal(await Visitor.countDocuments(), 1);
  assert.equal((await Visitor.findById(visitor._id)).exitTime.toISOString(), '2026-10-22T12:00:00.000Z');
});

test('PUT rejects invalid or non-increasing exit times without changing the record', async () => {
  const student = await createStudent().save();
  const visitor = await Visitor.create({
    studentId: student._id,
    name: 'Suresh Rao',
    contact: '9988776655',
    purpose: 'Meeting',
    entryTime: new Date('2026-10-22T10:00:00.000Z'),
    recordedBy: admin.id
  });
  const original = (await Visitor.findById(visitor._id)).toObject();

  for (const exitTime of ['2026-10-22T09:00:00.000Z', '2026-10-22T10:00:00.000Z', undefined, 'not-a-date']) {
    const response = await request(buildApp(admin))
      .put(`/api/visitors/${visitor._id}/exit`)
      .send(exitTime === undefined ? {} : { exitTime });
    assertError(response, 400, 'VALIDATION_ERROR');
  }
  assert.equal((await Visitor.findById(visitor._id)).exitTime, null);
  assert.equal((await Visitor.findById(visitor._id)).entryTime.toISOString(), original.entryTime.toISOString());
});

test('PUT returns NOT_FOUND for unknown and malformed ids', async () => {
  const unknown = await request(buildApp(admin))
    .put(`/api/visitors/${new mongoose.Types.ObjectId()}/exit`)
    .send({ exitTime: '2026-10-22T12:00:00.000Z' });
  assertError(unknown, 404, 'NOT_FOUND');

  const malformed = await request(buildApp(admin))
    .put('/api/visitors/not-an-id/exit')
    .send({ exitTime: '2026-10-22T12:00:00.000Z' });
  assertError(malformed, 404, 'NOT_FOUND');
});

test('unexpected model errors use the safe internal error response', async () => {
  const response = await request(buildApp(admin, {
    Visitor: {
      find: () => {
        throw new Error('internal secret');
      }
    }
  })).get('/api/visitors');
  assertError(response, 500, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response.body).includes('internal secret'), false);
});

test('the real app mounts and protects the visitor route', async () => {
  const response = await request(createApp()).get('/api/visitors');
  assertError(response, 401, 'SESSION_EXPIRED');
});
