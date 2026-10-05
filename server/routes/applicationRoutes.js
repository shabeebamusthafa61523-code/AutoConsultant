const express = require('express');
const router = express.Router();
const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStage,
  updateNextAction,
  getStudentApplications,
  deleteApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getApplications)
  .post(createApplication);

router.get('/student/:studentId', getStudentApplications);

router.route('/:id')
  .get(getApplicationById)
  .put(updateApplication)
  .delete(authorize('Superadmin', 'Admin'), deleteApplication);

router.patch('/:id/stage', updateApplicationStage);
router.patch('/:id/next-action', updateNextAction);

module.exports = router;
