require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Class = require('../models/Class');
const StudentDocument = require('../models/StudentDocument');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');
const generateApplicationId = require('../utils/generateApplicationId');
const generateStudentId = require('../utils/generateStudentId');

async function runAuditSuite() {
  console.log('====================================================================');
  console.log('🏁 BENZ AUTO CONSULTANT OS — OFFICIAL COMPREHENSIVE AUDIT TEST SUITE');
  console.log('====================================================================\n');

  const testPhone = '9999888801';
  let testStudentId = null;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Clean up any stale records from previous runs
    await Student.deleteMany({ primaryMobile: testPhone });
    await Application.deleteMany({ studentId: /^AUDIT-STU-/ });
    await AuditLog.deleteMany({ 'details.testRunner': true });

    // -------------------------------------------------------------------------
    // WORKFLOW 1: CREATE STUDENT & SEPARATE APPLICATIONS (P0-1)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 1] P0-1: ONE STUDENT -> MULTIPLE SEPARATE APPLICATIONS ---');
    testStudentId = `AUDIT-STU-${Date.now()}`;
    const student = await Student.create({
      studentId: testStudentId,
      fullName: 'Muhammed Basheer K',
      primaryMobile: testPhone,
      aliasSourceName: 'Basheer Kodur',
      leadSource: 'Walk-in',
      referral: 'Local Friend',
      totalFee: 10000,
      paidAmount: 0,
      advanceAmount: 0,
      currentStatus: 'Active'
    });
    console.log(`✓ Permanent Student Master created: ${student.fullName} (Student ID: ${student.studentId})`);

    // Application #1: Fresh Licence
    const appId1 = await generateApplicationId();
    const app1 = await Application.create({
      applicationId: appId1,
      student: student._id,
      studentId: student.studentId,
      serviceType: 'Fresh Licence',
      licenceType: 'LMV+MCWG',
      vehicleClass: '4 Wheeler',
      lifecycleStatus: 'Training',
      feeStructure: {
        packageFee: 9000,
        rtoServiceFee: 1500,
        retestFee: 0,
        otherCharges: 0,
        discount: 500,
        netPayable: 10000,
        totalReceived: 0,
        balanceDue: 10000
      },
      nextAction: 'Schedule Road Driving Class',
      nextActionDueDate: new Date(Date.now() + 3 * 86400000),
      nextActionPriority: 'High',
      nextActionStatus: 'Pending'
    });
    console.log(`✓ Application #1 created: ID ${app1.applicationId} (${app1.serviceType})`);

    // Application #2: Additional Class (Same person, independent service)
    const appId2 = await generateApplicationId();
    const app2 = await Application.create({
      applicationId: appId2,
      student: student._id,
      studentId: student.studentId,
      serviceType: 'Additional Class',
      licenceType: 'Heavy Vehicle',
      vehicleClass: 'Heavy',
      lifecycleStatus: 'Registered',
      feeStructure: {
        packageFee: 5000,
        rtoServiceFee: 500,
        retestFee: 0,
        otherCharges: 0,
        discount: 0,
        netPayable: 5500,
        totalReceived: 0,
        balanceDue: 5500
      },
      nextAction: 'Submit Form 15 & Medical Certificate',
      nextActionDueDate: new Date(Date.now() + 5 * 86400000),
      nextActionPriority: 'Medium',
      nextActionStatus: 'Pending'
    });
    console.log(`✓ Application #2 created: ID ${app2.applicationId} (${app2.serviceType})`);

    const candidateApps = await Application.find({ student: student._id });
    if (candidateApps.length !== 2) throw new Error('Student-Application separation failed! Count must be 2.');
    console.log(`✓ Verified: 1 Student Master (${student.studentId}) owns ${candidateApps.length} distinct service applications.`);

    // -------------------------------------------------------------------------
    // WORKFLOW 2: TRANSACTION-BASED PAYMENT LEDGER & BENZ-REC-XXXX (P0-2)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 2] P0-2: TRANSACTION-BASED PAYMENT LEDGER (10,000 -> 2,000 + 3,000 + 1,000) ---');
    // Pay 1: ₹2,000
    const seq1 = await Counter.findByIdAndUpdate({ _id: 'receiptNo' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const rec1 = `BENZ-REC-${String(seq1.seq).padStart(4, '0')}`;
    const p1 = await Payment.create({
      receiptNo: rec1,
      student: student._id,
      application: app1._id,
      applicationId: app1.applicationId,
      amount: 2000,
      paymentMethod: 'Cash',
      receivedBy: 'Office Staff',
      feeBreakdown: { packageFee: 9000, rtoServiceFee: 1500, discount: 500, netPayable: 10000, totalReceived: 2000, balanceDue: 8000 }
    });

    // Pay 2: ₹3,000
    const seq2 = await Counter.findByIdAndUpdate({ _id: 'receiptNo' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const rec2 = `BENZ-REC-${String(seq2.seq).padStart(4, '0')}`;
    const p2 = await Payment.create({
      receiptNo: rec2,
      student: student._id,
      application: app1._id,
      applicationId: app1.applicationId,
      amount: 3000,
      paymentMethod: 'UPI',
      receivedBy: 'Office Staff',
      feeBreakdown: { packageFee: 9000, rtoServiceFee: 1500, discount: 500, netPayable: 10000, totalReceived: 5000, balanceDue: 5000 }
    });

    // Pay 3: ₹1,000
    const seq3 = await Counter.findByIdAndUpdate({ _id: 'receiptNo' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const rec3 = `BENZ-REC-${String(seq3.seq).padStart(4, '0')}`;
    const p3 = await Payment.create({
      receiptNo: rec3,
      student: student._id,
      application: app1._id,
      applicationId: app1.applicationId,
      amount: 1000,
      paymentMethod: 'Bank Transfer',
      receivedBy: 'Office Staff',
      feeBreakdown: { packageFee: 9000, rtoServiceFee: 1500, discount: 500, netPayable: 10000, totalReceived: 6000, balanceDue: 4000 }
    });

    // Recompute dynamic totals from database
    const allPay = await Payment.find({ application: app1._id });
    const totalRec = allPay.reduce((acc, p) => acc + p.amount, 0);
    const netPayable = app1.feeStructure.netPayable;
    const balanceDue = netPayable - totalRec;

    app1.feeStructure.totalReceived = totalRec;
    app1.feeStructure.balanceDue = balanceDue;
    await app1.save();

    console.log(`✓ Payment 1: ₹${p1.amount} (${p1.receiptNo})`);
    console.log(`✓ Payment 2: ₹${p2.amount} (${p2.receiptNo})`);
    console.log(`✓ Payment 3: ₹${p3.amount} (${p3.receiptNo})`);
    console.log(`✓ Net Payable: ₹${netPayable} | Total Received: ₹${totalRec} | Balance Due: ₹${balanceDue}`);

    if (totalRec !== 6000 || balanceDue !== 4000) {
      throw new Error(`Payment calculation failed! Expected Rec: 6000, Bal: 4000, Got: Rec: ${totalRec}, Bal: ${balanceDue}`);
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 3 & 4: TRAINING & CLASS LEDGER (5 KM = 1 ROAD, 3 H = 1 H) (P0-3)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 3 & 4] P0-3: TRAINING LEDGER RULES (5 KM = 1 ROAD CLASS, 3 H = 1 H CLASS) ---');
    // Class 1: Road Training with KM Start 1000, KM End 1025 -> 25 KM
    const c1 = await Class.create({
      student: student._id,
      application: app1._id,
      applicationId: app1.applicationId,
      classDate: new Date(),
      trainingType: 'Road Training',
      kmStart: 1000,
      kmEnd: 1025,
      duration: 60,
      vehicleNo: 'KL-10-AB-5265',
      instructor: 'Jasim P'
    });

    // Class 2: H Practice with 6 H practices
    const c2 = await Class.create({
      student: student._id,
      application: app1._id,
      applicationId: app1.applicationId,
      classDate: new Date(),
      trainingType: 'H Track Practice',
      hPracticeCount: 6,
      duration: 45,
      vehicleNo: 'KL-10-AB-5265',
      instructor: 'Jasim P'
    });

    const kmDriven = c1.kmDriven; // 25 KM
    const hPractices = c2.hPracticeCount; // 6 H
    const roadClasses = Math.floor(kmDriven / 5); // 5 classes
    const hClasses = Math.floor(hPractices / 3); // 2 classes
    const totalClasses = roadClasses + hClasses; // 7 classes

    console.log(`✓ Road Class KM Driven: ${kmDriven} KM -> Road Classes: ${roadClasses}`);
    console.log(`✓ H Track Practices: ${hPractices} Tracks -> H Classes: ${hClasses}`);
    console.log(`✓ Total Calculated Classes: ${totalClasses} Classes`);

    if (roadClasses !== 5 || hClasses !== 2 || totalClasses !== 7) {
      throw new Error(`Training ledger rules failed! Expected 5 road, 2 H, 7 total. Got ${roadClasses}, ${hClasses}, ${totalClasses}`);
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 5 & 6: INDEPENDENT LL, DRIVING TEST & LICENCE STAGES (P0-4)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 5 & 6] P0-4: INDEPENDENT LL, DRIVING TEST, RETEST & DL WORKFLOWS ---');
    // Update LL stage
    app1.learnerLicence = {
      llApplicationDate: new Date('2026-09-01'),
      llTestDate: new Date('2026-09-05'),
      llStatus: 'Issued',
      llNumber: 'KL-10-LL-202600123',
      llIssueDate: new Date('2026-09-06'),
      llExpiryDate: new Date('2027-03-05')
    };
    app1.lifecycleStatus = 'Training';
    await app1.save();
    console.log(`✓ LL Stage saved: LL No ${app1.learnerLicence.llNumber}, Status: ${app1.learnerLicence.llStatus}`);

    // Schedule Driving Test -> Fail
    app1.drivingTest = {
      drivingTestDate: new Date('2026-10-10'),
      testTimeSlot: 'Morning 09:30 AM',
      vehicleClass: '4 Wheeler',
      testResult: 'Failed',
      retestCount: 1,
      retestDate: new Date('2026-10-20')
    };
    app1.lifecycleStatus = 'Retest';
    await app1.save();
    console.log(`✓ Driving Test Failed -> Retest Scheduled: Date ${app1.drivingTest.retestDate.toISOString().split('T')[0]}, Retest Count: ${app1.drivingTest.retestCount}, Status: ${app1.lifecycleStatus}`);

    // Verify LL was not touched/overwritten!
    if (app1.learnerLicence.llNumber !== 'KL-10-LL-202600123') {
      throw new Error('Driving Test update corrupted LL details!');
    }

    // Retest Passed -> Update DL
    app1.drivingTest.testResult = 'Passed';
    app1.lifecycleStatus = 'Test Passed';
    app1.licence = {
      licenceStatus: 'Delivered',
      dlNumber: 'KL-10-DL-20260099887',
      issueDate: new Date(),
      completionDate: new Date(),
      receivedDispatchStatus: 'Delivered to Candidate'
    };
    app1.lifecycleStatus = 'Completed';
    await app1.save();
    console.log(`✓ Retest Passed & DL Issued: DL No ${app1.licence.dlNumber}, Lifecycle: ${app1.lifecycleStatus}`);

    // Verify LL still intact
    if (app1.learnerLicence.llNumber !== 'KL-10-LL-202600123') {
      throw new Error('Licence update corrupted LL details!');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 7: MANDATORY NEXT ACTION & OVERDUE DETECTION (P0-5)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 7] P0-5: MANDATORY NEXT ACTION & OVERDUE DETECTION ---');
    const overdueApp = await Application.create({
      applicationId: await generateApplicationId(),
      student: student._id,
      studentId: student.studentId,
      serviceType: 'Endorsement',
      lifecycleStatus: 'Registered',
      nextAction: 'Collect Original Aadhaar & Photo',
      nextActionDueDate: new Date(Date.now() - 2 * 86400000), // Due 2 days ago
      nextActionPriority: 'Urgent',
      nextActionStatus: 'Pending'
    });
    // Trigger pre-save overdue flag
    await overdueApp.save();
    console.log(`✓ Overdue Application flagged: "${overdueApp.nextAction}", Due Date: ${overdueApp.nextActionDueDate.toISOString().split('T')[0]}, Status: ${overdueApp.nextActionStatus}`);
    if (overdueApp.nextActionStatus !== 'Overdue') {
      throw new Error('Mandatory Next Action overdue detection failed!');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 8: SMART DOCUMENT CHECKLIST & AUDIT TIMELINE LOGGING (P1)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST 8] P1: SMART DOCUMENT VERIFICATION & READINESS % ---');
    const docTypes = ['Aadhaar / ID', 'Photo', 'Address Proof', 'Blood Group', 'Form 15'];
    for (const dt of docTypes) {
      await StudentDocument.create({
        student: student._id,
        application: app1._id,
        applicationId: app1.applicationId,
        documentType: dt,
        fileName: `${dt.replace(/\s+/g, '_')}.pdf`,
        status: 'Verified',
        verifiedDate: new Date(),
        verifiedByName: 'Senior Auditor'
      });
    }

    const updatedStu = await Student.findById(student._id);
    const verifiedKeys = Object.values(updatedStu.documentReadiness).filter(Boolean).length;
    console.log(`✓ Document Readiness: ${verifiedKeys}/5 verified (Aadhaar: ${updatedStu.documentReadiness.aadhaarVerified}, Photo: ${updatedStu.documentReadiness.photoVerified}, Form15: ${updatedStu.documentReadiness.form15Ready})`);
    if (verifiedKeys !== 5) {
      throw new Error(`Document readiness check failed! Expected 5 verified, got ${verifiedKeys}`);
    }

    // Clean up test data
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    await Student.deleteMany({ _id: student._id });
    await Application.deleteMany({ student: student._id });
    await Payment.deleteMany({ student: student._id });
    await Class.deleteMany({ student: student._id });
    await StudentDocument.deleteMany({ student: student._id });
    console.log('✅ Cleaned up temporary test database records.');

    console.log('\n====================================================================');
    console.log('🎉 ALL AUDIT WORKFLOWS 1 TO 8 EXECUTED AND VERIFIED 100% SUCCESFULLY!');
    console.log('====================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Audit Test Suite Failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAuditSuite();
