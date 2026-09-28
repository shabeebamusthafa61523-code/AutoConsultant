const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');

// Helper to auto-generate atomic expense voucher numbers (EXP-0001, EXP-0002, ...)
const generateExpenseId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'expenseId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `EXP-${formattedSeq}`;
};

// @desc    Get dynamic expense summary statistics
// @route   GET /api/expenses/stats
const getExpenseStats = async (req, res, next) => {
  try {
    const { startDate, endDate, category } = req.query;
    const matchQuery = {};

    if (category) {
      matchQuery.category = category;
    }

    if (startDate || endDate) {
      matchQuery.expenseDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        matchQuery.expenseDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchQuery.expenseDate.$lte = e;
      }
    }

    // 1. Overall Aggregation
    const overallAgg = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalVouchers: { $sum: 1 }
        }
      }
    ]);

    const totalAmount = overallAgg[0]?.totalAmount || 0;
    const totalVouchers = overallAgg[0]?.totalVouchers || 0;

    // 2. Today's Expenses
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAgg = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: todayStart, $lte: todayEnd }
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

    const todaysAmount = todayAgg[0]?.todayTotal || 0;
    const todaysCount = todayAgg[0]?.todayCount || 0;

    // 3. Category Breakdown Aggregation
    const categoryAgg = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      totalAmount,
      totalVouchers,
      todaysAmount,
      todaysCount,
      byCategory: categoryAgg
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all expenses with filtering and pagination
// @route   GET /api/expenses
const getExpenses = async (req, res, next) => {
  try {
    const {
      search,
      category,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 15,
      sortBy = 'expenseDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { expenseId: regex },
        { reference: regex },
        { notes: regex },
        { category: regex }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.expenseDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = e;
      }
    }

    const sort = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = order;

    if (limit === 'all') {
      const expenses = await Expense.find(query)
        .populate('recordedBy', 'name role')
        .sort(sort);
      return res.json(expenses);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('recordedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.json({
      expenses,
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

// @desc    Get single expense by ID
// @route   GET /api/expenses/:id
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('recordedBy', 'name role');
    if (!expense) {
      res.status(404);
      throw new Error('Expense record not found');
    }
    res.json(expense);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new expense record
// @route   POST /api/expenses
const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, expenseDate, paymentMethod, reference, notes } = req.body;

    if (!title || !title.trim()) {
      res.status(400);
      throw new Error('Expense title is required');
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400);
      throw new Error('Expense amount must be a valid positive number');
    }

    let validExpenseDate = new Date();
    if (expenseDate) {
      const parsedD = new Date(expenseDate);
      if (!isNaN(parsedD.getTime())) {
        validExpenseDate = parsedD;
      }
    }

    const expenseId = await generateExpenseId();

    const expense = await Expense.create({
      expenseId,
      title: title.trim(),
      category: (category && category.trim()) || 'Office Expense',
      amount: parsedAmount,
      expenseDate: validExpenseDate,
      paymentMethod: (paymentMethod && paymentMethod.trim()) || 'Cash',
      reference: (reference && reference.trim()) || '',
      notes: (notes && notes.trim()) || '',
      recordedBy: req.user ? req.user._id : null
    });

    await AuditLog.logAction({
      user: req.user,
      action: 'CREATE_EXPENSE',
      entity: 'Expense',
      entityId: expense._id,
      details: {
        expenseId,
        title: expense.title,
        category: expense.category,
        amount: parsedAmount,
        paymentMethod: expense.paymentMethod
      },
      req
    });

    const populatedExpense = await Expense.findById(expense._id).populate('recordedBy', 'name role');
    res.status(201).json(populatedExpense);
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense record
// @route   PUT /api/expenses/:id
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      res.status(404);
      throw new Error('Expense record not found');
    }

    if (req.body.amount !== undefined) {
      const parsedAmount = Number(req.body.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400);
        throw new Error('Expense amount must be greater than zero');
      }
      req.body.amount = parsedAmount;
    }

    req.body.updatedBy = req.user ? req.user._id : null;

    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('recordedBy', 'name role');

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_EXPENSE',
      entity: 'Expense',
      entityId: req.params.id,
      details: {
        expenseId: updated.expenseId,
        title: updated.title,
        amount: updated.amount
      },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense record
// @route   DELETE /api/expenses/:id
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      res.status(404);
      throw new Error('Expense record not found');
    }

    await Expense.findByIdAndDelete(req.params.id);

    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_EXPENSE',
      entity: 'Expense',
      entityId: req.params.id,
      details: {
        expenseId: expense.expenseId,
        title: expense.title,
        amount: expense.amount
      },
      req
    });

    res.json({ message: 'Expense record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense
};
