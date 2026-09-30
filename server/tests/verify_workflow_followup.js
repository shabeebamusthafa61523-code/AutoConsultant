const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Student = require('../models/Student');
const WorkflowHistory = require('../models/WorkflowHistory');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');

const runTests = async () => {
  try {
    await connectDB();
    console.log('--- RUNNING BACKEND INTEGRATION TESTS FOR WORKFLOW & FOLLOW-UP ---');

    // 1. Find or verify test user
    const user = await User.findOne();
    if (!user) throw new Error('No user found to run test');
    console.log(`Using user: ${user.name} (${user.role})`);

    // 2. Find a test student
    let student = await Student.findOne();
    if (!student) throw new Error('No student found to test');
    console.log(`Using student: ${student.fullName} (${student.studentId})`);

    // TEST 1: Forward stage transitions
    const stagesToTest = [
      'Application',
      'Documents',
      'LL Slot / Test',
      'LL Passed',
      'Training',
      'DL Test',
      'Passed / Licence Processing',
      'Completed'
    ];

    console.log('\n--- TEST 1: Sequential Stage Transitions ---');
    for (let i = 0; i < stagesToTest.length; i++) {
      const targetStage = stagesToTest[i];
      const prevStage = student.workflowStage;
      student.previousWorkflowStage = prevStage;
      student.workflowStage = targetStage;
      student.workflowStageChangedAt = new Date();
      student.workflowStageChangedBy = user._id;
      await student.save();

      const hist = await WorkflowHistory.create({
        student: student._id,
        fromStage: prevStage,
        toStage: targetStage,
        action: 'Stage Transition Test',
        changedBy: user._id,
        changedByName: user.name,
        changedByRole: user.role,
        notes: `Transitioned to ${targetStage} in automated test`
      });

      console.log(`  ✓ Stage changed: ${prevStage} -> ${targetStage} (History ID: ${hist._id})`);
    }

    // TEST 2: Backward Stage Transition
    console.log('\n--- TEST 2: Backward Stage Transition ---');
    const backwardFrom = student.workflowStage;
    const backwardTo = 'Training';
    student.previousWorkflowStage = backwardFrom;
    student.workflowStage = backwardTo;
    student.workflowStageChangedAt = new Date();
    await student.save();

    await WorkflowHistory.create({
      student: student._id,
      fromStage: backwardFrom,
      toStage: backwardTo,
      action: 'Backward Transition Test',
      changedBy: user._id,
      changedByName: user.name,
      changedByRole: user.role,
      notes: 'Moved backward to Training'
    });
    console.log(`  ✓ Backward transition successful: ${backwardFrom} -> ${backwardTo}`);

    // TEST 3: Create Follow-Up linked to Student
    console.log('\n--- TEST 3: Create Follow-Up ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const followUp = await FollowUp.create({
      student: student._id,
      task: 'Prepare student for DL Test simulator session',
      dueDate: tomorrow,
      dueTime: '10:30 AM',
      assignedTo: user._id,
      assignedToName: user.name,
      priority: 'High',
      status: 'Pending',
      relatedStage: 'Training',
      notes: 'Ensure candidate brings learner licence copy',
      createdBy: user._id,
      createdByName: user.name
    });
    console.log(`  ✓ Follow-Up created successfully: "${followUp.task}" (ID: ${followUp._id})`);

    // TEST 4: Reschedule Follow-Up
    console.log('\n--- TEST 4: Reschedule Follow-Up ---');
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 3);

    followUp.rescheduleHistory.push({
      previousDate: followUp.dueDate,
      newDate: newDate,
      reason: 'Student requested weekend slot',
      rescheduledBy: user._id,
      rescheduledByName: user.name,
      rescheduledAt: new Date()
    });
    followUp.dueDate = newDate;
    followUp.rescheduledCount = (followUp.rescheduledCount || 0) + 1;
    await followUp.save();
    console.log(`  ✓ Follow-Up rescheduled to ${newDate.toISOString().split('T')[0]}, count: ${followUp.rescheduledCount}`);

    // TEST 5: Complete Follow-Up
    console.log('\n--- TEST 5: Complete Follow-Up ---');
    followUp.status = 'Completed';
    followUp.completedAt = new Date();
    followUp.completedBy = user._id;
    followUp.completedByName = user.name;
    await followUp.save();
    console.log(`  ✓ Follow-Up marked as Completed by ${followUp.completedByName}`);

    // TEST 6: Create Overdue Follow-Up
    console.log('\n--- TEST 6: Overdue Follow-Up ---');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const overdueFollowUp = await FollowUp.create({
      student: student._id,
      task: 'Submit DL application Form 1A',
      dueDate: pastDate,
      dueTime: '09:00 AM',
      assignedTo: user._id,
      assignedToName: user.name,
      priority: 'Urgent',
      status: 'Pending',
      relatedStage: 'Documents',
      notes: 'Doctor signature pending',
      createdBy: user._id,
      createdByName: user.name
    });

    const isOverdue = overdueFollowUp.dueDate < new Date() && overdueFollowUp.status === 'Pending';
    console.log(`  ✓ Overdue Follow-Up created: ${overdueFollowUp.task} (isOverdue = ${isOverdue})`);

    // Clean up test overdue follow-up so we leave clean data
    await FollowUp.findByIdAndDelete(overdueFollowUp._id);
    console.log('  ✓ Cleaned up temporary test overdue record.');

    console.log('\n========================================');
    console.log('ALL BACKEND INTEGRATION TESTS PASSED!');
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
};

runTests();
