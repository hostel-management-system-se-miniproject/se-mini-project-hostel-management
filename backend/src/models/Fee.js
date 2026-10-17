const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => value > 0,
      message: 'Payment amount must be greater than 0'
    }
  },
  paidOn: {
    type: Date,
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  amountDue: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  totalPaid: {
    type: Number,
    min: 0,
    default: 0
  },
  payments: {
    type: [paymentSchema],
    default: []
  },
  lastNotifiedOn: {
    type: Date,
    default: null
  }
});

feeSchema.index({ studentId: 1 }, { unique: true });
feeSchema.index({ dueDate: 1 });

const Fee = mongoose.model('Fee', feeSchema);

module.exports = Fee;
