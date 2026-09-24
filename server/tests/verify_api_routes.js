require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const dashboardRoutes = require('../routes/dashboardRoutes');
const studentRoutes = require('../routes/studentRoutes');
const batchRoutes = require('../routes/batchRoutes');
const classRoutes = require('../routes/classRoutes');
const enquiryRoutes = require('../routes/enquiryRoutes');
const paymentRoutes = require('../routes/paymentRoutes');
const courseFeeRoutes = require('../routes/courseFeeRoutes');
const userRoutes = require('../routes/userRoutes');
const instructorRoutes = require('../routes/instructorRoutes');
const vehicleRoutes = require('../routes/vehicleRoutes');
const studentDocumentRoutes = require('../routes/studentDocumentRoutes');
const complaintRoutes = require('../routes/complaintRoutes');
const { errorHandler } = require('../middleware/errorHandler');

async function testApiRoutes() {
  console.log('=====================================================');
  console.log('🌐 TESTING FULL REST API & REGRESSION ENDPOINTS');
  console.log('=====================================================');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB Atlas');

  // Find admin user for auth token
  let adminUser = await User.findOne({ role: { $in: ['Superadmin', 'Admin'] }, status: 'Active' });
  if (!adminUser) {
    adminUser = await User.findOne({ status: 'Active' });
  }
  if (!adminUser) {
    throw new Error('No active user found in database to generate JWT auth header');
  }

  const token = jwt.sign(
    { id: adminUser._id, role: adminUser.role },
    process.env.JWT_SECRET || 'benz_jwt_secret_2026',
    { expiresIn: '1h' }
  );
  console.log(`✅ Generated test auth token for [${adminUser.role}] ${adminUser.name}`);

  // Create isolated express instance on port 5098
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Healthy' }));
  app.use('/api/users', userRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/batches', batchRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/enquiries', enquiryRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/course-fees', courseFeeRoutes);
  app.use('/api/instructors', instructorRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/student-documents', studentDocumentRoutes);
  app.use('/api/complaints', complaintRoutes);
  app.use(errorHandler);

  const server = app.listen(5098);
  console.log('✅ Ephemeral Test API Server listening on port 5098\n');

  const BASE_URL = 'http://localhost:5098';
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const tests = [
    { name: 'Health Check', url: '/api/health', method: 'GET', auth: false, check: (d) => d.status === 'OK' },
    
    // Operational Modules
    { name: 'Get All Instructors', url: '/api/instructors', method: 'GET', auth: true, check: (d) => Array.isArray(d.instructors) && d.instructors.length >= 5 },
    { name: 'Get Vehicles Master List', url: '/api/vehicles', method: 'GET', auth: true, check: (d) => Array.isArray(d.vehicles) && d.vehicles.length >= 3 },
    { name: 'Get Vehicle Expiry Alerts', url: '/api/vehicles/alerts/expiries', method: 'GET', auth: true, check: (d) => d.totalAlerts !== undefined && Array.isArray(d.alerts) },
    { name: 'Get Student Documents List', url: '/api/student-documents', method: 'GET', auth: true, check: (d) => Array.isArray(d.documents) },

    // Compliance Route Complete Removal Verification (Must return 404)
    { name: 'Verify Compliance Route Completely Removed (404)', url: '/api/compliance/dashboard', method: 'GET', auth: false, expectedStatus: 404 },

    // Complaint Control Centre Endpoints
    { name: 'Get Complaint Control Dashboard', url: '/api/complaints/dashboard', method: 'GET', auth: true, check: (d) => d.summary !== undefined && d.summary.totalComplaints >= 6 },
    { name: 'Get Complaints Master List', url: '/api/complaints', method: 'GET', auth: true, check: (d) => Array.isArray(d.complaints) && d.complaints.length >= 6 },

    // Existing Modules Regression Check
    { name: 'Regression: Get Students List', url: '/api/students', method: 'GET', auth: true, check: (d) => d !== undefined },
    { name: 'Regression: Get Batches List', url: '/api/batches', method: 'GET', auth: true, check: (d) => d !== undefined },
    { name: 'Regression: Get Classes List', url: '/api/classes', method: 'GET', auth: true, check: (d) => d !== undefined },
    { name: 'Regression: Get Payments List', url: '/api/payments', method: 'GET', auth: true, check: (d) => d !== undefined },
    { name: 'Regression: Get Course Fees', url: '/api/course-fees', method: 'GET', auth: true, check: (d) => d !== undefined }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await fetch(`${BASE_URL}${t.url}`, {
        method: t.method,
        headers: t.auth ? authHeaders : { 'Content-Type': 'application/json' }
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
      const isOk = t.expectedStatus
        ? res.status === t.expectedStatus
        : (res.ok && t.check(data));

      if (isOk) {
        console.log(`  ✓ [HTTP ${res.status}] ${t.name} -> Passed`);
        passed++;
      } else {
        console.error(`  ❌ [HTTP ${res.status}] ${t.name} -> FAILED check`);
        console.error('     Response:', JSON.stringify(data).slice(0, 150));
        failed++;
      }
    } catch (err) {
      console.error(`  ❌ ${t.name} -> ERROR: ${err.message}`);
      failed++;
    }
  }

  // Instructor profile test
  const firstIns = await Instructor.findOne({});
  if (firstIns) {
    try {
      const res = await fetch(`${BASE_URL}/api/instructors/${firstIns._id}/profile`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok && data.instructor && data.metrics) {
        console.log(`  ✓ [HTTP ${res.status}] Instructor Profile (${firstIns.name}) -> Passed`);
        passed++;
      } else {
        console.error(`  ❌ Instructor Profile -> FAILED check`);
        failed++;
      }
    } catch (err) {
      console.error(`  ❌ Instructor Profile -> ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================');

  server.close();
  await mongoose.disconnect();
  console.log('Test server closed and DB disconnected cleanly.');

  if (failed > 0) {
    process.exit(1);
  }
}

testApiRoutes().catch(err => {
  console.error('Fatal API test error:', err);
  process.exit(1);
});
