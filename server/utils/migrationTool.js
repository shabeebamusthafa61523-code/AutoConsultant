const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');
const generateStudentId = require('./generateStudentId');
const generateApplicationId = require('./generateApplicationId');

const cleanPhone = (val) => {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  return digits;
};

const LEGACY_PATH = path.resolve(__dirname, '../../../reference_model/AUTO CONSULTANT');

/**
 * Reads and maps sample data from legacy XLSX backups without altering MongoDB
 */
const getSampleMigrationData = (sampleSize = 10) => {
  const studentFile = path.join(LEGACY_PATH, 'DDS_Student_Master_Database_Raw.xlsx');
  const feeFile = path.join(LEGACY_PATH, 'DDS_Fee_Management_Database_2026.xlsx');
  const licenceFile = path.join(LEGACY_PATH, 'DDS_Licence_Management_Database_2026.xlsx');

  const studentWb = XLSX.readFile(studentFile);
  const studentRows = XLSX.utils.sheet_to_json(studentWb.Sheets[studentWb.SheetNames[0]]);

  let feeMap = {};
  try {
    const feeWb = XLSX.readFile(feeFile);
    const feeRows = XLSX.utils.sheet_to_json(feeWb.Sheets['Fee Master 2026'] || feeWb.Sheets[feeWb.SheetNames[0]]);
    feeRows.forEach((r) => {
      const id = String(r['Student ID'] || '').trim();
      if (id) feeMap[id] = r;
    });
  } catch (err) {
    console.warn('Fee map read warning:', err.message);
  }

  let llMap = {};
  try {
    const licWb = XLSX.readFile(licenceFile);
    const llRows = XLSX.utils.sheet_to_json(licWb.Sheets['Learner Licence Register'] || licWb.Sheets[licWb.SheetNames[0]]);
    llRows.forEach((r) => {
      const id = String(r['Student ID'] || '').trim();
      if (id) llMap[id] = r;
    });
  } catch (err) {
    console.warn('LL map read warning:', err.message);
  }

  const sample = studentRows.slice(0, sampleSize).map((s, idx) => {
    const rawId = String(s['Student ID'] || `LEGACY-${idx + 1}`).trim();
    const name = String(s['Student Name'] || s['Name'] || 'Legacy Student').trim();
    const phone = cleanPhone(s['Mobile Number'] || s['Mobile'] || '9800000000');
    const feeInfo = feeMap[rawId] || {};
    const llInfo = llMap[rawId] || {};

    const totalFee = Number(feeInfo['Total Fee']) || 9000;
    const paidAmount = Number(feeInfo['Total Paid']) || 0;
    const balance = Number(feeInfo['Balance']) || Math.max(0, totalFee - paidAmount);

    return {
      legacyId: rawId,
      name,
      mobile: phone || `98950000${String(idx).padStart(2, '0')}`,
      category: s['Category'] || 'LMV',
      status: s['Status'] || 'Active',
      totalFee,
      paidAmount,
      balance,
      llStatus: llInfo['LL Status'] || 'Pending',
      remarks: s['Remarks'] || 'Legacy Migration Sample'
    };
  });

  return sample;
};

/**
 * Validates migration records and detects duplicates against existing CRM database
 */
const validateMigrationRecords = async (records = []) => {
  const validation = {
    totalRecords: records.length,
    validCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    errors: [],
    validatedRecords: []
  };

  const legacyIds = records.map((r) => r.legacyId).filter(Boolean);
  const mobiles = records.map((r) => cleanPhone(r.mobile)).filter(Boolean);

  const existingStudents = await Student.find({
    $or: [
      { legacyId: { $in: legacyIds } },
      { primaryMobile: { $in: mobiles } }
    ]
  }).select('studentId fullName primaryMobile legacyId');

  const existingMap = new Map();
  existingStudents.forEach((stu) => {
    if (stu.legacyId) existingMap.set(`leg:${stu.legacyId}`, stu);
    if (stu.primaryMobile) existingMap.set(`mob:${stu.primaryMobile}`, stu);
  });

  records.forEach((rec, idx) => {
    const itemErrors = [];
    const phone = cleanPhone(rec.mobile);

    if (!rec.name) itemErrors.push('Missing student name');
    if (!phone || phone.length < 10) itemErrors.push('Invalid phone number (must be >= 10 digits)');
    if (!rec.legacyId) itemErrors.push('Missing legacy reference ID');
    if (rec.totalFee < 0) itemErrors.push('Total fee cannot be negative');
    if (rec.paidAmount < 0) itemErrors.push('Paid amount cannot be negative');

    const duplicateByLeg = existingMap.get(`leg:${rec.legacyId}`);
    const duplicateByMob = existingMap.get(`mob:${phone}`);
    const isDuplicate = Boolean(duplicateByLeg || duplicateByMob);
    const existingRef = duplicateByLeg || duplicateByMob;

    if (itemErrors.length > 0) {
      validation.invalidCount++;
      validation.errors.push({
        index: idx,
        legacyId: rec.legacyId,
        errors: itemErrors
      });
      validation.validatedRecords.push({
        ...rec,
        validationStatus: 'INVALID',
        errors: itemErrors
      });
    } else if (isDuplicate) {
      validation.duplicateCount++;
      validation.validatedRecords.push({
        ...rec,
        validationStatus: 'DUPLICATE',
        existingStudentId: existingRef.studentId,
        existingName: existingRef.fullName,
        duplicateReason: duplicateByLeg ? 'Matched Legacy ID' : 'Matched Mobile Number'
      });
    } else {
      validation.validCount++;
      validation.validatedRecords.push({
        ...rec,
        validationStatus: 'VALID'
      });
    }
  });

  return validation;
};

/**
 * Executes an in-memory simulation / dry-run without writing anything to MongoDB
 */
const runDryRun = async (sampleSize = 10, customRecords = null) => {
  const records = customRecords || getSampleMigrationData(sampleSize);
  const validation = await validateMigrationRecords(records);

  const projectedStudents = validation.validCount;
  const projectedApplications = validation.validCount;
  const projectedPayments = validation.validatedRecords.filter(
    (r) => r.validationStatus === 'VALID' && r.paidAmount > 0
  ).length;

  let totalProjectedNet = 0;
  let totalProjectedPaid = 0;
  let totalProjectedBalance = 0;

  validation.validatedRecords.forEach((r) => {
    if (r.validationStatus === 'VALID') {
      totalProjectedNet += Number(r.totalFee) || 0;
      totalProjectedPaid += Number(r.paidAmount) || 0;
      totalProjectedBalance += Number(r.balance) || 0;
    }
  });

  return {
    dryRun: true,
    totalInputRecords: records.length,
    validationSummary: {
      validRecords: validation.validCount,
      duplicateRecords: validation.duplicateCount,
      invalidRecords: validation.invalidCount
    },
    projectedCreations: {
      students: projectedStudents,
      applications: projectedApplications,
      payments: projectedPayments,
      skippedDuplicates: validation.duplicateCount
    },
    projectedFinancials: {
      totalNetPayable: totalProjectedNet,
      totalReceived: totalProjectedPaid,
      totalBalanceDue: totalProjectedBalance
    },
    errors: validation.errors,
    samplePreview: validation.validatedRecords.slice(0, 5)
  };
};

/**
 * Commits a safe migration batch into MongoDB with transactional tagging and audit logging
 */
const commitMigrationBatch = async ({ sampleSize = 10, customRecords = null, user = null, batchId = null, migrationStatus = 'Committed' }) => {
  const records = customRecords || getSampleMigrationData(sampleSize);
  const activeBatchId = batchId || `BATCH-MIG-${Date.now()}`;
  const validation = await validateMigrationRecords(records);

  const results = {
    batchId: activeBatchId,
    migrationStatus,
    migratedStudents: 0,
    migratedApplications: 0,
    migratedPayments: 0,
    skippedCount: validation.duplicateCount,
    invalidCount: validation.invalidCount,
    details: [],
    financialTotals: {
      totalNetPayable: 0,
      totalReceived: 0,
      totalBalanceDue: 0
    }
  };

  for (const item of validation.validatedRecords) {
    if (item.validationStatus !== 'VALID') {
      results.details.push({
        legacyId: item.legacyId,
        status: `Skipped (${item.validationStatus})`,
        reason: item.duplicateReason || (item.errors ? item.errors.join(', ') : 'Validation failed')
      });
      continue;
    }

    // 1. Create Student Master
    const studentId = await generateStudentId();
    const student = await Student.create({
      studentId,
      fullName: item.name,
      primaryMobile: item.mobile,
      coursePackage: `${item.category} (Fresh Licence)`,
      vehicleType: item.category.includes('2') ? '2 Wheeler' : '4 Wheeler',
      licenceCategory: item.category,
      totalFee: item.totalFee,
      paidAmount: item.paidAmount,
      currentStatus: item.status === 'Completed' ? 'Completed' : 'Active',
      legacySource: 'DDS_Student_Master_Database_Raw.xlsx',
      legacyId: item.legacyId,
      migrationStatus,
      migrationBatchId: activeBatchId,
      migrationVerifiedAt: new Date(),
      timeline: [
        {
          action: `Legacy Migration (${migrationStatus})`,
          category: 'Registration',
          description: `Migrated from legacy database (${item.legacyId}) under Batch ${activeBatchId}`,
          timestamp: new Date(),
          performedBy: user ? user.name : 'Migration Tool'
        }
      ]
    });
    results.migratedStudents++;

    // 2. Create Application
    const applicationId = await generateApplicationId();
    const app = await Application.create({
      applicationId,
      student: student._id,
      studentId: student.studentId,
      serviceType: 'Fresh Licence',
      licenceType: item.category,
      vehicleClass: item.category.includes('2') ? '2 Wheeler' : '4 Wheeler',
      coursePackage: student.coursePackage,
      lifecycleStatus: item.status === 'Completed' ? 'Completed' : 'Training',
      feeStructure: {
        packageFee: item.totalFee,
        rtoServiceFee: 0,
        retestFee: 0,
        otherCharges: 0,
        discount: 0,
        netPayable: item.totalFee,
        totalReceived: item.paidAmount,
        balanceDue: item.balance
      },
      learnerLicence: {
        llStatus: item.llStatus === 'Passed' ? 'Approved' : 'Applied'
      },
      nextAction: item.balance > 0 ? 'Collect Balance Due' : 'Schedule Driving Test',
      nextActionDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      nextActionAssignedTo: 'Office Desk',
      nextActionPriority: 'Medium',
      nextActionStatus: 'Pending',
      legacySource: 'DDS_Student_Master_Database_Raw.xlsx',
      legacyId: item.legacyId,
      migrationStatus,
      migrationBatchId: activeBatchId,
      migrationVerifiedAt: new Date(),
      notes: `Batch ${activeBatchId} Migration from Legacy ID ${item.legacyId}`
    });
    results.migratedApplications++;

    // 3. Create Payment Transaction if paidAmount > 0
    if (item.paidAmount > 0) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'receiptNo' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const receiptNo = `BENZ-REC-${String(counter.seq).padStart(4, '0')}`;

      await Payment.create({
        receiptNo,
        student: student._id,
        application: app._id,
        applicationId: app.applicationId,
        amount: item.paidAmount,
        paymentType: 'Fee Payment',
        paymentMethod: 'Cash',
        previousBalance: item.totalFee,
        balanceAfter: item.balance,
        feeBreakdown: {
          packageFee: item.totalFee,
          netPayable: item.totalFee,
          totalReceived: item.paidAmount,
          balanceDue: item.balance
        },
        status: 'Completed',
        receivedBy: 'Legacy Accounts Desk',
        notes: `Legacy Payment record for ${item.legacyId} (Batch: ${activeBatchId})`,
        legacySource: 'DDS_Fee_Management_Database_2026.xlsx',
        legacyId: item.legacyId,
        migrationStatus,
        migrationBatchId: activeBatchId,
        migrationVerifiedAt: new Date()
      });
      results.migratedPayments++;
    }

    results.financialTotals.totalNetPayable += item.totalFee;
    results.financialTotals.totalReceived += item.paidAmount;
    results.financialTotals.totalBalanceDue += item.balance;

    results.details.push({
      legacyId: item.legacyId,
      studentId: student.studentId,
      applicationId: app.applicationId,
      paidAmount: item.paidAmount,
      balance: item.balance,
      status: 'Migrated & Committed'
    });
  }

  // Audit Log
  await AuditLog.logAction({
    user,
    action: 'MIGRATION_BATCH_COMMITTED',
    entity: 'Migration',
    entityId: activeBatchId,
    details: {
      batchId: activeBatchId,
      migratedStudents: results.migratedStudents,
      migratedApplications: results.migratedApplications,
      migratedPayments: results.migratedPayments,
      skipped: results.skippedCount
    }
  });

  return results;
};

/**
 * Safely rolls back / reverses a migration batch without touching any organic CRM data
 */
const rollbackMigrationBatch = async ({ batchId, user = null }) => {
  const query = batchId ? { migrationBatchId: batchId } : { migrationStatus: 'Sample' };

  // 1. Delete associated payments
  const paymentResult = await Payment.deleteMany(query);

  // 2. Delete associated applications
  const applicationResult = await Application.deleteMany(query);

  // 3. Delete associated students
  const studentResult = await Student.deleteMany(query);

  const rollbackReport = {
    success: true,
    targetBatch: batchId || 'All Sample Migrations',
    rolledBackPayments: paymentResult.deletedCount,
    rolledBackApplications: applicationResult.deletedCount,
    rolledBackStudents: studentResult.deletedCount,
    message: `Safely reversed migration batch. Deleted ${studentResult.deletedCount} students, ${applicationResult.deletedCount} applications, and ${paymentResult.deletedCount} payments.`
  };

  await AuditLog.logAction({
    user,
    action: 'MIGRATION_BATCH_ROLLEDBACK',
    entity: 'Migration',
    entityId: batchId || 'SAMPLE_MIGRATION',
    details: rollbackReport
  });

  return rollbackReport;
};

/**
 * Lists all migration batches recorded in database
 */
const getMigrationBatches = async () => {
  const batches = await Student.aggregate([
    {
      $match: {
        migrationStatus: { $in: ['Sample', 'Committed', 'Full', 'Verified'] }
      }
    },
    {
      $group: {
        _id: '$migrationBatchId',
        migrationStatus: { $first: '$migrationStatus' },
        legacySource: { $first: '$legacySource' },
        studentCount: { $sum: 1 },
        earliestDate: { $min: '$migrationVerifiedAt' },
        latestDate: { $max: '$migrationVerifiedAt' }
      }
    },
    { $sort: { latestDate: -1 } }
  ]);

  return batches;
};

/**
 * Backward compatibility wrapper for sample migration
 */
const runSampleMigration = async (sampleSize = 10, user = null) => {
  return commitMigrationBatch({
    sampleSize,
    user,
    batchId: `SAMPLE-PHASE1-${Date.now()}`,
    migrationStatus: 'Sample'
  });
};

module.exports = {
  getSampleMigrationData,
  validateMigrationRecords,
  runDryRun,
  commitMigrationBatch,
  rollbackMigrationBatch,
  getMigrationBatches,
  runSampleMigration
};
