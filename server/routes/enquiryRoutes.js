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
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getEnquiries)
  .post(createEnquiry);

router.post('/:id/convert', convertEnquiryToStudent);

router.route('/:id')
  .get(getEnquiryById)
  .put(updateEnquiry)
  .delete(authorize('Superadmin', 'Admin', 'Manager'), deleteEnquiry);

module.exports = router;
