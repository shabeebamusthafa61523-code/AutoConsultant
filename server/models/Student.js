const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true
    },
    aliasSourceName: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },
    dob: {
      type: Date
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      houseName: { type: String, trim: true, default: '' },
      place: { type: String, trim: true, default: '' },
      postOffice: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: 'Malappuram' },
      pincode: { type: String, trim: true, default: '' }
    },
    primaryMobile: {
      type: String,
      required: [true, 'Primary mobile is required'],
      trim: true,
      index: true
    },
    alternateMobile: {
      type: String,
      trim: true
    },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' }
    },

    // Course & Admission Details
    coursePackage: {
      type: String,
      trim: true,
      default: 'LMV+MCWG (Fresh Licence)'
    },
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both', '3 Wheeler', 'Heavy'],
      default: '4 Wheeler'
    },
    licenceCategory: {
      type: String,
      trim: true,
      default: 'LMV'
    },
    admissionNumber: {
      type: String,
      trim: true
    },
    registrationDate: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Batch Assignment & Historical Transfer Tracking
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      index: true
    },
    batchHistory: [
      {
        batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
        batchName: { type: String },
        assignedDate: { type: Date, default: Date.now },
        transferredDate: { type: Date },
        reason: { type: String, trim: true },
        transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],

    // Licence & RTO Pipeline
    licenceServiceType: {
      type: String,
      trim: true,
      default: 'Fresh Licence'
    },
    applicationNo: {
      type: String,
      trim: true
    },
    applicationDate: {
      type: Date
    },
    application: {
      type: String,
      trim: true,
      default: ''
    },
    applicationOpen: {
      type: Boolean,
      default: true
    },
    newApplication: {
      type: Boolean,
      default: true
    },
    workflowStage: {
      type: String,
      default: 'Registration'
    },

    // Learner Licence (LL)
    learnerLicence: {
      llNumber: { type: String, trim: true, default: '' },
      appliedDate: { type: Date },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      status: {
        type: String,
        enum: ['Not Applied', 'Slot Booked', 'Pending', 'Passed', 'Failed', 'Issued'],
        default: 'Not Applied'
      },
      remarks: { type: String, trim: true, default: '' }
    },

    // Driving Licence (DL)
    drivingLicence: {
      dlNumber: { type: String, trim: true, default: '' },
      issueDate: { type: Date },
      deliveryDate: { type: Date },
      status: {
        type: String,
        enum: ['Pending', 'Under Processing', 'Printed', 'Delivered'],
        default: 'Pending'
      },
      remarks: { type: String, trim: true, default: '' }
    },

    // RTO Final Driving Test
    testDate: {
      type: Date
    },
    testStatus: {
      type: String,
      enum: ['Not Scheduled', 'Scheduled', 'Passed', 'Failed', 'Retest Required'],
      default: 'Not Scheduled'
    },
    testDetails: {
      testDate: { type: Date },
      testType: { type: String, default: 'Road & H' },
      testStatus: {
        type: String,
        enum: ['Not Scheduled', 'Scheduled', 'Passed', 'Failed', 'Retest Required'],
        default: 'Not Scheduled'
      },
      attempts: { type: Number, default: 1 },
      remarks: { type: String, trim: true, default: '' }
    },

    // Training Progress & Lesson Counters
    trainingProgress: {
      status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Test Ready', 'Completed'],
        default: 'Not Started'
      },
      roadClassesCount: { type: Number, default: 0 },
      hTrackClassesCount: { type: Number, default: 0 },
      bikeClassesCount: { type: Number, default: 0 },
      totalKm: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      equivalentClasses: { type: Number, default: 0 },
      requiredClasses: { type: Number, default: 20 },
      pendingClasses: { type: Number, default: 20 },
      completionPercentage: { type: Number, default: 0 },
      latestClassDate: { type: Date },
      nextScheduledDate: { type: Date },
      theoryCompleted: { type: Boolean, default: false },
      simulatorCompleted: { type: Boolean, default: false },
      remarks: { type: String, trim: true, default: '' }
    },

    // Student Status & Lifecycle
    currentStatus: {
      type: String,
      enum: [
        'New',
        'Active',
        'Training',
        'Test Pending',
        'Test Scheduled',
        'Passed',
        'Completed',
        'Retest',
        'Pending',
        'Inactive',
        'Dropped'
      ],
      default: 'Active',
      index: true
    },
    nextAction: {
      type: String,
      trim: true
    },
    followUpDate: {
      type: Date
    },

    // Financial Records
    totalFee: {
      type: Number,
      default: 9000
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    advanceAmount: {
      type: Number,
      default: 0
    },

    // Document Checklist & Repository
    documentReadiness: {
      aadhaarVerified: { type: Boolean, default: false },
      photoVerified: { type: Boolean, default: false },
      addressProofVerified: { type: Boolean, default: false },
      bloodGroupRecorded: { type: Boolean, default: false },
      form15Ready: { type: Boolean, default: false }
    },
    documents: [
      {
        docType: {
          type: String,
          required: true
        },
        fileName: { type: String, default: '' },
        fileUrl: { type: String, default: '' },
        uploadedDate: { type: Date, default: Date.now },
        verificationStatus: {
          type: String,
          enum: ['Pending', 'Verified', 'Rejected'],
          default: 'Pending'
        },
        remarks: { type: String, trim: true, default: '' }
      }
    ],

    // Activity Timeline Audit Log
    timeline: [
      {
        action: { type: String, required: true },
        category: {
          type: String,
          enum: ['Registration', 'Batch', 'Class', 'Attendance', 'Payment', 'Licence', 'Test', 'Status', 'Note', 'General'],
          default: 'General'
        },
        description: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: String, default: 'System' }
      }
    ],

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

// Virtual property for Fee Status
studentSchema.virtual('feeStatus').get(function () {
  const total = this.totalFee || 0;
  const paid = (this.paidAmount || 0) + (this.advanceAmount || 0);
  if (total <= 0) return 'Paid';
  if (paid >= total) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  return 'Pending';
});

// Text index for search
studentSchema.index({
  fullName: 'text',
  primaryMobile: 'text',
  studentId: 'text'
});

module.exports = mongoose.model('Student', studentSchema);
