const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true
    },
    courseLicenceType: {
      type: String,
      trim: true,
      default: 'LMV'
    },
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both'],
      default: '4 Wheeler'
    },
    instructor: {
      type: String,
      trim: true,
      default: 'Unassigned'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    startTime: {
      type: String
    },
    endTime: {
      type: String
    },
    maxStudents: {
      type: Number,
      default: 20
    },
    status: {
      type: String,
      enum: ['Active', 'Upcoming', 'Completed', 'Inactive'],
      default: 'Active'
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

module.exports = mongoose.model('Batch', batchSchema);
