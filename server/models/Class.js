const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required for a class record']
    },
    classDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Class date is required']
    },
    instructor: {
      type: String,
      trim: true,
      default: 'Instructor'
    },
    vehicleNo: {
      type: String,
      trim: true,
      default: 'KL-01-AB-1234'
    },
    trainingType: {
      type: String,
      default: 'Practical Driving'
    },
    km: {
      type: Number,
      default: 0
    },
    hours: {
      type: Number,
      default: 1
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Class', classSchema);
