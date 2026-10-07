const express = require('express');
const router = express.Router();
const {
  getStatus,
  recordPunch,
  getStudentPunches,
  getTodayPunches
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/biometric/status', getStatus);
router.post('/punch', recordPunch);
router.get('/student/:studentId', getStudentPunches);
router.get('/today', getTodayPunches);

module.exports = router;
