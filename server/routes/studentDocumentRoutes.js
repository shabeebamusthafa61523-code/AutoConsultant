const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../utils/fileUpload');
const {
  getStudentDocuments,
  getStudentDocumentById,
  createStudentDocument,
  verifyStudentDocument,
  rejectStudentDocument,
  updateStudentDocument,
  deleteStudentDocument,
  getStudentReadiness,
  serveDocumentFile
} = require('../controllers/studentDocumentController');

router.use(protect);

router.route('/')
  .get(getStudentDocuments)
  .post(upload.single('file'), createStudentDocument);

router.get('/student/:studentId/readiness', getStudentReadiness);
router.get('/:id/file', serveDocumentFile);

router.route('/:id')
  .get(getStudentDocumentById)
  .put(upload.single('file'), updateStudentDocument)
  .delete(authorize('Superadmin', 'Admin'), deleteStudentDocument);

router.put('/:id/verify', authorize('Superadmin', 'Admin'), verifyStudentDocument);
router.put('/:id/reject', authorize('Superadmin', 'Admin'), rejectStudentDocument);

module.exports = router;
