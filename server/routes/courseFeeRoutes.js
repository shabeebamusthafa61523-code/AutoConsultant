const express = require('express');
const router = express.Router();
const {
  getCourseFees,
  getCourseFeeById,
  createCourseFee,
  updateCourseFee,
  deleteCourseFee
} = require('../controllers/courseFeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getCourseFees)
  .post(authorize('Superadmin', 'Admin', 'Manager'), createCourseFee);

router.route('/:id')
  .get(getCourseFeeById)
  .put(authorize('Superadmin', 'Admin', 'Manager'), updateCourseFee)
  .delete(authorize('Superadmin', 'Admin', 'Manager'), deleteCourseFee);

module.exports = router;
