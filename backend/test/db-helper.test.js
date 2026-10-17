const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const mongoose = require('mongoose');
const {
  assertTestDatabaseName,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');

test('assertTestDatabaseName accepts only names ending in _test', () => {
  assert.doesNotThrow(() => assertTestDatabaseName('hms_test'));
  assert.throws(() => assertTestDatabaseName('hms'));
  assert.throws(() => assertTestDatabaseName(''));
  assert.throws(() => assertTestDatabaseName(undefined));
  assert.throws(() => assertTestDatabaseName('test_hms'));
});

after(async () => {
  await disconnectTestDb();
});

test('connectTestDb connects to a test database', async () => {
  await connectTestDb();

  assert.match(mongoose.connection.name, /_test$/);
  const result = await mongoose.connection.db.admin().ping();
  assert.equal(result.ok, 1);
});
