const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNo: {
    type: String,
    required: true,
    trim: true
  },
  block: {
    type: String,
    required: true,
    trim: true
  },
  floor: {
    type: Number,
    required: true,
    integer: true,
    min: 0,
    validate: {
      validator: Number.isInteger
    }
  },
  sharingType: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    integer: true,
    min: 1,
    validate: {
      validator: Number.isInteger
    }
  },
  occupancy: {
    type: Number,
    integer: true,
    min: 0,
    default: 0,
    validate: [
      {
        validator: Number.isInteger
      },
      {
        validator: function (value) {
          return value <= this.capacity;
        },
        message: 'Occupancy cannot exceed capacity'
      }
    ]
  }
});

roomSchema.index({ roomNo: 1 }, { unique: true });
roomSchema.index({ block: 1, floor: 1, sharingType: 1 });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
