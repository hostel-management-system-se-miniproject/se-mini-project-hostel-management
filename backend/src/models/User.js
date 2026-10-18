const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    required: true,
    default: 'student'
  },
  failedAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
});

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
