const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.trim().length > 0
    }
  },
  contact: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.trim().length > 0
    }
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.trim().length > 0
    }
  },
  entryTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  exitTime: {
    type: Date,
    default: null
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

visitorSchema.index({ entryTime: -1 });
visitorSchema.index({ studentId: 1 });

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
