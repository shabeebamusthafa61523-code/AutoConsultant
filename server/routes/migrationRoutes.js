const express = require('express');
const router = express.Router();
const { previewSample, executeSample } = require('../controllers/migrationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('Superadmin', 'Admin'));

router.get('/sample-preview', previewSample);
router.post('/sample-execute', executeSample);

module.exports = router;
