const {
  getTelemetryConfigurationStatus,
  startGpsSession,
  recordWaypoints,
  stopGpsSession
} = require('../services/gpsService');
const Class = require('../models/Class');

// @desc    Get GPS Live Telemetry configuration status
// @route   GET /api/telemetry/status
// @access  Private
const getStatus = async (req, res, next) => {
  try {
    const status = getTelemetryConfigurationStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start GPS tracking session for a training class
// @route   POST /api/telemetry/start
// @access  Private (Staff, Instructor, Admin)
const startSession = async (req, res, next) => {
  try {
    const { classId, startLocation, deviceId } = req.body;
    if (!classId) {
      res.status(400);
      throw new Error('classId is required to start GPS session');
    }

    const result = await startGpsSession({
      classId,
      startLocation,
      deviceId,
      user: req.user
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Push GPS waypoints from vehicle tracker / mobile app
// @route   POST /api/telemetry/waypoints
// @access  Private
const pushWaypoints = async (req, res, next) => {
  try {
    const { classId, waypoints, deviceId } = req.body;
    if (!classId) {
      res.status(400);
      throw new Error('classId is required to record waypoints');
    }

    const result = await recordWaypoints({
      classId,
      waypoints: Array.isArray(waypoints) ? waypoints : [waypoints],
      deviceId
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Stop GPS session, calculate final distance, sync with class ledger
// @route   POST /api/telemetry/stop
// @access  Private
const stopSession = async (req, res, next) => {
  try {
    const { classId, endLocation, deviceId, syncToOdometer = true } = req.body;
    if (!classId) {
      res.status(400);
      throw new Error('classId is required to stop GPS session');
    }

    const result = await stopGpsSession({
      classId,
      endLocation,
      deviceId,
      syncToOdometer,
      user: req.user
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get GPS session waypoints and route for a class
// @route   GET /api/telemetry/session/:classId
// @access  Private
const getSessionData = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const cls = await Class.findById(classId).select('gpsSession telemetryMode km kmDriven vehicleNo instructor classDate');

    if (!cls) {
      res.status(404);
      throw new Error('Class record not found');
    }

    res.json({
      success: true,
      data: cls
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  startSession,
  pushWaypoints,
  stopSession,
  getSessionData
};
