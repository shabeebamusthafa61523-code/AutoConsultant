const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required'],
      index: true
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule'
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Excused', 'Late'],
      default: 'Present'
    },
    classType: {
      type: String,
      default: 'Practical Driving'
    },
    instructor: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ batch: 1, date: -1 });
attendanceSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
