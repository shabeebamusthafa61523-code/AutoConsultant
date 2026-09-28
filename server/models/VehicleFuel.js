const mongoose = require('mongoose');

const vehicleFuelSchema = new mongoose.Schema(
  {
    fuelId: {
      type: String,
      trim: true
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
    fuelQty: {
      type: Number,
      required: [true, 'Fuel quantity (litres) is required'],
      min: [0.1, 'Fuel quantity must be greater than zero']
    },
    amount: {
      type: Number,
      required: [true, 'Fuel amount is required'],
      min: [0, 'Amount must be positive']
    },
    mileage: {
      type: Number,
      default: 0
    },
    driverInstructor: {
      type: String,
      trim: true,
      default: ''
    },
    fuelStation: {
      type: String,
      trim: true,
      default: 'Indian Oil'
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

vehicleFuelSchema.index({ vehicle: 1, date: -1 });

module.exports = mongoose.model('VehicleFuel', vehicleFuelSchema);
