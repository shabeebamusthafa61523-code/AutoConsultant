const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  getStudentDetails,
  createStudent,
  updateStudent,
  updateStudentStatus,
  transferStudentBatch,
  addStudentService,
  addStudentDocument,
  updateDocumentStatus,
  deleteStudent,
  bulkImportStudents
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getStudents)
  .post(protect, createStudent);

router.post('/bulk-import', protect, bulkImportStudents);

router.get('/:id/details', protect, getStudentDetails);

// Status, Batch Transfer & Add Service
router.patch('/:id/status', protect, updateStudentStatus);
router.post('/:id/batch-transfer', protect, transferStudentBatch);
router.post('/:id/add-service', protect, addStudentService);

// Document Management
router.post('/:id/documents', protect, addStudentDocument);
router.patch('/:id/documents/:docId', protect, updateDocumentStatus);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, updateStudent)
  .delete(protect, authorize('Superadmin', 'Admin'), deleteStudent);

module.exports = router;
