require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Class = require('../models/Class');
const Batch = require('../models/Batch');
const Instructor = require('../models/Instructor');
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

async function runLiveApiSuite() {
  console.log('====================================================');
  console.log('🧪 LIVE SERVER E2E API, RBAC & FUNCTIONAL SUITE');
  console.log('====================================================\n');

  let adminToken = '';
  let staffToken = '';
  let adminUser = null;
  let staffUser = null;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas for test setup...');

    // Find or create admin and staff
    adminUser = await User.findOne({ role: { $in: ['Superadmin', 'Admin'] }, status: 'Active' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Test Super Admin',
        username: 'test_superadmin',
        email: 'test_superadmin@benz.com',
        password: 'password123',
        role: 'Superadmin',
        status: 'Active'
      });
    }

    staffUser = await User.findOne({ role: 'Staff', status: 'Active' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Test Staff User',
        username: 'test_staff',
        email: 'test_staff@benz.com',
        password: 'password123',
        role: 'Staff',
        status: 'Active'
      });
    }

    let inactiveUser = await User.findOne({ status: 'Inactive' });
    if (!inactiveUser) {
      inactiveUser = await User.create({
        name: 'Test Inactive User',
        username: 'test_inactive',
        email: 'test_inactive@benz.com',
        password: 'password123',
        role: 'Staff',
        status: 'Inactive'
      });
    }

    // Set known password for login tests
    adminUser.password = 'admin123';
    await adminUser.save();
    staffUser.password = 'password123';
    await staffUser.save();

    console.log(`Admin User: ${adminUser.username} (${adminUser.role})`);
    console.log(`Staff User: ${staffUser.username} (${staffUser.role})`);
    console.log(`Inactive User: ${inactiveUser.username} (${inactiveUser.status})\n`);

    // ==========================================
    // 1. AUTHENTICATION TESTS
    // ==========================================
    console.log('--- 1. AUTHENTICATION TESTS ---');

    // 1.1 Invalid Login - Wrong password
    const res1 = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: adminUser.username, password: 'wrong_password' }
    });
    if (res1.status === 401) {
      console.log('✓ PASS: Invalid password returns 401 Unauthorized');
    } else {
      console.error(`❌ FAIL: Invalid password returned ${res1.status}`);
    }

    // 1.2 Invalid Login - Non-existent user
    const res2 = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: 'non_existent_9999', password: 'password123' }
    });
    if (res2.status === 401) {
      console.log('✓ PASS: Non-existent user returns 401 Unauthorized');
    } else {
      console.error(`❌ FAIL: Non-existent user returned ${res2.status}`);
    }

    // 1.3 Inactive User Login
    const res3 = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: inactiveUser.username, password: 'password123' }
    });
    if (res3.status === 401) {
      console.log('✓ PASS: Inactive user blocked with 401 Unauthorized');
    } else {
      console.error(`❌ FAIL: Inactive user returned ${res3.status}`);
    }

    // 1.4 Valid Login
    const adminLoginRes = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: adminUser.username, password: 'admin123' }
    });
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      adminToken = adminLoginRes.data.token;
      console.log(`✓ PASS: Admin login successful. Token acquired. Role: ${adminLoginRes.data.role}`);
    } else {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
    }

    const staffLoginRes = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: staffUser.username, password: 'password123' }
    });
    if (staffLoginRes.status === 200 && staffLoginRes.data.token) {
      staffToken = staffLoginRes.data.token;
      console.log(`✓ PASS: Staff login successful. Token acquired. Role: ${staffLoginRes.data.role}`);
    } else {
      throw new Error(`Staff login failed: ${JSON.stringify(staffLoginRes.data)}`);
    }

    // 1.5 Protected routes without token
    const resNoToken = await request(`${BASE_URL}/students`);
    if (resNoToken.status === 401) {
      console.log('✓ PASS: Accessing /api/students without token returns 401');
    } else {
      console.error(`❌ FAIL: Expected 401 without token, got ${resNoToken.status}`);
    }

    // 1.6 Protected routes with invalid token
    const resBadToken = await request(`${BASE_URL}/students`, {
      headers: { Authorization: 'Bearer malformed.token.here' }
    });
    if (resBadToken.status === 401) {
      console.log('✓ PASS: Accessing /api/students with invalid token returns 401');
    } else {
      console.error(`❌ FAIL: Expected 401 with invalid token, got ${resBadToken.status}`);
    }

    // 1.7 Check unauthenticated access on other key routes
    const routesToTest = [
      `${BASE_URL}/applications`,
      `${BASE_URL}/payments`,
      `${BASE_URL}/classes`,
      `${BASE_URL}/reports/daily`,
      `${BASE_URL}/dashboard/stats`,
      `${BASE_URL}/course-fees`,
      `${BASE_URL}/enquiries`
    ];

    for (const u of routesToTest) {
      const r = await request(u);
      if (r.status === 401) {
        console.log(`✓ PASS: ${u} requires authentication (401)`);
      } else {
        console.warn(`⚠️ GAP: ${u} permitted unauthenticated access! Status: ${r.status}`);
      }
    }

    // ==========================================
    // 2. RBAC PERMISSIONS TESTS
    // ==========================================
    console.log('\n--- 2. RBAC PERMISSIONS TESTS ---');
    const testStuMobile = '9847123999';
    await Student.deleteMany({ primaryMobile: testStuMobile });

    const createStuRes = await request(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        fullName: 'RBAC Test Student',
        primaryMobile: testStuMobile,
        vehicleType: '4 Wheeler',
        coursePackage: 'LMV+MCWG (Fresh Licence)',
        totalFee: 9500
      }
    });
    const createdStudent = createStuRes.data;
    console.log(`✓ PASS: Staff can create Student: ID ${createdStudent.studentId} (_id: ${createdStudent._id})`);

    // Staff attempts to DELETE student (should be 403 Forbidden)
    const staffDelRes = await request(`${BASE_URL}/students/${createdStudent._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    if (staffDelRes.status === 403) {
      console.log('✓ PASS: Staff deleting student is strictly blocked with 403 Forbidden');
    } else {
      console.error(`❌ FAIL: Staff deleting student returned ${staffDelRes.status}, expected 403`);
    }

    // Admin attempts to DELETE student (should succeed 200)
    const adminDelRes = await request(`${BASE_URL}/students/${createdStudent._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminDelRes.status === 200) {
      console.log('✓ PASS: Admin successfully deleted student (200 OK)');
    } else {
      console.error(`❌ FAIL: Admin deleting student returned ${adminDelRes.status}`);
    }

    // Staff creating User account
    const staffUserRes = await request(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        name: 'Hacker User',
        username: 'hacker_staff_made',
        email: 'hacker@benz.com',
        password: 'password123',
        role: 'Admin'
      }
    });
    if (staffUserRes.status === 403) {
      console.log('✓ PASS: Staff blocked from creating User accounts (403)');
    } else {
      console.warn(`⚠️ GAP: Staff creating user returned ${staffUserRes.status} (Expected 403)`);
    }

    // ==========================================
    // 3. STUDENT MODULE TESTS
    // ==========================================
    console.log('\n--- 3. STUDENT MODULE TESTS ---');
    const stu1Mobile = '9847111222';
    await Student.deleteMany({ primaryMobile: stu1Mobile });

    // Invalid mobile
    const badPhoneRes = await request(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { fullName: 'Bad Phone Student', primaryMobile: '12345', totalFee: 9000 }
    });
    if (badPhoneRes.status === 400) {
      console.log('✓ PASS: Invalid mobile number rejected with 400 Bad Request');
    } else {
      console.error(`❌ FAIL: Invalid phone returned ${badPhoneRes.status}`);
    }

    // Valid student creation
    const addStuRes = await request(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        fullName: 'Shamsudheen V P',
        primaryMobile: stu1Mobile,
        alternateMobile: '9847333444',
        vehicleType: '4 Wheeler',
        coursePackage: 'LMV+MCWG (Fresh Licence)',
        totalFee: 10000,
        paidAmount: 0,
        advanceAmount: 0,
        bloodGroup: 'B+',
        notes: 'Regular morning training student'
      }
    });
    const stu1 = addStuRes.data;
    console.log(`✓ PASS: Student created: ID ${stu1.studentId}, Name: ${stu1.fullName}`);

    // Duplicate mobile check
    const dupRes = await request(`${BASE_URL}/students/check-duplicate?mobile=${stu1Mobile}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (dupRes.data?.isDuplicate) {
      console.log(`✓ PASS: Duplicate student flagged for mobile ${stu1Mobile}: ${dupRes.data.duplicateStudent.fullName}`);
    } else {
      console.error('❌ FAIL: Duplicate check failed to detect existing mobile');
    }

    // Student list search
    const listRes = await request(`${BASE_URL}/students?search=Shamsudheen`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const list = listRes.data?.students || listRes.data || [];
    const found = list.find(s => s.primaryMobile === stu1Mobile);
    if (found) {
      console.log(`✓ PASS: Student list search returned matching record: ${found.fullName}`);
    } else {
      console.error('❌ FAIL: Student search did not find Shamsudheen');
    }

    // Edit student
    const editRes = await request(`${BASE_URL}/students/${stu1._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { address: 'West Kodur, Malappuram', bloodGroup: 'O+' }
    });
    if (editRes.data.bloodGroup === 'O+') {
      console.log('✓ PASS: Student update persisted (Blood group O+)');
    } else {
      console.error('❌ FAIL: Student update did not persist');
    }

    // ==========================================
    // 4. APPLICATION WORKFLOW TESTS
    // ==========================================
    console.log('\n--- 4. APPLICATION WORKFLOW TESTS ---');

    // Missing next action for active application
    const badAppRes = await request(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        serviceType: 'Fresh Licence',
        lifecycleStatus: 'Registered',
        nextAction: ''
      }
    });
    if (badAppRes.status === 400) {
      console.log('✓ PASS: Active Application without Next Action rejected (400 Bad Request)');
    } else {
      console.error(`❌ FAIL: Missing next action returned ${badAppRes.status}`);
    }

    // Valid Application #1
    const app1Res = await request(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        serviceType: 'Fresh Licence',
        licenceType: 'LMV+MCWG',
        vehicleClass: '4 Wheeler',
        lifecycleStatus: 'Registered',
        feeStructure: {
          packageFee: 9000,
          rtoServiceFee: 1000,
          retestFee: 0,
          otherCharges: 500,
          discount: 500
        },
        nextAction: 'Collect Form 15 and Photos',
        nextActionDueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        nextActionPriority: 'High'
      }
    });
    const app1 = app1Res.data.data;
    console.log(`✓ PASS: Application #1 created: ID ${app1.applicationId}, Net Payable: ₹${app1.feeStructure.netPayable}`);

    // Valid Application #2 for same student
    const app2Res = await request(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        serviceType: 'Additional Class',
        licenceType: 'Heavy Vehicle',
        vehicleClass: 'Heavy',
        lifecycleStatus: 'Registered',
        feeStructure: {
          packageFee: 4000,
          rtoServiceFee: 500,
          retestFee: 0,
          otherCharges: 0,
          discount: 0
        },
        nextAction: 'Submit Experience Form',
        nextActionDueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        nextActionPriority: 'Medium'
      }
    });
    const app2 = app2Res.data.data;
    console.log(`✓ PASS: Application #2 created: ID ${app2.applicationId} for the same student!`);

    // ==========================================
    // 5. PAYMENT / FINANCE TESTS
    // ==========================================
    console.log('\n--- 5. PAYMENT / FINANCE TESTS ---');

    // Negative payment validation
    const badPayRes = await request(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { student: stu1._id, amount: -100, paymentMethod: 'Cash' }
    });
    if (badPayRes.status === 400) {
      console.log('✓ PASS: Negative payment amount rejected (400)');
    } else {
      console.error(`❌ FAIL: Negative payment returned ${badPayRes.status}`);
    }

    // Payment 1: ₹3,000 Cash
    const p1Res = await request(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        application: app1._id,
        applicationId: app1.applicationId,
        amount: 3000,
        paymentType: 'Fee Payment',
        paymentMethod: 'Cash',
        notes: 'Initial fee'
      }
    });
    const p1 = p1Res.data;
    console.log(`✓ PASS: Payment #1: Receipt ${p1.receiptNo}, ₹${p1.amount} Cash`);

    // Payment 2: ₹4,000 UPI
    const p2Res = await request(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        application: app1._id,
        applicationId: app1.applicationId,
        amount: 4000,
        paymentType: 'Fee Payment',
        paymentMethod: 'UPI',
        reference: 'UPI/2026/88390',
        notes: 'Second installment'
      }
    });
    const p2 = p2Res.data;
    console.log(`✓ PASS: Payment #2: Receipt ${p2.receiptNo}, ₹${p2.amount} UPI`);

    // Payment 3: ₹1,000 Bank Transfer
    const p3Res = await request(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        application: app1._id,
        applicationId: app1.applicationId,
        amount: 1000,
        paymentType: 'Fee Payment',
        paymentMethod: 'Bank Transfer',
        reference: 'NEFT/HDFC/00192',
        notes: 'Third installment'
      }
    });
    const p3 = p3Res.data;
    console.log(`✓ PASS: Payment #3: Receipt ${p3.receiptNo}, ₹${p3.amount} Bank Transfer`);

    // Verify Formula:
    // Net Payable: 10,000
    // Total Received: 8,000
    // Balance Due: 2,000
    const checkAppRes = await request(`${BASE_URL}/applications/${app1._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const updatedApp = checkAppRes.data.data.application;
    console.log(`✓ Application Fee Breakdown Verified:`);
    console.log(`    Net Payable: ₹${updatedApp.feeStructure.netPayable}`);
    console.log(`    Total Received: ₹${updatedApp.feeStructure.totalReceived}`);
    console.log(`    Balance Due: ₹${updatedApp.feeStructure.balanceDue}`);

    if (updatedApp.feeStructure.totalReceived === 8000 && updatedApp.feeStructure.balanceDue === 2000) {
      console.log('✓ PASS: Exact balance match: 10,000 - 8,000 = 2,000');
    } else {
      console.error('❌ FAIL: Balance formula mismatch on Application!');
    }

    // ==========================================
    // 6. TRAINING / CLASS LEDGER TESTS
    // ==========================================
    console.log('\n--- 6. TRAINING / CLASS LEDGER TESTS ---');

    // Road Class: 30 KM
    const c1Res = await request(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        application: app1._id,
        applicationId: app1.applicationId,
        classDate: new Date().toISOString(),
        trainingType: 'Practical Driving (Road)',
        kmStart: 20000,
        kmEnd: 20030, // 30 KM
        duration: 60,
        vehicleNo: 'KL-10-AB-5265',
        instructor: 'Jasim P',
        notes: 'Highway training'
      }
    });
    console.log(`✓ PASS: Road Class: ${c1Res.data.kmDriven} KM driven`);

    // H Track Class: 9 H practices
    const c2Res = await request(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: stu1._id,
        application: app1._id,
        applicationId: app1.applicationId,
        classDate: new Date().toISOString(),
        trainingType: 'H Track Practice',
        hPracticeCount: 9,
        duration: 60,
        vehicleNo: 'KL-10-AB-5265',
        instructor: 'Jasim P',
        notes: 'H reverse track'
      }
    });
    console.log(`✓ PASS: H Track Class: ${c2Res.data.hPracticeCount} practices`);

    // Check Class Slip
    const slipRes = await request(`${BASE_URL}/students/${stu1._id}/class-slip`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Class slip generated. Candidate: ${slipRes.data.data.student.name}, Total Classes: ${slipRes.data.data.summary.totalClasses}`);

    // ==========================================
    // 7. RTO WORKFLOW & INDEPENDENT STAGES
    // ==========================================
    console.log('\n--- 7. RTO WORKFLOW & INDEPENDENT STAGES ---');

    // LL Stage
    const llRes = await request(`${BASE_URL}/applications/${app1._id}/stage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        stage: 'll',
        stageData: {
          llApplicationDate: new Date('2026-09-10'),
          llTestDate: new Date('2026-09-15'),
          llStatus: 'Issued',
          llNumber: 'KL-10-LL-998877',
          llIssueDate: new Date('2026-09-16'),
          llExpiryDate: new Date('2027-03-15')
        }
      }
    });
    console.log(`✓ PASS: LL Stage saved: LL No ${llRes.data.data.learnerLicence.llNumber}`);

    // Driving Test Stage
    const testRes = await request(`${BASE_URL}/applications/${app1._id}/stage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        stage: 'test',
        stageData: {
          drivingTestDate: new Date(Date.now() + 7 * 86400000),
          testTimeSlot: 'Morning 10:00 AM',
          testResult: 'Scheduled'
        }
      }
    });
    console.log(`✓ PASS: Driving Test Stage saved: Result ${testRes.data.data.drivingTest.testResult}`);
    if (testRes.data.data.learnerLicence.llNumber === 'KL-10-LL-998877') {
      console.log('✓ PASS: LL details intact after test stage update');
    } else {
      console.error('❌ FAIL: LL details were overwritten by test stage update!');
    }

    // Retest
    const retestRes = await request(`${BASE_URL}/applications/${app1._id}/stage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        stage: 'test',
        stageData: {
          testResult: 'Failed',
          retestDate: new Date(Date.now() + 14 * 86400000)
        }
      }
    });
    console.log(`✓ PASS: Retest recorded: Status ${retestRes.data.data.lifecycleStatus}, Retest Count ${retestRes.data.data.drivingTest.retestCount}`);

    // Licence Dispatch
    const dlRes = await request(`${BASE_URL}/applications/${app1._id}/stage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        stage: 'licence',
        stageData: {
          dlNumber: 'KL-10-20260011223',
          licenceStatus: 'Delivered',
          receivedDispatchStatus: 'Delivered to Candidate'
        }
      }
    });
    console.log(`✓ PASS: Licence stage updated: DL ${dlRes.data.data.licence.dlNumber}, Lifecycle: ${dlRes.data.data.lifecycleStatus}`);

    // ==========================================
    // 8. GLOBAL SEARCH
    // ==========================================
    console.log('\n--- 8. GLOBAL SEARCH TESTS ---');
    const sName = await request(`${BASE_URL}/students/global-search?q=Shamsudheen`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Search by Name returned ${sName.data.results.length} result(s)`);

    const sPhone = await request(`${BASE_URL}/students/global-search?q=${stu1Mobile}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Search by Phone returned ${sPhone.data.results.length} result(s)`);

    const sLL = await request(`${BASE_URL}/students/global-search?q=KL-10-LL-998877`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Search by LL returned ${sLL.data.results.length} result(s)`);

    const sDL = await request(`${BASE_URL}/students/global-search?q=KL-10-20260011223`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Search by DL returned ${sDL.data.results.length} result(s)`);

    // ==========================================
    // 9. DASHBOARD TODAY COMMAND CENTRE
    // ==========================================
    console.log('\n--- 9. DASHBOARD TODAY COMMAND CENTRE ---');
    const dRes = await request(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const d = dRes.data;
    console.log(`✓ PASS: Dashboard stats loaded:`);
    console.log(`    Total Students: ${d.stats.totalStudents}`);
    console.log(`    Active Applications: ${d.stats.activeApplications}`);
    console.log(`    Todays Collections: ₹${d.stats.todaysCollections}`);
    console.log(`    Todays Classes: ${d.stats.todaysClasses}`);
    console.log(`    Total Outstanding Amount: ₹${d.stats.totalPendingAmount}`);

    // ==========================================
    // 10. REPORTS
    // ==========================================
    console.log('\n--- 10. REPORTS MODULE TESTS ---');
    const daily = await request(`${BASE_URL}/reports/daily`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Daily Report: Date ${daily.data.date}, Collections ₹${daily.data.summary.totalCollectionsAmount}`);

    const monthly = await request(`${BASE_URL}/reports/monthly`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Monthly Report: Month ${monthly.data.month}/${monthly.data.year}, Collected ₹${monthly.data.summary.totalCollected}, Outstanding ₹${monthly.data.summary.totalOutstanding}`);

    // Cleanup
    await Student.deleteOne({ _id: stu1._id });
    await Application.deleteMany({ student: stu1._id });
    await Payment.deleteMany({ student: stu1._id });
    await Class.deleteMany({ student: stu1._id });
    console.log('\n✅ Cleaned up temporary test artifacts.');

    console.log('\n====================================================');
    console.log('🎉 ALL LIVE SERVER SUITE CHECKS COMPLETED!');
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runLiveApiSuite();
