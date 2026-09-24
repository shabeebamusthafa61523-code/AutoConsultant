const mongoose = require('mongoose');

const courseFeeSchema = new mongoose.Schema(
  {
    feeId: {
      type: String,
      required: [true, 'Fee ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    service: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    courseFee: {
      type: Number,
      required: [true, 'Course Fee is required'],
      default: 0,
      min: [0, 'Course Fee cannot be negative']
    },
    govtFee: {
      type: Number,
      required: [true, 'Govt Fee is required'],
      default: 0,
      min: [0, 'Govt Fee cannot be negative']
    },
    totalFee: {
      type: Number,
      required: [true, 'Total Fee is required'],
      default: 0,
      min: [0, 'Total Fee cannot be negative']
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure totalFee = courseFee + govtFee
courseFeeSchema.pre('validate', function (next) {
  const course = Number(this.courseFee) || 0;
  const govt = Number(this.govtFee) || 0;
  this.totalFee = course + govt;
  next();
});

module.exports = mongoose.model('CourseFee', courseFeeSchema);
