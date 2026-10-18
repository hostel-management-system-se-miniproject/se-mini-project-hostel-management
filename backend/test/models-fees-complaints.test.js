const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Fee, Complaint } = require('../src/models');

before(async () => {
  await connectTestDb();
  await Fee.init();
  await Complaint.init();
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function createFee(overrides = {}) {
  return new Fee({
    studentId: new mongoose.Types.ObjectId(),
    amountDue: 1000,
    dueDate: new Date('2026-12-31'),
    ...overrides
  });
}

function createComplaint(overrides = {}) {
  return new Complaint({
    studentId: new mongoose.Types.ObjectId(),
    category: 'Maintenance',
    description: 'Broken window',
    ...overrides
  });
}

function isDuplicateKey(error) {
  return error.name === 'MongoServerError' && error.code === 11000;
}

test('saves a valid fee with the expected defaults', async () => {
  const fee = await createFee().save();

  assert.equal(fee.totalPaid, 0);
  assert.deepEqual(fee.payments, []);
  assert.equal(fee.lastNotifiedOn, null);
});

test('rejects missing and negative fee values', async () => {
  for (const field of ['studentId', 'amountDue', 'dueDate']) {
    const values = {
      studentId: new mongoose.Types.ObjectId(),
      amountDue: 1000,
      dueDate: new Date('2026-12-31')
    };
    values[field] = undefined;

    await assert.rejects(
      () => createFee(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  for (const values of [{ amountDue: -1 }, { totalPaid: -1 }]) {
    await assert.rejects(
      () => createFee(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }
});

test('validates fee payments and records payment time', async () => {
  const paymentDefaults = {
    paidOn: new Date('2026-01-15'),
    recordedBy: new mongoose.Types.ObjectId()
  };

  for (const amount of [0, -1]) {
    await assert.rejects(
      () => createFee({ payments: [{ ...paymentDefaults, amount }] }).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  for (const field of ['paidOn', 'recordedBy']) {
    const payment = { ...paymentDefaults, amount: 100 };
    payment[field] = undefined;

    await assert.rejects(
      () => createFee({ payments: [payment] }).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  const fee = await createFee({
    payments: [{
      amount: 100,
      paidOn: paymentDefaults.paidOn,
      recordedBy: paymentDefaults.recordedBy
    }]
  }).save();

  assert.ok(fee.payments[0].recordedAt instanceof Date);
});

test('rejects duplicate fee studentIds', async () => {
  const studentId = new mongoose.Types.ObjectId();
  await createFee({ studentId }).save();

  await assert.rejects(
    () => createFee({ studentId }).save(),
    isDuplicateKey
  );
});

test('declares the required fee indexes', async () => {
  const indexes = await Fee.collection.indexes();

  assert.ok(indexes.some((index) => index.unique && index.key.studentId === 1));
  assert.ok(indexes.some((index) => index.key.dueDate === 1));
});

test('saves a valid complaint with the expected defaults and timestamps', async () => {
  const complaint = await createComplaint().save();

  assert.equal(complaint.status, 'Open');
  assert.equal(complaint.isOpen, true);
  assert.deepEqual(complaint.history, []);
  assert.ok(complaint.createdAt instanceof Date);
  assert.ok(complaint.updatedAt instanceof Date);
});

test('rejects invalid complaint fields', async () => {
  for (const field of ['studentId', 'category', 'description']) {
    const values = {
      studentId: new mongoose.Types.ObjectId(),
      category: 'Maintenance',
      description: 'Broken window'
    };
    values[field] = undefined;

    await assert.rejects(
      () => createComplaint(values).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  for (const description of ['', '   ']) {
    await assert.rejects(
      () => createComplaint({ description }).save(),
      (error) => error instanceof mongoose.Error.ValidationError
    );
  }

  await assert.rejects(
    () => createComplaint({ status: 'Pending' }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
});

test('rejects duplicate open complaints for the same student and category', async () => {
  const studentId = new mongoose.Types.ObjectId();
  await createComplaint({ studentId, status: 'Open', isOpen: true }).save();

  await assert.rejects(
    () => createComplaint({ studentId, status: 'In Progress', isOpen: true }).save(),
    isDuplicateKey
  );
});

test('allows open complaints in different categories for one student', async () => {
  const studentId = new mongoose.Types.ObjectId();
  await createComplaint({ studentId, category: 'Maintenance' }).save();

  await assert.doesNotReject(() => createComplaint({
    studentId,
    category: 'Noise'
  }).save());
});

test('allows different students to have open complaints in one category', async () => {
  await createComplaint().save();

  await assert.doesNotReject(() => createComplaint({
    studentId: new mongoose.Types.ObjectId()
  }).save());
});

test('allows new and multiple closed complaints after closing the first', async () => {
  const studentId = new mongoose.Types.ObjectId();
  await createComplaint({
    studentId,
    status: 'Resolved',
    isOpen: false
  }).save();
  await createComplaint({
    studentId,
    status: 'Rejected',
    isOpen: false
  }).save();

  await assert.doesNotReject(() => createComplaint({ studentId }).save());
});

test('allows a new open complaint after the first is closed', async () => {
  const studentId = new mongoose.Types.ObjectId();
  const complaint = await createComplaint({ studentId }).save();

  complaint.status = 'Resolved';
  complaint.isOpen = false;
  await complaint.save();

  await assert.doesNotReject(() => createComplaint({ studentId }).save());
});

test('allows exactly one open complaint in a concurrent race', async () => {
  const studentId = new mongoose.Types.ObjectId();
  const results = await Promise.allSettled([
    createComplaint({ studentId }).save(),
    createComplaint({ studentId }).save()
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => (
    result.status === 'rejected' && isDuplicateKey(result.reason)
  )).length, 1);
});

test('validates complaint history entries', async () => {
  const validHistory = {
    status: 'In Progress',
    remarks: 'Assigned to maintenance',
    by: new mongoose.Types.ObjectId()
  };
  const complaint = await createComplaint({ history: [validHistory] }).save();

  assert.equal(complaint.history[0].status, 'In Progress');
  assert.ok(complaint.history[0].at instanceof Date);

  await assert.rejects(
    () => createComplaint({
      history: [{ ...validHistory, status: 'Pending' }]
    }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
  await assert.rejects(
    () => createComplaint({
      history: [{ status: 'Open' }]
    }).save(),
    (error) => error instanceof mongoose.Error.ValidationError
  );
});

test('declares the required complaint indexes', async () => {
  const indexes = await Complaint.collection.indexes();

  const uniqueIndex = indexes.find((index) => (
    index.unique
    && Object.keys(index.key).join(',') === 'studentId,category'
  ));
  assert.ok(uniqueIndex);
  assert.deepEqual(uniqueIndex.partialFilterExpression, { isOpen: true });
  assert.ok(indexes.some((index) => index.key.status === 1));
});
