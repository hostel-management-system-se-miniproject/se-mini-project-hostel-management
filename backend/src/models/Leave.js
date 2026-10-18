const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.trim().length > 0
    }
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    required: true,
    default: 'Pending'
  },
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  decidedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
});

leaveSchema.index({ studentId: 1, createdAt: -1 });
leaveSchema.index({ status: 1 });

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
