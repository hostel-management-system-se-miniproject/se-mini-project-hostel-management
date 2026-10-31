const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, mock, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Student, Room, Allocation } = require('../src/models');
const {
  allocateRoom,
  reallocateAllocation,
  vacateAllocation
} = require('../src/services/allocationService');

before(async () => {
  await connectTestDb();
  await Promise.all([Student.init(), Room.init(), Allocation.init()]);
});

beforeEach(async () => {
  await clearTestDb();
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await disconnectTestDb();
});

function createStudent(overrides = {}) {
  return new Student({
    userId: new mongoose.Types.ObjectId(),
    usn: 'PES1UG24CS001',
    name: 'Test Student',
    email: 'student@example.com',
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

function errorWith(code, status) {
  return (error) => error.code === code && error.status === status;
}

test('IT-03 reallocates an active allocation and updates both rooms', async () => {
  const student = await createStudent().save();
  const oldRoom = await createRoom({ occupancy: 1 }).save();
  const newRoom = await createRoom({ roomNo: 'A-205' }).save();
  const allocation = await Allocation.create({
    studentId: student._id,
    roomId: oldRoom._id,
    status: 'active'
  });

  const result = await reallocateAllocation({
    allocationId: String(allocation._id),
    roomId: String(newRoom._id)
  });

  assert.deepEqual(result, {
    id: result.id,
    usn: student.usn,
    room: newRoom.roomNo,
    status: 'active'
  });
  const old = await Allocation.findById(allocation._id);
  const replacement = await Allocation.findById(result.id);
  assert.equal(old.status, 'inactive');
  assert.equal(old.endReason, 'reallocated');
  assert.ok(old.endedAt);
  assert.equal(replacement.status, 'active');
  assert.equal(String(replacement.roomId), String(newRoom._id));
  assert.equal((await Room.findById(oldRoom._id)).occupancy, 0);
  assert.equal((await Room.findById(newRoom._id)).occupancy, 1);
});

test('IT-14 returns ROOM_FULL without changing the old allocation', async () => {
  const student = await createStudent().save();
  const oldRoom = await createRoom({ occupancy: 1 }).save();
  const fullRoom = await createRoom({ roomNo: 'A-205', capacity: 1, occupancy: 1 }).save();
  const allocation = await Allocation.create({ studentId: student._id, roomId: oldRoom._id });

  await assert.rejects(
    () => reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(fullRoom._id)
    }),
    errorWith('ROOM_FULL', 409)
  );
  assert.equal((await Allocation.findById(allocation._id)).status, 'active');
  assert.equal((await Room.findById(oldRoom._id)).occupancy, 1);
  assert.equal((await Room.findById(fullRoom._id)).occupancy, 1);
});

test('reallocate validates the destination before changing anything', async () => {
  const student = await createStudent().save();
  const room = await createRoom({ occupancy: 1 }).save();
  const allocation = await Allocation.create({ studentId: student._id, roomId: room._id });

  for (const roomId of [undefined, '', 'bad']) {
    await assert.rejects(
      () => reallocateAllocation({ allocationId: String(allocation._id), roomId }),
      errorWith('VALIDATION_ERROR', 400)
    );
  }
  await assert.rejects(
    () => reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(room._id)
    }),
    errorWith('VALIDATION_ERROR', 400)
  );
  await assert.rejects(
    () => reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(new mongoose.Types.ObjectId())
    }),
    errorWith('NOT_FOUND', 404)
  );
  for (const allocationId of ['bad', String(new mongoose.Types.ObjectId())]) {
    await assert.rejects(
      () => reallocateAllocation({ allocationId, roomId: String(room._id) }),
      errorWith('NOT_FOUND', 404)
    );
  }
  await Allocation.updateOne(
    { _id: allocation._id },
    { $set: { status: 'inactive', endedAt: new Date(), endReason: 'vacated' } }
  );
  await assert.rejects(
    () => reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(new mongoose.Types.ObjectId())
    }),
    errorWith('NOT_FOUND', 404)
  );
});

test('reallocate compensates when creating the replacement fails', async () => {
  const student = await createStudent().save();
  const oldRoom = await createRoom({ occupancy: 1 }).save();
  const newRoom = await createRoom({ roomNo: 'A-205' }).save();
  const allocation = await Allocation.create({ studentId: student._id, roomId: oldRoom._id });
  const expectedError = new Error('insert failed');
  mock.method(Allocation, 'create', async () => { throw expectedError; });

  await assert.rejects(
    () => reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(newRoom._id)
    }),
    (error) => error === expectedError
  );
  const restored = await Allocation.findById(allocation._id);
  assert.equal(restored.status, 'active');
  assert.equal(restored.endedAt, null);
  assert.equal(restored.endReason, undefined);
  assert.equal((await Room.findById(newRoom._id)).occupancy, 0);
});

test('reallocate compensates when ending the old allocation fails', async () => {
  const student = await createStudent().save();
  const oldRoom = await createRoom({ occupancy: 1 }).save();
  const newRoom = await createRoom({ roomNo: 'A-205' }).save();
  const allocation = await Allocation.create({ studentId: student._id, roomId: oldRoom._id });
  const expectedError = new Error('update failed');
  mock.method(Allocation, 'findOneAndUpdate', async () => { throw expectedError; });

  await assert.rejects(
    () => reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(newRoom._id)
    }),
    (error) => error === expectedError
  );
  assert.equal((await Allocation.findById(allocation._id)).status, 'active');
  assert.equal((await Room.findById(newRoom._id)).occupancy, 0);
});

test('two reallocations into the last bed have one winner', async () => {
  const students = await Promise.all([
    createStudent().save(),
    createStudent({ usn: 'PES1UG24CS002', email: 'second@example.com' }).save()
  ]);
  const oldRooms = await Promise.all([
    createRoom({ roomNo: 'A-204', occupancy: 1 }).save(),
    createRoom({ roomNo: 'A-205', occupancy: 1 }).save()
  ]);
  const destination = await createRoom({ roomNo: 'A-206', capacity: 1 }).save();
  const allocations = await Promise.all(students.map((student, index) => (
    Allocation.create({ studentId: student._id, roomId: oldRooms[index]._id })
  )));

  const results = await Promise.allSettled(allocations.map((allocation) => (
    reallocateAllocation({
      allocationId: String(allocation._id),
      roomId: String(destination._id)
    })
  )));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => (
    result.status === 'rejected' && result.reason.code === 'ROOM_FULL'
  )).length, 1);
  assert.equal((await Room.findById(destination._id)).occupancy, 1);
});

test('IT-04 vacates after confirmation and permits allocation again', async () => {
  const student = await createStudent().save();
  const room = await createRoom({ occupancy: 1 }).save();
  const allocation = await Allocation.create({ studentId: student._id, roomId: room._id });

  const result = await vacateAllocation({ allocationId: String(allocation._id), confirm: true });

  assert.deepEqual(result, { id: String(allocation._id), usn: student.usn, status: 'inactive' });
  const ended = await Allocation.findById(allocation._id);
  assert.equal(ended.endReason, 'vacated');
  assert.ok(ended.endedAt);
  assert.equal((await Room.findById(room._id)).occupancy, 0);
  await assert.doesNotReject(() => allocateRoom({
    usn: student.usn,
    roomId: String(room._id)
  }));
});

test('IT-15 requires boolean confirmation and rejects a second vacate', async () => {
  const student = await createStudent().save();
  const room = await createRoom({ occupancy: 1 }).save();
  const allocation = await Allocation.create({ studentId: student._id, roomId: room._id });

  for (const confirm of [undefined, false, 'true']) {
    await assert.rejects(
      () => vacateAllocation({ allocationId: String(allocation._id), confirm }),
      errorWith('CONFIRMATION_REQUIRED', 400)
    );
  }
  assert.equal((await Allocation.findById(allocation._id)).status, 'active');
  await vacateAllocation({ allocationId: String(allocation._id), confirm: true });
  await assert.rejects(
    () => vacateAllocation({ allocationId: String(allocation._id), confirm: true }),
    errorWith('NOT_FOUND', 404)
  );
});

test('IT-16 keeps occupancy equal to active allocations through the lifecycle', async () => {
  const student = await createStudent().save();
  const rooms = await Promise.all([
    createRoom({ roomNo: 'A-204' }).save(),
    createRoom({ roomNo: 'A-205' }).save(),
    createRoom({ roomNo: 'A-206' }).save(),
    createRoom({ roomNo: 'A-207' }).save()
  ]);
  const allocation = await Allocation.create({ studentId: student._id, roomId: rooms[0]._id });
  await reallocateAllocation({
    allocationId: String(allocation._id),
    roomId: String(rooms[1]._id)
  });
  const current = await Allocation.findOne({ studentId: student._id, status: 'active' });
  await vacateAllocation({ allocationId: String(current._id), confirm: true });
  const replacement = await allocateRoom({ usn: student.usn, roomId: String(rooms[2]._id) });
  await reallocateAllocation({
    allocationId: replacement.id,
    roomId: String(rooms[3]._id)
  });

  for (const room of rooms) {
    assert.equal(
      (await Room.findById(room._id)).occupancy,
      await Allocation.countDocuments({ roomId: room._id, status: 'active' })
    );
  }
});
