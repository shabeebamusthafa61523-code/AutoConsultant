const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const BASE_URL = 'http://localhost:5000/api';

async function testLiveEndpoints() {
  console.log('\n======================================================');
  console.log('🌐 TESTING LIVE BACKEND ENDPOINTS OVER HTTP');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  const realUser = await User.findOne({ status: 'Active' });
  const token = jwt.sign({ id: realUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('✓ Health Check:', health.message);

  // 2. WhatsApp Status
  const waRes = await fetch(`${BASE_URL}/whatsapp/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const wa = await waRes.json();
  console.log('✓ WhatsApp Status Endpoint:', wa.data.status, `(${wa.data.message})`);

  // 3. Biometric Status
  const bioRes = await fetch(`${BASE_URL}/attendance/biometric/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bio = await bioRes.json();
  console.log('✓ Biometric Status Endpoint:', bio.status.status, `(${bio.status.message})`);

  // 4. Telemetry Status
  const telRes = await fetch(`${BASE_URL}/telemetry/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const tel = await telRes.json();
  console.log('✓ Telemetry Status Endpoint:', tel.status.status, `(${tel.status.message})`);

  // 5. Unauthenticated rejection (Security test)
  const unauthRes = await fetch(`${BASE_URL}/whatsapp/status`);
  if (unauthRes.status === 401) {
    console.log('✓ Security: Unauthenticated request to /whatsapp/status correctly rejected with 401');
  } else {
    throw new Error(`Expected 401, got ${unauthRes.status}`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL LIVE HTTP ENDPOINTS RESPONDING PERFECTLY!');
  console.log('======================================================\n');
  await mongoose.disconnect();
  process.exit(0);
}

testLiveEndpoints().catch(err => {
  console.error('❌ Live test failed:', err);
  process.exit(1);
});
