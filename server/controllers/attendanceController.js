const { getBiometricStatus, processPunch } = require('../services/biometricService');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// @desc    Get Biometric Hardware Gateway configuration status
// @route   GET /api/attendance/biometric/status
// @access  Private
const getStatus = async (req, res, next) => {
  try {
    const status = getBiometricStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a biometric punch (Punch In / Punch Out)
// @route   POST /api/attendance/punch
// @access  Private (Staff, Manager, Admin, Instructor)
const recordPunch = async (req, res, next) => {
  try {
    const {
      studentIdentifier,
      studentId,
      deviceId,
      punchType = 'IN',
      punchTime,
      verificationMode,
      confidenceScore,
      rawPayload
    } = req.body;

    const identifier = studentIdentifier || studentId;

    if (!identifier) {
      res.status(400);
      throw new Error('Student identifier (studentId or _id) is required for attendance punch');
    }

    const result = await processPunch({
      studentIdentifier: identifier,
      deviceId,
      punchType,
      punchTime: punchTime || new Date(),
      verificationMode,
      confidenceScore,
      rawPayload,
      user: req.user
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get punch history for a specific student
// @route   GET /api/attendance/student/:studentId
// @access  Private
const getStudentPunches = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    let query = {};

    if (/^[0-9a-fA-F]{24}$/.test(studentId)) {
      query.student = studentId;
    } else {
      query.studentId = studentId;
    }

    const records = await Attendance.find(query)
      .sort({ punchTime: -1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's punch activity feed
// @route   GET /api/attendance/today
// @access  Private
const getTodayPunches = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const records = await Attendance.find({
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    })
      .sort({ punchTime: -1 })
      .populate('student', 'studentId fullName primaryMobile');

    res.json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  recordPunch,
  getStudentPunches,
  getTodayPunches
};
