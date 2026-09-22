const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      required: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    aliasSourceName: {
      type: String,
      trim: true
    },
    primaryMobile: {
      type: String,
      required: [true, 'Primary mobile is required'],
      trim: true
    },
    alternateMobile: {
      type: String,
      trim: true
    },
    dob: {
      type: Date
    },
    licenceServiceType: {
      type: String,
      trim: true,
      default: 'Fresh Licence'
    },
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both'],
      default: '4 Wheeler'
    },
    applicationNo: {
      type: String,
      trim: true
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    licenceCategory: {
      type: String,
      trim: true,
      default: 'LMV'
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    },
    workflowStage: {
      type: String,
      default: 'Registration'
    },
    currentStatus: {
      type: String,
      enum: ['Active', 'Pending', 'Passed', 'Failed', 'Dropped'],
      default: 'Active'
    },
    applicationOpen: {
      type: Boolean,
      default: true
    },
    newApplication: {
      type: Boolean,
      default: true
    },
    nextAction: {
      type: String,
      trim: true
    },
    followUpDate: {
      type: Date
    },
    testDate: {
      type: Date
    },
    testStatus: {
      type: String,
      enum: ['Not Scheduled', 'Scheduled', 'Passed', 'Failed'],
      default: 'Not Scheduled'
    },
    totalFee: {
      type: Number,
      default: 0
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    advanceAmount: {
      type: Number,
      default: 0
    },
    documentReadiness: {
      aadhaarVerified: { type: Boolean, default: false },
      photoVerified: { type: Boolean, default: false },
      addressProofVerified: { type: Boolean, default: false },
      bloodGroupRecorded: { type: Boolean, default: false },
      form15Ready: { type: Boolean, default: false }
    },
    notes: {
      type: String,
      trim: true
    },
    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property for Balance
studentSchema.virtual('balance').get(function () {
  const total = this.totalFee || 0;
  const paid = this.paidAmount || 0;
  const advance = this.advanceAmount || 0;
  return total - paid - advance;
});

module.exports = mongoose.model('Student', studentSchema);
