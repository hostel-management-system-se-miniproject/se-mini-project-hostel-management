const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Room, Allocation } = require('../src/models');

before(async () => {
  await connectTestDb();
  await Room.init();
  await Allocation.init();
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

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

function isDuplicateKey(error) {
  return error.name === 'MongoServerError' && error.code === 11000;
}

test('saves a valid room with occupancy defaulting to zero', async () => {
  const room = await createRoom().save();

  assert.equal(room.occupancy, 0);
});

test('rejects missing required room fields and invalid numeric values', async () => {
  for (const field of ['roomNo', 'block', 'floor', 'sharingType', 'capacity']) {
    const values = {
      roomNo: 'A-204',
      block: 'A',
      floor: 2,
      sharingType: 'double',
      capacity: 2
    };
    values[field] = undefined;

    await assert.rejects(
      () => createRoom(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  for (const values of [{ capacity: 0 }, { floor: -1 }, { floor: 1.5 }]) {
    await assert.rejects(
      () => createRoom(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }
});

test('rejects occupancy above capacity and accepts equal occupancy', async () => {
  await assert.rejects(
    () => createRoom({ occupancy: 3 }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );

  const room = await createRoom({ occupancy: 2 }).save();
  assert.equal(room.occupancy, room.capacity);
});

test('rejects duplicate room numbers', async () => {
  await createRoom().save();

  await assert.rejects(
    () => createRoom({ block: 'B' }).save(),
    isDuplicateKey
  );
});

test('accepts room upserts that run update validators', async () => {
  await assert.doesNotReject(() => Room.findOneAndUpdate(
    { roomNo: 'A-101' },
    { $set: { roomNo: 'A-101', block: 'A', floor: 1, sharingType: 'triple', capacity: 3, occupancy: 3 } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ));
});

test('declares the required room indexes', async () => {
  const indexes = await Room.collection.indexes();

  assert.ok(indexes.some((index) => index.unique && index.key.roomNo === 1));
  assert.ok(indexes.some((index) => (
    Object.keys(index.key).join(',') === 'block,floor,sharingType'
  )));
});

test('saves a valid allocation with active defaults', async () => {
  const allocation = await createAllocation().save();

  assert.equal(allocation.status, 'active');
  assert.ok(allocation.startedAt instanceof Date);
  assert.equal(allocation.endedAt, null);
});

test('rejects invalid allocation fields and end reasons', async () => {
  for (const field of ['studentId', 'roomId']) {
    const values = {
      studentId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId()
    };
    values[field] = undefined;

    await assert.rejects(
      () => createAllocation(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  await assert.rejects(
    () => createAllocation({ status: 'pending' }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
  await assert.rejects(
    () => createAllocation({ endReason: 'other' }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );

  await assert.doesNotReject(() => createAllocation({ endReason: null }).save());
  await assert.doesNotReject(() => createAllocation({
    studentId: new mongoose.Types.ObjectId(),
    endReason: 'vacated'
  }).save());
});

test('rejects a second active allocation for the same student', async () => {
  const studentId = new mongoose.Types.ObjectId();
  await createAllocation({ studentId }).save();

  await assert.rejects(
    () => createAllocation({ studentId }).save(),
    isDuplicateKey
  );
});

test('allows multiple inactive allocations and a new active allocation', async () => {
  const studentId = new mongoose.Types.ObjectId();
  await createAllocation({ studentId, status: 'inactive' }).save();
  await createAllocation({
    studentId,
    status: 'inactive',
    roomId: new mongoose.Types.ObjectId()
  }).save();

  await assert.doesNotReject(() => createAllocation({ studentId }).save());
});

test('allows a new active allocation after the first becomes inactive', async () => {
  const studentId = new mongoose.Types.ObjectId();
  const allocation = await createAllocation({ studentId }).save();

  allocation.status = 'inactive';
  await allocation.save();

  await assert.doesNotReject(() => createAllocation({ studentId }).save());
});

test('allows different students to have active allocations in one room', async () => {
  const roomId = new mongoose.Types.ObjectId();

  await createAllocation({ roomId }).save();
  await assert.doesNotReject(() => createAllocation({
    roomId,
    studentId: new mongoose.Types.ObjectId()
  }).save());
});

test('allows exactly one active allocation in a concurrent race', async () => {
  const studentId = new mongoose.Types.ObjectId();
  const results = await Promise.allSettled([
    createAllocation({ studentId }).save(),
    createAllocation({ studentId }).save()
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => (
    result.status === 'rejected' && isDuplicateKey(result.reason)
  )).length, 1);
});

test('declares the required allocation indexes', async () => {
  const indexes = await Allocation.collection.indexes();

  assert.ok(indexes.some((index) => (
    index.unique
    && index.key.studentId === 1
    && JSON.stringify(index.partialFilterExpression) === JSON.stringify({ status: 'active' })
  )));
  assert.ok(indexes.some((index) => (
    Object.keys(index.key).join(',') === 'roomId,status'
  )));
});
