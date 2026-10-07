const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required for an application'],
      index: true
    },
    studentId: {
      type: String,
      required: true,
      index: true
    },
    serviceType: {
      type: String,
      enum: [
        'Fresh Licence',
        'Additional Class',
        'Endorsement',
        'Renewal',
        'Badge',
        'Duplicate Licence',
        'Retest',
        'Other'
      ],
      default: 'Fresh Licence',
      index: true
    },
    licenceType: {
      type: String,
      default: 'LMV+MCWG'
    },
    vehicleClass: {
      type: String,
      enum: ['4 Wheeler', '2 Wheeler', 'Both', '3 Wheeler', 'Heavy'],
      default: '4 Wheeler'
    },
    coursePackage: {
      type: String,
      default: 'LMV+MCWG (Fresh Licence)'
    },
    applicationDate: {
      type: Date,
      default: Date.now,
      index: true
    },

    // 13 Clear Lifecycle Statuses from R&D Implementation Guide
    lifecycleStatus: {
      type: String,
      enum: [
        'Lead',
        'Registered',
        'Documents Pending',
        'LL Processing',
        'LL Approved',
        'Training',
        'Test Scheduled',
        'Retest',
        'Test Passed',
        'Licence Processing',
        'Completed',
        'On Hold',
        'Cancelled'
      ],
      default: 'Registered',
      index: true
    },

    // Batch & Resource Allocations
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true
    },
    primaryInstructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null
    },
    secondaryInstructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Stage 1: Learner Licence (LL)
    learnerLicence: {
      llApplicationDate: { type: Date },
      llTestDate: { type: Date },
      llStatus: {
        type: String,
        enum: ['Not Applied', 'Applied', 'Slot Booked', 'Processing', 'Approved', 'Issued', 'Failed'],
        default: 'Not Applied'
      },
      llNumber: { type: String, trim: true, default: '' },
      llIssueDate: { type: Date },
      llExpiryDate: { type: Date },
      remarks: { type: String, trim: true, default: '' }
    },

    // Stage 2: RTO Final Driving Test
    drivingTest: {
      drivingTestDate: { type: Date },
      testTimeSlot: { type: String, default: '' },
      vehicleClass: { type: String, default: '4 Wheeler' },
      testResult: {
        type: String,
        enum: ['Pending', 'Scheduled', 'Passed', 'Failed', 'Absent'],
        default: 'Pending'
      },
      retestDate: { type: Date },
      retestCount: { type: Number, default: 0 },
      remarks: { type: String, trim: true, default: '' }
    },

    // Stage 3: Licence
    licence: {
      licenceStatus: {
        type: String,
        enum: ['Pending', 'Under Processing', 'Printed', 'Dispatched', 'Delivered'],
        default: 'Pending'
      },
      dlNumber: { type: String, trim: true, default: '' },
      issueDate: { type: Date },
      receivedDispatchStatus: { type: String, default: '' },
      completionDate: { type: Date },
      remarks: { type: String, trim: true, default: '' }
    },

    // Financial Ledger Breakdown (Transaction-based accounting)
    feeStructure: {
      packageFee: { type: Number, default: 9000 },
      rtoServiceFee: { type: Number, default: 0 },
      retestFee: { type: Number, default: 0 },
      otherCharges: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      netPayable: { type: Number, default: 9000 },
      totalReceived: { type: Number, default: 0 },
      balanceDue: { type: Number, default: 9000 }
    },

    // Mandatory Next Action
    nextAction: {
      type: String,
      trim: true,
      default: 'Submit Documents'
    },
    nextActionDueDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    nextActionAssignedTo: {
      type: String,
      trim: true,
      default: 'Office Desk'
    },
    nextActionPriority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    nextActionStatus: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending'
    },

    // Training Progress Ledger Summary
    trainingSummary: {
      roadKm: { type: Number, default: 0 },
      roadClasses: { type: Number, default: 0 },
      hPractices: { type: Number, default: 0 },
      hClasses: { type: Number, default: 0 },
      bikeClasses: { type: Number, default: 0 },
      totalClasses: { type: Number, default: 0 },
      requiredClasses: { type: Number, default: 20 },
      completionPercentage: { type: Number, default: 0 }
    },

    // Document Readiness %
    documentReadiness: {
      readinessPercentage: { type: Number, default: 0 },
      verifiedCount: { type: Number, default: 0 },
      totalCount: { type: Number, default: 5 }
    },

    // Historical Migration Tracking
    legacySource: { type: String, default: '' },
    legacyId: { type: String, default: '' },
    migrationStatus: {
      type: String,
      enum: ['None', 'Sample', 'Full', 'Verified', 'Committed', 'RolledBack'],
      default: 'None'
    },
    migrationBatchId: { type: String, default: '' },
    migrationVerifiedAt: { type: Date },

    notes: { type: String, trim: true, default: '' }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for dynamic Net Payable & Balance Due
applicationSchema.pre('save', function (next) {
  if (this.feeStructure) {
    const pkg = Number(this.feeStructure.packageFee) || 0;
    const rto = Number(this.feeStructure.rtoServiceFee) || 0;
    const retest = Number(this.feeStructure.retestFee) || 0;
    const other = Number(this.feeStructure.otherCharges) || 0;
    const disc = Number(this.feeStructure.discount) || 0;
    const rec = Number(this.feeStructure.totalReceived) || 0;

    const net = Math.max(0, pkg + rto + retest + other - disc);
    this.feeStructure.netPayable = net;
    this.feeStructure.balanceDue = Math.max(0, net - rec);
  }

  // Auto-flag Next Action Overdue if past due date
  if (this.nextActionDueDate && this.nextActionStatus === 'Pending') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(this.nextActionDueDate) < today) {
      this.nextActionStatus = 'Overdue';
    }
  }

  next();
});

// Compound Indexes for fast queries
applicationSchema.index({ student: 1, applicationDate: -1 });
applicationSchema.index({ lifecycleStatus: 1, nextActionDueDate: 1 });
applicationSchema.index({ 'learnerLicence.llNumber': 1 });
applicationSchema.index({ 'licence.dlNumber': 1 });
applicationSchema.index({ 'drivingTest.drivingTestDate': 1 });

module.exports = mongoose.model('Application', applicationSchema);
