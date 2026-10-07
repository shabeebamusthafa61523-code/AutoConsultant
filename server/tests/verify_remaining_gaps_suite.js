/**
 * BENZ AUTO CONSULTANT CRM — REMAINING GAPS VERIFICATION SUITE
 * Tests:
 * 1. Centralized WhatsApp Service & API (Meta Cloud API architecture, templates, phone formatting, wa.me fallback, RBAC)
 * 2. Data Migration Workflow (Parse, Validate, Preview, Dry Run, Batch Commit, Audit Logging, Safe Rollback)
 * 3. Biometric Attendance Architecture (Hardware status, Punch In/Out, 5-min debounce, student history, manual fallback)
 * 4. GPS Live Telemetry Architecture (Status, Haversine distance, Session start/stop, Waypoint push, Deduplication, Class ledger sync)
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');

const {
  getConfigurationStatus,
  formatPhoneNumber,
  buildTemplateMessage,
  generateWaMeLink,
  sendWhatsAppMessage
} = require('../services/whatsappService');

const {
  getSampleMigrationData,
  validateMigrationRecords,
  runDryRun,
  commitMigrationBatch,
  rollbackMigrationBatch,
  getMigrationBatches
} = require('../utils/migrationTool');

const {
  getBiometricStatus,
  processPunch
} = require('../services/biometricService');

const {
  calculateHaversineDistance,
  getTelemetryConfigurationStatus,
  startGpsSession,
  recordWaypoints,
  stopGpsSession
} = require('../services/gpsService');

let passedTests = 0;
let totalTests = 0;

const assert = (condition, testName) => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
};

const runSuite = async () => {
  console.log('\n========================================================================');
  console.log('🌟 BENZ AUTO CONSULTANT CRM — REMAINING GAPS VERIFICATION SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas...\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: WHATSAPP ARCHITECTURE & DISPATCH
    // -------------------------------------------------------------------------
    console.log('--- [GAP 1] WHATSAPP SERVICE & API VERIFICATION ---');

    // 1.1 Phone formatting
    const formatted1 = formatPhoneNumber('9847123456');
    const formatted2 = formatPhoneNumber('+91 9847123456');
    const formatted3 = formatPhoneNumber('09847123456');
    assert(formatted1 === '919847123456', 'Phone formatting: 10-digit number prepends 91');
    assert(formatted2 === '919847123456', 'Phone formatting: +91 with spaces stripped cleanly');
    assert(formatted3 === '919847123456', 'Phone formatting: 11-digit leading 0 stripped cleanly');

    // 1.2 Configuration status
    const waStatus = getConfigurationStatus();
    assert(waStatus.status === 'CONFIGURATION REQUIRED', 'WhatsApp status reports CONFIGURATION REQUIRED when credentials unconfigured');
    assert(waStatus.maskedToken === 'NOT_SET' || waStatus.maskedToken.includes('...'), 'WhatsApp status masks credentials safely without leaking secrets');
    assert(waStatus.fallbackAvailable === true, 'WhatsApp status confirms wa.me fallback availability');

    // 1.3 Message template generation
    const receiptMsg = buildTemplateMessage('receipt', {
      candidateName: 'Rahul Varma',
      amount: 5000,
      receiptNumber: 'BENZ-REC-9999',
      paymentMode: 'UPI',
      balance: 4500
    });
    assert(receiptMsg.includes('Rahul Varma') && receiptMsg.includes('BENZ-REC-9999') && receiptMsg.includes('₹5000'), 'Receipt template generates correct text');

    const testMsg = buildTemplateMessage('test_reminder', {
      candidateName: 'Rahul Varma',
      testDate: '15/10/2026'
    });
    assert(testMsg.includes('Driving Test is scheduled for 15/10/2026'), 'Test reminder template generates correct text');

    const paymentMsg = buildTemplateMessage('payment_reminder', {
      candidateName: 'Rahul Varma',
      balance: 4500
    });
    assert(paymentMsg.includes('pending balance of ₹4500'), 'Payment reminder template generates correct text');

    // 1.4 wa.me link generation
    const waLink = generateWaMeLink('9847123456', receiptMsg);
    assert(waLink.startsWith('https://wa.me/919847123456?text='), 'wa.me link generated with proper URL encoding');

    // 1.5 Send WhatsApp message in fallback mode
    const sendResult = await sendWhatsAppMessage({
      phone: '9847123456',
      template: 'receipt',
      data: { candidateName: 'Rahul Varma', amount: 5000, receiptNumber: 'BENZ-REC-9999', balance: 4500 }
    });
    assert(sendResult.success === true, 'WhatsApp dispatch succeeds');
    assert(sendResult.mode === 'WA_ME_FALLBACK', 'Gracefully routes to WA_ME_FALLBACK when Meta credentials pending');
    assert(sendResult.waMeFallbackUrl.includes('BENZ-REC-9999'), 'Fallback URL contains receipt payload');

    console.log('✓ GAP 1 WhatsApp Architecture Verified!\n');

    // -------------------------------------------------------------------------
    // TEST 2: DATA MIGRATION WORKFLOW (VALIDATE -> DRY RUN -> COMMIT -> ROLLBACK)
    // -------------------------------------------------------------------------
    console.log('--- [GAP 2] DATA MIGRATION WORKFLOW VERIFICATION ---');

    // 2.1 Read sample data
    const sampleData = getSampleMigrationData(5);
    assert(sampleData.length === 5, 'Sample data reader reads 5 records from reference XLSX');
    assert(sampleData[0].legacyId && sampleData[0].totalFee, 'Sample record has legacyId and totalFee');

    // 2.2 Validation
    const validation = await validateMigrationRecords(sampleData);
    assert(validation.totalRecords === 5, 'Validation processes all 5 records');
    assert(validation.validCount + validation.duplicateCount + validation.invalidCount === 5, 'Validation categorization totals match');

    // 2.3 Dry Run (Must NOT touch database!)
    const initialStudentCount = await Student.countDocuments();
    const dryRunReport = await runDryRun(3);
    const postDryRunStudentCount = await Student.countDocuments();
    assert(initialStudentCount === postDryRunStudentCount, 'Dry-run produces ZERO database mutations');
    assert(dryRunReport.dryRun === true, 'Dry-run report flag set');
    assert(dryRunReport.projectedCreations.students >= 0, 'Dry-run reports projected creations');

    // 2.4 Controlled Batch Commit
    const testBatchId = `TEST-BATCH-${Date.now()}`;
    const commitResult = await commitMigrationBatch({
      sampleSize: 2,
      batchId: testBatchId,
      migrationStatus: 'Committed'
    });
    assert(commitResult.batchId === testBatchId, 'Committed batch returns designated batchId');
    assert(commitResult.migratedStudents >= 1, 'Batch commit created students');

    // Verify database records for this batch
    const createdStudent = await Student.findOne({ migrationBatchId: testBatchId });
    assert(createdStudent && createdStudent.legacyId, 'Committed student tagged with migrationBatchId and legacyId');
    assert(createdStudent.studentId.startsWith('STU-'), 'Committed student assigned standard STU-XXXX ID');

    const createdApp = await Application.findOne({ migrationBatchId: testBatchId });
    assert(createdApp && createdApp.studentId === createdStudent.studentId, 'Application correctly linked to Student Master');

    // 2.5 List batches
    const batchList = await getMigrationBatches();
    assert(batchList.some((b) => b._id === testBatchId), 'Batch listing detects committed batch');

    // 2.6 Safe Rollback / Reversal
    const rollbackResult = await rollbackMigrationBatch({ batchId: testBatchId });
    assert(rollbackResult.success === true, 'Rollback reports success');
    assert(rollbackResult.rolledBackStudents >= 1, 'Rollback removed committed students');

    const remainingBatchStudents = await Student.countDocuments({ migrationBatchId: testBatchId });
    const remainingBatchApps = await Application.countDocuments({ migrationBatchId: testBatchId });
    const remainingBatchPayments = await Payment.countDocuments({ migrationBatchId: testBatchId });
    assert(remainingBatchStudents === 0, 'Zero remaining students after batch rollback');
    assert(remainingBatchApps === 0, 'Zero remaining applications after batch rollback');
    assert(remainingBatchPayments === 0, 'Zero remaining payments after batch rollback');

    console.log('✓ GAP 2 Data Migration Workflow Verified!\n');

    // -------------------------------------------------------------------------
    // TEST 3: BIOMETRIC ATTENDANCE ARCHITECTURE
    // -------------------------------------------------------------------------
    console.log('--- [GAP 3] BIOMETRIC ATTENDANCE ARCHITECTURE VERIFICATION ---');

    // 3.1 Status
    const bioStatus = getBiometricStatus();
    assert(bioStatus.status === 'CONFIGURATION REQUIRED', 'Biometric status correctly reports CONFIGURATION REQUIRED');
    assert(bioStatus.manualFallbackActive === true, 'Biometric status confirms manual fallback is active');

    // Clean up any previous test student
    await Student.deleteMany({ studentId: /^STU-BIO-/ });
    await Attendance.deleteMany({ studentId: /^STU-BIO-/ });

    const bioTestStudentId = `STU-BIO-${Date.now()}`;
    const testStudent = await Student.create({
      studentId: bioTestStudentId,
      fullName: 'Anoop Biometric Test',
      primaryMobile: `9847${String(Date.now()).slice(-6)}`,
      coursePackage: '4 Wheeler (Fresh Licence)',
      vehicleType: '4 Wheeler',
      licenceCategory: 'LMV'
    });

    // 3.2 Punch In
    const punchInResult = await processPunch({
      studentIdentifier: testStudent.studentId,
      deviceId: 'BIO-GATE-01',
      punchType: 'IN',
      verificationMode: 'BIOMETRIC_FINGERPRINT',
      confidenceScore: 98
    });
    assert(punchInResult.success === true, 'Biometric Punch IN succeeds');
    assert(punchInResult.duplicate === false, 'Initial punch is not flagged as duplicate');
    assert(punchInResult.attendance.punchType === 'IN', 'Attendance recorded with punchType IN');

    // 3.3 Duplicate punch prevention (5-minute debounce)
    const duplicatePunch = await processPunch({
      studentIdentifier: testStudent.studentId,
      deviceId: 'BIO-GATE-01',
      punchType: 'IN',
      verificationMode: 'BIOMETRIC_FINGERPRINT'
    });
    assert(duplicatePunch.duplicate === true, 'Duplicate punch within 5 minutes suppressed by debounce filter');

    // 3.4 Punch Out
    const punchOutResult = await processPunch({
      studentIdentifier: testStudent.studentId,
      deviceId: 'BIO-GATE-01',
      punchType: 'OUT',
      verificationMode: 'BIOMETRIC_FINGERPRINT',
      confidenceScore: 96
    });
    assert(punchOutResult.success === true, 'Biometric Punch OUT succeeds');
    assert(punchOutResult.attendance.punchType === 'OUT', 'Attendance recorded with punchType OUT');

    // Verify MongoDB attendance records
    const attendances = await Attendance.find({ student: testStudent._id });
    assert(attendances.length === 2, '2 distinct punch records stored in MongoDB (IN and OUT)');

    // Cleanup test student & attendance
    await Attendance.deleteMany({ student: testStudent._id });
    await Student.findByIdAndDelete(testStudent._id);

    console.log('✓ GAP 3 Biometric Attendance Architecture Verified!\n');

    // -------------------------------------------------------------------------
    // TEST 4: GPS LIVE TELEMETRY ARCHITECTURE
    // -------------------------------------------------------------------------
    console.log('--- [GAP 4] GPS LIVE TELEMETRY ARCHITECTURE VERIFICATION ---');

    // 4.1 Status
    const gpsStatus = getTelemetryConfigurationStatus();
    assert(gpsStatus.status === 'CONFIGURATION REQUIRED', 'Telemetry status correctly reports CONFIGURATION REQUIRED');
    assert(gpsStatus.manualModeActive === true, 'Telemetry status confirms manual odometer entry is active');

    // 4.2 Haversine Distance Formula Unit Test
    // Distance between Calicut Beach (11.2588, 75.7804) and Mananchira Square (11.2530, 75.7797) is ~0.65 km
    const testDist = calculateHaversineDistance(11.2588, 75.7804, 11.2530, 75.7797);
    assert(testDist > 0.6 && testDist < 0.75, `Haversine distance calculation verified: ${testDist.toFixed(2)} km`);

    // Create a temporary class session for telemetry tracking
    const testClass = await Class.create({
      student: new mongoose.Types.ObjectId(),
      classDate: new Date(),
      trainingType: 'Practical Driving',
      kmStart: 1000,
      kmEnd: 0,
      kmDriven: 0
    });

    // 4.3 Start GPS Session
    const startResult = await startGpsSession({
      classId: testClass._id,
      startLocation: { lat: 11.2588, lng: 75.7804, address: 'Driving Ground Gate' },
      deviceId: 'TRACKER-KL10-01'
    });
    assert(startResult.success === true, 'GPS telemetry session started');
    assert(startResult.session.status === 'IN_PROGRESS', 'GPS session marked IN_PROGRESS');

    // 4.4 Push Waypoints with deduplication
    const wpResult = await recordWaypoints({
      classId: testClass._id,
      waypoints: [
        { lat: 11.2560, lng: 75.7800, speed: 25, eventId: 'WP-001' },
        { lat: 11.2560, lng: 75.7800, speed: 25, eventId: 'WP-001' }, // duplicate!
        { lat: 11.2530, lng: 75.7797, speed: 20, eventId: 'WP-002' }
      ]
    });
    assert(wpResult.success === true, 'Waypoints recorded successfully');
    assert(wpResult.addedWaypoints === 2, 'Duplicate waypoint eventId filtered out');
    assert(wpResult.calculatedGpsKm > 0, `Cumulative GPS distance computed: ${wpResult.calculatedGpsKm} km`);

    // 4.5 Stop GPS Session & Synchronize with Class Ledger
    const stopResult = await stopGpsSession({
      classId: testClass._id,
      endLocation: { lat: 11.2530, lng: 75.7797, address: 'City Centre Depot' },
      syncToOdometer: true
    });
    assert(stopResult.success === true, 'GPS session stopped');
    assert(stopResult.session.status === 'COMPLETED', 'GPS session marked COMPLETED');

    const updatedCls = await Class.findById(testClass._id);
    assert(updatedCls.status === 'Completed', 'Class status updated to Completed');
    assert(updatedCls.telemetryMode === 'GPS_LIVE', 'Class recorded with telemetryMode GPS_LIVE');
    assert(Math.abs(updatedCls.kmDriven - stopResult.finalKm) < 0.05, 'Class kmDriven synchronized from GPS calculated distance');

    // Cleanup test class
    await Class.findByIdAndDelete(testClass._id);

    console.log('✓ GAP 4 GPS Live Telemetry Architecture Verified!\n');

    console.log('========================================================================');
    console.log(`🎉 ALL ${passedTests} OF ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
    console.log('========================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
};

runSuite();
