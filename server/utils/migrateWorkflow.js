const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../config/db');
const Student = require('../models/Student');
const WorkflowHistory = require('../models/WorkflowHistory');

const migrate = async () => {
  try {
    await connectDB();
    console.log('--- Starting Safe Workflow Data Alignment ---');

    const students = await Student.find();
    console.log(`Found ${students.length} existing students to inspect.`);

    let updatedCount = 0;
    for (const student of students) {
      let changed = false;

      // Ensure valid workflow stage
      if (!student.workflowStage || student.workflowStage === 'Registration') {
        student.workflowStage = 'Application';
        changed = true;
      }

      if (!student.workflowStageChangedAt) {
        student.workflowStageChangedAt = student.createdAt || new Date();
        changed = true;
      }

      if (changed) {
        await student.save();
        updatedCount++;

        // Create an initial workflow history entry if none exists
        const historyExists = await WorkflowHistory.findOne({ student: student._id });
        if (!historyExists) {
          await WorkflowHistory.create({
            student: student._id,
            fromStage: '',
            toStage: student.workflowStage,
            action: 'Initial Stage Assigned',
            changedByName: 'System Migration',
            changedByRole: 'Admin',
            notes: 'System auto-aligned stage to Application from existing record',
            createdAt: student.createdAt || new Date()
          });
        }
      }
    }

    console.log(`Aligned ${updatedCount} students successfully. All data preserved.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();
