const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    task: {
      type: String,
      required: [true, 'Task/Follow-up description is required'],
      trim: true
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true
    },
    dueTime: {
      type: String,
      trim: true,
      default: ''
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedToName: {
      type: String,
      default: 'Unassigned'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    relatedStage: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    completedAt: {
      type: Date
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedByName: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdByName: {
      type: String,
      default: 'System'
    },
    rescheduledCount: {
      type: Number,
      default: 0
    },
    rescheduleHistory: [
      {
        previousDate: { type: Date },
        newDate: { type: Date },
        reason: { type: String, trim: true, default: '' },
        rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rescheduledByName: { type: String, default: '' },
        rescheduledAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal querying
followUpSchema.index({ status: 1, dueDate: 1 });
followUpSchema.index({ student: 1, status: 1 });
followUpSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
