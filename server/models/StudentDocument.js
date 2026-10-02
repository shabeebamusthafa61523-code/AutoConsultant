const mongoose = require('mongoose');

const studentDocumentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
      index: true
    },
    applicationId: {
      type: String,
      default: '',
      index: true
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      enum: [
        'Aadhaar / ID',
        'Photo',
        'Address Proof',
        'Blood Group',
        'Form 15',
        'Medical Certificate (Form 1A)',
        'SSLC / Age Proof',
        'Existing Licence',
        'Other'
      ],
      index: true
    },
    documentNumber: {
      type: String,
      trim: true,
      default: ''
    },
    fileName: {
      type: String,
      default: ''
    },
    fileUrl: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Pending', 'Submitted', 'Verified', 'Rejected', 'Expired'],
      default: 'Submitted',
      index: true
    },
    submissionDate: {
      type: Date,
      default: Date.now
    },
    verifiedDate: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedByName: {
      type: String,
      trim: true,
      default: ''
    },
    expiryDate: {
      type: Date
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Helper function to sync student readiness & documents array
studentDocumentSchema.statics.syncStudentReadiness = async function (studentId) {
  const Student = mongoose.model('Student');
  const allDocs = await this.find({ student: studentId });

  const readiness = {
    aadhaarVerified: false,
    photoVerified: false,
    addressProofVerified: false,
    bloodGroupRecorded: false,
    form15Ready: false
  };

  const embeddedDocs = [];

  for (const doc of allDocs) {
    embeddedDocs.push({
      docType: doc.documentType,
      fileName: doc.fileName || doc.documentType,
      fileUrl: doc.fileUrl || '',
      uploadedDate: doc.submissionDate || doc.createdAt,
      verificationStatus: doc.status === 'Verified' ? 'Verified' : (doc.status === 'Rejected' ? 'Rejected' : 'Pending'),
      remarks: doc.remarks || ''
    });

    if (doc.status === 'Verified') {
      if (doc.documentType === 'Aadhaar / ID') readiness.aadhaarVerified = true;
      if (doc.documentType === 'Photo') readiness.photoVerified = true;
      if (doc.documentType === 'Address Proof') readiness.addressProofVerified = true;
      if (doc.documentType === 'Blood Group') readiness.bloodGroupRecorded = true;
      if (doc.documentType === 'Form 15') readiness.form15Ready = true;
    }
  }

  const verifiedCount = Object.values(readiness).filter(Boolean).length;
  const readinessPercentage = Math.round((verifiedCount / 5) * 100);

  await Student.findByIdAndUpdate(studentId, {
    documentReadiness: readiness,
    documents: embeddedDocs
  });

  try {
    const Application = mongoose.model('Application');
    await Application.updateMany(
      { student: studentId },
      {
        $set: {
          'documentReadiness.verifiedCount': verifiedCount,
          'documentReadiness.readinessPercentage': readinessPercentage,
          'documentReadiness.totalCount': 5
        }
      }
    );

    // If all essential documents are verified and lifecycle is 'Documents Pending', transition to 'LL Processing'
    if (verifiedCount === 5) {
      await Application.updateMany(
        { student: studentId, lifecycleStatus: 'Documents Pending' },
        {
          $set: {
            lifecycleStatus: 'LL Processing',
            nextAction: 'Apply Learner Licence (LL)',
            nextActionDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          }
        }
      );
    }
  } catch (appErr) {
    console.warn('Application document readiness sync note:', appErr.message);
  }
};

studentDocumentSchema.post('save', async function () {
  await this.constructor.syncStudentReadiness(this.student);
});

studentDocumentSchema.pre('validate', function (next) {
  if (!this.documentId) {
    this.documentId = `DOC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

studentDocumentSchema.post('findOneAndDelete', async function (doc) {
  if (doc && doc.student) {
    await doc.constructor.syncStudentReadiness(doc.student);
  }
});

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
