const express = require('express');
const router = express.Router();
const { getStatus, previewTemplate, sendMessage } = require('../controllers/whatsappController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/status', getStatus);
router.post('/preview', previewTemplate);
router.post('/send', sendMessage);

module.exports = router;
