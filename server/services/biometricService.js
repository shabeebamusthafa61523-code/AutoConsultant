const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

const BIOMETRIC_DEVICE_IP = process.env.BIOMETRIC_DEVICE_IP || '';
const BIOMETRIC_DEVICE_PORT = process.env.BIOMETRIC_DEVICE_PORT || '';
const BIOMETRIC_API_KEY = process.env.BIOMETRIC_API_KEY || '';
const BIOMETRIC_SDK_ENABLED = process.env.BIOMETRIC_SDK_ENABLED === 'true';

/**
 * Base Biometric Provider Abstraction Interface
 */
class BaseBiometricProvider {
  constructor(name = 'GenericBiometricProvider') {
    this.name = name;
  }
  getStatus() {
    throw new Error('getStatus must be implemented by provider');
  }
  processPunch(payload) {
    throw new Error('processPunch must be implemented by provider');
  }
}

/**
 * Hardware Provider (Prepared for Mantra / ZKTeco / Essl biometric gateway)
 */
class HardwareBiometricProvider extends BaseBiometricProvider {
  constructor() {
    super('Mantra/ZKTeco Driver Gateway');
  }

  isConfigured() {
    return Boolean(BIOMETRIC_SDK_ENABLED && BIOMETRIC_DEVICE_IP);
  }

  getStatus() {
    const configured = this.isConfigured();
    return {
      configured,
      status: configured ? 'READY' : 'CONFIGURATION REQUIRED',
      provider: 'Mantra MFS100 / ZKTeco Biometric Gateway',
      deviceIp: BIOMETRIC_DEVICE_IP ? `${BIOMETRIC_DEVICE_IP}:${BIOMETRIC_DEVICE_PORT || 4370}` : 'NOT_CONFIGURED',
      hasApiKey: Boolean(BIOMETRIC_API_KEY),
      sdkEnabled: BIOMETRIC_SDK_ENABLED,
      manualFallbackActive: true,
      supportedModes: ['BIOMETRIC_FINGERPRINT', 'BIOMETRIC_FACE', 'RFID_CARD', 'MANUAL'],
      debounceWindowMinutes: 5,
      message: configured
        ? 'Biometric hardware gateway is online and accepting punch events.'
        : 'Biometric hardware integration interface is active. Physical device pairing (BIOMETRIC_DEVICE_IP) pending. Manual class & batch attendance is fully operational.'
    };
  }
}

const provider = new HardwareBiometricProvider();

/**
 * Process a punch event from device webhook or API endpoint with debounce validation
 */
const processPunch = async ({
  studentIdentifier,
  deviceId = 'BIO-DESK-01',
  punchType = 'IN',
  punchTime = new Date(),
  verificationMode = 'BIOMETRIC_FINGERPRINT',
  confidenceScore = 95,
  rawPayload = null,
  user = null
}) => {
  if (!studentIdentifier) {
    throw new Error('Student identifier (studentId, Mongo ID, or mobile) is required');
  }

  // 1. Locate student
  let student = null;
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(String(studentIdentifier));

  if (isMongoId) {
    student = await Student.findById(studentIdentifier);
  } else {
    student = await Student.findOne({
      $or: [
        { studentId: String(studentIdentifier).trim() },
        { primaryMobile: String(studentIdentifier).trim() }
      ]
    });
  }

  if (!student) {
    throw new Error(`Student not found for identifier: ${studentIdentifier}`);
  }

  // 2. Duplicate punch prevention (5-minute debounce window)
  const punchDate = new Date(punchTime);
  const fiveMinutesAgo = new Date(punchDate.getTime() - 5 * 60 * 1000);

  const recentPunch = await Attendance.findOne({
    student: student._id,
    punchType,
    punchTime: { $gte: fiveMinutesAgo, $lte: punchDate }
  });

  if (recentPunch) {
    return {
      success: true,
      duplicate: true,
      message: `Duplicate ${punchType} punch detected within 5-minute debounce window. Ignored.`,
      existingPunch: {
        id: recentPunch._id,
        punchTime: recentPunch.punchTime,
        punchType: recentPunch.punchType,
        deviceId: recentPunch.deviceId
      }
    };
  }

  // 3. Record verified attendance punch
  const dayStart = new Date(punchDate.getTime());
  dayStart.setHours(0, 0, 0, 0);

  const attendance = await Attendance.create({
    student: student._id,
    studentId: student.studentId,
    batch: student.batch || null,
    date: dayStart,
    punchType,
    punchTime: punchDate,
    status: 'Present',
    classType: 'Biometric Verified Class',
    deviceId: deviceId || 'BIO-GATEWAY',
    verificationMode: verificationMode || 'BIOMETRIC_FINGERPRINT',
    biometricConfidence: Number(confidenceScore) || 95,
    deviceRawPayload: rawPayload,
    remarks: `Biometric Punch (${punchType}) verified via ${deviceId}`
  });

  // 4. Update student timeline
  student.timeline.push({
    action: `Biometric ${punchType} Recorded`,
    category: 'Attendance',
    description: `Verified ${verificationMode} punch on device ${deviceId}`,
    timestamp: new Date(),
    performedBy: user ? user.name : 'Biometric Hardware Gateway'
  });
  await student.save();

  // 5. Audit Log
  await AuditLog.logAction({
    user,
    action: 'BIOMETRIC_PUNCH_RECORDED',
    entity: 'Attendance',
    entityId: String(attendance._id),
    details: {
      studentId: student.studentId,
      fullName: student.fullName,
      punchType,
      deviceId,
      verificationMode
    }
  });

  return {
    success: true,
    duplicate: false,
    message: `Biometric punch (${punchType}) successfully recorded for ${student.fullName} (${student.studentId}).`,
    attendance: {
      id: attendance._id,
      studentId: student.studentId,
      fullName: student.fullName,
      punchType: attendance.punchType,
      punchTime: attendance.punchTime,
      deviceId: attendance.deviceId,
      status: attendance.status
    }
  };
};

module.exports = {
  getBiometricStatus: () => provider.getStatus(),
  processPunch,
  provider
};
