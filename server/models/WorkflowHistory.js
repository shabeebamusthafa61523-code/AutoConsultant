const mongoose = require('mongoose');

const workflowHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    fromStage: {
      type: String,
      default: ''
    },
    toStage: {
      type: String,
      required: [true, 'Target stage is required'],
      index: true
    },
    action: {
      type: String,
      default: 'Stage Changed'
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    changedByName: {
      type: String,
      default: 'System'
    },
    changedByRole: {
      type: String,
      default: 'Staff'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    nextAction: {
      type: String,
      trim: true,
      default: ''
    },
    nextActionDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

workflowHistorySchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('WorkflowHistory', workflowHistorySchema);
