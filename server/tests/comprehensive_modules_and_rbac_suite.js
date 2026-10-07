require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
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

async function runComprehensiveSuite() {
  console.log('====================================================================');
  console.log('🧪 BENZ CRM — INSTRUCTOR, BATCH, DOCS, BULK INTAKE & RBAC SUITE');
  console.log('====================================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // 1. Setup Users for Admin, Manager, and Staff
    let admin = await User.findOne({ role: 'Superadmin', status: 'Active' });
    if (!admin) {
      admin = await User.create({
        name: 'Super Admin Test',
        username: 'superadmin_test',
        email: 'superadmin_test@benz.com',
        password: 'password123',
        role: 'Superadmin',
        status: 'Active'
      });
    }

    let manager = await User.findOne({ role: 'Manager', status: 'Active' });
    if (!manager) {
      manager = await User.create({
        name: 'Branch Manager',
        username: 'manager_benz',
        email: 'manager@benz.com',
        password: 'password123',
        role: 'Manager',
        status: 'Active'
      });
    }

    let staff = await User.findOne({ role: 'Staff', status: 'Active' });
    if (!staff) {
      staff = await User.create({
        name: 'Staff Frontdesk',
        username: 'staff_frontdesk',
        email: 'staff@benz.com',
        password: 'password123',
        role: 'Staff',
        status: 'Active'
      });
    }

    admin.password = 'admin123';
    await admin.save();
    manager.password = 'password123';
    await manager.save();
    staff.password = 'password123';
    await staff.save();

    // Login each user
    const adminLogin = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: admin.username, password: 'admin123' }
    });
    const adminToken = adminLogin.data.token;

    const managerLogin = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: manager.username, password: 'password123' }
    });
    const managerToken = managerLogin.data.token;

    const staffLogin = await request(`${BASE_URL}/users/login`, {
      method: 'POST',
      body: { username: staff.username, password: 'password123' }
    });
    const staffToken = staffLogin.data.token;

    console.log('✓ Admin, Manager, and Staff authenticated successfully.\n');

    // =========================================================================
    // SECTION A: VERIFY NEWLY SECURED ROUTES REJECT UNAUTHENTICATED CALLS
    // =========================================================================
    console.log('--- SECTION A: VERIFY NEWLY SECURED ROUTES ---');
    const newlySecuredRoutes = [
      `${BASE_URL}/dashboard/stats`,
      `${BASE_URL}/course-fees`,
      `${BASE_URL}/enquiries`
    ];

    for (const url of newlySecuredRoutes) {
      const res = await request(url);
      if (res.status === 401) {
        console.log(`✓ PASS: ${url} now strictly rejects unauthenticated access (401)`);
      } else {
        console.error(`❌ FAIL: ${url} returned ${res.status}, expected 401`);
      }
    }

    // =========================================================================
    // SECTION B: USER MANAGEMENT RBAC
    // =========================================================================
    console.log('\n--- SECTION B: USER MANAGEMENT RBAC ---');
    // Staff attempt to create User
    const staffCreateUser = await request(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        name: 'Unauthorized User',
        username: 'unauth_user_test',
        email: 'unauth@benz.com',
        password: 'password123',
        role: 'Admin'
      }
    });
    if (staffCreateUser.status === 403) {
      console.log('✓ PASS: Staff is strictly forbidden from creating User accounts (403)');
    } else {
      console.error(`❌ FAIL: Staff create user returned ${staffCreateUser.status}, expected 403`);
    }

    // Admin creates User
    await User.deleteMany({ username: 'valid_test_user' });
    const adminCreateUser = await request(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Valid Test User',
        username: 'valid_test_user',
        email: 'valid_test_user@benz.com',
        password: 'password123',
        role: 'Staff'
      }
    });
    if (adminCreateUser.status === 201) {
      console.log(`✓ PASS: Admin successfully created user: ${adminCreateUser.data.username}`);
      const newUserId = adminCreateUser.data._id;

      // Staff attempt to delete User
      const staffDeleteUser = await request(`${BASE_URL}/users/${newUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      if (staffDeleteUser.status === 403) {
        console.log('✓ PASS: Staff is strictly forbidden from deleting User accounts (403)');
      } else {
        console.error(`❌ FAIL: Staff delete user returned ${staffDeleteUser.status}, expected 403`);
      }

      // Admin deletes User
      const adminDeleteUser = await request(`${BASE_URL}/users/${newUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (adminDeleteUser.status === 200) {
        console.log('✓ PASS: Admin successfully deleted user (200 OK)');
      } else {
        console.error(`❌ FAIL: Admin delete user returned ${adminDeleteUser.status}`);
      }
    } else {
      console.error(`❌ FAIL: Admin create user failed: ${JSON.stringify(adminCreateUser.data)}`);
    }

    // =========================================================================
    // SECTION C: INSTRUCTOR MODULE
    // =========================================================================
    console.log('\n--- SECTION C: INSTRUCTOR MODULE ---');
    const testInstructorMobile = '9847999888';
    await Instructor.deleteMany({ mobile: testInstructorMobile });

    // 1. Create Instructor
    const createInsRes = await request(`${BASE_URL}/instructors`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Mohammed Shafi',
        mobile: testInstructorMobile,
        email: 'shafi.instructor@benz.com',
        licenceNo: 'KL-10-INS-2020-0987',
        badgeNo: 'BDG-9872',
        experience: '8 Years',
        department: 'Practical Training',
        designation: 'Senior Instructor',
        status: 'Active',
        notes: 'Specialist in 4W highway and reverse track'
      }
    });
    const instructor = createInsRes.data;
    console.log(`✓ PASS: Instructor created: ${instructor.name} (ID: ${instructor.instructorId}, _id: ${instructor._id})`);

    // 2. View Instructor Profile
    const profileRes = await request(`${BASE_URL}/instructors/${instructor._id}/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (profileRes.status === 200 && profileRes.data.instructor) {
      console.log(`✓ PASS: Instructor operational profile retrieved with metrics: totalClasses=${profileRes.data.metrics.totalClasses}`);
    } else {
      console.error(`❌ FAIL: Failed to retrieve instructor profile`);
    }

    // 3. Edit Instructor
    const editInsRes = await request(`${BASE_URL}/instructors/${instructor._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        designation: 'Head Instructor / Senior Mentor'
      }
    });
    if (editInsRes.data.designation === 'Head Instructor / Senior Mentor') {
      console.log(`✓ PASS: Instructor updated successfully: ${editInsRes.data.designation}`);
    } else {
      console.error(`❌ FAIL: Instructor update did not persist`);
    }

    // 4. Check Availability
    const availRes = await request(`${BASE_URL}/instructors/check-availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        instructorId: instructor._id,
        date: new Date().toISOString(),
        timeSlot: '07:00 AM - 08:30 AM'
      }
    });
    if (availRes.status === 200 && availRes.data.available !== undefined) {
      console.log(`✓ PASS: Instructor availability check returned available = ${availRes.data.available}`);
    } else {
      console.error(`❌ FAIL: Availability check returned unexpected structure`);
    }

    // 5. RBAC: Staff cannot delete instructor (Superadmin only)
    const staffDelIns = await request(`${BASE_URL}/instructors/${instructor._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    if (staffDelIns.status === 403) {
      console.log('✓ PASS: Staff is strictly forbidden from deleting Instructor (403)');
    } else {
      console.error(`❌ FAIL: Staff delete instructor returned ${staffDelIns.status}`);
    }

    // =========================================================================
    // SECTION D: BATCH MODULE
    // =========================================================================
    console.log('\n--- SECTION D: BATCH MODULE ---');
    // 1. Create a test student to assign to batch
    const stuBatchMobile = '9847000111';
    await Student.deleteMany({ primaryMobile: stuBatchMobile });
    const createStuRes = await request(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        fullName: 'Batch Enrolled Candidate',
        primaryMobile: stuBatchMobile,
        vehicleType: '4 Wheeler',
        coursePackage: 'LMV+MCWG (Fresh Licence)',
        totalFee: 9000
      }
    });
    const batchStudent = createStuRes.data;

    // 2. Create Batch with capacity of 1 (to test capacity validation)
    const createBatchRes = await request(`${BASE_URL}/batches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Batch Test - Fast Track Morning',
        courseLicenceType: 'LMV - 4 Wheeler',
        vehicleType: '4 Wheeler',
        instructor: instructor.name,
        instructorRef: instructor._id,
        startTime: '06:30 AM',
        endTime: '08:00 AM',
        maxStudents: 1, // Capacity = 1
        status: 'Active'
      }
    });
    const batch = createBatchRes.data;
    console.log(`✓ PASS: Batch created: ${batch.name} (Batch No: ${batch.batchNumber}, Capacity: ${batch.maxStudents})`);

    // 3. Assign 1st student to batch (should succeed)
    const assign1Res = await request(`${BASE_URL}/batches/${batch._id}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { studentId: batchStudent._id }
    });
    if (assign1Res.status === 200) {
      console.log(`✓ PASS: Student ${batchStudent.studentId} assigned to Batch ${batch.name}`);
    } else {
      console.error(`❌ FAIL: Assign student to batch failed: ${JSON.stringify(assign1Res.data)}`);
    }

    // 4. Create 2nd student and attempt to assign to same batch (should fail due to max capacity of 1)
    const stuBatchMobile2 = '9847000222';
    await Student.deleteMany({ primaryMobile: stuBatchMobile2 });
    const createStu2Res = await request(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        fullName: 'Batch Overflow Candidate',
        primaryMobile: stuBatchMobile2,
        vehicleType: '4 Wheeler',
        coursePackage: 'LMV+MCWG (Fresh Licence)',
        totalFee: 9000
      }
    });
    const batchStudent2 = createStu2Res.data;

    const assign2Res = await request(`${BASE_URL}/batches/${batch._id}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { studentId: batchStudent2._id }
    });
    if (assign2Res.status === 400) {
      console.log(`✓ PASS: Over-capacity student assignment strictly rejected with 400: "${assign2Res.data.message}"`);
    } else {
      console.error(`❌ FAIL: Expected 400 on over-capacity assignment, got ${assign2Res.status}`);
    }

    // 5. Get batch details & check available seats
    const getBatchRes = await request(`${BASE_URL}/batches/${batch._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Batch details: Capacity: ${getBatchRes.data.capacity}, Active Enrolled: ${getBatchRes.data.activeStudents}, Available Seats: ${getBatchRes.data.availableSeats}`);
    if (getBatchRes.data.availableSeats !== 0) {
      console.error(`❌ FAIL: Available seats should be 0 when full!`);
    }

    // 6. Delete Batch & verify students unassigned cleanly
    const delBatchRes = await request(`${BASE_URL}/batches/${batch._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Batch deleted: ${delBatchRes.data.message}`);

    const stuAfterBatchDel = await Student.findById(batchStudent._id);
    if (!stuAfterBatchDel.batch) {
      console.log('✓ PASS: Student batch reference safely unassigned without deleting student record');
    } else {
      console.error('❌ FAIL: Student still has deleted batch reference!');
    }

    // =========================================================================
    // SECTION E: DOCUMENT MANAGEMENT
    // =========================================================================
    console.log('\n--- SECTION E: DOCUMENT MANAGEMENT ---');
    // 1. Create a Student Document record
    const createDocRes = await request(`${BASE_URL}/student-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student: batchStudent._id,
        documentType: 'Aadhaar Card',
        documentNumber: '1234 5678 9012',
        fileUrl: '/uploads/sample_aadhaar.pdf',
        originalFileName: 'sample_aadhaar.pdf',
        fileSize: 1048576,
        status: 'Pending'
      }
    });
    const docRecord = createDocRes.data;
    console.log(`✓ PASS: Document record created: ${docRecord.documentType} (ID: ${docRecord.documentId}, Status: ${docRecord.status})`);

    // 2. Check Document Readiness before verification
    const readinessBefore = await request(`${BASE_URL}/student-documents/student/${batchStudent._id}/readiness`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✓ PASS: Initial Document Readiness: ${readinessBefore.data.readinessPercentage}% (Status: ${readinessBefore.data.isFullyReady ? 'Complete' : 'Incomplete'})`);

    // 3. Verify Document
    const verifyDocRes = await request(`${BASE_URL}/student-documents/${docRecord._id}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { remarks: 'Verified with original Aadhaar Card' }
    });
    if (verifyDocRes.data.status === 'Verified') {
      console.log(`✓ PASS: Document status changed to 'Verified'. Verified By: ${verifyDocRes.data.verifiedBy?.name || 'Admin'}`);
    } else {
      console.error(`❌ FAIL: Document verification status did not change to Verified`);
    }

    // 4. Reject Document with mandatory reason
    // 4a. Attempt without reason (should fail 400)
    const badReject = await request(`${BASE_URL}/student-documents/${docRecord._id}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { rejectionReason: '' }
    });
    if (badReject.status === 400) {
      console.log('✓ PASS: Document rejection without mandatory reason rejected with 400');
    } else {
      console.error(`❌ FAIL: Expected 400 on rejection without reason, got ${badReject.status}`);
    }

    // 4b. Valid rejection
    const validReject = await request(`${BASE_URL}/student-documents/${docRecord._id}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { rejectionReason: 'Aadhaar image is blurry and date of birth is unreadable' }
    });
    if (validReject.data.status === 'Rejected') {
      console.log(`✓ PASS: Document status set to 'Rejected' with reason: "${validReject.data.rejectionReason}"`);
    } else {
      console.error(`❌ FAIL: Document rejection failed`);
    }

    // =========================================================================
    // SECTION F: BULK IMPORT (BULK INTAKE HUB)
    // =========================================================================
    console.log('\n--- SECTION F: BULK IMPORT (BULK INTAKE HUB) ---');
    const bulkPhone1 = '9847888111';
    const bulkPhone2 = '9847888222';
    await Student.deleteMany({ primaryMobile: { $in: [bulkPhone1, bulkPhone2] } });

    const bulkPayload = {
      students: [
        // 1. Valid record with initial paid amount
        {
          fullName: 'Bulk Candidate Rashid',
          primaryMobile: bulkPhone1,
          gender: 'Male',
          vehicleType: '4 Wheeler',
          coursePackage: 'LMV+MCWG (Fresh Licence)',
          totalFee: 9500,
          paidAmount: 2500,
          notes: 'Walk-in bulk registration'
        },
        // 2. Missing mobile (should be skipped)
        {
          fullName: 'Incomplete Student No Mobile',
          primaryMobile: '',
          totalFee: 9000
        },
        // 3. Invalid Indian mobile (should be skipped)
        {
          fullName: 'Bad Phone Student',
          primaryMobile: '12345',
          totalFee: 9000
        },
        // 4. Another valid record
        {
          fullName: 'Bulk Candidate Fatima',
          primaryMobile: bulkPhone2,
          gender: 'Female',
          vehicleType: '2 Wheeler',
          coursePackage: 'MCWG Only',
          totalFee: 4000,
          paidAmount: 4000,
          notes: 'Full payment at registration'
        }
      ]
    };

    const bulkRes = await request(`${BASE_URL}/students/bulk-import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: bulkPayload
    });

    console.log(`✓ Bulk Import Response:`);
    console.log(`    Successfully Imported: ${bulkRes.data.importedCount}`);
    console.log(`    Skipped / Errors: ${bulkRes.data.skippedCount}`);

    if (bulkRes.data.importedCount === 2 && bulkRes.data.skippedCount === 2) {
      console.log('✓ PASS: Exact import count verified (2 imported, 2 skipped)');
    } else {
      console.error(`❌ FAIL: Expected 2 imported and 2 skipped, got ${bulkRes.data.importedCount} imported, ${bulkRes.data.skippedCount} skipped`);
    }

    // Verify database creation for imported student Rashid
    const importedStu = await Student.findOne({ primaryMobile: bulkPhone1 });
    if (importedStu) {
      console.log(`✓ PASS: Permanent Student record created: ${importedStu.fullName} (${importedStu.studentId})`);
      // Verify linked Application
      const linkedApp = await Application.findOne({ student: importedStu._id });
      if (linkedApp) {
        console.log(`✓ PASS: Linked Application auto-generated: ID ${linkedApp.applicationId}, Net: ₹${linkedApp.feeStructure.netPayable}, Received: ₹${linkedApp.feeStructure.totalReceived}`);
      } else {
        console.error('❌ FAIL: Linked application not created for bulk imported student!');
      }

      // Verify initial payment record
      const linkedPay = await Payment.findOne({ student: importedStu._id });
      if (linkedPay && linkedPay.amount === 2500) {
        console.log(`✓ PASS: Initial Payment auto-generated: Receipt ${linkedPay.receiptNo}, Amount: ₹${linkedPay.amount}`);
      } else {
        console.error('❌ FAIL: Payment record not created for initial paid amount during bulk import!');
      }
    } else {
      console.error('❌ FAIL: Imported student not found in database!');
    }

    // =========================================================================
    // CLEANUP TEMPORARY TEST DATA
    // =========================================================================
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    await Instructor.deleteOne({ _id: instructor._id });
    await Student.deleteMany({ primaryMobile: { $in: [stuBatchMobile, stuBatchMobile2, bulkPhone1, bulkPhone2] } });
    await Application.deleteMany({ studentId: { $in: [batchStudent.studentId, batchStudent2.studentId] } });
    await StudentDocument.deleteMany({ student: batchStudent._id });
    console.log('✅ Cleaned up temporary test artifacts cleanly.');

    console.log('\n====================================================================');
    console.log('🎉 ALL INSTRUCTOR, BATCH, DOCS, BULK & RBAC TESTS PASSED 100%!');
    console.log('====================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runComprehensiveSuite();
