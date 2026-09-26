const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');

// Helper to auto-generate atomic receipt numbers (REC-0001, REC-0002, ...)
const generateReceiptNo = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'receiptNo' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `REC-${formattedSeq}`;
};

// Helper function to recalculate student paid/advance amounts dynamically from payment records
// Strictly follows the business logic:
// Total Fee - Paid Amount - Advance Amount = Balance
const updateStudentPaymentTotals = async (studentId) => {
  if (!studentId) return;
  const studentPayments = await Payment.find({
    student: studentId,
    status: { $ne: 'Cancelled' }
  });

  let totalPaid = 0;
  let totalAdvance = 0;

  studentPayments.forEach((p) => {
    const amt = Number(p.amount) || 0;
    if (p.paymentType === 'Advance Payment') {
      totalAdvance += amt;
    } else {
      totalPaid += amt;
    }
  });

  await Student.findByIdAndUpdate(studentId, {
    paidAmount: totalPaid,
    advanceAmount: totalAdvance
  });
};

// @desc    Get dynamic payment summary statistics
// @route   GET /api/payments/stats
const getPaymentStats = async (req, res, next) => {
  try {
    const { startDate, endDate, student } = req.query;
    const matchQuery = { status: { $ne: 'Cancelled' } };

    if (student) {
      if (mongoose.Types.ObjectId.isValid(student)) {
        matchQuery.student = new mongoose.Types.ObjectId(student);
      } else {
        matchQuery.student = new mongoose.Types.ObjectId();
      }
    }
    if (startDate || endDate) {
      matchQuery.paymentDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        matchQuery.paymentDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchQuery.paymentDate.$lte = e;
      }
    }

    // 1. Overall Aggregation
    const overallAgg = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$amount' },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    const totalCollected = overallAgg[0]?.totalCollected || 0;
    const totalRecords = overallAgg[0]?.totalRecords || 0;

    // 2. Today's Collections
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAgg = await Payment.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          paymentDate: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          todayTotal: { $sum: '$amount' },
          todayCount: { $sum: 1 }
        }
      }
    ]);

    const todaysCollection = todayAgg[0]?.todayTotal || 0;
    const todaysCount = todayAgg[0]?.todayCount || 0;

    // 3. Outstanding / Pending across all students (or filtered student)
    const studentFilter = student && mongoose.Types.ObjectId.isValid(student) ? { _id: student } : {};
    const allStudents = await Student.find(studentFilter, 'totalFee paidAmount advanceAmount');
    let totalPending = 0;
    let studentsWithPendingCount = 0;

    allStudents.forEach((st) => {
      const total = Number(st.totalFee) || 0;
      const paid = Number(st.paidAmount) || 0;
      const advance = Number(st.advanceAmount) || 0;
      const bal = total - paid - advance;
      if (bal > 0) {
        totalPending += bal;
        studentsWithPendingCount++;
      }
    });

    // 4. Payment Method breakdown
    const methodAgg = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // 5. Payment Type breakdown
    const typeAgg = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      totalCollected,
      totalRecords,
      todaysCollection,
      todaysCount,
      totalPending,
      studentsWithPendingCount,
      methodBreakdown: methodAgg,
      typeBreakdown: typeAgg
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments with multi-field search, filters & server-side pagination
// @route   GET /api/payments
const getPayments = async (req, res, next) => {
  try {
    const {
      search,
      student,
      paymentMethod,
      paymentType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 15,
      all
    } = req.query;

    const query = {};

    // 1. Search filter: matches student name, student ID, mobile, applicationNo, or receiptNo / notes
    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');

      const matchedStudents = await Student.find({
        $or: [
          { fullName: regex },
          { primaryMobile: regex },
          { studentId: regex },
          { applicationNo: regex }
        ]
      }).select('_id');

      const studentIds = matchedStudents.map((st) => st._id);

      query.$or = [
        { student: { $in: studentIds } },
        { receiptNo: regex },
        { reference: regex },
        { notes: regex }
      ];
    }

    // 2. Exact Student filter
    if (student) {
      query.student = student;
    }

    // 3. Payment Method filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // 4. Payment Type filter
    if (paymentType) {
      query.paymentType = paymentType;
    }

    // 5. Status filter
    if (status) {
      query.status = status;
    }

    // 6. Date Range filter
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.paymentDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = e;
      }
    }

    // If client requested unpaginated array (e.g. all=true)
    if (all === 'true' || req.query.pagination === 'false') {
      const payments = await Payment.find(query)
        .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo totalFee paidAmount advanceAmount')
        .populate('recordedBy', 'name role')
        .sort({ paymentDate: -1, createdAt: -1 });

      return res.json(payments);
    }

    // Server-side pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 15);
    const skip = (pageNum - 1) * limitNum;

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo totalFee paidAmount advanceAmount')
      .populate('recordedBy', 'name role')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      payments,
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

// @desc    Get single payment by ID
// @route   GET /api/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo totalFee paidAmount advanceAmount address coursePackage')
      .populate('recordedBy', 'name role');

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
    const { student, amount, paymentDate, paymentType, paymentMethod, reference, notes } = req.body;

    // Validate Student
    if (!student) {
      res.status(400);
      throw new Error('Student is required to record a payment');
    }

    if (!mongoose.Types.ObjectId.isValid(student)) {
      res.status(400);
      throw new Error('Invalid student ID format');
    }

    const studentRecord = await Student.findById(student);
    if (!studentRecord) {
      res.status(404);
      throw new Error('Selected student does not exist in database');
    }

    // Validate Amount
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400);
      throw new Error('Payment amount must be a valid positive number');
    }

    // Validate Date
    let validPaymentDate = new Date();
    if (paymentDate) {
      const parsedD = new Date(paymentDate);
      if (!isNaN(parsedD.getTime())) {
        validPaymentDate = parsedD;
      }
    }

    // Auto-generate atomic receipt number if not provided
    const receiptNo = req.body.receiptNo ? req.body.receiptNo.trim().toUpperCase() : await generateReceiptNo();

    // Financial balance snapshot prior to payment
    const totalFee = Number(studentRecord.totalFee) || 0;
    const currentPaid = Number(studentRecord.paidAmount) || 0;
    const currentAdvance = Number(studentRecord.advanceAmount) || 0;
    const previousBalance = Math.max(0, totalFee - currentPaid - currentAdvance);
    const balanceAfter = Math.max(0, previousBalance - parsedAmount);

    const payment = await Payment.create({
      receiptNo,
      student,
      paymentDate: validPaymentDate,
      amount: parsedAmount,
      paymentType: (paymentType && paymentType.trim()) || 'Fee Payment',
      paymentMethod: (paymentMethod && paymentMethod.trim()) || 'Cash',
      reference: (reference && reference.trim()) || '',
      notes: (notes && notes.trim()) || '',
      previousBalance,
      balanceAfter,
      status: 'Completed',
      recordedBy: req.user ? req.user._id : null
    });

    // Recalculate student paid/advance totals atomically
    await updateStudentPaymentTotals(student);

    // Append to Student activity timeline atomically without full-document validation risk
    await Student.findByIdAndUpdate(student, {
      $push: {
        timeline: {
          action: 'Fee Payment Recorded',
          category: 'Payment',
          description: `Collected ₹${parsedAmount} via ${paymentMethod || 'Cash'} (${receiptNo}). Remaining balance: ₹${balanceAfter}`,
          timestamp: new Date(),
          performedBy: req.user ? req.user.name : 'Staff'
        }
      }
    });

    // Log to AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'CREATE_PAYMENT',
      entity: 'Payment',
      entityId: payment._id,
      details: {
        receiptNo,
        studentId: studentRecord.studentId,
        studentName: studentRecord.fullName,
        amount: parsedAmount,
        paymentMethod: paymentMethod || 'Cash',
        paymentType: paymentType || 'Fee Payment',
        balanceAfter
      },
      req
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo totalFee paidAmount advanceAmount')
      .populate('recordedBy', 'name role');

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
    const oldAmount = payment.amount;

    if (req.body.amount !== undefined) {
      const parsedAmount = Number(req.body.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400);
        throw new Error('Payment amount must be greater than zero');
      }
      req.body.amount = parsedAmount;
    }

    req.body.updatedBy = req.user ? req.user._id : null;

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('student', 'studentId fullName primaryMobile totalFee paidAmount advanceAmount')
      .populate('recordedBy', 'name role')
      .populate('updatedBy', 'name role');

    // Recalculate totals for both old and new student (if student changed)
    await updateStudentPaymentTotals(oldStudentId);
    if (updatedPayment.student && updatedPayment.student._id.toString() !== oldStudentId.toString()) {
      await updateStudentPaymentTotals(updatedPayment.student._id);
    }

    // Log to AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_PAYMENT',
      entity: 'Payment',
      entityId: req.params.id,
      details: {
        receiptNo: updatedPayment.receiptNo,
        oldAmount,
        newAmount: updatedPayment.amount,
        paymentMethod: updatedPayment.paymentMethod
      },
      req
    });

    res.json(updatedPayment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment record safely
// @route   DELETE /api/payments/:id
const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found');
    }

    const studentId = payment.student;
    const deletedDetails = {
      receiptNo: payment.receiptNo,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      studentId
    };

    await Payment.findByIdAndDelete(req.params.id);

    // Recalculate totals for student
    await updateStudentPaymentTotals(studentId);

    // Log to AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_PAYMENT',
      entity: 'Payment',
      entityId: req.params.id,
      details: deletedDetails,
      req
    });

    res.json({ success: true, message: 'Payment record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Export filtered payments into streaming CSV
// @route   GET /api/payments/export
const exportPaymentsCSV = async (req, res, next) => {
  try {
    const { search, student, paymentMethod, paymentType, startDate, endDate } = req.query;
    const query = { status: { $ne: 'Cancelled' } };

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      const matchedStudents = await Student.find({
        $or: [
          { fullName: regex },
          { primaryMobile: regex },
          { studentId: regex },
          { applicationNo: regex }
        ]
      }).select('_id');

      const studentIds = matchedStudents.map((st) => st._id);
      query.$or = [
        { student: { $in: studentIds } },
        { receiptNo: regex },
        { reference: regex },
        { notes: regex }
      ];
    }

    if (student) query.student = student;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentType) query.paymentType = paymentType;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = e;
      }
    }

    const payments = await Payment.find(query)
      .populate('student', 'studentId fullName primaryMobile applicationNo')
      .populate('recordedBy', 'name role')
      .sort({ paymentDate: -1, createdAt: -1 });

    const filename = `payments_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // CSV Header row
    const headers = [
      'Receipt No',
      'Payment Date',
      'Student Name',
      'Student ID',
      'Mobile',
      'Payment Type',
      'Amount (INR)',
      'Payment Method',
      'Reference / Txn ID',
      'Recorded By',
      'Notes'
    ];

    res.write(headers.join(',') + '\r\n');

    for (const p of payments) {
      const dateFormatted = p.paymentDate
        ? new Date(p.paymentDate).toISOString().split('T')[0]
        : '';
      const stuName = `"${(p.student?.fullName || 'N/A').replace(/"/g, '""')}"`;
      const stuId = `"${(p.student?.studentId || '').replace(/"/g, '""')}"`;
      const mobile = `"${(p.student?.primaryMobile || '').replace(/"/g, '""')}"`;
      const pType = `"${(p.paymentType || 'Fee Payment').replace(/"/g, '""')}"`;
      const method = `"${(p.paymentMethod || 'Cash').replace(/"/g, '""')}"`;
      const ref = `"${(p.reference || '').replace(/"/g, '""')}"`;
      const recordedBy = `"${(p.recordedBy?.name || 'Staff').replace(/"/g, '""')}"`;
      const notes = `"${(p.notes || '').replace(/"/g, '""')}"`;
      const receiptNo = `"${(p.receiptNo || p.paymentId || '').replace(/"/g, '""')}"`;

      const row = [
        receiptNo,
        dateFormatted,
        stuName,
        stuId,
        mobile,
        pType,
        p.amount || 0,
        method,
        ref,
        recordedBy,
        notes
      ];

      res.write(row.join(',') + '\r\n');
    }

    res.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  getPaymentStats,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  exportPaymentsCSV,
  updateStudentPaymentTotals
};
