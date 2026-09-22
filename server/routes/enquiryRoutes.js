const express = require('express');
const router = express.Router();
const {
  getEnquiries,
  getEnquiryById,
  createEnquiry,
  updateEnquiry,
  convertEnquiryToStudent,
  deleteEnquiry
} = require('../controllers/enquiryController');

router.route('/')
  .get(getEnquiries)
  .post(createEnquiry);

router.post('/:id/convert', convertEnquiryToStudent);

router.route('/:id')
  .get(getEnquiryById)
  .put(updateEnquiry)
  .delete(deleteEnquiry);

module.exports = router;
