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
    instructorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null
    },
    vehicleNo: {
      type: String,
      trim: true,
      default: 'KL-01-AB-1234'
    },
    vehicleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
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
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
    },
    startTime: {
      type: String,
      trim: true,
      default: ''
    },
    endTime: {
      type: String,
      trim: true,
      default: ''
    },
    timeSlot: {
      type: String,
      trim: true,
      default: ''
    },
    section: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'General'],
      default: 'General'
    },
    bikeClassCount: {
      type: Number,
      default: 0,
      min: 0
    },
    hClassCount: {
      type: Number,
      default: 0,
      min: 0
    },
    attendance: {
      type: String,
      enum: ['Present', 'Absent', 'Excused'],
      default: 'Present'
    },
    scheduleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null
    },
    status: {
      type: String,
      enum: ['Completed', 'Planned', 'Scheduled', 'Cancelled'],
      default: 'Completed'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual aliases for API compatibility
classSchema.virtual('kilometers')
  .get(function () { return this.km; })
  .set(function (v) { this.km = v; });

classSchema.virtual('date')
  .get(function () { return this.classDate; })
  .set(function (v) { this.classDate = v; });

classSchema.virtual('type')
  .get(function () { return this.trainingType; })
  .set(function (v) { this.trainingType = v; });

// Virtual for exact unrounded equivalent classes calculation: (Road KM / 5) + (H / 3) + Bike Classes
classSchema.virtual('equivalentClasses').get(function () {
  const kmPart = (this.km || 0) / 5;
  const hPart = (this.hours || 0) / 3;
  const bikePart = this.bikeClassCount || 0;
  return kmPart + hPart + bikePart;
});

// Performance indexes
classSchema.index({ student: 1, classDate: -1 });
classSchema.index({ batch: 1, classDate: -1 });
classSchema.index({ instructorRef: 1, classDate: -1 });
classSchema.index({ vehicleRef: 1, classDate: -1 });
classSchema.index({ classDate: -1 });
classSchema.index({ status: 1, classDate: -1 });
classSchema.index({ createdAt: -1 });

// Pre-save hook to populate textual instructor/vehicle names if references are supplied
classSchema.pre('save', async function (next) {
  try {
    if (this.isModified('instructorRef') && this.instructorRef) {
      const Instructor = mongoose.model('Instructor');
      const ins = await Instructor.findById(this.instructorRef).select('name');
      if (ins) {
        this.instructor = ins.name;
      }
    }
    if (this.isModified('vehicleRef') && this.vehicleRef) {
      const Vehicle = mongoose.model('Vehicle');
      const veh = await Vehicle.findById(this.vehicleRef).select('vehicleNumber');
      if (veh) {
        this.vehicleNo = veh.vehicleNumber;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Class', classSchema);
