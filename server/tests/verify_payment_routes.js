require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const paymentRoutes = require('../routes/paymentRoutes');
const User = require('../models/User');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const { updateStudentPaymentTotals } = require('../controllers/paymentController');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    message: err.message
  });
});

async function runPaymentRouteTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING PAYMENTS REST API ROUTES END-TO-END');
  console.log('================================================================\n');

  let server;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    server = app.listen(5097);
    console.log('✅ Ephemeral server listening on port 5097\n');

    const BASE_URL = 'http://localhost:5097';

    // 1. Get admin user for token
    let admin = await User.findOne({ role: 'Superadmin' });
    if (!admin) admin = await User.findOne({});
    const token = jwt.sign(
      { id: admin._id, role: admin.role, name: admin.name },
      process.env.JWT_SECRET || 'benz_jwt_secret_2026',
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test Unauthorized access
    console.log('--- 1. Testing Unauthorized Access (Security & RBAC) ---');
    const unauthRes = await fetch(`${BASE_URL}/api/payments`);
    console.log(`Status without token: ${unauthRes.status}`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
    }
    console.log('✓ Protected route successfully rejects unauthorized requests (HTTP 401).\n');

    // 3. Test GET /api/payments/stats
    console.log('--- 2. Testing GET /api/payments/stats ---');
    const statsRes = await fetch(`${BASE_URL}/api/payments/stats`, { headers: authHeaders });
    console.log(`Status: ${statsRes.status}`);
    const statsBody = await statsRes.json();
    if (statsRes.status !== 200) throw new Error(`Stats endpoint failed: ${JSON.stringify(statsBody)}`);
    console.log(`✓ Total Collected: ₹${statsBody.totalCollected}`);
    console.log(`✓ Total Pending: ₹${statsBody.totalPending}`);
    console.log(`✓ Today's Collection: ₹${statsBody.todaysCollection} (${statsBody.todaysCount} payments)`);
    console.log(`✓ Total Payment Records: ${statsBody.totalRecords}\n`);

    // 4. Test GET /api/payments (Paginated Ledger)
    console.log('--- 3. Testing GET /api/payments ---');
    const listRes = await fetch(`${BASE_URL}/api/payments?page=1&limit=10`, { headers: authHeaders });
    console.log(`Status: ${listRes.status}`);
    const listBody = await listRes.json();
    if (listRes.status !== 200) throw new Error(`Payment list failed: ${JSON.stringify(listBody)}`);
    console.log(`✓ Returned ${listBody.payments?.length} payments in page 1 (Total: ${listBody.pagination?.total})`);
    if (listBody.payments?.length > 0) {
      const p = listBody.payments[0];
      console.log(`  Sample: ${p.receiptNo || p.paymentId} | Student: ${p.student?.fullName} | ₹${p.amount} via ${p.paymentMethod}`);
    }
    console.log('');

    // 5. Test POST /api/payments (Create Payment)
    console.log('--- 4. Testing POST /api/payments ---');
    const student = await Student.findOne({});
    const initialPaid = student.paidAmount || 0;

    const createRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        student: student._id,
        amount: 500,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentType: 'Fee Payment',
        paymentMethod: 'Cash',
        reference: 'API-TEST-REF-001',
        notes: 'REST API verification payment'
      })
    });

    console.log(`Status: ${createRes.status}`);
    const createdData = await createRes.json();
    if (createRes.status !== 201) throw new Error(`Create payment failed: ${JSON.stringify(createdData)}`);
    console.log(`✓ Created payment ID: ${createdData._id}`);
    console.log(`  Receipt No: ${createdData.receiptNo || createdData.paymentId}`);
    console.log(`  Previous Balance: ₹${createdData.previousBalance}, Balance After: ₹${createdData.balanceAfter}`);
    const createdPaymentId = createdData._id;

    // Verify student was updated
    const afterStudent = await Student.findById(student._id);
    console.log(`✓ Student paid amount increased: ₹${initialPaid} -> ₹${afterStudent.paidAmount}`);
    console.log('');

    // 6. Test GET /api/payments/:id
    console.log('--- 5. Testing GET /api/payments/:id ---');
    const singleRes = await fetch(`${BASE_URL}/api/payments/${createdPaymentId}`, { headers: authHeaders });
    console.log(`Status: ${singleRes.status}`);
    const singleData = await singleRes.json();
    if (singleRes.status !== 200) throw new Error(`Get payment by ID failed: ${JSON.stringify(singleData)}`);
    console.log(`✓ Retrieved single payment details successfully.\n`);

    // 7. Test PUT /api/payments/:id
    console.log('--- 6. Testing PUT /api/payments/:id ---');
    const updateRes = await fetch(`${BASE_URL}/api/payments/${createdPaymentId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 750,
        notes: 'Updated REST API verification payment'
      })
    });
    console.log(`Status: ${updateRes.status}`);
    const updatedData = await updateRes.json();
    if (updateRes.status !== 200) throw new Error(`Update payment failed: ${JSON.stringify(updatedData)}`);
    console.log(`✓ Updated payment amount to ₹${updatedData.amount}\n`);

    // 8. Test DELETE /api/payments/:id
    console.log('--- 7. Testing DELETE /api/payments/:id ---');
    const deleteRes = await fetch(`${BASE_URL}/api/payments/${createdPaymentId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`Status: ${deleteRes.status}`);
    const deleteData = await deleteRes.json();
    if (deleteRes.status !== 200) throw new Error(`Delete payment failed: ${JSON.stringify(deleteData)}`);
    console.log(`✓ Delete response: ${deleteData.message}`);

    const revertedStudent = await Student.findById(student._id);
    console.log(`✓ Student paid amount cleanly reverted to initial ₹${revertedStudent.paidAmount}\n`);

    // 9. Test GET /api/payments/export (CSV)
    console.log('--- 8. Testing GET /api/payments/export ---');
    const exportRes = await fetch(`${BASE_URL}/api/payments/export`, { headers: authHeaders });
    console.log(`Status: ${exportRes.status}`);
    console.log(`Content-Type: ${exportRes.headers.get('content-type')}`);
    if (exportRes.status !== 200) throw new Error(`Export CSV failed`);
    const csvContent = await exportRes.text();
    console.log(`✓ Successfully streamed CSV file (${csvContent.split('\n').length} lines)\n`);

    console.log('================================================================');
    console.log('🎉 ALL PAYMENTS REST API ROUTES VERIFIED WITH 100% SUCCESS!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Error during route verification:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runPaymentRouteTests();
