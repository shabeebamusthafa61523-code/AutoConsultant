const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Payment = require('../models/Payment');
const generateStudentId = require('../utils/generateStudentId');

// Helper to sanitize Indian mobile numbers
const cleanPhone = (val) => {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  // If starts with 0 and has 11 digits, strip leading trunk 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // If starts with 91 and has 12 digits, strip country code 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits;
};

// Comprehensive server-side validation helper
const validateStudentInput = async (data, isUpdate = false) => {
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

  if (totalFee !== undefined) {
    if (isNaN(totalFee) || totalFee < 0) {
      errors.push('Total Fee must be a valid non-negative number.');
    }
  }
  if (paidAmount !== undefined) {
    if (isNaN(paidAmount) || paidAmount < 0) {
      errors.push('Paid / Working Amount must be a non-negative number.');
    }
  }
  if (advanceAmount !== undefined) {
    if (isNaN(advanceAmount) || advanceAmount < 0) {
      errors.push('Advance Amount must be a non-negative number.');
    }
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

// @desc    Get all students (with search & filter)
// @route   GET /api/students
const getStudents = async (req, res, next) => {
  try {
    const { search, batch, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { studentId: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { primaryMobile: { $regex: search, $options: 'i' } },
        { applicationNo: { $regex: search, $options: 'i' } }
      ];
    }

    if (batch) {
      query.batch = batch;
    }

    if (status) {
      query.currentStatus = status;
    }

    const students = await Student.find(query)
      .populate('batch', 'name courseLicenceType')
      .sort({ createdAt: -1 });

    res.json(students);
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

// @desc    Get full student details with Class History and Payment History
// @route   GET /api/students/:id/details
const getStudentDetails = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('batch')
      .populate('enquiry');

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const classes = await Class.find({ student: student._id }).sort({ classDate: -1 });
    const payments = await Payment.find({ student: student._id }).sort({ paymentDate: -1 });

    // Dynamic fee check
    const totalPaymentsReceived = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    res.json({
      student,
      classes,
      payments,
      feeSummary: {
        totalFee: student.totalFee || 0,
        paidAmount: student.paidAmount || 0,
        advanceAmount: student.advanceAmount || 0,
        paymentsLoggedSum: totalPaymentsReceived,
        balance: (student.totalFee || 0) - (student.paidAmount || 0) - (student.advanceAmount || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new student
// @route   POST /api/students
const createStudent = async (req, res, next) => {
  try {
    const errors = await validateStudentInput(req.body, false);
    if (errors.length > 0) {
      res.status(400);
      throw new Error(errors.join(' '));
    }

    const studentId = await generateStudentId();

    const cleanPrimaryMobile = cleanPhone(req.body.primaryMobile);
    const cleanAlternateMobile = req.body.alternateMobile ? cleanPhone(req.body.alternateMobile) : undefined;

    const totalFeeNum = req.body.totalFee !== undefined ? Number(req.body.totalFee) : 9000;
    const paidAmountNum = req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : 0;
    const advanceAmountNum = req.body.advanceAmount !== undefined ? Number(req.body.advanceAmount) : 0;

    const studentData = {
      ...req.body,
      studentId, // Strictly server-generated atomic ID
      fullName: req.body.fullName.trim(),
      aliasSourceName: req.body.aliasSourceName ? req.body.aliasSourceName.trim() : '',
      primaryMobile: cleanPrimaryMobile,
      alternateMobile: cleanAlternateMobile,
      totalFee: totalFeeNum,
      paidAmount: paidAmountNum,
      advanceAmount: advanceAmountNum,
      batch: req.body.batch || undefined,
      dob: req.body.dob || undefined,
      registrationDate: req.body.registrationDate || new Date(),
      followUpDate: req.body.followUpDate || undefined,
      testDate: req.body.testDate || undefined,
      application: req.body.application ? req.body.application.trim() : ''
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

    const errors = await validateStudentInput(req.body, true);
    if (errors.length > 0) {
      res.status(400);
      throw new Error(errors.join(' '));
    }

    // Protect recorded payment totals if transactions exist in Payment collection
    const paymentCount = await Payment.countDocuments({ student: student._id });
    if (paymentCount > 0) {
      const studentPayments = await Payment.find({ student: student._id });
      let loggedPaid = 0;
      let loggedAdvance = 0;
      studentPayments.forEach(p => {
        if (p.paymentType === 'Advance Payment') loggedAdvance += (p.amount || 0);
        else loggedPaid += (p.amount || 0);
      });
      req.body.paidAmount = loggedPaid;
      req.body.advanceAmount = loggedAdvance;
    }

    // Clean phone numbers if provided
    if (req.body.primaryMobile) {
      req.body.primaryMobile = cleanPhone(req.body.primaryMobile);
    }
    if (req.body.alternateMobile) {
      req.body.alternateMobile = cleanPhone(req.body.alternateMobile);
    }

    // Clean empty values to null/empty
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

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('batch');

    res.json(updatedStudent);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Clean up linked classes and payments
    await Class.deleteMany({ student: student._id });
    await Payment.deleteMany({ student: student._id });
    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: 'Student and related records deleted successfully' });
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
  deleteStudent
};
