const express = require('express');
const router = express.Router();
const {
  previewSample,
  validateData,
  dryRun,
  commitBatch,
  executeSample,
  rollbackBatch,
  listBatches
} = require('../controllers/migrationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('Superadmin', 'Admin'));

// Safe Migration Workflow Routes
router.get('/sample-preview', previewSample);
router.post('/validate', validateData);
router.post('/dry-run', dryRun);
router.post('/commit', commitBatch);
router.post('/sample-execute', executeSample);
router.post('/rollback', rollbackBatch);
router.get('/batches', listBatches);

module.exports = router;
