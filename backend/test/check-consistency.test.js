const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Room, Allocation } = require('../src/models');
const { checkConsistency } = require('../scripts/check-consistency');

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

test('returns an empty consistent result for an empty database', async () => {
  assert.deepEqual(await checkConsistency(), {
    ok: true,
    roomDifferences: [],
    multipleActive: [],
    unknownRooms: []
  });
});

test('reports consistent room occupancy', async () => {
  const room = await createRoom({ capacity: 3, occupancy: 2 }).save();
  await Allocation.create([
    { studentId: new mongoose.Types.ObjectId(), roomId: room._id },
    { studentId: new mongoose.Types.ObjectId(), roomId: room._id }
  ]);

  const result = await checkConsistency();

  assert.equal(result.ok, true);
  assert.deepEqual(result.roomDifferences, []);
});

test('reports occupancy higher than active allocations', async () => {
  const room = await createRoom({ occupancy: 2 }).save();
  await createAllocation({ roomId: room._id }).save();

  const result = await checkConsistency();

  assert.deepEqual(result.roomDifferences, [{
    roomId: String(room._id),
    roomNo: room.roomNo,
    occupancy: 2,
    activeAllocations: 1
  }]);
});

test('reports occupancy lower than active allocations', async () => {
  const room = await createRoom({ occupancy: 1 }).save();
  await Allocation.create([
    { studentId: new mongoose.Types.ObjectId(), roomId: room._id },
    { studentId: new mongoose.Types.ObjectId(), roomId: room._id }
  ]);

  const result = await checkConsistency();

  assert.deepEqual(result.roomDifferences, [{
    roomId: String(room._id),
    roomNo: room.roomNo,
    occupancy: 1,
    activeAllocations: 2
  }]);
});

test('reports only rooms with occupancy or allocation differences', async () => {
  await createRoom({ roomNo: 'A-101', occupancy: 0 }).save();
  const mismatchedRoom = await createRoom({ roomNo: 'A-102', occupancy: 1 }).save();

  const result = await checkConsistency();

  assert.deepEqual(result.roomDifferences, [{
    roomId: String(mismatchedRoom._id),
    roomNo: mismatchedRoom.roomNo,
    occupancy: 1,
    activeAllocations: 0
  }]);
});

test('does not count inactive allocations', async () => {
  const room = await createRoom({ occupancy: 0 }).save();
  await createAllocation({ roomId: room._id, status: 'inactive' }).save();

  assert.deepEqual(await checkConsistency(), {
    ok: true,
    roomDifferences: [],
    multipleActive: [],
    unknownRooms: []
  });
});

test('reports active allocations for unknown rooms', async () => {
  const roomId = new mongoose.Types.ObjectId();
  await createAllocation({ roomId }).save();

  const result = await checkConsistency();

  assert.deepEqual(result.unknownRooms, [{
    roomId: String(roomId),
    count: 1
  }]);
});

test('reports students with multiple active allocations and restores the index', async () => {
  const studentId = new mongoose.Types.ObjectId();
  const index = (await Allocation.collection.indexes()).find((entry) => (
    entry.key.studentId === 1 && entry.unique
  ));
  assert.ok(index);

  await Allocation.collection.dropIndex(index.name);
  try {
    await Allocation.create([
      { studentId, roomId: new mongoose.Types.ObjectId() },
      { studentId, roomId: new mongoose.Types.ObjectId() }
    ]);

    const result = await checkConsistency();

    assert.deepEqual(result.multipleActive, [{
      studentId: String(studentId),
      count: 2
    }]);
  } finally {
    await Allocation.deleteMany({});
    await Allocation.createIndexes();
  }

  const restoredIndexes = await Allocation.collection.indexes();
  assert.ok(restoredIndexes.some((entry) => (
    entry.key.studentId === 1 && entry.unique
  )));
});

test('does not modify rooms or allocations', async () => {
  const room = await createRoom({ occupancy: 1 }).save();
  await createAllocation({ roomId: room._id }).save();
  const beforeCounts = {
    rooms: await Room.countDocuments(),
    allocations: await Allocation.countDocuments()
  };

  await checkConsistency();

  assert.deepEqual({
    rooms: await Room.countDocuments(),
    allocations: await Allocation.countDocuments()
  }, beforeCounts);
});
