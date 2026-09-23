const express = require('express');
const router = express.Router();
const {
  getBatchStats,
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  assignStudentToBatch,
  removeStudentFromBatch,
  transferStudentFromBatch,
  getBatchSchedules,
  createBatchSchedule,
  updateBatchSchedule,
  deleteBatchSchedule,
  getBatchAttendance,
  recordBatchAttendance
} = require('../controllers/batchController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Batch statistics summary
router.get('/stats', protect, getBatchStats);

router.route('/')
  .get(protect, getBatches)
  .post(protect, createBatch);

// Student Assignment & Transfer
router.post('/:id/students', protect, assignStudentToBatch);
router.delete('/:id/students/:studentId', protect, removeStudentFromBatch);
router.post('/:id/transfer-student', protect, transferStudentFromBatch);

// Schedule Management
router.route('/:id/schedules')
  .get(protect, getBatchSchedules)
  .post(protect, createBatchSchedule);

router.route('/:id/schedules/:scheduleId')
  .put(protect, updateBatchSchedule)
  .delete(protect, deleteBatchSchedule);

// Attendance Management
router.route('/:id/attendance')
  .get(protect, getBatchAttendance)
  .post(protect, recordBatchAttendance);

router.route('/:id')
  .get(protect, getBatchById)
  .put(protect, updateBatch)
  .delete(protect, authorize('Superadmin', 'Admin'), deleteBatch);

module.exports = router;
