const mongoose = require('mongoose');
const { Student, Room, Allocation } = require('../models');

class AllocationError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'AllocationError';
    this.code = code;
    this.status = status;
  }
}

function validationError(field) {
  return new AllocationError('VALIDATION_ERROR', 400, `${field} is required and must be a string`);
}

async function allocateRoom({ usn, roomId }) {
  if (typeof usn !== 'string' || usn.length === 0) {
    throw validationError('usn');
  }
  if (typeof roomId !== 'string' || roomId.length === 0) {
    throw validationError('roomId');
  }
  if (!/^[A-Za-z0-9]{13}$/.test(usn)) {
    throw new AllocationError(
      'INVALID_USN',
      400,
      'Enter a valid USN (13 alphanumeric characters, for example PES1UG24CS924)'
    );
  }
  if (!mongoose.isValidObjectId(roomId)) {
    throw new AllocationError('VALIDATION_ERROR', 400, 'roomId must be a valid ObjectId');
  }

  const student = await Student.findOne({ usn: usn.toUpperCase() });
  if (!student) {
    throw new AllocationError('NOT_FOUND', 404, 'Student not found');
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new AllocationError('NOT_FOUND', 404, 'Room not found');
  }

  let allocation;
  try {
    allocation = await Allocation.create({
      studentId: student._id,
      roomId: room._id,
      status: 'active'
    });
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      throw new AllocationError(
        'ALREADY_ALLOCATED',
        409,
        'Student already has an active allocation'
      );
    }
    throw error;
  }

  let updatedRoom;
  try {
    updatedRoom = await Room.findOneAndUpdate(
      {
        _id: room._id,
        $expr: { $lt: ['$occupancy', '$capacity'] }
      },
      { $inc: { occupancy: 1 } },
      { new: true }
    );
  } catch (error) {
    try {
      await Allocation.deleteOne({ _id: allocation._id });
    } catch (compensationError) {
      console.error(compensationError);
    }
    throw error;
  }

  if (updatedRoom === null) {
    try {
      await Allocation.deleteOne({ _id: allocation._id });
    } catch (cleanupError) {
      console.error('allocateRoom: could not remove allocation after ROOM_FULL:', cleanupError.message);
    }
    throw new AllocationError('ROOM_FULL', 409, 'Room at full capacity');
  }

  return {
    id: String(allocation._id),
    usn: student.usn,
    room: room.roomNo,
    status: 'active'
  };
}

module.exports = { allocateRoom, AllocationError };
