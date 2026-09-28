const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getComplaints,
  getComplaintDashboard,
  getComplaintById,
  createComplaint,
  updateComplaint,
  assignComplaint,
  updateComplaintStatus,
  escalateComplaint,
  resolveComplaint,
  closeComplaint,
  reopenComplaint,
  addComment,
  deleteComplaint
} = require('../controllers/complaintController');

// All complaint routes protected by authentication
router.use(protect);

// Dashboard KPI metrics
router.get('/dashboard', getComplaintDashboard);

// Core CRUD
router.route('/')
  .get(getComplaints)
  .post(createComplaint);

router.route('/:id')
  .get(getComplaintById)
  .put(updateComplaint)
  .delete(authorize('Superadmin'), deleteComplaint);

// Specialized workflow actions
router.patch('/:id/status', updateComplaintStatus);
router.patch('/:id/assign', assignComplaint);
router.patch('/:id/escalate', escalateComplaint);
router.patch('/:id/resolve', resolveComplaint);
router.patch('/:id/close', closeComplaint);
router.patch('/:id/reopen', reopenComplaint);
router.post('/:id/comments', addComment);

module.exports = router;
