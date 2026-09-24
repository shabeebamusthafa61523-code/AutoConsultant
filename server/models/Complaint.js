const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: [true, 'Complaint ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    complaintDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Complaint date is required'],
      index: true
    },
    source: {
      type: String,
      enum: ['Walk-in', 'Phone', 'WhatsApp', 'Email', 'Website', 'Staff', 'Student', 'Management', 'Other'],
      default: 'Phone',
      index: true
    },
    complainantType: {
      type: String,
      enum: ['Student', 'Instructor', 'Employee', 'Customer/Visitor', 'Other'],
      default: 'Student',
      index: true
    },
    // Linked Complainant Entities
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
      index: true
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Direct Complainant Info (Populated or manual for visitors/non-enrolled)
    complainantName: {
      type: String,
      required: [true, 'Complainant name is required'],
      trim: true,
      index: true
    },
    complainantMobile: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: [
        'Training',
        'Instructor',
        'Vehicle',
        'Scheduling',
        'Fees / Payment',
        'Staff',
        'Documentation',
        'Licence Service',
        'Behaviour',
        'Safety',
        'Facility',
        'Service Quality',
        'Other'
      ],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true
    },
    // Optional Related Operational Entities
    relatedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
      index: true
    },
    relatedInstructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null,
      index: true
    },
    relatedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
      index: true
    },
    relatedBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
    },
    relatedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    },
    relatedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null
    },
    relatedEnquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
      default: null
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Pending', 'Escalated', 'Resolved', 'Closed'],
      default: 'Open',
      index: true
    },
    // Staff Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedToName: {
      type: String,
      default: 'Unassigned',
      trim: true
    },
    expectedResolutionDate: {
      type: Date,
      index: true
    },
    // Resolution Details
    resolution: {
      resolutionNotes: { type: String, default: '' },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedByName: { type: String, default: '' },
      resolvedDate: { type: Date, default: null },
      correctiveActionTaken: { type: String, default: '' },
      satisfactionRating: {
        type: String,
        enum: ['Satisfied', 'Neutral', 'Unsatisfied', ''],
        default: ''
      }
    },
    // Escalation Details
    escalation: {
      isEscalated: { type: Boolean, default: false },
      escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      escalatedToName: { type: String, default: '' },
      escalatedDate: { type: Date, default: null },
      escalationReason: { type: String, default: '' }
    },
    // Internal Staff Comments
    comments: [
      {
        comment: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdByName: { type: String, default: 'Staff' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    // Activity & Audit Timeline
    activities: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String, default: 'System' },
        performedByRole: { type: String, default: 'Staff' },
        details: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdByName: {
      type: String,
      default: 'System'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: isOverdue (true if not resolved/closed and past expected resolution date)
complaintSchema.virtual('isOverdue').get(function () {
  if (this.status === 'Resolved' || this.status === 'Closed') {
    return false;
  }
  if (!this.expectedResolutionDate) {
    return false;
  }
  return new Date(this.expectedResolutionDate) < new Date();
});

// Text index for server-side full-text searches
complaintSchema.index({
  complaintId: 'text',
  complainantName: 'text',
  complainantMobile: 'text',
  description: 'text'
});

// Compound indexes for fast filtered lookups
complaintSchema.index({ status: 1, priority: 1, expectedResolutionDate: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
