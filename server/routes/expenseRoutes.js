const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');

router.use(protect);

router.get('/stats', getExpenseStats);
router.route('/').get(getExpenses).post(createExpense);
router.route('/:id')
  .get(getExpenseById)
  .put(updateExpense)
  .delete(authorize('Superadmin', 'Admin', 'Manager'), deleteExpense);

module.exports = router;
