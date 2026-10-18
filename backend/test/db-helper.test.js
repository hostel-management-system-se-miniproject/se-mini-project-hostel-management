const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const mongoose = require('mongoose');
const {
  assertTestDatabaseName,
  getDatabaseNameFromUri,
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

test('getDatabaseNameFromUri extracts database names without connecting', () => {
  assert.equal(
    getDatabaseNameFromUri('mongodb+srv://u:p@h.mongodb.net/hms_test?retryWrites=true'),
    'hms_test'
  );
  assert.equal(
    getDatabaseNameFromUri('mongodb://127.0.0.1:27017/hms'),
    'hms'
  );
  assert.equal(
    getDatabaseNameFromUri('mongodb://h1:27017,h2:27017/hms_test'),
    'hms_test'
  );
  assert.equal(
    getDatabaseNameFromUri('mongodb://127.0.0.1:27017'),
    ''
  );
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
