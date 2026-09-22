const Student = require('../models/Student');
const Class = require('../models/Class');
const Payment = require('../models/Payment');
const generateStudentId = require('../utils/generateStudentId');

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
    const studentId = await generateStudentId();
    const studentData = {
      ...req.body,
      studentId
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
