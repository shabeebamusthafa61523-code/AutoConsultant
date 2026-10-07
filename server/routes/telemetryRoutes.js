const express = require('express');
const router = express.Router();
const {
  getStatus,
  startSession,
  pushWaypoints,
  stopSession,
  getSessionData
} = require('../controllers/telemetryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/status', getStatus);
router.post('/start', startSession);
router.post('/waypoints', pushWaypoints);
router.post('/stop', stopSession);
router.get('/session/:classId', getSessionData);

module.exports = router;
