const mongoose = require('mongoose');

const complaintStatuses = ['Open', 'In Progress', 'Resolved', 'Rejected'];

const historySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: complaintStatuses,
    required: true
  },
  remarks: {
    type: String,
    default: null
  },
  at: {
    type: Date,
    required: true,
    default: Date.now
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.trim().length > 0
    }
  },
  status: {
    type: String,
    enum: complaintStatuses,
    required: true,
    default: 'Open'
  },
  isOpen: {
    type: Boolean,
    required: true,
    default: true
  },
  remarks: {
    type: String,
    trim: true,
    default: null
  },
  history: {
    type: [historySchema],
    default: []
  }
}, {
  timestamps: true
});

complaintSchema.index(
  { studentId: 1, category: 1 },
  { unique: true, partialFilterExpression: { isOpen: true } }
);
complaintSchema.index({ status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
