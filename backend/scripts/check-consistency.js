const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const { Room, Allocation } = require('../src/models');

async function checkConsistency() {
  const [rooms, allocationsByRoom, multipleActive] = await Promise.all([
    Room.aggregate([
      {
        $project: {
          _id: 1,
          roomNo: 1,
          occupancy: 1
        }
      }
    ]),
    Allocation.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$roomId', count: { $sum: 1 } } }
    ]),
    Allocation.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ])
  ]);

  const countsByRoom = new Map(
    allocationsByRoom.map(({ _id, count }) => [String(_id), count])
  );
  const roomIds = new Set(rooms.map((room) => String(room._id)));
  const roomDifferences = rooms
    .map((room) => {
      const activeAllocations = countsByRoom.get(String(room._id)) || 0;
      return {
        roomId: String(room._id),
        roomNo: room.roomNo,
        occupancy: room.occupancy,
        activeAllocations
      };
    })
    .filter(({ occupancy, activeAllocations }) => occupancy !== activeAllocations);

  const unknownRooms = allocationsByRoom
    .filter(({ _id }) => !roomIds.has(String(_id)))
    .map(({ _id, count }) => ({
      roomId: String(_id),
      count
    }));

  return {
    ok: roomDifferences.length === 0
      && multipleActive.length === 0
      && unknownRooms.length === 0,
    roomDifferences,
    multipleActive: multipleActive.map(({ _id, count }) => ({
      studentId: String(_id),
      count
    })),
    unknownRooms
  };
}

async function runCheck() {
  try {
    require('dotenv').config();
    await connectDatabase();
    const result = await checkConsistency();

    if (result.ok) {
      console.log('No differences found.');
    } else {
      result.roomDifferences.forEach((difference) => {
        console.log(
          `Room ${difference.roomNo} (${difference.roomId}): occupancy ${difference.occupancy}, active allocations ${difference.activeAllocations}`
        );
      });
      result.multipleActive.forEach((difference) => {
        console.log(
          `Student ${difference.studentId}: ${difference.count} active allocations`
        );
      });
      result.unknownRooms.forEach((difference) => {
        console.log(
          `Unknown room ${difference.roomId}: ${difference.count} active allocations`
        );
      });
    }

    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error('Consistency check failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runCheck();
}

module.exports = { checkConsistency };
