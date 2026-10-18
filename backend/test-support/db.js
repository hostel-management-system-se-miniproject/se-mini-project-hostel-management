const dotenv = require('dotenv');
const mongoose = require('mongoose');

let dotenvLoaded = false;

function assertTestDatabaseName(name) {
  if (typeof name !== 'string' || name.length === 0 || !name.endsWith('_test')) {
    throw new Error('Test database name must be a non-empty string ending in _test.');
  }
}

function getDatabaseNameFromUri(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^/?@]+@)?[^/]+\/([^/?]*)/.exec(uri);
  return match ? match[1] : '';
}

async function connectTestDb() {
  if (!dotenvLoaded) {
    dotenv.config();
    dotenvLoaded = true;
  }

  const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Set MONGODB_URI_TEST to a database whose name ends in _test.');
  }

  assertTestDatabaseName(getDatabaseNameFromUri(uri));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    assertTestDatabaseName(mongoose.connection.name);
    return mongoose.connection;
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }
}

async function clearTestDb() {
  assertTestDatabaseName(mongoose.connection.name);

  const collections = await mongoose.connection.db.listCollections({ type: 'collection' }).toArray();
  await Promise.all(collections
    .filter(({ name }) => !name.startsWith('system.'))
    .map(({ name }) => (
    mongoose.connection.db.collection(name).deleteMany({})
    )));
}

async function disconnectTestDb() {
  await mongoose.disconnect();
}

module.exports = {
  assertTestDatabaseName,
  getDatabaseNameFromUri,
  connectTestDb,
  clearTestDb,
  disconnectTestDb
};
