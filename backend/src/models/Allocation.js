const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    required: true,
    default: 'active'
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  endReason: {
    type: String,
    validate: {
      validator: (value) => value == null || ['reallocated', 'vacated'].includes(value)
    }
  }
});

allocationSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
allocationSchema.index({ roomId: 1, status: 1 });

const Allocation = mongoose.model('Allocation', allocationSchema);

module.exports = Allocation;
