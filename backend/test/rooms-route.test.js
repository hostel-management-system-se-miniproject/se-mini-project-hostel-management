// HMS-07 (UT-08, UT-31): GET /api/rooms filters, vacancy and access control. No MongoDB needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createRoomsRouter, parseRoomFilters } = require('../src/routes/rooms');
const { createFakeRoomModel } = require('../test-support/fakeRoomModel');

const ROOMS = [
  { _id: 'r1', roomNo: 'A-101', block: 'A', floor: 1, sharingType: 'triple', capacity: 3, occupancy: 3 },
  { _id: 'r2', roomNo: 'A-102', block: 'A', floor: 1, sharingType: 'double', capacity: 2, occupancy: 0 },
  { _id: 'r3', roomNo: 'A-204', block: 'A', floor: 2, sharingType: 'single', capacity: 1, occupancy: 1 },
  { _id: 'r4', roomNo: 'B-101', block: 'B', floor: 1, sharingType: 'double', capacity: 2, occupancy: 1 },
  { _id: 'r5', roomNo: 'B-204', block: 'B', floor: 2, sharingType: 'triple', capacity: 3, occupancy: 0 }
];

const admin = { id: 'a1', role: 'admin', usn: null };
const student = { id: 's1', role: 'student', usn: 'PES1UG24CS001' };

// Builds an app whose session is whatever the test passes (null means not logged in).
function buildApp(sessionUser) {
  const Room = createFakeRoomModel(ROOMS);
  const app = express();
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/rooms', createRoomsRouter({ Room }));
  return { app, Room };
}

const roomNumbers = (response) => response.body.data.map((room) => room.roomNo);

test('UT-08 no filters returns all rooms with capacity, occupancy and vacancy', async () => {
  const { app } = buildApp(admin);
  const response = await request(app).get('/api/rooms');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 5);
  assert.deepEqual(response.body.data[0], {
    id: 'r1', roomNo: 'A-101', block: 'A', floor: 1, sharingType: 'triple', capacity: 3, occupancy: 3, vacancy: 0
  });
  assert.equal(response.body.data[1].vacancy, 2);
  assert.equal(response.body.data[3].vacancy, 1);
});

test('UT-08 block, floor and sharing filters narrow the list and combine', async () => {
  const { app } = buildApp(admin);

  assert.deepEqual(roomNumbers(await request(app).get('/api/rooms?block=B')), ['B-101', 'B-204']);
  assert.deepEqual(roomNumbers(await request(app).get('/api/rooms?floor=2')), ['A-204', 'B-204']);
  assert.deepEqual(roomNumbers(await request(app).get('/api/rooms?sharing=double')), ['A-102', 'B-101']);
  assert.deepEqual(roomNumbers(await request(app).get('/api/rooms?block=A&floor=1&sharing=double')), ['A-102']);
});

test('filters ignore letter case, so Triple matches triple and a matches A', async () => {
  const { app } = buildApp(admin);

  assert.deepEqual(roomNumbers(await request(app).get('/api/rooms?sharing=Triple')), ['A-101', 'B-204']);
  assert.deepEqual(roomNumbers(await request(app).get('/api/rooms?block=a&floor=2')), ['A-204']);
});

test('UT-08 available=true returns only rooms with a vacancy; available=false adds no restriction', async () => {
  const { app } = buildApp(admin);

  const available = await request(app).get('/api/rooms?available=true');
  assert.deepEqual(roomNumbers(available), ['A-102', 'B-101', 'B-204']);
  assert.ok(available.body.data.every((room) => room.vacancy > 0));

  assert.equal((await request(app).get('/api/rooms?available=false')).body.data.length, 5);
});

test('UT-31 a filter with no match returns 200 and an empty list', async () => {
  const { app } = buildApp(admin);
  const response = await request(app).get('/api/rooms?block=Z');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, []);
});

test('blank filter values are treated as no filter', async () => {
  const { app } = buildApp(admin);
  const response = await request(app).get('/api/rooms?block=&floor=&sharing=&available=');

  assert.equal(response.body.data.length, 5);
});

test('invalid filters return 400 VALIDATION_ERROR naming each bad field', async () => {
  const { app } = buildApp(admin);

  for (const bad of ['floor=abc', 'floor=-1', 'floor=1.5', 'available=yes']) {
    const response = await request(app).get(`/api/rooms?${bad}`);
    assert.equal(response.status, 400, bad);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }

  const both = await request(app).get('/api/rooms?floor=x&available=maybe');
  assert.deepEqual(Object.keys(both.body.error.details).sort(), ['available', 'floor']);

  const repeated = await request(app).get('/api/rooms?block=A&block=B');
  assert.equal(repeated.status, 400);
  assert.ok(repeated.body.error.details.block);
});

test('regex characters in a filter are matched literally and cannot inject a pattern', async () => {
  const { app, Room } = buildApp(admin);
  const response = await request(app).get('/api/rooms').query({ block: '.*' });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, []);
  assert.equal(Room.lastFilter.block.$regex, '^\\.\\*$');
  assert.equal(parseRoomFilters({ block: 'A(' }).ok, true);
});

test('UT-31 a student receives 403 FORBIDDEN and no room data', async () => {
  const { app, Room } = buildApp(student);
  const response = await request(app).get('/api/rooms');

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
  assert.equal(response.body.data, undefined);
  assert.equal(Room.lastFilter, null);
});

test('an anonymous request receives 401 SESSION_EXPIRED', async () => {
  const { app } = buildApp(null);
  const response = await request(app).get('/api/rooms');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'SESSION_EXPIRED');
});

test('the real app mounts /api/rooms and protects it', async () => {
  const response = await request(createApp()).get('/api/rooms');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'SESSION_EXPIRED');
});

test('a database failure returns the safe 500 body without internals', async () => {
  const Room = { find() { throw new Error('connection secret details'); } };
  const app = express();
  app.use((req, _res, next) => { req.session = { user: admin }; next(); });
  app.use('/api/rooms', createRoomsRouter({ Room }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  });
  const response = await request(app).get('/api/rooms');

  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
});
