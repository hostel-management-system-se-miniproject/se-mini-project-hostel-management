// HMS-07 against a real MongoDB test database, so the filters run as real queries.
// Needs backend/.env with MONGODB_URI_TEST pointing to a database whose name ends in _test.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { Room } = require('../src/models');
const { createRoomsRouter } = require('../src/routes/rooms');
const { connectTestDb, clearTestDb } = require('../test-support/db');

function buildApp() {
  const app = express();
  app.use((req, _res, next) => { req.session = { user: { id: 'a1', role: 'admin', usn: null } }; next(); });
  app.use('/api/rooms', createRoomsRouter());
  return app;
}

test.before(async () => {
  await connectTestDb();
  await Room.createIndexes();
});

test.beforeEach(async () => {
  await clearTestDb();
  await Room.create([
    { roomNo: 'A-101', block: 'A', floor: 1, sharingType: 'triple', capacity: 3, occupancy: 3 },
    { roomNo: 'A-102', block: 'A', floor: 1, sharingType: 'double', capacity: 2, occupancy: 0 },
    { roomNo: 'B-101', block: 'B', floor: 1, sharingType: 'double', capacity: 2, occupancy: 1 },
    { roomNo: 'B-204', block: 'B', floor: 2, sharingType: 'Triple', capacity: 3, occupancy: 0 }
  ]);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('UT-08 (database) filters run as real queries and vacancy is computed', async () => {
  const app = buildApp();

  const all = await request(app).get('/api/rooms');
  assert.deepEqual(all.body.data.map((room) => room.roomNo), ['A-101', 'A-102', 'B-101', 'B-204']);

  const free = await request(app).get('/api/rooms?available=true');
  assert.deepEqual(free.body.data.map((room) => room.roomNo), ['A-102', 'B-101', 'B-204']);
  assert.equal(free.body.data.find((room) => room.roomNo === 'B-101').vacancy, 1);

  const triple = await request(app).get('/api/rooms?sharing=triple');
  assert.deepEqual(triple.body.data.map((room) => room.roomNo), ['A-101', 'B-204']);

  const combined = await request(app).get('/api/rooms?block=B&floor=1&sharing=double&available=true');
  assert.deepEqual(combined.body.data.map((room) => room.roomNo), ['B-101']);
});

test('UT-31 (database) a filter with no match returns an empty list', async () => {
  const response = await request(buildApp()).get('/api/rooms?block=Z');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, []);
});
