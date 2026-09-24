const StudentDocument = require('../models/StudentDocument');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const fs = require('fs');

const generateDocumentId = async () => {
  const count = await StudentDocument.countDocuments();
  const nextNum = count + 1;
  return `DOC-${String(nextNum).padStart(4, '0')}`;
};

// @desc    Get student documents with filters & pagination
// @route   GET /api/student-documents
const getStudentDocuments = async (req, res, next) => {
  try {
    const { student, status, documentType, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (student) query.student = student;
    if (status) query.status = status;
    if (documentType) query.documentType = documentType;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    let studentFilter = {};
    if (search && search.trim()) {
      const term = search.trim();
      const matchedStudents = await Student.find({
        $or: [
          { fullName: { $regex: term, $options: 'i' } },
          { studentId: { $regex: term, $options: 'i' } },
          { primaryMobile: { $regex: term, $options: 'i' } }
        ]
      }).select('_id');

      const matchedIds = matchedStudents.map(s => s._id);
      query.$or = [
        { student: { $in: matchedIds } },
        { documentNumber: { $regex: term, $options: 'i' } },
        { documentId: { $regex: term, $options: 'i' } }
      ];
    }

    const total = await StudentDocument.countDocuments(query);
    const documents = await StudentDocument.find(query)
      .populate('student', 'studentId fullName primaryMobile vehicleType batch currentStatus')
      .populate('verifiedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Summary counts
    const statusCounts = {
      total,
      pending: await StudentDocument.countDocuments({ status: 'Pending' }),
      submitted: await StudentDocument.countDocuments({ status: 'Submitted' }),
      verified: await StudentDocument.countDocuments({ status: 'Verified' }),
      rejected: await StudentDocument.countDocuments({ status: 'Rejected' }),
      expired: await StudentDocument.countDocuments({ status: 'Expired' })
    };

    res.json({
      documents,
      statusCounts,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single student document by ID
// @route   GET /api/student-documents/:id
const getStudentDocumentById = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findById(req.params.id)
      .populate('student', 'studentId fullName primaryMobile vehicleType batch documentReadiness')
      .populate('verifiedBy', 'name role');

    if (!doc) {
      res.status(404);
      throw new Error('Student document record not found');
    }

    res.json(doc);
  } catch (error) {
    next(error);
  }
};

// @desc    Create / upload student document
// @route   POST /api/student-documents
const createStudentDocument = async (req, res, next) => {
  try {
    const { student, documentType, documentNumber, status, remarks, expiryDate } = req.body;

    if (!student) {
      res.status(400);
      throw new Error('Student reference is required');
    }
    if (!documentType) {
      res.status(400);
      throw new Error('Document type is required');
    }

    const studentRecord = await Student.findById(student);
    if (!studentRecord) {
      res.status(404);
      throw new Error('Student not found');
    }

    const documentId = await generateDocumentId();
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let mimeType = '';

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/documents/${req.file.filename}`;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
      fileName = req.body.fileName || documentType;
    }

    const doc = await StudentDocument.create({
      documentId,
      student,
      documentType,
      documentNumber: documentNumber || '',
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      status: status || 'Submitted',
      submissionDate: new Date(),
      remarks: remarks || '',
      expiryDate: expiryDate || null
    });

    await AuditLog.logAction({
      user: req.user,
      action: 'SUBMIT_STUDENT_DOCUMENT',
      entity: 'StudentDocument',
      entityId: doc._id,
      details: { studentId: studentRecord.studentId, documentType: doc.documentType, documentId: doc.documentId },
      req
    });

    const populated = await StudentDocument.findById(doc._id)
      .populate('student', 'studentId fullName documentReadiness');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify student document (Authorized staff/admin only)
// @route   PUT /api/student-documents/:id/verify
const verifyStudentDocument = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const doc = await StudentDocument.findById(req.params.id);

    if (!doc) {
      res.status(404);
      throw new Error('Student document record not found');
    }

    doc.status = 'Verified';
    doc.verifiedDate = new Date();
    doc.verifiedBy = req.user._id;
    doc.verifiedByName = req.user.name || req.user.username;
    if (remarks) doc.remarks = remarks;
    doc.rejectionReason = '';

    await doc.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'VERIFY_STUDENT_DOCUMENT',
      entity: 'StudentDocument',
      entityId: doc._id,
      details: { documentType: doc.documentType, verifiedBy: doc.verifiedByName },
      req
    });

    const updated = await StudentDocument.findById(doc._id)
      .populate('student', 'studentId fullName documentReadiness')
      .populate('verifiedBy', 'name role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Reject student document (with mandatory reason)
// @route   PUT /api/student-documents/:id/reject
const rejectStudentDocument = async (req, res, next) => {
  try {
    const { rejectionReason, remarks } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      res.status(400);
      throw new Error('Rejection reason is required');
    }

    const doc = await StudentDocument.findById(req.params.id);
    if (!doc) {
      res.status(404);
      throw new Error('Student document record not found');
    }

    doc.status = 'Rejected';
    doc.rejectionReason = rejectionReason.trim();
    if (remarks) doc.remarks = remarks;
    doc.verifiedDate = new Date();
    doc.verifiedBy = req.user._id;
    doc.verifiedByName = req.user.name || req.user.username;

    await doc.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'REJECT_STUDENT_DOCUMENT',
      entity: 'StudentDocument',
      entityId: doc._id,
      details: { documentType: doc.documentType, reason: rejectionReason },
      req
    });

    const updated = await StudentDocument.findById(doc._id)
      .populate('student', 'studentId fullName documentReadiness')
      .populate('verifiedBy', 'name role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update document metadata
// @route   PUT /api/student-documents/:id
const updateStudentDocument = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findById(req.params.id);
    if (!doc) {
      res.status(404);
      throw new Error('Student document record not found');
    }

    const { documentNumber, remarks, expiryDate, status } = req.body;
    if (documentNumber !== undefined) doc.documentNumber = documentNumber;
    if (remarks !== undefined) doc.remarks = remarks;
    if (expiryDate !== undefined) doc.expiryDate = expiryDate;
    if (status !== undefined) doc.status = status;

    if (req.file) {
      doc.fileName = req.file.originalname;
      doc.fileUrl = `/uploads/documents/${req.file.filename}`;
      doc.fileSize = req.file.size;
      doc.mimeType = req.file.mimetype;
    }

    await doc.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_STUDENT_DOCUMENT',
      entity: 'StudentDocument',
      entityId: doc._id,
      details: { documentType: doc.documentType, status: doc.status },
      req
    });

    const updated = await StudentDocument.findById(doc._id)
      .populate('student', 'studentId fullName documentReadiness')
      .populate('verifiedBy', 'name role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student document
// @route   DELETE /api/student-documents/:id
const deleteStudentDocument = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findById(req.params.id);
    if (!doc) {
      res.status(404);
      throw new Error('Student document record not found');
    }

    const studentId = doc.student;
    await StudentDocument.findByIdAndDelete(req.params.id);

    // Sync student readiness
    await StudentDocument.syncStudentReadiness(studentId);

    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_STUDENT_DOCUMENT',
      entity: 'StudentDocument',
      entityId: req.params.id,
      details: { documentType: doc.documentType },
      req
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student document readiness scorecard
// @route   GET /api/student-documents/student/:studentId/readiness
const getStudentReadiness = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const documents = await StudentDocument.find({ student: student._id })
      .populate('verifiedBy', 'name role')
      .sort({ createdAt: -1 });

    const requiredTypes = [
      { key: 'aadhaarVerified', label: 'Aadhaar / ID', docType: 'Aadhaar / ID' },
      { key: 'photoVerified', label: 'Photo', docType: 'Photo' },
      { key: 'addressProofVerified', label: 'Address Proof', docType: 'Address Proof' },
      { key: 'bloodGroupRecorded', label: 'Blood Group', docType: 'Blood Group' },
      { key: 'form15Ready', label: 'Form 15', docType: 'Form 15' }
    ];

    const checklistStatus = requiredTypes.map(reqItem => {
      const match = documents.find(d => d.documentType === reqItem.docType);
      const isVerified = match && match.status === 'Verified';
      const isSubmitted = match && match.status === 'Submitted';
      const isRejected = match && match.status === 'Rejected';

      return {
        key: reqItem.key,
        label: reqItem.label,
        docType: reqItem.docType,
        verified: !!isVerified,
        status: isVerified ? 'Verified' : (isRejected ? 'Rejected' : (isSubmitted ? 'Submitted' : 'Pending')),
        document: match || null
      };
    });

    const verifiedCount = checklistStatus.filter(c => c.verified).length;
    const readinessPercentage = Math.round((verifiedCount / requiredTypes.length) * 100);

    res.json({
      student: {
        _id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        primaryMobile: student.primaryMobile,
        coursePackage: student.coursePackage,
        currentStatus: student.currentStatus
      },
      readinessPercentage,
      isFullyReady: verifiedCount === requiredTypes.length,
      verifiedCount,
      totalRequired: requiredTypes.length,
      checklist: checklistStatus,
      allDocuments: documents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download / view document file
// @route   GET /api/student-documents/:id/file
const serveDocumentFile = async (req, res, next) => {
  try {
    const doc = await StudentDocument.findById(req.params.id);
    if (!doc || !doc.fileUrl) {
      res.status(404);
      throw new Error('File not found for this document');
    }

    const filename = path.basename(doc.fileUrl);
    const fullPath = path.resolve(__dirname, '../uploads/documents', filename);

    if (!fs.existsSync(fullPath)) {
      res.status(404);
      throw new Error('Physical file not found on server');
    }

    res.sendFile(fullPath);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDocuments,
  getStudentDocumentById,
  createStudentDocument,
  verifyStudentDocument,
  rejectStudentDocument,
  updateStudentDocument,
  deleteStudentDocument,
  getStudentReadiness,
  serveDocumentFile
};
