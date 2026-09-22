const Payment = require('../models/Payment');
const Student = require('../models/Student');

// Helper function to recalculate student paid/advance amounts dynamically from payment records
const updateStudentPaymentTotals = async (studentId) => {
  const studentPayments = await Payment.find({ student: studentId });

  let totalPaid = 0;
  let totalAdvance = 0;

  studentPayments.forEach(p => {
    if (p.paymentType === 'Advance Payment') {
      totalAdvance += (p.amount || 0);
    } else {
      totalPaid += (p.amount || 0);
    }
  });

  await Student.findByIdAndUpdate(studentId, {
    paidAmount: totalPaid,
    advanceAmount: totalAdvance
  });
};

// @desc    Get all payments
// @route   GET /api/payments
const getPayments = async (req, res, next) => {
  try {
    const { student } = req.query;
    let query = {};

    if (student) {
      query.student = student;
    }

    const payments = await Payment.find(query)
      .populate('student', 'studentId fullName primaryMobile totalFee paidAmount advanceAmount')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('student');

    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found');
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new payment record
// @route   POST /api/payments
const createPayment = async (req, res, next) => {
  try {
    const { student, amount } = req.body;

    const studentRecord = await Student.findById(student);
    if (!studentRecord) {
      res.status(404);
      throw new Error('Selected student does not exist');
    }

    const payment = await Payment.create(req.body);

    // Recalculate student paid/advance totals
    await updateStudentPaymentTotals(student);

    const populatedPayment = await Payment.findById(payment._id).populate('student', 'studentId fullName primaryMobile totalFee paidAmount advanceAmount');

    res.status(201).json(populatedPayment);
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
const updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found');
    }

    const oldStudentId = payment.student;

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('student', 'studentId fullName primaryMobile totalFee paidAmount advanceAmount');

    // Recalculate totals for both old and new student (if student changed)
    await updateStudentPaymentTotals(oldStudentId);
    if (updatedPayment.student._id.toString() !== oldStudentId.toString()) {
      await updateStudentPaymentTotals(updatedPayment.student._id);
    }

    res.json(updatedPayment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found');
    }

    const studentId = payment.student;

    await Payment.findByIdAndDelete(req.params.id);

    // Recalculate totals
    await updateStudentPaymentTotals(studentId);

    res.json({ message: 'Payment record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
};
