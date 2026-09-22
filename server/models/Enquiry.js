const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Enquiry name is required'],
      trim: true
    },
    primaryMobile: {
      type: String,
      required: [true, 'Primary mobile is required'],
      trim: true
    },
    alternateMobile: {
      type: String,
      trim: true
    },
    interestedLicence: {
      type: String,
      trim: true,
      default: 'LMV - 4 Wheeler'
    },
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both'],
      default: '4 Wheeler'
    },
    preferredBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    },
    enquiryDate: {
      type: Date,
      default: Date.now
    },
    followUpDate: {
      type: Date
    },
    source: {
      type: String,
      default: 'Walk-in'
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'],
      default: 'New'
    },
    notes: {
      type: String,
      trim: true
    },
    convertedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
