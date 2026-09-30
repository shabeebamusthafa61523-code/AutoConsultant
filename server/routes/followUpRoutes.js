const express = require('express');
const router = express.Router();
const {
  getFollowUps,
  getFollowUpSummary,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  rescheduleFollowUp,
  cancelFollowUp,
  deleteFollowUp
} = require('../controllers/followUpController');
const { protect } = require('../middleware/authMiddleware');

router.get('/summary', protect, getFollowUpSummary);
router.route('/')
  .get(protect, getFollowUps)
  .post(protect, createFollowUp);

router.route('/:id')
  .get(protect, getFollowUpById)
  .put(protect, updateFollowUp)
  .delete(protect, deleteFollowUp);

router.patch('/:id/complete', protect, completeFollowUp);
router.patch('/:id/reschedule', protect, rescheduleFollowUp);
router.patch('/:id/cancel', protect, cancelFollowUp);

module.exports = router;
