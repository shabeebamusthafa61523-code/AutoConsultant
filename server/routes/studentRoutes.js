const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  getStudentDetails,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getStudents)
  .post(protect, createStudent);

router.get('/:id/details', protect, getStudentDetails);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, updateStudent)
  .delete(protect, deleteStudent);

module.exports = router;
