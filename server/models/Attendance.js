const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    studentId: {
      type: String,
      trim: true,
      index: true
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null
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
      trim: true,
      default: ''
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },

    // Biometric & Hardware Telemetry Fields
    punchType: {
      type: String,
      enum: ['IN', 'OUT', 'CHECK', 'MANUAL'],
      default: 'MANUAL'
    },
    punchTime: {
      type: Date,
      default: Date.now
    },
    deviceId: {
      type: String,
      trim: true,
      default: ''
    },
    verificationMode: {
      type: String,
      enum: ['BIOMETRIC_FINGERPRINT', 'BIOMETRIC_FACE', 'RFID_CARD', 'MANUAL'],
      default: 'MANUAL'
    },
    biometricConfidence: {
      type: Number,
      default: 0
    },
    deviceRawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ batch: 1, date: -1 });
attendanceSchema.index({ student: 1, date: -1 });
attendanceSchema.index({ studentId: 1, punchTime: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
