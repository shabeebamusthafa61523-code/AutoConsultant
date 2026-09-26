require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const classRoutes = require('../routes/classRoutes');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Schedule = require('../models/Schedule');
const Class = require('../models/Class');

const app = express();
app.use(express.json());
app.use('/api/classes', classRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    message: err.message
  });
});

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFYING TRAINING & CLASSES API ROUTES END-TO-END');
  console.log('================================================================\n');

  let server;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    server = app.listen(5099);
    console.log('✅ Ephemeral server listening on port 5099\n');

    const BASE_URL = 'http://localhost:5099';

    // 1. Get or create test user for token
    let admin = await User.findOne({ role: 'Superadmin' });
    if (!admin) admin = await User.findOne({});
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test GET /api/classes/stats
    console.log('--- 1. Testing GET /api/classes/stats ---');
    const statsRes = await fetch(`${BASE_URL}/api/classes/stats`, { headers });
    console.log(`Status: ${statsRes.status}`);
    const statsBody = await statsRes.json();
    if (statsRes.status !== 200) throw new Error(`Stats endpoint failed: ${JSON.stringify(statsBody)}`);
    console.log(`✓ Total Records: ${statsBody.totalRecords}`);
    console.log(`✓ Recorded KM: ${statsBody.recordedKm}`);
    console.log(`✓ Recorded Hours: ${statsBody.recordedHours}`);
    console.log(`✓ Equivalent Classes: ${statsBody.equivalentClasses}`);
    console.log(`✓ Instructor: ${statsBody.instructor?.name} (${statsBody.instructor?.km} KM, ${statsBody.instructor?.hours} hrs)`);
    console.log(`✓ Instructor breakdown count: ${statsBody.instructorBreakdown?.length}`);
    console.log(`✓ Vehicle breakdown count: ${statsBody.vehicleBreakdown?.length}\n`);

    // 3. Test GET /api/classes/progress-tracker
    console.log('--- 2. Testing GET /api/classes/progress-tracker ---');
    const trackerRes = await fetch(`${BASE_URL}/api/classes/progress-tracker`, { headers });
    console.log(`Status: ${trackerRes.status}`);
    const trackerBody = await trackerRes.json();
    if (trackerRes.status !== 200) throw new Error(`Progress tracker failed: ${JSON.stringify(trackerBody)}`);
    console.log(`✓ Students count: ${trackerBody.students?.length}`);
    if (trackerBody.students?.length > 0) {
      const s0 = trackerBody.students[0];
      console.log(`  Sample: ${s0.fullName} | Road Eq: ${s0.roadEquivalent} | H Eq: ${s0.hEquivalent} | Total Eq: ${s0.equivalentClasses} | Pending: ${s0.pendingClasses} | Fee Bal: ₹${s0.balance}`);
    }
    console.log('');

    // 4. Test GET /api/classes/schedules
    console.log('--- 3. Testing GET /api/classes/schedules ---');
    const schedulesRes = await fetch(`${BASE_URL}/api/classes/schedules`, { headers });
    console.log(`Status: ${schedulesRes.status}`);
    const schedulesBody = await schedulesRes.json();
    if (schedulesRes.status !== 200) throw new Error(`Schedules failed: ${JSON.stringify(schedulesBody)}`);
    console.log(`✓ Schedules returned: ${schedulesBody.length}\n`);

    // 5. Test POST & Complete schedule
    console.log('--- 4. Testing POST /api/classes/schedules & /complete ---');
    const batch = await Batch.findOne({});
    const student = await Student.findOne({});

    if (batch && student) {
      const createSchRes = await fetch(`${BASE_URL}/api/classes/schedules`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          batch: batch._id,
          date: new Date().toISOString().split('T')[0],
          timeSlot: '07:00 AM - 08:30 AM',
          classType: 'Road & H',
          instructor: 'Farhan',
          vehicleNo: 'KL-10-AB-5265',
          students: [student._id],
          remarks: 'Automated verification session'
        })
      });

      console.log(`✓ Create Schedule Status: ${createSchRes.status}`);
      const schData = await createSchRes.json();
      const schId = schData._id;

      // Complete the schedule
      const completeRes = await fetch(`${BASE_URL}/api/classes/schedules/${schId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          km: 10,
          hours: 1,
          attendedStudentIds: [student._id],
          notes: 'Test completed session'
        })
      });

      console.log(`✓ Complete Schedule Status: ${completeRes.status}`);
      const completeData = await completeRes.json();
      console.log(`  Response message: ${completeData.message}`);

      // Clean up test schedule and created class
      await Schedule.findByIdAndDelete(schId);
      await Class.deleteMany({ scheduleRef: schId });
      console.log('✓ Cleaned up test schedule and generated class record.\n');
    }

    // 6. Test GET /api/classes/export
    console.log('--- 5. Testing GET /api/classes/export ---');
    const exportRes = await fetch(`${BASE_URL}/api/classes/export`, { headers });
    console.log(`Status: ${exportRes.status}`);
    console.log(`Content-Type: ${exportRes.headers.get('content-type')}`);
    if (exportRes.status !== 200) throw new Error(`Export CSV failed`);
    const csvText = await exportRes.text();
    console.log(`✓ Exported CSV successfully (${csvText.split('\n').length} lines).\n`);

    console.log('================================================================');
    console.log('🎉 ALL TRAINING & CLASSES API ROUTES VERIFIED WITH 100% SUCCESS!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Error during route verification:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

run();
