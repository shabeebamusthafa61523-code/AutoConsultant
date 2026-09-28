require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const generateComplaintId = require('../utils/generateComplaintId');

async function verifyComplaintsModule() {
  console.log('=====================================================');
  console.log('🚀 TESTING COMPLAINT CONTROL CENTRE MODULE');
  console.log('=====================================================');

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas\n');

    // 1. VERIFY SEEDED COMPLAINTS & INDEXES
    console.log('--- 1. VERIFY COMPLAINTS COLLECTION & INDEXES ---');
    const count = await Complaint.countDocuments();
    console.log(`Found ${count} complaints in MongoDB.`);
    if (count < 6) throw new Error(`Expected at least 6 seeded complaints, found ${count}`);

    const sampleComplaints = await Complaint.find({}).sort({ complaintId: 1 });
    sampleComplaints.forEach(c => {
      console.log(`  ✓ [${c.complaintId}] ${c.category} | ${c.complainantName} (${c.complainantType}) | Status: ${c.status} | Priority: ${c.priority} | Overdue: ${c.isOverdue}`);
    });

    // 2. TEST COUNTER GENERATION
    console.log('\n--- 2. TEST ATOMIC COUNTER ID GENERATION ---');
    const newId = await generateComplaintId();
    console.log(`  ✓ Generated next Complaint ID via Counter: ${newId}`);
    if (!newId.startsWith('CMP-')) throw new Error('ID format must start with CMP-');

    // 3. CREATE FULL COMPLAINT LIFECYCLE TEST
    console.log('\n--- 3. TEST COMPLAINT CREATION & LINKED REFERENCES ---');
    const [testStudent, testInstructor, testVehicle, testUser] = await Promise.all([
      Student.findOne({}),
      Instructor.findOne({}),
      Vehicle.findOne({}),
      User.findOne({ status: 'Active' })
    ]);

    const testComplaint = new Complaint({
      complaintId: newId,
      complaintDate: new Date(),
      source: 'Student',
      complainantType: 'Student',
      student: testStudent ? testStudent._id : null,
      complainantName: testStudent ? testStudent.fullName : 'Test Student Lifecycle',
      complainantMobile: '9988776655',
      category: 'Vehicle',
      description: 'Test dual control brake response delayed on uphill grade; requires mechanical inspection.',
      relatedVehicle: testVehicle ? testVehicle._id : null,
      relatedInstructor: testInstructor ? testInstructor._id : null,
      priority: 'High',
      status: 'Open',
      assignedTo: testUser ? testUser._id : null,
      assignedToName: testUser ? testUser.name : 'Super Admin',
      expectedResolutionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      createdBy: testUser ? testUser._id : null,
      createdByName: testUser ? testUser.name : 'System',
      activities: [
        {
          action: 'Created',
          performedByName: 'Automated Test Runner',
          details: 'Initial registration of test lifecycle complaint',
          timestamp: new Date()
        }
      ]
    });

    await testComplaint.save();
    console.log(`  ✓ Created complaint ${testComplaint.complaintId} with linked student & vehicle`);

    // 4. TEST ASSIGNMENT & ACTIVITY
    console.log('\n--- 4. TEST ASSIGNMENT & REASSIGNMENT ---');
    testComplaint.assignedToName = 'Senior Workshop Inspector';
    testComplaint.activities.push({
      action: 'Assigned',
      performedByName: 'Admin',
      details: 'Assigned to Senior Workshop Inspector',
      timestamp: new Date()
    });
    await testComplaint.save();
    console.log(`  ✓ Updated assignment and logged timeline activity`);

    // 5. TEST ESCALATION
    console.log('\n--- 5. TEST ESCALATION WORKFLOW ---');
    testComplaint.status = 'Escalated';
    testComplaint.escalation = {
      isEscalated: true,
      escalatedToName: 'Managing Director',
      escalatedDate: new Date(),
      escalationReason: 'Dual control safety hazard requires immediate vehicle grounding.'
    };
    testComplaint.activities.push({
      action: 'Escalated',
      performedByName: 'Admin',
      details: 'Escalated to Managing Director due to safety hazard',
      timestamp: new Date()
    });
    await testComplaint.save();
    console.log(`  ✓ Escalated complaint: Status=${testComplaint.status}, Reason: ${testComplaint.escalation.escalationReason}`);

    // 6. TEST RESOLUTION & CAPA
    console.log('\n--- 6. TEST RESOLUTION & CAPA RECORDING ---');
    testComplaint.status = 'Resolved';
    testComplaint.resolution = {
      resolutionNotes: 'Brake slave cylinder inspected, bled, and dual cable tension readjusted.',
      resolvedByName: 'Authorized Maruti Workshop',
      resolvedDate: new Date(),
      correctiveActionTaken: 'Added dual brake tension check to daily pre-drive checklist DDS-CHK-004.',
      satisfactionRating: 'Satisfied'
    };
    testComplaint.activities.push({
      action: 'Resolved',
      performedByName: 'Senior Workshop Inspector',
      details: 'Brake inspection completed and tested satisfactory',
      timestamp: new Date()
    });
    await testComplaint.save();
    console.log(`  ✓ Resolved complaint: Notes="${testComplaint.resolution.resolutionNotes}"`);

    // 7. TEST INTERNAL COMMENTS
    console.log('\n--- 7. TEST INTERNAL STAFF COMMENTS ---');
    testComplaint.comments.push({
      comment: 'Vehicle test-driven on Kodur ground incline; braking response confirmed immediate.',
      createdByName: 'Farhan (Instructor)',
      createdAt: new Date()
    });
    await testComplaint.save();
    console.log(`  ✓ Added internal remark: Total comments = ${testComplaint.comments.length}`);

    // 8. TEST CLOSURE
    console.log('\n--- 8. TEST CLOSURE ---');
    testComplaint.status = 'Closed';
    testComplaint.activities.push({
      action: 'Closed',
      performedByName: 'Admin',
      details: 'Case closed and filed in service quality archive',
      timestamp: new Date()
    });
    await testComplaint.save();
    console.log(`  ✓ Closed complaint: Status=${testComplaint.status}, Activities count=${testComplaint.activities.length}`);

    // Clean up test complaint
    await Complaint.findByIdAndDelete(testComplaint._id);
    console.log(`  ✓ Cleaned up test complaint ${newId}`);

    // 9. VERIFY KPI AGGREGATION
    console.log('\n--- 9. VERIFY KPI AGGREGATIONS ---');
    const now = new Date();
    const [openCount, inProgCount, escCount, resCount, overdueCount] = await Promise.all([
      Complaint.countDocuments({ status: 'Open' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Escalated' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: { $nin: ['Resolved', 'Closed'] }, expectedResolutionDate: { $lt: now } })
    ]);
    console.log(`  ✓ Live KPI Aggregation:`);
    console.log(`      Open: ${openCount}`);
    console.log(`      In Progress: ${inProgCount}`);
    console.log(`      Escalated: ${escCount}`);
    console.log(`      Resolved: ${resCount}`);
    console.log(`      Overdue: ${overdueCount}`);

    console.log('\n=====================================================');
    console.log('🎯 COMPLAINT MODULE BACKEND VERIFICATION: 100% PASSED');
    console.log('=====================================================');

  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Mongoose disconnected.');
  }
}

verifyComplaintsModule();
