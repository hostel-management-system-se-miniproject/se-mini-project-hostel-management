const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Leave, Visitor } = require('../src/models');

before(async () => {
  await connectTestDb();
  await Leave.init();
  await Visitor.init();
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function createLeave(overrides = {}) {
  return new Leave({
    studentId: new mongoose.Types.ObjectId(),
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-05'),
    reason: 'Family visit',
    ...overrides
  });
}

function createVisitor(overrides = {}) {
  return new Visitor({
    studentId: new mongoose.Types.ObjectId(),
    name: 'Visitor Name',
    contact: '9876543210',
    purpose: 'Meeting',
    recordedBy: new mongoose.Types.ObjectId(),
    ...overrides
  });
}

test('saves a valid leave with the expected defaults and timestamp', async () => {
  const leave = await createLeave().save();

  assert.equal(leave.status, 'Pending');
  assert.equal(leave.decidedBy, null);
  assert.equal(leave.decidedAt, null);
  assert.ok(leave.createdAt instanceof Date);
  assert.equal(leave.updatedAt, undefined);
});

test('rejects missing and invalid leave fields', async () => {
  for (const field of ['studentId', 'startDate', 'endDate', 'reason']) {
    const values = {
      studentId: new mongoose.Types.ObjectId(),
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-05'),
      reason: 'Family visit'
    };
    values[field] = undefined;

    await assert.rejects(
      () => createLeave(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  await assert.rejects(
    () => createLeave({ reason: '   ' }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
  await assert.rejects(
    () => createLeave({ status: 'Cancelled' }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
});

test('accepts approved and rejected leaves with decision fields', async () => {
  const decidedBy = new mongoose.Types.ObjectId();
  const decidedAt = new Date('2026-10-20');

  const approved = await createLeave({
    status: 'Approved',
    decidedBy,
    decidedAt
  }).save();
  const rejected = await createLeave({
    status: 'Rejected',
    decidedBy,
    decidedAt
  }).save();

  assert.equal(approved.status, 'Approved');
  assert.equal(rejected.status, 'Rejected');
  assert.deepEqual(approved.decidedBy, decidedBy);
  assert.deepEqual(rejected.decidedBy, decidedBy);
  assert.equal(approved.decidedAt.getTime(), decidedAt.getTime());
  assert.equal(rejected.decidedAt.getTime(), decidedAt.getTime());
});

test('declares the required leave indexes', async () => {
  const indexes = await Leave.collection.indexes();

  assert.ok(indexes.some((index) => (
    Object.keys(index.key).join(',') === 'studentId,createdAt'
    && index.key.studentId === 1
    && index.key.createdAt === -1
  )));
  assert.ok(indexes.some((index) => index.key.status === 1));
});

test('saves a valid visitor with entryTime default and null exitTime', async () => {
  const visitor = await createVisitor().save();

  assert.ok(visitor.entryTime instanceof Date);
  assert.equal(visitor.exitTime, null);
});

test('rejects missing and empty visitor fields', async () => {
  for (const field of ['studentId', 'name', 'contact', 'purpose', 'recordedBy']) {
    const values = {
      studentId: new mongoose.Types.ObjectId(),
      name: 'Visitor Name',
      contact: '9876543210',
      purpose: 'Meeting',
      recordedBy: new mongoose.Types.ObjectId()
    };
    values[field] = undefined;

    await assert.rejects(
      () => createVisitor(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  await assert.rejects(
    () => createVisitor({ name: '   ' }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
});

test('declares the required visitor indexes', async () => {
  const indexes = await Visitor.collection.indexes();

  assert.ok(indexes.some((index) => index.key.entryTime === -1));
  assert.ok(indexes.some((index) => index.key.studentId === 1));
});
