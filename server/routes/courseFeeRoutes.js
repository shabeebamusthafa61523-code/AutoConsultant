const express = require('express');
const router = express.Router();
const {
  getCourseFees,
  getCourseFeeById,
  createCourseFee,
  updateCourseFee,
  deleteCourseFee
} = require('../controllers/courseFeeController');

router.route('/')
  .get(getCourseFees)
  .post(createCourseFee);

router.route('/:id')
  .get(getCourseFeeById)
  .put(updateCourseFee)
  .delete(deleteCourseFee);

module.exports = router;
