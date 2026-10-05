const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true
    },
    courseLicenceType: {
      type: String,
      trim: true,
      default: 'LMV - 4 Wheeler'
    },
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both', '3 Wheeler', 'Heavy'],
      default: '4 Wheeler'
    },
    session: {
      type: String,
      enum: ['Morning', 'Evening', 'Afternoon', 'Weekend'],
      default: 'Morning'
    },
    instructor: {
      type: String,
      trim: true,
      default: 'Unassigned'
    },
    instructorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null
    },
    secondaryInstructor: {
      type: String,
      trim: true
    },
    vehicleNo: {
      type: String,
      trim: true
    },
    vehicleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    meetingPoint: {
      type: String,
      trim: true,
      default: 'West Kodur Office'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    startTime: {
      type: String,
      default: '07:00 AM'
    },
    endTime: {
      type: String,
      default: '08:30 AM'
    },
    maxStudents: {
      type: Number,
      default: 20
    },
    status: {
      type: String,
      enum: ['Active', 'Upcoming', 'Completed', 'Inactive'],
      default: 'Active',
      index: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals for R&D compatibility: batchId, timeSlot, capacity, availableSeats
batchSchema.virtual('batchId').get(function () {
  return this.batchNumber || `BAT-${String(this._id).slice(-4).toUpperCase()}`;
});

batchSchema.virtual('capacity')
  .get(function () { return this.maxStudents || 20; })
  .set(function (val) { this.maxStudents = val; });

batchSchema.virtual('timeSlot').get(function () {
  return `${this.startTime || ''} - ${this.endTime || ''}`.trim();
});

batchSchema.virtual('availableSeats').get(function () {
  const cap = this.maxStudents || 20;
  const active = this.activeStudents || 0;
  return Math.max(0, cap - active);
});

batchSchema.index({ status: 1, startDate: -1 });

module.exports = mongoose.model('Batch', batchSchema);
