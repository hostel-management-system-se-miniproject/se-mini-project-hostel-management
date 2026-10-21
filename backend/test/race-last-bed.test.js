const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const {
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Student, Room, Allocation } = require('../src/models');
const { runRace } = require('../scripts/race-last-bed');

before(async () => {
  await connectTestDb();
  await Student.init();
  await Room.init();
  await Allocation.init();
});

after(async () => {
  await disconnectTestDb();
});

test('runRace proves one winner for three real HTTP rounds', async () => {
  const result = await runRace({ rounds: 3 });

  assert.equal(result.ok, true);
  assert.equal(result.rounds.length, 3);
  assert.ok(result.rounds.every((round) => round.ok));
});

test('runRace rejects invalid round counts before database work', async () => {
  await assert.rejects(() => runRace({ rounds: 0 }), /rounds must be an integer from 1 to 200/);
  await assert.rejects(() => runRace({ rounds: 500 }), /rounds must be an integer from 1 to 200/);
});
