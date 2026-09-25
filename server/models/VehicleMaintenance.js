const mongoose = require('mongoose');

const vehicleMaintenanceSchema = new mongoose.Schema(
  {
    maintenanceId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
      index: true
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    date: {
      type: Date,
      default: Date.now,
      required: true
    },
    maintenanceType: {
      type: String,
      enum: ['Regular Service', 'Repair', 'Inspection', 'Tyres', 'Brakes', 'Oil Change', 'Accident Damage', 'Other'],
      default: 'Regular Service'
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
      min: [0, 'Cost must be positive'],
      default: 0
    },
    vendor: {
      type: String,
      trim: true,
      default: 'Benz Auto Care'
    },
    odometer: {
      type: Number,
      default: 0
    },
    nextDueDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Completed',
      index: true
    },
    performedBy: {
      type: String,
      trim: true,
      default: ''
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

vehicleMaintenanceSchema.index({ vehicle: 1, date: -1 });

module.exports = mongoose.model('VehicleMaintenance', vehicleMaintenanceSchema);
