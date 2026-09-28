const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema(
  {
    instructorId: {
      type: String,
      required: [true, 'Instructor ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Instructor name is required'],
      trim: true,
      index: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true
    },
    licenceNo: {
      type: String,
      trim: true,
      default: ''
    },
    badgeNo: {
      type: String,
      trim: true,
      default: ''
    },
    experience: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave'],
      default: 'Active',
      index: true
    },
    department: {
      type: String,
      trim: true,
      default: 'Instructor Team'
    },
    designation: {
      type: String,
      trim: true,
      default: 'Road & H-Class Instructor'
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: ''
    },
    assignedVehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
      }
    ],
    // Training & Certifications from DDS_HR_Administration_Management_2026.xlsx
    certifications: [
      {
        trainingName: { type: String, required: true },
        certificateNo: { type: String, default: '' },
        issueDate: { type: Date },
        validity: { type: Date },
        remarks: { type: String, default: '' }
      }
    ],
    // Staff Document Register from DDS_HR_Administration_Management_2026.xlsx
    staffDocuments: [
      {
        docType: {
          type: String,
          enum: ['Aadhaar', 'Licence', 'Photo', 'Agreement', 'Bank Details', 'Badge', 'Medical Certificate', 'Other'],
          required: true
        },
        docNumber: { type: String, default: '' },
        fileUrl: { type: String, default: '' },
        fileName: { type: String, default: '' },
        status: {
          type: String,
          enum: ['Pending', 'Submitted', 'Verified', 'Expired'],
          default: 'Submitted'
        },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        remarks: { type: String, default: '' }
      }
    ],
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

instructorSchema.index({ name: 'text', instructorId: 'text', mobile: 'text' });

module.exports = mongoose.model('Instructor', instructorSchema);
