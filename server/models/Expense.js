const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseId: {
      type: String,
      trim: true,
      uppercase: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title / description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      default: 'Office Expense',
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero']
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Expense date is required']
    },
    paymentMethod: {
      type: String,
      default: 'Cash',
      trim: true
    },
    reference: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

expenseSchema.index({ expenseDate: -1, createdAt: -1 });
expenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
