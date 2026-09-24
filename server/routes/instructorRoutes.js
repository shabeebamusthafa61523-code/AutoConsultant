const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getInstructors,
  getInstructorById,
  getInstructorProfile,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  addCertification,
  addStaffDocument,
  checkAvailability
} = require('../controllers/instructorController');

// All instructor routes protected by auth
router.use(protect);

router.route('/')
  .get(getInstructors)
  .post(authorize('Superadmin', 'Admin'), createInstructor);

router.post('/check-availability', checkAvailability);

router.route('/:id')
  .get(getInstructorById)
  .put(authorize('Superadmin', 'Admin'), updateInstructor)
  .delete(authorize('Superadmin'), deleteInstructor);

router.get('/:id/profile', getInstructorProfile);
router.post('/:id/certifications', authorize('Superadmin', 'Admin'), addCertification);
router.post('/:id/documents', authorize('Superadmin', 'Admin'), addStaffDocument);

module.exports = router;
