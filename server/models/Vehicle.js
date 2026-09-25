const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: [true, 'Vehicle ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle Number / Reg No is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    vehicleType: {
      type: String,
      enum: ['LMV', 'Motorcycle Training', '2 Wheeler', '4 Wheeler', 'Both', '3 Wheeler', 'Heavy'],
      default: 'LMV'
    },
    brand: {
      type: String,
      trim: true,
      default: 'Maruti Suzuki'
    },
    model: {
      type: String,
      trim: true,
      default: 'Alto'
    },
    assignedInstructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      default: null
    },
    assignedInstructorName: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Maintenance', 'Inactive', 'Decommissioned'],
      default: 'Active',
      index: true
    },
    branch: {
      type: String,
      trim: true,
      default: 'West Kodur'
    },
    purchaseDate: {
      type: Date
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'CNG', 'Electric'],
      default: 'Petrol'
    },
    currentOdometer: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },

    // Legal Compliance Registers
    rc: {
      rcNumber: { type: String, trim: true, default: '' },
      ownerName: { type: String, trim: true, default: '' },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      status: {
        type: String,
        enum: ['Valid', 'Expiring Soon', 'Expired'],
        default: 'Valid'
      }
    },
    insurance: {
      insuranceCompany: { type: String, trim: true, default: '' },
      policyNumber: { type: String, trim: true, default: '' },
      agency: { type: String, trim: true, default: '' },
      contact: { type: String, trim: true, default: '' },
      startDate: { type: Date },
      expiryDate: { type: Date },
      premium: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['Valid', 'Expiring Soon', 'Expired', 'Renewal Due'],
        default: 'Valid'
      }
    },
    fitness: {
      fitnessCertificateNumber: { type: String, trim: true, default: '' },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      status: {
        type: String,
        enum: ['Valid', 'Expiring Soon', 'Expired', 'Renewal Due'],
        default: 'Valid'
      }
    },
    tax: {
      taxType: { type: String, trim: true, default: 'Road Tax' },
      lastPaidDate: { type: Date },
      nextDueDate: { type: Date },
      amount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['Paid', 'Due Soon', 'Overdue'],
        default: 'Paid'
      }
    },
    puc: {
      pucNumber: { type: String, trim: true, default: '' },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      status: {
        type: String,
        enum: ['Valid', 'Expiring Soon', 'Expired'],
        default: 'Valid'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Method to automatically calculate compliance statuses based on expiry dates
vehicleSchema.methods.calculateComplianceStatuses = function () {
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  // RC Expiry
  if (this.rc && this.rc.expiryDate) {
    const diff = new Date(this.rc.expiryDate) - now;
    if (diff <= 0) this.rc.status = 'Expired';
    else if (diff <= thirtyDays) this.rc.status = 'Expiring Soon';
    else this.rc.status = 'Valid';
  }

  // Insurance Expiry
  if (this.insurance && this.insurance.expiryDate) {
    const diff = new Date(this.insurance.expiryDate) - now;
    if (diff <= 0) this.insurance.status = 'Expired';
    else if (diff <= thirtyDays) this.insurance.status = 'Renewal Due';
    else this.insurance.status = 'Valid';
  }

  // Fitness Expiry
  if (this.fitness && this.fitness.expiryDate) {
    const diff = new Date(this.fitness.expiryDate) - now;
    if (diff <= 0) this.fitness.status = 'Expired';
    else if (diff <= thirtyDays) this.fitness.status = 'Renewal Due';
    else this.fitness.status = 'Valid';
  }

  // Tax Due
  if (this.tax && this.tax.nextDueDate) {
    const diff = new Date(this.tax.nextDueDate) - now;
    if (diff <= 0) this.tax.status = 'Overdue';
    else if (diff <= thirtyDays) this.tax.status = 'Due Soon';
    else this.tax.status = 'Paid';
  }

  // PUC Expiry
  if (this.puc && this.puc.expiryDate) {
    const diff = new Date(this.puc.expiryDate) - now;
    if (diff <= 0) this.puc.status = 'Expired';
    else if (diff <= thirtyDays) this.puc.status = 'Expiring Soon';
    else this.puc.status = 'Valid';
  }
};

vehicleSchema.pre('save', function (next) {
  this.calculateComplianceStatuses();
  next();
});

vehicleSchema.index({ vehicleNumber: 'text', vehicleId: 'text', model: 'text', brand: 'text' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
