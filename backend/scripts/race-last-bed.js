'use strict';

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { createAllocationsRouter } = require('../src/routes/allocations');
const { checkConsistency } = require('./check-consistency');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const { Student, Room, Allocation } = require('../src/models');

const DEFAULT_ROUNDS = 20;

function validateRounds(rounds) {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 200) {
    throw new Error('rounds must be an integer from 1 to 200');
  }
}

function createStudent(round, index) {
  const number = round * 2 + index + 1;
  return new Student({
    userId: new mongoose.Types.ObjectId(),
    usn: `PES1UG24CS${String(number).padStart(3, '0')}`,
    name: `Race Student ${number}`,
    email: `race-${round}-${index}@example.com`,
    phone: `90000${String(number).padStart(5, '0')}`
  });
}

function createRaceApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { user: { id: 'admin', role: 'admin', usn: null } };
    next();
  });
  app.use('/api/allocations', createAllocationsRouter());
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
  app.use((error, _req, res, _next) => { // eslint-disable-line no-unused-vars
    console.error('Unhandled error:', error && error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again',
        details: {}
      }
    });
  });
  return app;
}

async function listen(app) {
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function postAllocation(port, student, room) {
  const response = await fetch(`http://127.0.0.1:${port}/api/allocations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usn: student.usn, roomId: String(room._id) })
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function runRace({ rounds = DEFAULT_ROUNDS } = {}) {
  validateRounds(rounds);

  let server;
  const results = [];
  try {
    await Student.createIndexes();
    await Room.createIndexes();
    await Allocation.createIndexes();
    server = await listen(createRaceApp());
    const { port } = server.address();

    for (let round = 1; round <= rounds; round += 1) {
      await clearTestDb();
      const students = await Promise.all([
        createStudent(round, 0).save(),
        createStudent(round, 1).save()
      ]);
      const room = await new Room({
        roomNo: `RACE-${round}`,
        block: 'R',
        floor: 1,
        sharingType: 'single',
        capacity: 1,
        occupancy: 0
      }).save();

      const responses = await Promise.all(
        students.map((student) => postAllocation(port, student, room))
      );
      const storedRoom = await Room.findById(room._id);
      const activeAllocations = await Allocation.countDocuments({
        roomId: room._id,
        status: 'active'
      });
      const winnerCount = responses.filter((response) => response.status === 201).length;
      const fullCount = responses.filter((response) => (
        response.status === 409 && response.body.error
        && response.body.error.code === 'ROOM_FULL'
      )).length;
      const result = {
        round,
        statuses: responses.map((response) => response.status),
        occupancy: storedRoom && storedRoom.occupancy,
        activeAllocations,
        ok: winnerCount === 1
          && fullCount === 1
          && storedRoom
          && storedRoom.occupancy === 1
          && activeAllocations === 1
      };
      results.push(result);
      if (!result.ok) {
        break;
      }
    }

    const consistency = await checkConsistency();
    const ok = results.length === rounds
      && results.every((result) => result.ok)
      && consistency.ok;
    return { ok, rounds: results };
  } finally {
    try {
      await closeServer(server);
    } finally {
      try {
        await clearTestDb();
      } finally {
        await disconnectTestDb();
      }
    }
  }
}

function parseCliRounds(args) {
  const index = args.indexOf('--rounds');
  if (index === -1) return DEFAULT_ROUNDS;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value)) {
    throw new Error('--rounds requires an integer');
  }
  return value;
}

async function main() {
  const rounds = parseCliRounds(process.argv.slice(2));
  validateRounds(rounds);
  await connectTestDb();
  const result = await runRace({ rounds });
  result.rounds.forEach((round) => {
    console.log(`Round ${round.round}: statuses ${round.statuses.join(', ')}`);
  });
  if (result.ok) {
    console.log(`PASS: ${rounds}/${rounds} rounds had exactly one winner`);
    return;
  }
  const failed = result.rounds.find((round) => !round.ok);
  console.log(failed
    ? `FAIL: round ${failed.round} did not have exactly one winner`
    : 'FAIL: the final consistency check found differences');
  process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { runRace };
