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
const { Student, Room, Allocation } = require('../src/models');
const { createStudentsRouter } = require('../src/routes/students');
const { createAllocationsRouter } = require('../src/routes/allocations');

const admin = { id: 'admin', role: 'admin', usn: null };
const studentUser = { id: 'student', role: 'student', usn: 'PES1UG24CS001' };

before(async () => {
  await connectTestDb();
  await Student.init();
  await Room.init();
  await Allocation.init();
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
    sharingType: 'double',
    capacity: 2,
    ...overrides
  });
}

function createAllocation(overrides = {}) {
  return new Allocation({
    studentId: new mongoose.Types.ObjectId(),
    roomId: new mongoose.Types.ObjectId(),
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
  app.use('/api/students', createStudentsRouter(options));
  app.use('/api/allocations', createAllocationsRouter(options));
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

test('all endpoints require an admin session before validation or queries', async () => {
  const paths = [
    request(buildApp(null)).get('/api/students'),
    request(buildApp(null)).get('/api/allocations'),
    request(buildApp(null)).post('/api/allocations').send({})
  ];
  for (const responsePromise of paths) {
    assertError(await responsePromise, 401, 'SESSION_EXPIRED');
  }

  for (const response of await Promise.all([
    request(buildApp(studentUser)).get('/api/students'),
    request(buildApp(studentUser)).get('/api/allocations'),
    request(buildApp(studentUser)).post('/api/allocations').send({})
  ])) {
    assertError(response, 403, 'FORBIDDEN');
  }
});

test('POST allocation returns the service data and handles service errors', async () => {
  const student = await createStudent().save();
  const room = await createRoom().save();
  const app = buildApp(admin);
  const success = await request(app).post('/api/allocations').send({
    usn: student.usn,
    roomId: String(room._id)
  });

  assert.equal(success.status, 201);
  assert.deepEqual(Object.keys(success.body.data).sort(), ['id', 'room', 'status', 'usn']);
  assert.deepEqual(success.body.data, {
    id: success.body.data.id,
    usn: student.usn,
    room: room.roomNo,
    status: 'active'
  });
  assert.equal((await Room.findById(room._id)).occupancy, 1);

  for (const [body, status, code] of [
    [{ roomId: String(room._id) }, 400, 'VALIDATION_ERROR'],
    [{ usn: 'PES1UG24CS01', roomId: String(room._id) }, 400, 'INVALID_USN'],
    [{ usn: 'PES1UG24CS002', roomId: String(room._id) }, 404, 'NOT_FOUND'],
    [{ usn: student.usn, roomId: String(new mongoose.Types.ObjectId()) }, 404, 'NOT_FOUND']
  ]) {
    assertError(await request(buildApp(admin)).post('/api/allocations').send(body), status, code);
  }

  assertError(await request(buildApp(admin)).post('/api/allocations').send({
    usn: student.usn,
    roomId: String(room._id)
  }), 409, 'ALREADY_ALLOCATED');

  assertError(await request(buildApp(admin)).post('/api/allocations'), 400, 'VALIDATION_ERROR');
});

test('POST reports room full and unexpected errors safely', async () => {
  const first = await createStudent().save();
  const second = await createStudent({ usn: 'PES1UG24CS002', email: 'second@example.com' }).save();
  const room = await createRoom({ capacity: 1, occupancy: 1 }).save();
  await createAllocation({ studentId: first._id, roomId: room._id }).save();

  assertError(await request(buildApp(admin)).post('/api/allocations').send({
    usn: second.usn,
    roomId: String(room._id)
  }), 409, 'ROOM_FULL');

  const app = buildApp(admin, {
    allocateRoom: async () => {
      throw new Error('internal secret');
    }
  });
  const response = await request(app).post('/api/allocations').send({
    usn: second.usn,
    roomId: String(room._id)
  });
  assertError(response, 500, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response.body).includes('internal secret'), false);
  assert.equal(JSON.stringify(response.body).includes('stack'), false);
});

test('GET students returns sorted fields, searches, and unallocated students', async () => {
  const allocated = await createStudent().save();
  const inactive = await createStudent({
    usn: 'PES1UG24CS002',
    name: 'Regex (Name)',
    email: 'regex@example.com'
  }).save();
  const unallocated = await createStudent({
    usn: 'PES1UG24CS003',
    name: 'Anita',
    email: 'anita@example.com'
  }).save();
  const room = await createRoom().save();
  await createAllocation({ studentId: allocated._id, roomId: room._id }).save();
  await createAllocation({ studentId: inactive._id, roomId: room._id, status: 'inactive' }).save();

  const app = buildApp(admin);
  const all = await request(app).get('/api/students');
  assert.equal(all.status, 200);
  assert.deepEqual(all.body.data.map(({ usn }) => usn), [
    allocated.usn, inactive.usn, unallocated.usn
  ]);
  assert.deepEqual(Object.keys(all.body.data[0]).sort(), ['email', 'name', 'phone', 'room', 'usn']);
  assert.deepEqual(all.body.data.map(({ usn, room: roomNo }) => ({ usn, room: roomNo })), [
    { usn: allocated.usn, room: room.roomNo },
    { usn: inactive.usn, room: null },
    { usn: unallocated.usn, room: null }
  ]);

  const unallocatedResponse = await request(app).get('/api/students?unallocated=true');
  assert.deepEqual(unallocatedResponse.body.data.map(({ usn }) => usn), [inactive.usn, unallocated.usn]);

  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: 'ug24cs00' })).body.data.map(({ usn }) => usn),
    [allocated.usn, inactive.usn, unallocated.usn]
  );
  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: 'RAVI' })).body.data.map(({ usn }) => usn),
    [allocated.usn]
  );
  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: 'EXAMPLE.COM' })).body.data.map(({ usn }) => usn),
    [allocated.usn, inactive.usn, unallocated.usn]
  );
  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: 'does-not-match' })).body.data,
    []
  );
  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: '(' })).body.data.map(({ usn }) => usn),
    [inactive.usn]
  );
  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: 'Regex (Name)' })).body.data.map(({ usn }) => usn),
    [inactive.usn]
  );
  assert.deepEqual(
    (await request(app).get('/api/students').query({ search: 'CS00', unallocated: 'true' })).body.data.map(({ usn }) => usn),
    [inactive.usn, unallocated.usn]
  );
  assert.equal((await request(app).get('/api/students?unallocated=yes')).body.data.length, 3);
});

test('the real app mounts and protects both new routers', async () => {
  const app = createApp();

  for (const response of await Promise.all([
    request(app).get('/api/students'),
    request(app).get('/api/allocations'),
    request(app).post('/api/allocations')
  ])) {
    assertError(response, 401, 'SESSION_EXPIRED');
  }
});

test('GET allocations filters, sorts newest first, and preserves missing references as null', async () => {
  const student = await createStudent().save();
  const other = await createStudent({ usn: 'PES1UG24CS002', email: 'other@example.com' }).save();
  const room = await createRoom().save();
  const oldAllocation = await createAllocation({
    studentId: student._id,
    roomId: room._id,
    status: 'inactive',
    startedAt: new Date('2026-01-01'),
    endedAt: new Date('2026-01-02'),
    endReason: 'vacated'
  }).save();
  const newAllocation = await createAllocation({
    studentId: other._id,
    roomId: room._id,
    startedAt: new Date('2026-02-01')
  }).save();
  const missingAllocation = await createAllocation({
    startedAt: new Date('2026-03-01')
  }).save();

  const app = buildApp(admin);
  const all = await request(app).get('/api/allocations');
  assert.equal(all.status, 200);
  assert.deepEqual(all.body.data.map(({ id }) => id), [
    String(missingAllocation._id), String(newAllocation._id), String(oldAllocation._id)
  ]);
  assert.deepEqual(Object.keys(all.body.data[0]).sort(), [
    'endReason', 'endedAt', 'id', 'roomId', 'roomNo', 'startedAt', 'status', 'studentName', 'usn'
  ]);
  assert.equal(all.body.data[0].usn, null);
  assert.equal(all.body.data[0].studentName, null);
  assert.equal(all.body.data[0].roomNo, null);

  assert.equal((await request(app).get('/api/allocations?active=true')).body.data.length, 2);
  assert.equal((await request(app).get('/api/allocations?active=false')).body.data.length, 1);
  assert.equal((await request(app).get(`/api/allocations?usn=${student.usn.toLowerCase()}`)).body.data.length, 1);
  assert.equal((await request(app).get(`/api/allocations?roomId=${room._id}`)).body.data.length, 2);
  assert.deepEqual((await request(app).get('/api/allocations?usn=UNKNOWN')).body.data, []);
  assert.deepEqual((await request(app).get('/api/allocations?roomId=bad')).body.data, []);
  assert.equal((await request(app).get(`/api/allocations?active=false&usn=${student.usn}&roomId=${room._id}`)).body.data.length, 1);
});

test('HTTP allocation race does not overbook a capacity-one room', async () => {
  const app = buildApp(admin);
  for (let round = 0; round < 5; round += 1) {
    const students = await Promise.all([
      createStudent({
        usn: `PES1UG24CS${String(round * 2 + 1).padStart(3, '0')}`,
        email: `first-${round}@example.com`
      }).save(),
      createStudent({
        usn: `PES1UG24CS${String(round * 2 + 2).padStart(3, '0')}`,
        email: `second-${round}@example.com`
      }).save()
    ]);
    const room = await createRoom({ roomNo: `R-${round}`, capacity: 1 }).save();
    const responses = await Promise.all(students.map((student) => (
      request(app).post('/api/allocations').send({
        usn: student.usn,
        roomId: String(room._id)
      })
    )));

    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => (
      response.status === 409 && response.body.error.code === 'ROOM_FULL'
    )).length, 1);
    assert.equal((await Room.findById(room._id)).occupancy, 1);
  }
});
