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

router.route('/')
  .get(getStudents)
  .post(createStudent);

router.get('/:id/details', getStudentDetails);

router.route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

module.exports = router;
