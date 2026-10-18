const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  assertTestDatabaseName,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const {
  User,
  Student,
  Room,
  Allocation,
  Fee,
  Complaint,
  Leave,
  Visitor
} = require('../src/models');
const { ensureIndexes } = require('../src/config/indexes');

const models = [User, Student, Room, Allocation, Fee, Complaint, Leave, Visitor];

async function dropModelCollection(Model) {
  try {
    await Model.collection.drop();
  } catch (error) {
    if (error.code !== 26) {
      throw error;
    }
  }
}

function findIndex(indexes, key) {
  return indexes.find((index) => JSON.stringify(index.key) === JSON.stringify(key));
}

test.before(async () => {
  await connectTestDb();
});

test.after(async () => {
  await disconnectTestDb();
});

test('ensureIndexes creates all required indexes and is idempotent', async () => {
  assertTestDatabaseName(mongoose.connection.name);
  await Promise.all(models.map(dropModelCollection));

  await ensureIndexes();
  await ensureIndexes();

  const expectedIndexes = [
    [User, { email: 1 }, { unique: true }],
    [Student, { usn: 1 }, { unique: true }],
    [Student, { userId: 1 }, { unique: true }],
    [Room, { roomNo: 1 }, { unique: true }],
    [Room, { block: 1, floor: 1, sharingType: 1 }, {}],
    [Allocation, { studentId: 1 }, {
      unique: true,
      partialFilterExpression: { status: 'active' }
    }],
    [Allocation, { roomId: 1, status: 1 }, {}],
    [Fee, { studentId: 1 }, { unique: true }],
    [Fee, { dueDate: 1 }, {}],
    [Complaint, { studentId: 1, category: 1 }, {
      unique: true,
      partialFilterExpression: { isOpen: true }
    }],
    [Complaint, { status: 1 }, {}],
    [Leave, { studentId: 1, createdAt: -1 }, {}],
    [Leave, { status: 1 }, {}],
    [Visitor, { entryTime: -1 }, {}],
    [Visitor, { studentId: 1 }, {}]
  ];

  const indexesByModel = new Map();
  for (const Model of models) {
    indexesByModel.set(Model, await Model.collection.indexes());
  }

  for (const [Model, key, options] of expectedIndexes) {
    const index = findIndex(indexesByModel.get(Model), key);
    assert.ok(index, `${Model.modelName} index ${JSON.stringify(key)} is missing`);
    assert.equal(index.unique, options.unique);
    assert.deepEqual(index.partialFilterExpression, options.partialFilterExpression);
  }
});
