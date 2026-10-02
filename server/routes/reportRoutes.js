const express = require('express');
const router = express.Router();
const { getDailyReports, getMonthlyReports } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/daily', getDailyReports);
router.get('/monthly', getMonthlyReports);

module.exports = router;
