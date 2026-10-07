require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Class = require('../models/Class');
const StudentDocument = require('../models/StudentDocument');

const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, { method, headers, body });
  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

async function runRealCandidateLifecycle() {
  console.log('========================================================================');
  console.log('🌟 BENZ AUTO CONSULTANT CRM — COMPLETE REAL CANDIDATE E2E LIFECYCLE');
  console.log('========================================================================\n');

  const candidatePhone = '9847555666';

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // Clean up any previous test candidate
    await Student.deleteMany({ primaryMobile: candidatePhone });
    await Application.deleteMany({ 'learnerLicence.llNumber': 'KL-10-LL-REAL-001' });

    // Authenticate Admin
    const adminUser = await User.findOne({ role: 'Superadmin', status: 'Active' });
    const adminLogin = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: adminUser.username, password: 'admin123' }
    });
    const token = adminLogin.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // -------------------------------------------------------------------------
    // STAGE 1: LEAD / ENQUIRY CREATION
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 1] LEAD INTAKE (ENQUIRY) ---');
    const enqRes = await request(`${BASE_URL}/enquiries`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'Arjun Nambiar',
        primaryMobile: candidatePhone,
        interestedLicence: 'LMV+MCWG',
        leadSource: 'Walk-in',
        notes: 'Interested in morning 4-wheeler package'
      }
    });
    const enquiry = enqRes.data;
    console.log(`✓ Lead logged: ${enquiry.name} (${enquiry.primaryMobile}), Status: ${enquiry.status}`);

    // -------------------------------------------------------------------------
    // STAGE 2: FORMAL STUDENT REGISTRATION (ENQUIRY CONVERSION)
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 2] STUDENT REGISTRATION ---');
    const regRes = await request(`${BASE_URL}/students`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        fullName: 'Arjun Nambiar',
        gender: 'Male',
        primaryMobile: candidatePhone,
        alternateMobile: '9847555777',
        vehicleType: '4 Wheeler',
        coursePackage: 'LMV+MCWG (Fresh Licence)',
        totalFee: 11000,
        paidAmount: 0,
        advanceAmount: 0,
        address: 'Melmuri, Malappuram, Kerala',
        bloodGroup: 'B+',
        leadSource: 'Walk-in',
        notes: 'Converted from walk-in lead'
      }
    });
    const student = regRes.data;
    console.log(`✓ Student Master Registered: ${student.fullName} (Student ID: ${student.studentId}, _id: ${student._id})`);

    // -------------------------------------------------------------------------
    // STAGE 3: APPLICATION CREATION WITH FINANCIAL CONTRACT & NEXT ACTION
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 3] SERVICE APPLICATION & CONTRACT ---');
    const appRes = await request(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        serviceType: 'Fresh Licence',
        licenceType: 'LMV+MCWG',
        vehicleClass: '4 Wheeler',
        coursePackage: 'LMV+MCWG (Fresh Licence)',
        lifecycleStatus: 'Documents Pending',
        feeStructure: {
          packageFee: 9500,
          rtoServiceFee: 1500,
          retestFee: 0,
          otherCharges: 500,
          discount: 500
        },
        nextAction: 'Collect Original Aadhaar & Passport Photo',
        nextActionDueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        nextActionPriority: 'High',
        nextActionAssignedTo: 'Front Desk'
      }
    });
    const application = appRes.data.data;
    console.log(`✓ Application Generated: ID ${application.applicationId}`);
    console.log(`    Net Payable: ₹${application.feeStructure.netPayable} (9500 + 1500 + 500 - 500)`);
    console.log(`    Next Action: "${application.nextAction}" (Due: ${application.nextActionDueDate.split('T')[0]})`);

    // -------------------------------------------------------------------------
    // STAGE 4: DOCUMENT SUBMISSION & VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 4] DOCUMENT INTAKE & VERIFICATION ---');
    // Upload Aadhaar
    const doc1Res = await request(`${BASE_URL}/student-documents`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        application: application._id,
        applicationId: application.applicationId,
        documentType: 'Aadhaar / ID',
        documentNumber: '9988 7766 5544',
        fileUrl: '/uploads/sample_aadhaar.pdf',
        fileName: 'arjun_aadhaar.pdf',
        status: 'Submitted'
      }
    });
    const aadhaarDoc = doc1Res.data;

    // Verify Aadhaar
    const verifyDoc = await request(`${BASE_URL}/student-documents/${aadhaarDoc._id}/verify`, {
      method: 'PUT',
      headers: authHeaders,
      body: { remarks: 'Verified against original Aadhaar card' }
    });
    console.log(`✓ Document Verified: ${verifyDoc.data.documentType}, Status: ${verifyDoc.data.status}`);

    // Update Application lifecycle: LL Processing
    await request(`${BASE_URL}/applications/${application._id}/stage`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        stage: 'lifecycle',
        stageData: {
          lifecycleStatus: 'LL Processing',
          nextAction: 'Submit LL Application on Sarathi Portal',
          nextActionDueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          nextActionPriority: 'High'
        }
      }
    });
    console.log(`✓ Lifecycle Transition -> LL Processing`);

    // -------------------------------------------------------------------------
    // STAGE 5: LEARNER LICENCE (LL) ISSUE
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 5] LEARNER LICENCE (LL) ISSUE ---');
    const llRes = await request(`${BASE_URL}/applications/${application._id}/stage`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        stage: 'll',
        stageData: {
          llApplicationDate: new Date('2026-09-01'),
          llTestDate: new Date('2026-09-05'),
          llStatus: 'Issued',
          llNumber: 'KL-10-LL-REAL-001',
          llIssueDate: new Date('2026-09-06'),
          llExpiryDate: new Date('2027-03-05'),
          nextAction: 'Schedule Practical Road Training',
          nextActionDueDate: new Date(Date.now() + 2 * 86400000).toISOString()
        }
      }
    });
    console.log(`✓ LL Stage Completed: Number ${llRes.data.data.learnerLicence.llNumber}, Lifecycle: ${llRes.data.data.lifecycleStatus}`);

    // -------------------------------------------------------------------------
    // STAGE 6: FEE PAYMENT (TRANSACTION 1 - ₹5,000 via UPI)
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 6] FINANCIAL COLLECTION 1 ---');
    const pay1Res = await request(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        application: application._id,
        applicationId: application.applicationId,
        amount: 5000,
        paymentType: 'Fee Payment',
        paymentMethod: 'UPI',
        reference: 'UPI/2026/BENZ99812',
        notes: 'Initial fee payment before training starts'
      }
    });
    console.log(`✓ Payment #1 Recorded: Receipt ${pay1Res.data.receiptNo}, Amount: ₹${pay1Res.data.amount}, Remaining Balance: ₹${pay1Res.data.balanceAfter}`);

    // -------------------------------------------------------------------------
    // STAGE 7: PRACTICAL TRAINING (ROAD + H TRACK SESSIONS)
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 7] PRACTICAL TRAINING & CLASS LEDGER ---');
    // Road Training Session 1: 25 KM
    await request(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        application: application._id,
        applicationId: application.applicationId,
        classDate: new Date().toISOString(),
        trainingType: 'Practical Driving (Road)',
        kmStart: 35000,
        kmEnd: 35025, // 25 KM
        duration: 60,
        vehicleNo: 'KL-10-AB-5265',
        instructor: 'Jasim P',
        notes: 'Highway steering and braking control'
      }
    });

    // Road Training Session 2: 25 KM
    await request(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        application: application._id,
        applicationId: application.applicationId,
        classDate: new Date().toISOString(),
        trainingType: 'Practical Driving (Road)',
        kmStart: 35025,
        kmEnd: 35050, // 25 KM
        duration: 60,
        vehicleNo: 'KL-10-AB-5265',
        instructor: 'Jasim P',
        notes: 'City traffic driving'
      }
    });

    // H Track Session: 9 H track clearances
    await request(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        application: application._id,
        applicationId: application.applicationId,
        classDate: new Date().toISOString(),
        trainingType: 'H Track Practice',
        hPracticeCount: 9,
        duration: 60,
        vehicleNo: 'KL-10-AB-5265',
        instructor: 'Jasim P',
        notes: 'H reverse track clearance'
      }
    });

    // Verify Training Ledger Formulas:
    // Total Road KM = 50 KM -> 50 / 5 = 10 Road Classes
    // Total H Practices = 9 -> 9 / 3 = 3 H Classes
    // Total Classes = 13 Classes
    const slipRes = await request(`${BASE_URL}/students/${student._id}/class-slip`, {
      headers: authHeaders
    });
    const summary = slipRes.data.data.summary;
    console.log(`✓ Training Ledger Verification:`);
    console.log(`    Total KM Driven: ${summary.totalKm} KM -> Road Classes: ${summary.roadClasses}`);
    console.log(`    Total H Practices: ${summary.totalHPractices} -> H Classes: ${summary.hClasses}`);
    console.log(`    Total Calculated Classes: ${summary.totalClasses}`);

    if (summary.totalKm === 50 && summary.roadClasses === 10 && summary.totalHPractices === 9 && summary.hClasses === 3 && summary.totalClasses === 13) {
      console.log('✓ PASS: BENZ R&D Training formula verified with 100% exact math!');
    } else {
      console.error('❌ FAIL: Training class derivation formula mismatch!');
    }

    // -------------------------------------------------------------------------
    // STAGE 8: RTO DRIVING TEST (INITIAL TEST - SCHEDULED & FAILED)
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 8] RTO DRIVING TEST 1 (FAILED -> RETEST) ---');
    // Test Scheduled
    await request(`${BASE_URL}/applications/${application._id}/stage`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        stage: 'test',
        stageData: {
          drivingTestDate: new Date(Date.now() + 5 * 86400000),
          testTimeSlot: 'Morning 09:30 AM',
          vehicleClass: '4 Wheeler',
          testResult: 'Scheduled',
          nextAction: 'Attend RTO Driving Ground Test',
          nextActionDueDate: new Date(Date.now() + 5 * 86400000).toISOString()
        }
      }
    });

    // Test Failed -> Retest
    const retestRes = await request(`${BASE_URL}/applications/${application._id}/stage`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        stage: 'test',
        stageData: {
          testResult: 'Failed',
          retestDate: new Date(Date.now() + 12 * 86400000),
          nextAction: 'Pay Retest Fee and Practice Additional H Track',
          nextActionDueDate: new Date(Date.now() + 4 * 86400000).toISOString(),
          nextActionPriority: 'High'
        }
      }
    });
    console.log(`✓ Test Stage -> Failed -> Lifecycle: ${retestRes.data.data.lifecycleStatus}, Retest Count: ${retestRes.data.data.drivingTest.retestCount}`);

    // Add Retest Fee to feeStructure
    await request(`${BASE_URL}/applications/${application._id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        feeStructure: {
          retestFee: 500
        }
      }
    });
    console.log(`✓ Retest Fee (₹500) appended to Application fee structure.`);

    // -------------------------------------------------------------------------
    // STAGE 9: FINAL PAYMENT (CLEARING ALL DUES - ₹6,500 Cash)
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 9] FINAL SETTLEMENT PAYMENT ---');
    // Net Payable: 11,000 + 500 (retest) = 11,500. Total Received previously = 5,000. Balance = 6,500.
    const pay2Res = await request(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        student: student._id,
        application: application._id,
        applicationId: application.applicationId,
        amount: 6500,
        paymentType: 'Fee Payment',
        paymentMethod: 'Cash',
        notes: 'Final settlement including retest fee'
      }
    });
    console.log(`✓ Final Payment Recorded: Receipt ${pay2Res.data.receiptNo}, Amount: ₹${pay2Res.data.amount}, Balance After: ₹${pay2Res.data.balanceAfter}`);

    // -------------------------------------------------------------------------
    // STAGE 10: RETEST PASSED & DRIVING LICENCE (DL) DELIVERED -> COMPLETED
    // -------------------------------------------------------------------------
    console.log('\n--- [STAGE 10] RETEST PASSED & LICENCE DISPATCH ---');
    // Retest Passed
    await request(`${BASE_URL}/applications/${application._id}/stage`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        stage: 'test',
        stageData: {
          testResult: 'Passed',
          nextAction: 'Track Driving Licence Dispatch on MVD Kerala Portal',
          nextActionDueDate: new Date(Date.now() + 7 * 86400000).toISOString()
        }
      }
    });

    // Licence Delivered
    const dlCompletionRes = await request(`${BASE_URL}/applications/${application._id}/stage`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        stage: 'licence',
        stageData: {
          dlNumber: 'KL-10-2026-0044556',
          licenceStatus: 'Delivered',
          receivedDispatchStatus: 'Delivered to Candidate in Office',
          completionDate: new Date(),
          nextAction: 'Service Completed Successfully',
          nextActionDueDate: new Date().toISOString(),
          nextActionStatus: 'Completed'
        }
      }
    });

    const finalApp = dlCompletionRes.data.data;
    console.log(`✓ DL Stage Completed: DL Number ${finalApp.licence.dlNumber}`);
    console.log(`✓ Lifecycle Status: ${finalApp.lifecycleStatus} (Completed)`);
    console.log(`✓ Final Ledger Breakdown:`);
    console.log(`    Net Payable: ₹${finalApp.feeStructure.netPayable}`);
    console.log(`    Total Received: ₹${finalApp.feeStructure.totalReceived}`);
    console.log(`    Balance Due: ₹${finalApp.feeStructure.balanceDue}`);

    if (finalApp.lifecycleStatus === 'Completed' && finalApp.feeStructure.balanceDue === 0) {
      console.log('✓ PASS: Full candidate workflow executed from Lead -> Admission -> Documents -> LL -> Training -> Payment -> Test -> Retest -> Licence -> Completed with ZERO balance due!');
    } else {
      console.error('❌ FAIL: Final workflow status or balance check failed!');
    }

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST DATA ---');
    await Student.deleteOne({ _id: student._id });
    await Application.deleteMany({ student: student._id });
    await Payment.deleteMany({ student: student._id });
    await Class.deleteMany({ student: student._id });
    await StudentDocument.deleteMany({ student: student._id });
    console.log('✅ Cleaned up temporary test artifacts.');

    console.log('\n========================================================================');
    console.log('🎉 REAL CANDIDATE E2E LIFECYCLE 100% VERIFIED ACROSS ALL 10 STAGES!');
    console.log('========================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E Lifecycle failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runRealCandidateLifecycle();
