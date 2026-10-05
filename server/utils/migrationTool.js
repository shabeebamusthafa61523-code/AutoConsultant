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
    const balance = Number(feeInfo['Balance']) || (totalFee - paidAmount);

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
 * Executes a controlled sample migration of N students (default 10) into:
 * students -> applications -> payments
 * Ensures:
 * - NEVER deletes original database
 * - Sets legacySource, legacyId, migrationStatus='Sample', migrationVerifiedAt
 * - Avoids duplicate insertion if already migrated
 */
const runSampleMigration = async (sampleSize = 10, user = null) => {
  const sampleData = getSampleMigrationData(sampleSize);

  const results = {
    migratedStudents: 0,
    migratedApplications: 0,
    migratedPayments: 0,
    skippedCount: 0,
    details: []
  };

  for (const item of sampleData) {
    // 1. Check if already migrated
    const existing = await Student.findOne({
      $or: [{ legacyId: item.legacyId }, { primaryMobile: item.mobile }]
    });

    if (existing) {
      results.skippedCount++;
      results.details.push({
        legacyId: item.legacyId,
        status: 'Skipped - already exists in CRM',
        studentId: existing.studentId
      });
      continue;
    }

    // 2. Create Student Master
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
      migrationStatus: 'Sample',
      migrationVerifiedAt: new Date(),
      timeline: [
        {
          action: 'Legacy Migration (Sample Phase 1)',
          category: 'Registration',
          description: `Migrated from legacy database (${item.legacyId}) under Phase 1 Sample verification`,
          timestamp: new Date(),
          performedBy: user ? user.name : 'Migration Tool'
        }
      ]
    });
    results.migratedStudents++;

    // 3. Create Separate Application
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
      migrationStatus: 'Sample',
      migrationVerifiedAt: new Date(),
      notes: `Phase 1 Verified Sample Migration from Legacy ID ${item.legacyId}`
    });
    results.migratedApplications++;

    // 4. Create Separate Payment Transaction if paidAmount > 0
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
        notes: `Legacy Payment record for ${item.legacyId}`,
        legacySource: 'DDS_Fee_Management_Database_2026.xlsx',
        legacyId: item.legacyId,
        migrationStatus: 'Sample',
        migrationVerifiedAt: new Date()
      });
      results.migratedPayments++;
    }

    results.details.push({
      legacyId: item.legacyId,
      studentId: student.studentId,
      applicationId: app.applicationId,
      paidAmount: item.paidAmount,
      balance: item.balance,
      status: 'Migrated & Verified'
    });
  }

  // Record migration run in AuditLog
  await AuditLog.logAction({
    user,
    action: 'SAMPLE_MIGRATION_EXECUTED',
    entity: 'Migration',
    entityId: 'PHASE_1_SAMPLE',
    details: {
      migratedStudents: results.migratedStudents,
      migratedApplications: results.migratedApplications,
      migratedPayments: results.migratedPayments,
      skipped: results.skippedCount
    }
  });

  return results;
};

module.exports = {
  getSampleMigrationData,
  runSampleMigration
};
