const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required'],
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Schedule date is required'],
      index: true
    },
    day: {
      type: String,
      trim: true
    },
    timeSlot: {
      type: String,
      trim: true,
      default: '07:00 AM - 08:30 AM'
    },
    classType: {
      type: String,
      enum: ['Road', 'H-Track', 'Road & H', 'Highway Drive', 'Theory / Rules', 'Simulator', 'Bike Training'],
      default: 'Road & H'
    },
    instructor: {
      type: String,
      trim: true,
      default: 'Jasim'
    },
    vehicleNo: {
      type: String,
      trim: true
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
      }
    ],
    status: {
      type: String,
      enum: ['Planned', 'Scheduled', 'Done', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled',
      index: true
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

scheduleSchema.index({ batch: 1, date: -1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
