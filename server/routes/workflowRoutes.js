const express = require('express');
const router = express.Router();
const {
  getWorkflowStats,
  getWorkflowStudents,
  getStudentWorkflow,
  updateStudentStage,
  getWorkflowHistory,
  addWorkflowNote
} = require('../controllers/workflowController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getWorkflowStats);
router.get('/', protect, getWorkflowStudents);
router.get('/:studentId', protect, getStudentWorkflow);
router.patch('/:studentId/stage', protect, updateStudentStage);
router.get('/:studentId/history', protect, getWorkflowHistory);
router.post('/:studentId/note', protect, addWorkflowNote);

module.exports = router;
