const express = require('express');
const router = express.Router();
const {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
} = require('../controllers/batchController');

router.route('/')
  .get(getBatches)
  .post(createBatch);

router.route('/:id')
  .get(getBatchById)
  .put(updateBatch)
  .delete(deleteBatch);

module.exports = router;
