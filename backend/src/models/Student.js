const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usn: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: (value) => /^[A-Z0-9]{13}$/.test(value.toUpperCase()),
      message: 'USN must be exactly 13 alphanumeric characters'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  }
});

studentSchema.index({ usn: 1 }, { unique: true });
studentSchema.index({ userId: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
