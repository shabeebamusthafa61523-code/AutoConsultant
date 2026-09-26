const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      trim: true,
      uppercase: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required for a payment record']
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Payment date is required']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Payment amount must be greater than zero']
    },
    paymentType: {
      type: String,
      default: 'Fee Payment'
    },
    paymentMethod: {
      type: String,
      default: 'Cash'
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
    previousBalance: {
      type: Number,
      default: 0
    },
    balanceAfter: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Cancelled'],
      default: 'Completed'
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

// Virtual for Payment ID (falls back to receiptNo or _id slice)
paymentSchema.virtual('paymentId').get(function () {
  return this.receiptNo || `REC-${String(this._id).toUpperCase().slice(-6)}`;
});

// Indexes for fast ledger lookups and date-range queries
paymentSchema.index({ student: 1, paymentDate: -1 });
paymentSchema.index({ paymentDate: -1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
