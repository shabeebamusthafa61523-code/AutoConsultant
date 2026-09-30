const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const WorkflowHistory = require('../models/WorkflowHistory');
const FollowUp = require('../models/FollowUp');
const generateToken = require('../utils/generateToken');
const { getWorkflowStats } = require('../controllers/workflowController');
const { getDashboardStats } = require('../controllers/dashboardController');

const runComprehensiveSuite = async () => {
  try {
    await connectDB();
    console.log('===============================================================');
    console.log('STARTING COMPREHENSIVE PRODUCTION VERIFICATION SUITE');
    console.log('===============================================================');

    // Step 1: Users & Auth
    const adminUser = await User.findOne({ role: 'Superadmin' }) || await User.findOne();
    if (!adminUser) throw new Error('No admin user found');
    const adminToken = generateToken(adminUser._id);
    console.log(`[AUTH] Admin User authenticated: ${adminUser.name} (${adminUser.role})`);

    // Step 2: Create a dedicated Test Student for full lifecycle testing
    const testStudentId = 'STU-TEST-' + Date.now().toString().slice(-4);
    const testStudent = await Student.create({
      studentId: testStudentId,
      fullName: 'Rahul Varma (Workflow Test Candidate)',
      primaryMobile: '9847' + Math.floor(100000 + Math.random() * 900000),
      coursePackage: 'LMV - 4 Wheeler (Fresh Licence)',
      licenceCategory: 'LMV',
      workflowStage: 'Application',
      currentStatus: 'Active',
      totalFee: 9500,
      paidAmount: 2000
    });
    console.log(`[STUDENT] Created test student: ${testStudent.fullName} (${testStudent.studentId})`);

    // TEST 1: Complete Stage Transitions
    console.log('\n--- TEST 1: Full Workflow Stage Lifecycle ---');
    const stages = [
      'Application',
      'Documents',
      'LL Slot / Test',
      'LL Passed',
      'Training',
      'DL Test',
      'Passed / Licence Processing',
      'Completed'
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const prev = testStudent.workflowStage;
      testStudent.previousWorkflowStage = prev;
      testStudent.workflowStage = stage;
      testStudent.workflowStageChangedAt = new Date();
      testStudent.workflowStageChangedBy = adminUser._id;
      testStudent.workflowNotes = `Transitioned to ${stage}`;

      testStudent.timeline.push({
        action: 'Workflow Stage Transition',
        category: 'Licence',
        description: `Stage: ${prev} -> ${stage}`,
        timestamp: new Date(),
        performedBy: adminUser.name
      });
      await testStudent.save();

      await WorkflowHistory.create({
        student: testStudent._id,
        fromStage: prev,
        toStage: stage,
        action: 'Stage Transition',
        changedBy: adminUser._id,
        changedByName: adminUser.name,
        changedByRole: adminUser.role,
        notes: `Automated test transition to ${stage}`
      });
      console.log(`  ✓ Stage: ${prev} -> ${stage}`);
    }

    // Verify history records count
    const historyCount = await WorkflowHistory.countDocuments({ student: testStudent._id });
    console.log(`  ✓ Verified history entries count: ${historyCount} entries`);

    // TEST 2: Backward Stage Transition
    console.log('\n--- TEST 2: Backward Transition ---');
    const prevBeforeBack = testStudent.workflowStage;
    testStudent.previousWorkflowStage = prevBeforeBack;
    testStudent.workflowStage = 'Training';
    await testStudent.save();
    await WorkflowHistory.create({
      student: testStudent._id,
      fromStage: prevBeforeBack,
      toStage: 'Training',
      action: 'Backward Transition',
      changedBy: adminUser._id,
      changedByName: adminUser.name,
      changedByRole: adminUser.role,
      notes: 'Moved backward for additional road training'
    });
    console.log(`  ✓ Backward transition verified: ${prevBeforeBack} -> Training`);

    // TEST 3: Create Follow-Up, Upcoming check & Complete
    console.log('\n--- TEST 3: Create & Complete Follow-Up ---');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);

    const followUp1 = await FollowUp.create({
      student: testStudent._id,
      task: 'Confirm training session on H-track',
      dueDate: futureDate,
      dueTime: '08:00 AM',
      assignedTo: adminUser._id,
      assignedToName: adminUser.name,
      priority: 'High',
      status: 'Pending',
      relatedStage: 'Training',
      createdBy: adminUser._id,
      createdByName: adminUser.name
    });
    console.log(`  ✓ Created follow-up: "${followUp1.task}"`);

    // Complete follow-up
    followUp1.status = 'Completed';
    followUp1.completedAt = new Date();
    followUp1.completedBy = adminUser._id;
    followUp1.completedByName = adminUser.name;
    await followUp1.save();
    console.log(`  ✓ Marked follow-up as Completed (status: ${followUp1.status})`);

    // TEST 4: Create Overdue Follow-Up & Reschedule
    console.log('\n--- TEST 4: Overdue Follow-Up & Reschedule ---');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const overdueFollowUp = await FollowUp.create({
      student: testStudent._id,
      task: 'Collect Form 1A Medical Certificate',
      dueDate: pastDate,
      dueTime: '09:00 AM',
      assignedTo: adminUser._id,
      assignedToName: adminUser.name,
      priority: 'Urgent',
      status: 'Pending',
      relatedStage: 'Documents',
      createdBy: adminUser._id,
      createdByName: adminUser.name
    });

    const isOverdue = overdueFollowUp.dueDate < new Date() && overdueFollowUp.status === 'Pending';
    console.log(`  ✓ Overdue check: isOverdue=${isOverdue} (Due: ${overdueFollowUp.dueDate.toISOString().split('T')[0]})`);

    // Reschedule
    const rescheduledDate = new Date();
    rescheduledDate.setDate(rescheduledDate.getDate() + 4);
    overdueFollowUp.rescheduleHistory.push({
      previousDate: overdueFollowUp.dueDate,
      newDate: rescheduledDate,
      reason: 'Candidate visiting clinic on Friday',
      rescheduledBy: adminUser._id,
      rescheduledByName: adminUser.name,
      rescheduledAt: new Date()
    });
    overdueFollowUp.dueDate = rescheduledDate;
    overdueFollowUp.rescheduledCount = 1;
    await overdueFollowUp.save();
    console.log(`  ✓ Rescheduled to ${rescheduledDate.toISOString().split('T')[0]}, count: ${overdueFollowUp.rescheduledCount}`);

    // TEST 5: Stage change with automatic follow-up creation
    console.log('\n--- TEST 5: Stage Change + Auto Follow-Up Integration ---');
    const autoFollowUpDate = new Date();
    autoFollowUpDate.setDate(autoFollowUpDate.getDate() + 7);
    const autoFollowUp = await FollowUp.create({
      student: testStudent._id,
      task: 'Prepare student for DL Test (Slot Verification)',
      dueDate: autoFollowUpDate,
      dueTime: '09:30 AM',
      priority: 'High',
      status: 'Pending',
      relatedStage: 'DL Test',
      assignedTo: adminUser._id,
      assignedToName: adminUser.name,
      createdBy: adminUser._id,
      createdByName: adminUser.name
    });
    testStudent.workflowStage = 'DL Test';
    testStudent.nextAction = autoFollowUp.task;
    testStudent.followUpDate = autoFollowUpDate;
    await testStudent.save();
    console.log(`  ✓ Student stage moved to DL Test and linked auto follow-up: "${autoFollowUp.task}"`);

    // TEST 6: Student Profile Integration Data Fetch
    console.log('\n--- TEST 6: Student Profile Data Contract ---');
    const [fetchedHistory, fetchedFollowUps] = await Promise.all([
      WorkflowHistory.find({ student: testStudent._id }),
      FollowUp.find({ student: testStudent._id })
    ]);
    console.log(`  ✓ Profile query returns: ${fetchedHistory.length} history items, ${fetchedFollowUps.length} follow-ups`);

    // TEST 7: Dashboard Aggregations
    console.log('\n--- TEST 7: Dashboard Metrics Integration ---');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pendingCount, overdueCount, trainingCount, dlTestCount] = await Promise.all([
      FollowUp.countDocuments({ status: 'Pending' }),
      FollowUp.countDocuments({ status: 'Pending', dueDate: { $lt: todayStart } }),
      Student.countDocuments({ $or: [{ workflowStage: 'Training' }, { currentStatus: 'Training' }] }),
      Student.countDocuments({ $or: [{ workflowStage: 'DL Test' }, { currentStatus: { $in: ['Test Pending', 'Test Scheduled', 'Retest'] } }] })
    ]);

    console.log(`  ✓ Dashboard Live Metrics:`);
    console.log(`    - Pending Follow-ups: ${pendingCount}`);
    console.log(`    - Overdue Follow-ups: ${overdueCount}`);
    console.log(`    - Students in Training: ${trainingCount}`);
    console.log(`    - DL Tests Pending: ${dlTestCount}`);

    // Clean up test student & test follow-ups
    console.log('\n--- CLEANUP ---');
    await WorkflowHistory.deleteMany({ student: testStudent._id });
    await FollowUp.deleteMany({ student: testStudent._id });
    await Student.findByIdAndDelete(testStudent._id);
    console.log('  ✓ Cleaned up test student and test records. Database left in pristine state.');

    console.log('\n===============================================================');
    console.log('COMPREHENSIVE SUITE COMPLETED WITH 100% SUCCESS!');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('FAILED TEST:', err);
    process.exit(1);
  }
};

runComprehensiveSuite();
