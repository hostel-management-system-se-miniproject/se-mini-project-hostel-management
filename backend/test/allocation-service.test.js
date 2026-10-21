const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, mock, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Student, Room, Allocation } = require('../src/models');
const { allocateRoom } = require('../src/services/allocationService');

before(async () => {
  await connectTestDb();
  await Student.init();
  await Room.init();
  await Allocation.init();
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

test('allocates a room and increments occupancy', async () => {
  const student = await createStudent().save();
  const room = await createRoom().save();

  const result = await allocateRoom({ usn: student.usn, roomId: String(room._id) });

  assert.deepEqual(result, {
    id: result.id,
    usn: student.usn,
    room: room.roomNo,
    status: 'active'
  });
  assert.match(result.id, /^[a-f0-9]{24}$/);
  const updatedRoom = await Room.findById(room._id);
  assert.equal(updatedRoom.occupancy, 1);
  assert.equal(await Allocation.countDocuments({ studentId: student._id, status: 'active' }), 1);
});

test('accepts a lower-case USN and returns the upper-case USN', async () => {
  const student = await createStudent().save();
  const room = await createRoom().save();

  const result = await allocateRoom({
    usn: student.usn.toLowerCase(),
    roomId: String(room._id)
  });

  assert.equal(result.usn, student.usn);
});

test('rejects missing and malformed inputs', async () => {
  const roomId = String(new mongoose.Types.ObjectId());

  for (const input of [{ roomId }, { usn: 'PES1UG24CS001' }, { usn: 'PES1UG24CS001', roomId: 'bad' }]) {
    await assert.rejects(
      () => allocateRoom(input),
      errorWith('VALIDATION_ERROR', 400)
    );
  }

  for (const usn of ['PES1UG24CS01', 'PES1UG24CS00!']) {
    await assert.rejects(
      () => allocateRoom({ usn, roomId }),
      errorWith('INVALID_USN', 400)
    );
  }
});

test('rejects unknown students and rooms', async () => {
  const room = await createRoom().save();
  const unknownStudentUsn = 'PES1UG24CS999';

  await assert.rejects(
    () => allocateRoom({ usn: unknownStudentUsn, roomId: String(room._id) }),
    errorWith('NOT_FOUND', 404)
  );

  const student = await createStudent().save();
  await assert.rejects(
    () => allocateRoom({
      usn: student.usn,
      roomId: String(new mongoose.Types.ObjectId())
    }),
    errorWith('NOT_FOUND', 404)
  );
});

test('rejects a second active allocation without changing the second room', async () => {
  const student = await createStudent().save();
  const firstRoom = await createRoom().save();
  const secondRoom = await createRoom({ roomNo: 'A-205' }).save();

  await allocateRoom({ usn: student.usn, roomId: String(firstRoom._id) });

  await assert.rejects(
    () => allocateRoom({ usn: student.usn, roomId: String(secondRoom._id) }),
    errorWith('ALREADY_ALLOCATED', 409)
  );
  const unchangedRoom = await Room.findById(secondRoom._id);
  assert.equal(unchangedRoom.occupancy, 0);
  assert.equal(await Allocation.countDocuments({ studentId: student._id, status: 'active' }), 1);
});

test('allocates a student whose previous allocation is inactive', async () => {
  const student = await createStudent().save();
  const room = await createRoom().save();
  await new Allocation({
    studentId: student._id,
    roomId: room._id,
    status: 'inactive'
  }).save();

  await assert.doesNotReject(() => allocateRoom({
    usn: student.usn,
    roomId: String(room._id)
  }));
  assert.equal(await Allocation.countDocuments({ studentId: student._id, status: 'active' }), 1);
});

test('rolls back the allocation when the room is full', async () => {
  const existingStudent = await createStudent().save();
  const waitingStudent = await createStudent({ usn: 'PES1UG24CS002', email: 'other@example.com' }).save();
  const room = await createRoom({ capacity: 1, occupancy: 1 }).save();
  await new Allocation({
    studentId: existingStudent._id,
    roomId: room._id,
    status: 'active'
  }).save();

  await assert.rejects(
    () => allocateRoom({ usn: waitingStudent.usn, roomId: String(room._id) }),
    errorWith('ROOM_FULL', 409)
  );
  assert.equal(await Allocation.countDocuments({ studentId: waitingStudent._id }), 0);
  assert.equal((await Room.findById(room._id)).occupancy, 1);
});

test('compensates when occupancy update fails', async () => {
  const student = await createStudent().save();
  const room = await createRoom().save();
  const expectedError = new Error('occupancy update failed');
  mock.method(Room, 'findOneAndUpdate', async () => {
    throw expectedError;
  });

  try {
    await assert.rejects(
      () => allocateRoom({ usn: student.usn, roomId: String(room._id) }),
      (error) => error === expectedError
    );
  } finally {
    mock.restoreAll();
  }

  assert.equal(await Allocation.countDocuments({ studentId: student._id }), 0);
});

test('allows only one winner in ten last-bed races', async () => {
  for (let round = 0; round < 10; round += 1) {
    const students = await Promise.all([
      createStudent({
        usn: `PES1UG24CS${String(round * 2 + 1).padStart(3, '0')}`,
        email: `student-${round * 2 + 1}@example.com`
      }).save(),
      createStudent({
        usn: `PES1UG24CS${String(round * 2 + 2).padStart(3, '0')}`,
        email: `student-${round * 2 + 2}@example.com`
      }).save()
    ]);
    const room = await createRoom({ roomNo: `R-${round}`, capacity: 1 }).save();
    const results = await Promise.allSettled(
      students.map((student) => allocateRoom({
        usn: student.usn,
        roomId: String(room._id)
      }))
    );

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => (
      result.status === 'rejected'
      && result.reason.code === 'ROOM_FULL'
    )).length, 1);
    assert.equal((await Room.findById(room._id)).occupancy, 1);
    assert.equal(await Allocation.countDocuments({ roomId: room._id, status: 'active' }), 1);
    const losingStudent = students[results.findIndex((result) => result.status === 'rejected')];
    assert.equal(await Allocation.countDocuments({ studentId: losingStudent._id }), 0);
  }
});

test('does not overbook a room with five concurrent allocations', async () => {
  const students = await Promise.all(
    Array.from({ length: 5 }, (_, index) => createStudent({
      usn: `PES1UG24CS${String(index + 1).padStart(3, '0')}`,
      email: `student-${index + 1}@example.com`
    }).save())
  );
  const room = await createRoom({ capacity: 3 }).save();
  const results = await Promise.allSettled(
    students.map((student) => allocateRoom({
      usn: student.usn,
      roomId: String(room._id)
    }))
  );

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 3);
  assert.equal(results.filter((result) => (
    result.status === 'rejected'
    && result.reason.code === 'ROOM_FULL'
  )).length, 2);
  assert.equal((await Room.findById(room._id)).occupancy, 3);
  assert.equal(await Allocation.countDocuments({ roomId: room._id, status: 'active' }), 3);
});

test('prevents a same-student concurrent double allocation', async () => {
  const student = await createStudent().save();
  const room = await createRoom().save();

  const results = await Promise.allSettled([
    allocateRoom({ usn: student.usn, roomId: String(room._id) }),
    allocateRoom({ usn: student.usn, roomId: String(room._id) })
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => (
    result.status === 'rejected'
    && result.reason.code === 'ALREADY_ALLOCATED'
  )).length, 1);
  assert.equal((await Room.findById(room._id)).occupancy, 1);
  assert.equal(await Allocation.countDocuments({ studentId: student._id, status: 'active' }), 1);
});
