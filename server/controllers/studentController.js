const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const StudentDocument = require('../models/StudentDocument');
const Counter = require('../models/Counter');
const generateStudentId = require('../utils/generateStudentId');

// Helper to sanitize Indian mobile numbers
const cleanPhone = (val) => {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits;
};

// Comprehensive server-side validation helper
const validateStudentInput = async (data, isUpdate = false, currentStudentId = null) => {
  const errors = [];

  // Required: Full Name
  if (!isUpdate || data.fullName !== undefined) {
    if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
      errors.push('Full name is required and must be at least 2 characters.');
    }
  }

  // Required: Primary Mobile
  if (!isUpdate || data.primaryMobile !== undefined) {
    if (!data.primaryMobile) {
      errors.push('Primary mobile number is required.');
    } else {
      const cleaned = cleanPhone(data.primaryMobile);
      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        errors.push('Primary mobile must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      } else if (!isUpdate) {
        // Check for duplicate mobile number for active students
        const existing = await Student.findOne({
          primaryMobile: cleaned,
          currentStatus: { $ne: 'Dropped' }
        });
        if (existing) {
          errors.push(`A student with mobile number ${cleaned} is already registered (${existing.studentId} - ${existing.fullName}).`);
        }
      }
    }
  }

  // Optional: Alternate Mobile
  if (data.alternateMobile && data.alternateMobile.trim() !== '') {
    const cleanedAlt = cleanPhone(data.alternateMobile);
    if (!/^[6-9]\d{9}$/.test(cleanedAlt)) {
      errors.push('Alternate mobile must be a valid 10-digit Indian mobile number.');
    }
  }

  // Fees validation
  const totalFee = data.totalFee !== undefined ? Number(data.totalFee) : (isUpdate ? undefined : 9000);
  const paidAmount = data.paidAmount !== undefined ? Number(data.paidAmount) : (isUpdate ? undefined : 0);
  const advanceAmount = data.advanceAmount !== undefined ? Number(data.advanceAmount) : (isUpdate ? undefined : 0);

  if (totalFee !== undefined && (isNaN(totalFee) || totalFee < 0)) {
    errors.push('Total Fee must be a non-negative number.');
  }
  if (paidAmount !== undefined && (isNaN(paidAmount) || paidAmount < 0)) {
    errors.push('Paid Amount must be a non-negative number.');
  }
  if (advanceAmount !== undefined && (isNaN(advanceAmount) || advanceAmount < 0)) {
    errors.push('Advance Amount must be a non-negative number.');
  }

  // Negative balance prevention for new creations
  if (!isUpdate && totalFee !== undefined && paidAmount !== undefined && advanceAmount !== undefined) {
    if ((paidAmount + advanceAmount) > totalFee) {
      errors.push(`Paid and Advance total (₹${paidAmount + advanceAmount}) cannot exceed Total Fee (₹${totalFee}). Balance cannot be negative.`);
    }
  }

  // Dates validation
  const dateFields = [
    { field: 'dob', label: 'Date of Birth' },
    { field: 'registrationDate', label: 'Registration Date' },
    { field: 'followUpDate', label: 'Follow-up Date' },
    { field: 'testDate', label: 'Test Date' }
  ];

  for (const { field, label } of dateFields) {
    if (data[field] && data[field] !== '') {
      const d = new Date(data[field]);
      if (isNaN(d.getTime())) {
        errors.push(`${label} is not a valid date.`);
      }
    }
  }

  // Batch validation
  if (data.batch && data.batch !== '') {
    const batchExists = await Batch.findById(data.batch);
    if (!batchExists) {
      errors.push('Selected batch does not exist.');
    }
  }

  return errors;
};

// @desc    Get all students with advanced search, filtering & pagination
// @route   GET /api/students
const getStudents = async (req, res, next) => {
  try {
    const {
      search,
      studentId,
      mobile,
      category,
      batch,
      status,
      licenceStatus,
      feeStatus,
      trainingStatus,
      course,
      gender,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit
    } = req.query;

    const query = {};

    // Global multi-field search across all 26 fields
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { studentId: { $regex: s, $options: 'i' } },
        { fullName: { $regex: s, $options: 'i' } },
        { primaryMobile: { $regex: s, $options: 'i' } },
        { alternateMobile: { $regex: s, $options: 'i' } },
        { sarathiAppNo: { $regex: s, $options: 'i' } },
        { applicationNo: { $regex: s, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } },
        { guardian: { $regex: s, $options: 'i' } },
        { vehicleType: { $regex: s, $options: 'i' } },
        { licenceServiceType: { $regex: s, $options: 'i' } },
        { notes: { $regex: s, $options: 'i' } },
        { verificationNotes: { $regex: s, $options: 'i' } },
        { 'address.place': { $regex: s, $options: 'i' } },
        { 'address.pincode': { $regex: s, $options: 'i' } },
        { aliasSourceName: { $regex: s, $options: 'i' } }
      ];
    }

    if (studentId) {
      query.studentId = { $regex: studentId.trim(), $options: 'i' };
    }

    if (mobile) {
      query.primaryMobile = { $regex: mobile.trim(), $options: 'i' };
    }

    if (category) {
      query.category = { $regex: category.trim(), $options: 'i' };
    }

    if (batch) {
      if (batch === 'unassigned') {
        query.batch = { $in: [null, undefined] };
      } else {
        query.batch = batch;
      }
    }

    if (status) {
      query.currentStatus = status;
    }

    if (licenceStatus) {
      query['learnerLicence.status'] = licenceStatus;
    }

    if (trainingStatus) {
      query['trainingProgress.status'] = trainingStatus;
    }

    if (course) {
      query.coursePackage = { $regex: course, $options: 'i' };
    }

    if (gender) {
      query.gender = gender;
    }

    if (startDate || endDate) {
      query.registrationDate = {};
      if (startDate) query.registrationDate.$gte = new Date(startDate);
      if (endDate) query.registrationDate.$lte = new Date(endDate);
    }

    // Sorting
    const sort = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name' || sortBy === 'fullName') {
      sort.fullName = order;
    } else if (sortBy === 'studentId') {
      sort.studentId = order;
    } else if (sortBy === 'registrationDate') {
      sort.registrationDate = order;
    } else {
      sort[sortBy] = order;
    }

    // Support 'limit=all' for dropdowns or unpaginated callers
    if (limit === 'all') {
      const allStudents = await Student.find(query)
        .populate('batch', 'name courseLicenceType session startTime endTime instructor')
        .sort(sort);

      // If client also filtered by virtual feeStatus
      let filtered = allStudents;
      if (feeStatus) {
        filtered = filtered.filter(s => s.feeStatus === feeStatus);
      }
      return res.json(filtered);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('batch', 'name courseLicenceType session startTime endTime instructor')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // If client requested paginated object:
    res.json({
      students,
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

// @desc    Get single student by ID
// @route   GET /api/students/:id
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('batch')
      .populate('batchHistory.batch', 'name session instructor startTime endTime')
      .populate('enquiry');

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    res.json(student);
  } catch (error) {
    next(error);
  }
};

// @desc    Get full student operational profile with all tabbed history
// @route   GET /api/students/:id/details
const getStudentDetails = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('batch')
      .populate('batchHistory.batch', 'name session instructor startTime endTime')
      .populate('enquiry');

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const [classes, payments, attendances, documents] = await Promise.all([
      Class.find({ student: student._id }).sort({ classDate: -1 }),
      Payment.find({ student: student._id }).sort({ paymentDate: -1 }),
      Attendance.find({ student: student._id }).sort({ date: -1 }),
      StudentDocument.find({ student: student._id }).populate('verifiedBy', 'name role').sort({ createdAt: -1 })
    ]);

    // Financial calculations
    const totalPaymentsReceived = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const balance = (student.totalFee || 0) - (student.paidAmount || 0) - (student.advanceAmount || 0);

    // Attendance stats
    const totalAttendanceSessions = attendances.length;
    const presentSessions = attendances.filter(a => a.status === 'Present').length;
    const attendancePercentage = totalAttendanceSessions > 0
      ? Math.round((presentSessions / totalAttendanceSessions) * 100)
      : 0;

    // Training aggregations from Class log
    let roadCount = 0;
    let hTrackCount = 0;
    let bikeCount = 0;
    let totalKm = 0;
    let totalHours = 0;

    classes.forEach(c => {
      totalKm += (c.km || 0);
      totalHours += (c.hours || 0);
      const t = (c.trainingType || '').toLowerCase();
      if (t.includes('road')) roadCount++;
      if (t.includes('h') || t.includes('track') || t.includes('reverse')) hTrackCount++;
      if (t.includes('bike') || t.includes('2 wheeler')) bikeCount++;
    });

    res.json({
      student,
      classes,
      payments,
      attendance: attendances,
      stats: {
        attendance: {
          total: totalAttendanceSessions,
          present: presentSessions,
          percentage: attendancePercentage
        },
        training: {
          totalClasses: classes.length,
          roadCount: roadCount || student.trainingProgress?.roadClassesCount || 0,
          hTrackCount: hTrackCount || student.trainingProgress?.hTrackClassesCount || 0,
          bikeCount: bikeCount || student.trainingProgress?.bikeClassesCount || 0,
          totalKm: totalKm || student.trainingProgress?.totalKm || 0,
          totalHours: totalHours || student.trainingProgress?.totalHours || 0,
          roadEquivalent: Math.round(((totalKm || student.trainingProgress?.totalKm || 0) / 5) * 10) / 10,
          hEquivalent: Math.round(((totalHours || student.trainingProgress?.totalHours || 0) / 3) * 10) / 10,
          equivalentClasses: student.trainingProgress?.equivalentClasses !== undefined
            ? student.trainingProgress.equivalentClasses
            : Math.round(((totalKm / 5) + (totalHours / 3) + bikeCount) * 10) / 10,
          requiredClasses: student.trainingProgress?.requiredClasses || 20,
          pendingClasses: student.trainingProgress?.pendingClasses !== undefined
            ? student.trainingProgress.pendingClasses
            : Math.max(0, Math.round(((student.trainingProgress?.requiredClasses || 20) - ((totalKm / 5) + (totalHours / 3) + bikeCount)) * 10) / 10),
          completionPercentage: student.trainingProgress?.completionPercentage !== undefined
            ? student.trainingProgress.completionPercentage
            : Math.min(100, Math.round((((totalKm / 5) + (totalHours / 3) + bikeCount) / (student.trainingProgress?.requiredClasses || 20)) * 100)),
          status: student.trainingProgress?.status || (classes.length > 0 ? 'In Progress' : 'Not Started')
        }
      },
      feeSummary: {
        totalFee: student.totalFee || 0,
        paidAmount: student.paidAmount || 0,
        advanceAmount: student.advanceAmount || 0,
        paymentsLoggedSum: totalPaymentsReceived,
        balance,
        feeStatus: student.feeStatus
      },
      documents: documents || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new student with atomic ID & timeline log
// @route   POST /api/students
const createStudent = async (req, res, next) => {
  try {
    const errors = await validateStudentInput(req.body, false);
    if (errors.length > 0) {
      res.status(400);
      throw new Error(errors.join(' '));
    }

    let studentId;
    if (req.body.studentId && typeof req.body.studentId === 'string' && req.body.studentId.trim()) {
      const existingId = await Student.findOne({ studentId: req.body.studentId.trim() });
      if (!existingId) {
        studentId = req.body.studentId.trim();
      } else {
        studentId = await generateStudentId();
      }
    } else {
      studentId = await generateStudentId();
    }

    const cleanPrimaryMobile = cleanPhone(req.body.primaryMobile);
    const cleanAlternateMobile = req.body.alternateMobile ? cleanPhone(req.body.alternateMobile) : undefined;

    const totalFeeNum = req.body.totalFee !== undefined ? Number(req.body.totalFee) : 9000;
    const paidAmountNum = req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : 0;
    const advanceAmountNum = req.body.advanceAmount !== undefined ? Number(req.body.advanceAmount) : 0;

    // Initial batch assignment record if batch provided
    const initialBatchHistory = [];
    if (req.body.batch) {
      const assignedBatch = await Batch.findById(req.body.batch);
      if (assignedBatch) {
        initialBatchHistory.push({
          batch: assignedBatch._id,
          batchName: assignedBatch.name,
          assignedDate: new Date(),
          reason: 'Initial Batch Enrolment'
        });
      }
    }

    // Initial timeline event
    const initialTimeline = [
      {
        action: 'Student Registration',
        category: 'Registration',
        description: `Student registered in CRM with ID ${studentId} for ${req.body.coursePackage || 'LMV'}`,
        timestamp: new Date(),
        performedBy: req.user ? req.user.name : 'System'
      }
    ];

    if (req.body.batch) {
      initialTimeline.push({
        action: 'Batch Enrolment',
        category: 'Batch',
        description: `Initial assignment to batch upon registration`,
        timestamp: new Date(),
        performedBy: req.user ? req.user.name : 'System'
      });
    }

    if (advanceAmountNum > 0 || paidAmountNum > 0) {
      initialTimeline.push({
        action: 'Fee Payment Recorded',
        category: 'Payment',
        description: `Initial deposit: Paid ₹${paidAmountNum}, Advance ₹${advanceAmountNum}`,
        timestamp: new Date(),
        performedBy: req.user ? req.user.name : 'System'
      });
    }

    const sarathiAppNo = req.body.sarathiAppNo || req.body.applicationNo || '';

    const studentData = {
      ...req.body,
      studentId,
      fullName: req.body.fullName.trim(),
      category: req.body.category || 'A – New Application',
      guardian: req.body.guardian ? req.body.guardian.trim() : '',
      aliasSourceName: req.body.aliasSourceName ? req.body.aliasSourceName.trim() : '',
      primaryMobile: cleanPrimaryMobile,
      alternateMobile: cleanAlternateMobile,
      sarathiAppNo,
      applicationNo: sarathiAppNo,
      totalFee: totalFeeNum,
      paidAmount: paidAmountNum,
      advanceAmount: advanceAmountNum,
      batch: req.body.batch || undefined,
      batchHistory: initialBatchHistory,
      dob: req.body.dob || undefined,
      llTestDate: req.body.llTestDate || undefined,
      finalTestDate: req.body.finalTestDate || undefined,
      testDate: req.body.finalTestDate || req.body.testDate || undefined,
      registrationDate: req.body.registrationDate || new Date(),
      followUpDate: req.body.followUpDate || undefined,
      verificationNotes: req.body.verificationNotes ? req.body.verificationNotes.trim() : '',
      application: req.body.application ? req.body.application.trim() : '',
      timeline: initialTimeline
    };

    const student = await Student.create(studentData);
    const populatedStudent = await Student.findById(student._id).populate('batch');

    res.status(201).json(populatedStudent);
  } catch (error) {
    next(error);
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Never allow client to mutate studentId
    delete req.body.studentId;

    const errors = await validateStudentInput(req.body, true, student._id);
    if (errors.length > 0) {
      res.status(400);
      throw new Error(errors.join(' '));
    }

    // Clean phone numbers
    if (req.body.primaryMobile) {
      req.body.primaryMobile = cleanPhone(req.body.primaryMobile);
    }
    if (req.body.alternateMobile) {
      req.body.alternateMobile = cleanPhone(req.body.alternateMobile);
    }

    // Handle batch changes made through edit form
    if (req.body.batch !== undefined && String(req.body.batch) !== String(student.batch || '')) {
      const oldBatchId = student.batch;
      const newBatchId = req.body.batch || null;

      if (oldBatchId) {
        const oldBatch = await Batch.findById(oldBatchId);
        student.batchHistory.push({
          batch: oldBatchId,
          batchName: oldBatch ? oldBatch.name : 'Previous Batch',
          assignedDate: student.updatedAt || student.createdAt,
          transferredDate: new Date(),
          reason: 'Updated via Student Edit Form',
          transferredBy: req.user ? req.user._id : undefined
        });
      }

      student.timeline.push({
        action: 'Batch Changed',
        category: 'Batch',
        description: `Batch updated in student profile`,
        timestamp: new Date(),
        performedBy: req.user ? req.user.name : 'System'
      });
    }

    // Clean empty values
    if (req.body.batch === '') req.body.batch = null;
    if (req.body.dob === '') req.body.dob = null;
    if (req.body.followUpDate === '') req.body.followUpDate = null;
    if (req.body.testDate === '') req.body.testDate = null;
    if (req.body.application !== undefined) req.body.application = req.body.application.trim();

    // Validate balance with updated fees
    const targetTotalFee = req.body.totalFee !== undefined ? Number(req.body.totalFee) : student.totalFee;
    const targetPaid = req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : student.paidAmount;
    const targetAdvance = req.body.advanceAmount !== undefined ? Number(req.body.advanceAmount) : student.advanceAmount;

    if ((targetPaid + targetAdvance) > targetTotalFee) {
      res.status(400);
      throw new Error(`Paid and Advance total (₹${targetPaid + targetAdvance}) cannot exceed Total Fee (₹${targetTotalFee}). Balance cannot be negative.`);
    }

    // Timeline event for status change if altered
    if (req.body.currentStatus && req.body.currentStatus !== student.currentStatus) {
      student.timeline.push({
        action: 'Status Updated',
        category: 'Status',
        description: `Status changed from ${student.currentStatus} to ${req.body.currentStatus}`,
        timestamp: new Date(),
        performedBy: req.user ? req.user.name : 'System'
      });
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        batchHistory: student.batchHistory,
        timeline: student.timeline
      },
      { new: true, runValidators: true }
    ).populate('batch');

    res.json(updatedStudent);
  } catch (error) {
    next(error);
  }
};

// @desc    Update student status
// @route   PATCH /api/students/:id/status
const updateStudentStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const oldStatus = student.currentStatus;
    student.currentStatus = status;

    student.timeline.push({
      action: 'Status Changed',
      category: 'Status',
      description: `Status changed from ${oldStatus} to ${status}${remarks ? ` (${remarks})` : ''}`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();
    res.json(student);
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer student between batches with full audit history
// @route   POST /api/students/:id/batch-transfer
const transferStudentBatch = async (req, res, next) => {
  try {
    const { newBatchId, reason } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    let targetBatch = null;
    if (newBatchId) {
      targetBatch = await Batch.findById(newBatchId);
      if (!targetBatch) {
        res.status(400);
        throw new Error('Target batch does not exist.');
      }
    }

    const oldBatchId = student.batch;
    let oldBatchName = 'Unassigned';
    if (oldBatchId) {
      const oldBatch = await Batch.findById(oldBatchId);
      if (oldBatch) oldBatchName = oldBatch.name;
    }

    // Preserve previous batch in history
    if (oldBatchId) {
      student.batchHistory.push({
        batch: oldBatchId,
        batchName: oldBatchName,
        assignedDate: student.updatedAt || student.createdAt,
        transferredDate: new Date(),
        reason: reason || 'Batch transfer requested',
        transferredBy: req.user ? req.user._id : undefined
      });
    }

    student.batch = newBatchId || null;

    student.timeline.push({
      action: 'Batch Transfer',
      category: 'Batch',
      description: `Transferred from [${oldBatchName}] to [${targetBatch ? targetBatch.name : 'Unassigned'}]. Reason: ${reason || 'Operational adjustment'}`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();

    const populatedStudent = await Student.findById(student._id)
      .populate('batch')
      .populate('batchHistory.batch');

    res.json({
      message: 'Student transferred successfully with history preserved.',
      student: populatedStudent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add document record to student
// @route   POST /api/students/:id/documents
const addStudentDocument = async (req, res, next) => {
  try {
    const { docType, fileName, fileUrl, verificationStatus = 'Pending', remarks = '' } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    if (!docType) {
      res.status(400);
      throw new Error('Document Type is required.');
    }

    student.documents.push({
      docType,
      fileName: fileName || `${docType}.pdf`,
      fileUrl: fileUrl || '',
      uploadedDate: new Date(),
      verificationStatus,
      remarks
    });

    student.timeline.push({
      action: 'Document Uploaded',
      category: 'Licence',
      description: `Uploaded document: ${docType} (${verificationStatus})`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();
    res.status(201).json(student.documents);
  } catch (error) {
    next(error);
  }
};

// @desc    Update document verification status
// @route   PATCH /api/students/:id/documents/:docId
const updateDocumentStatus = async (req, res, next) => {
  try {
    const { verificationStatus, remarks } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const doc = student.documents.id(req.params.docId);
    if (!doc) {
      res.status(404);
      throw new Error('Document record not found');
    }

    if (verificationStatus) doc.verificationStatus = verificationStatus;
    if (remarks !== undefined) doc.remarks = remarks;

    student.timeline.push({
      action: 'Document Verified',
      category: 'Licence',
      description: `Document "${doc.docType}" marked as ${verificationStatus}`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();
    res.json(doc);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student (Superadmin only)
// @route   DELETE /api/students/:id
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Clean up linked classes, payments, attendance
    await Promise.all([
      Class.deleteMany({ student: student._id }),
      Payment.deleteMany({ student: student._id }),
      Attendance.deleteMany({ student: student._id })
    ]);

    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: 'Student and related records deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import Students from JSON array (Excel/CSV parsed)
// @route   POST /api/students/bulk-import
const bulkImportStudents = async (req, res, next) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of student records to import.');
    }

    // Pre-fetch all batches for fast name matching
    const allBatches = await Batch.find().select('_id name');
    const batchMap = new Map();
    allBatches.forEach((b) => {
      if (b.name) {
        batchMap.set(b.name.toLowerCase().trim(), b._id);
      }
    });

    const createdStudents = [];
    const skippedRecords = [];
    const warningRecords = [];

    for (let i = 0; i < students.length; i++) {
      const item = students[i];
      const fullName = item.fullName || item.name || item['Full Name'] || item['Student Name'] || item['Name'];

      if (!fullName) {
        skippedRecords.push({ row: i + 1, reason: 'Missing Candidate Name' });
        continue;
      }

      let rawMobile = item.primaryMobile || item.mobile || item['Mobile'] || item['Primary Mobile'] || item['Phone'] || item.alternateMobile || item['Alt Mobile'];
      let cleanedMobile = cleanPhone(rawMobile);

      if (!cleanedMobile || !/^[6-9]\d{9}$/.test(cleanedMobile)) {
        const seedStr = String(i + 1).padStart(5, '0');
        cleanedMobile = `90000${seedStr}`;
      }

      let duplicateMobileWarning = null;

      // Check if student with this mobile already exists
      const existing = await Student.findOne({
        primaryMobile: cleanedMobile,
        currentStatus: { $ne: 'Dropped' }
      });
      if (existing) {
        if (cleanedMobile.startsWith('90000')) {
          const randSuffix = String(Math.floor(10000 + Math.random() * 90000));
          cleanedMobile = `90000${randSuffix}`;
        } else {
          duplicateMobileWarning = `Mobile already registered under ${existing.studentId}`;
          warningRecords.push({
            row: i + 1,
            name: fullName,
            mobile: cleanedMobile,
            reason: `Mobile already registered under ${existing.studentId}`
          });
        }
      }

      // Match batch if provided
      let batchId = null;
      const rawBatch = item.batchName || item.batch || item['Batch'] || item['Batch Name'];
      if (rawBatch && typeof rawBatch === 'string') {
        const matchedId = batchMap.get(rawBatch.toLowerCase().trim());
        if (matchedId) batchId = matchedId;
      }

      // Fees parsing
      const totalFee = Number(item.totalFee || item['Total Fee'] || item['Course Fee'] || 9000);
      const paidAmount = Number(item.paidAmount || item['Paid Amount'] || item['Paid'] || 0);
      const advanceAmount = Number(item.advanceAmount || item['Advance Amount'] || item['Advance'] || 0);

      // Student ID: use provided Student ID if valid & non-duplicate, else generate atomic STU ID
      const customId = item.studentId || item['Student ID'] || item['ID'];
      let studentId;
      if (customId && typeof customId === 'string' && customId.trim()) {
        const existingId = await Student.findOne({ studentId: customId.trim() });
        if (!existingId) {
          studentId = customId.trim();
        } else {
          studentId = await generateStudentId();
        }
      } else {
        studentId = await generateStudentId();
      }

      // All 26 Excel fields mapping
      const category = item.category || item['Category'] || '';
      const gender = ['Male', 'Female', 'Other'].includes(item.gender || item['Gender']) ? (item.gender || item['Gender']) : 'Male';
      const vehicleType = item.vehicleType || item['Vehicle / COV'] || item['Vehicle/COV'] || item['Vehicle Type'] || '4 Wheeler';
      const licenceServiceType = item.licenceServiceType || item.service || item['Service'] || item['Service Type'] || 'New Driving Licence';
      const coursePackage = item.coursePackage || item['Course Package'] || item['Course'] || `${licenceServiceType} (${vehicleType})`;
      const sarathiAppNo = item.sarathiAppNo || item['Sarathi App No'] || item['Sarathi App No.'] || item['Application No'] || item['applicationNo'] || '';
      const currentStatus = item.currentStatus || item['Status'] || 'Active';
      const nextAction = item.nextAction || item['Next Action'] || '';

      // Robust Excel Date Parser Helper
      const parseServerExcelDate = (val) => {
        if (val === undefined || val === null || val === '') return null;
        if (val instanceof Date) {
          if (isNaN(val.getTime())) return null;
          const y = val.getFullYear();
          return (y >= 1900 && y <= 2100) ? val : null;
        }

        const str = String(val).trim();
        if (!str) return null;

        // Handle Excel Serial Numbers (e.g. 39308, 38000, 42000, 46000)
        const num = Number(str);
        if (!isNaN(num) && num > 1000 && num < 100000) {
          const utc_days = Math.floor(num - 25569);
          const utc_value = utc_days * 86400;
          const d = new Date(utc_value * 1000);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            if (y >= 1900 && y <= 2100) return d;
          }
          return null;
        }

        // Handle DD/MM/YYYY or DD-MM-YYYY (Indian format)
        const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (dmyMatch) {
          let day = parseInt(dmyMatch[1], 10);
          let month = parseInt(dmyMatch[2], 10) - 1;
          let year = parseInt(dmyMatch[3], 10);
          if (year < 100) year += year < 50 ? 2000 : 1900;
          if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const d = new Date(year, month, day);
            return isNaN(d.getTime()) ? null : d;
          }
        }

        // Handle YYYY-MM-DD or YYYY/MM/DD
        const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (ymdMatch) {
          let year = parseInt(ymdMatch[1], 10);
          let month = parseInt(ymdMatch[2], 10) - 1;
          let day = parseInt(ymdMatch[3], 10);
          if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const d = new Date(year, month, day);
            return isNaN(d.getTime()) ? null : d;
          }
        }

        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          if (y >= 1900 && y <= 2100) return d;
        }

        return null;
      };

      // All Dates parsing (Next Action Date, LL Test Date, Final Test Date, DOB)
      const rawNextDate = item.nextActionDate || item['Next Action Date'] || item['followUpDate'];
      const followUpDate = parseServerExcelDate(rawNextDate);

      const rawLlDate = item.llTestDate || item['LL Test Date'];
      const llTestDate = parseServerExcelDate(rawLlDate);

      const rawFinalDate = item.finalTestDate || item['Final Test Date'] || item['Test Date'];
      const finalTestDate = parseServerExcelDate(rawFinalDate);

      const rawDob = item.dob || item['DOB'] || item['Date of Birth'];
      const dob = parseServerExcelDate(rawDob);

      const bloodGroup = item.bloodGroup || item['Blood'] || item['Blood Group'] || '';
      const guardian = item.guardian || item['Guardian'] || '';
      const altMobile = item.alternateMobile || item['Alt Mobile'] || item['Alternate Mobile'] ? cleanPhone(item.alternateMobile || item['Alt Mobile'] || item['Alternate Mobile']) : '';
      const rawAddress = item.address || item['Address'] || '';
      const pincode = item.pincode || item['Pincode'] || '';
      const verificationNotes = item.verificationNotes || item['Verification'] || item['Verification Notes'] || '';
      const aliasSourceName = item.aliasSourceName || item['Source'] || item['Alias Source Name'] || 'Bulk Intake Import';
      const notes = item.notes || item['Notes'] || item['Remarks'] || 'Imported via Bulk Intake';

      const newStudent = await Student.create({
        studentId,
        fullName: String(fullName).trim(),
        category,
        gender,
        primaryMobile: cleanedMobile,
        alternateMobile: altMobile,
        dob,
        bloodGroup,
        guardian,
        emergencyContact: guardian ? { name: guardian, relation: 'Guardian', phone: '' } : undefined,
        address: {
          houseName: '',
          place: rawAddress,
          postOffice: '',
          district: 'Malappuram',
          pincode
        },
        aliasSourceName,
        coursePackage,
        vehicleType,
        licenceServiceType,
        licenceCategory: item.licenceCategory || 'LMV',
        sarathiAppNo,
        applicationNo: sarathiAppNo,
        batch: batchId,
        llTestDate,
        finalTestDate,
        testDate: finalTestDate,
        currentStatus,
        nextAction,
        followUpDate,
        totalFee: isNaN(totalFee) ? 9000 : totalFee,
        paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
        advanceAmount: isNaN(advanceAmount) ? 0 : advanceAmount,
        verificationNotes,
        notes,
        trainingProgress: {
          status: 'Not Started',
          requiredClasses: 20,
          pendingClasses: 20,
          equivalentClasses: 0,
          completionPercentage: 0
        },
        timeline: [
          {
            action: 'Bulk Intake Registration',
            category: 'Registration',
            description: `Candidate registered via Bulk Intake import (${studentId}). Category: ${category || 'N/A'}. Total Fee: ₹${totalFee}`,
            timestamp: new Date(),
            performedBy: req.user ? req.user.name : 'System'
          }
        ]
      });

      // If initial payment was included in import, create Payment record
      if (paidAmount > 0) {
        const counter = await Counter.findByIdAndUpdate(
          { _id: 'receiptNo' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const receiptNo = `REC-${String(counter.seq).padStart(4, '0')}`;

        await Payment.create({
          receiptNo,
          student: newStudent._id,
          amount: paidAmount,
          paymentType: 'Fee Payment',
          paymentMethod: 'Cash',
          previousBalance: totalFee,
          balanceAfter: Math.max(0, totalFee - paidAmount - advanceAmount),
          status: 'Completed',
          notes: 'Initial Payment from Bulk Import',
          recordedBy: req.user ? req.user._id : null
        });
      }

      createdStudents.push(newStudent);
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdStudents.length} candidate(s)${warningRecords.length > 0 ? ` (${warningRecords.length} duplicate mobile warning(s))` : ''}.`,
      importedCount: createdStudents.length,
      skippedCount: skippedRecords.length,
      warningCount: warningRecords.length,
      skippedRecords,
      warningRecords,
      students: createdStudents
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentById,
  getStudentDetails,
  createStudent,
  updateStudent,
  updateStudentStatus,
  transferStudentBatch,
  addStudentDocument,
  updateDocumentStatus,
  deleteStudent,
  bulkImportStudents
};
