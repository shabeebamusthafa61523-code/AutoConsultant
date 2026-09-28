const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPaymentStats,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  exportPaymentsCSV
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All payment routes require valid authentication
router.use(protect);

// Dynamic statistics for summary cards
router.get('/stats', getPaymentStats);

// Filtered CSV export for ledger
router.get('/export', exportPaymentsCSV);

// Main collection endpoints
router.route('/')
  .get(getPayments)
  .post(createPayment);

// Single payment operations
router.route('/:id')
  .get(getPaymentById)
  .put(updatePayment)
  .delete(authorize('Superadmin', 'Admin'), deletePayment);

module.exports = router;
