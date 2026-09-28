const express = require('express');
const router = express.Router();
const {
  getClasses,
  getClassStats,
  getProgressTracker,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  completeSchedule,
  exportClassesCSV,
  getClassById,
  createClass,
  updateClass,
  deleteClass
} = require('../controllers/classController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All class and training operations require authentication
router.use(protect);

// Dynamic statistics for Training & Classes dashboard cards
router.get('/stats', getClassStats);

// Filtered CSV export for ledger
router.get('/export', exportClassesCSV);

// Training progress tracker (student-level summary with fee status)
router.get('/progress-tracker', getProgressTracker);

// Daily class schedule roster endpoints
router.route('/schedules')
  .get(getSchedules)
  .post(createSchedule);

router.route('/schedules/:id')
  .put(updateSchedule)
  .delete(authorize('Superadmin', 'Admin'), deleteSchedule);

router.post('/schedules/:id/complete', completeSchedule);

// Main collection endpoints
router.route('/')
  .get(getClasses)
  .post(createClass);

// Single class record operations
router.route('/:id')
  .get(getClassById)
  .put(updateClass)
  .delete(authorize('Superadmin', 'Admin'), deleteClass);

module.exports = router;
