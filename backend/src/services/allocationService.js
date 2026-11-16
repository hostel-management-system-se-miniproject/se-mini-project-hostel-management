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
    if (error && error.code === 11000) {
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

async function reallocateAllocation({ allocationId, roomId }) {
  if (typeof roomId !== 'string' || roomId.length === 0) {
    throw validationError('roomId');
  }
  if (!mongoose.isValidObjectId(roomId)) {
    throw new AllocationError('VALIDATION_ERROR', 400, 'roomId must be a valid ObjectId');
  }
  if (typeof allocationId !== 'string' || !mongoose.isValidObjectId(allocationId)) {
    throw new AllocationError('NOT_FOUND', 404, 'Allocation not found');
  }

  const allocation = await Allocation.findOne({
    _id: allocationId,
    status: 'active'
  });
  if (!allocation) {
    throw new AllocationError('NOT_FOUND', 404, 'Allocation not found');
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new AllocationError('NOT_FOUND', 404, 'Room not found');
  }
  if (String(allocation.roomId) === String(room._id)) {
    throw new AllocationError('VALIDATION_ERROR', 400, 'Choose a different room');
  }

  const updatedRoom = await Room.findOneAndUpdate(
    {
      _id: room._id,
      $expr: { $lt: ['$occupancy', '$capacity'] }
    },
    { $inc: { occupancy: 1 } },
    { new: true }
  );

  if (updatedRoom === null) {
    throw new AllocationError('ROOM_FULL', 409, 'Room at full capacity');
  }

  let endedAllocation;
  try {
    endedAllocation = await Allocation.findOneAndUpdate(
      { _id: allocation._id, status: 'active' },
      {
        $set: {
          status: 'inactive',
          endedAt: new Date(),
          endReason: 'reallocated'
        }
      },
      { new: true }
    );
  } catch (error) {
    try {
      await Room.findOneAndUpdate(
        { _id: room._id, occupancy: { $gt: 0 } },
        { $inc: { occupancy: -1 } }
      );
    } catch (compensationError) {
      console.error('reallocateAllocation: could not undo destination occupancy:', compensationError);
    }
    throw error;
  }

  if (endedAllocation === null) {
    try {
      await Room.findOneAndUpdate(
        { _id: room._id, occupancy: { $gt: 0 } },
        { $inc: { occupancy: -1 } }
      );
    } catch (compensationError) {
      console.error('reallocateAllocation: could not undo destination occupancy:', compensationError);
    }
    throw new AllocationError('NOT_FOUND', 404, 'Allocation not found');
  }

  let newAllocation;
  try {
    newAllocation = await Allocation.create({
      studentId: allocation.studentId,
      roomId: room._id,
      status: 'active'
    });
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      try {
        await Allocation.findOneAndUpdate(
          { _id: allocation._id },
          {
            $set: { status: 'active', endedAt: null },
            $unset: { endReason: 1 }
          }
        );
      } catch (compensationError) {
        console.error('reallocateAllocation: could not reactivate old allocation:', compensationError);
      }
      try {
        await Room.findOneAndUpdate(
          { _id: room._id, occupancy: { $gt: 0 } },
          { $inc: { occupancy: -1 } }
        );
      } catch (compensationError) {
        console.error('reallocateAllocation: could not undo destination occupancy:', compensationError);
      }
      throw new AllocationError(
        'ALREADY_ALLOCATED',
        409,
        'Student already has an active allocation'
      );
    }
    try {
      await Allocation.findOneAndUpdate(
        { _id: allocation._id },
        {
          $set: { status: 'active', endedAt: null },
          $unset: { endReason: 1 }
        }
      );
    } catch (compensationError) {
      console.error('reallocateAllocation: could not reactivate old allocation:', compensationError);
    }
    try {
      await Room.findOneAndUpdate(
        { _id: room._id, occupancy: { $gt: 0 } },
        { $inc: { occupancy: -1 } }
      );
    } catch (compensationError) {
      console.error('reallocateAllocation: could not undo destination occupancy:', compensationError);
    }
    throw error;
  }

  try {
    await Room.findOneAndUpdate(
      { _id: allocation.roomId, occupancy: { $gt: 0 } },
      { $inc: { occupancy: -1 } }
    );
  } catch (error) {
    console.error('reallocateAllocation: could not decrement source occupancy:', error);
  }

  const student = await Student.findById(allocation.studentId);
  return {
    id: String(newAllocation._id),
    usn: student.usn,
    room: room.roomNo,
    status: 'active'
  };
}

async function vacateAllocation({ allocationId, confirm }) {
  if (confirm !== true) {
    throw new AllocationError(
      'CONFIRMATION_REQUIRED',
      400,
      'Confirmation is required to vacate an allocation'
    );
  }
  if (typeof allocationId !== 'string' || !mongoose.isValidObjectId(allocationId)) {
    throw new AllocationError('NOT_FOUND', 404, 'Allocation not found');
  }

  const allocation = await Allocation.findOne({
    _id: allocationId,
    status: 'active'
  });
  if (!allocation) {
    throw new AllocationError('NOT_FOUND', 404, 'Allocation not found');
  }

  const endedAllocation = await Allocation.findOneAndUpdate(
    { _id: allocation._id, status: 'active' },
    {
      $set: {
        status: 'inactive',
        endedAt: new Date(),
        endReason: 'vacated'
      }
    },
    { new: true }
  );
  if (endedAllocation === null) {
    throw new AllocationError('NOT_FOUND', 404, 'Allocation not found');
  }

  try {
    await Room.findOneAndUpdate(
      { _id: allocation.roomId, occupancy: { $gt: 0 } },
      { $inc: { occupancy: -1 } }
    );
  } catch (error) {
    console.error('vacateAllocation: could not decrement source occupancy:', error);
  }

  const student = await Student.findById(allocation.studentId);
  return {
    id: String(allocation._id),
    usn: student.usn,
    status: 'inactive'
  };
}

module.exports = {
  allocateRoom,
  reallocateAllocation,
  vacateAllocation,
  AllocationError
};
