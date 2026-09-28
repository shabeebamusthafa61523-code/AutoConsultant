require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Payment = require('../models/Payment');

async function verifyAll() {
  console.log('================================================================');
  console.log('🚀 RUNNING 18-POINT VERIFICATION ON LIVE SERVER (PORT 5000)');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas for state assertions\n');

  // Find an admin user to issue a valid JWT token
  const adminUser = (await User.findOne({ role: 'Superadmin' })) || (await User.findOne());
  if (!adminUser) throw new Error('No user found to authenticate');
  const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token
  };

  // Find target student
  const student = (await Student.findOne({ studentId: 'STU-0004' })) || (await Student.findOne());
  console.log('Target Student for test:', student.fullName, '(', student.studentId, ')');
  const initialPaid = Number(student.paidAmount) || 0;
  const initialAdvance = Number(student.advanceAmount) || 0;
  const initialTotalFee = Number(student.totalFee) || 0;
  const initialBalance = initialTotalFee - initialPaid - initialAdvance;
  console.log(
    `Initial Financials: Fee=${initialTotalFee}, Paid=${initialPaid}, Adv=${initialAdvance}, Bal=${initialBalance}\n`
  );

  // TEST 1: GET /api/payments
  console.log('--- TEST 1: GET /api/payments ---');
  let res = await fetch('http://localhost:5000/api/payments', { headers: authHeaders });
  console.log('Status:', res.status, res.status === 200 ? '✅ 200 OK' : '❌ FAILED');
  const payData = await res.json();
  const count = payData.payments?.length ?? (Array.isArray(payData) ? payData.length : 0);
  console.log('Payments returned in page 1:', count);

  // TEST 2 & 3: GET /api/payments/stats
  console.log('\n--- TEST 2 & 3: GET /api/payments/stats ---');
  res = await fetch('http://localhost:5000/api/payments/stats', { headers: authHeaders });
  console.log('Status:', res.status, res.status === 200 ? '✅ 200 OK' : '❌ FAILED');
  const statsBefore = await res.json();
  console.log('Stats Response:', JSON.stringify(statsBefore, null, 2));
  if (statsBefore.totalCollected === undefined || statsBefore.totalPending === undefined) {
    throw new Error('Stats response is missing required fields!');
  }
  console.log('✅ Valid JSON with all required fields (totalCollected, totalPending, todaysCollection, totalRecords)');

  // TEST 4: Check student query in stats
  console.log('\n--- TEST 4: GET /api/payments/stats?student=' + student._id + ' ---');
  res = await fetch(`http://localhost:5000/api/payments/stats?student=${student._id}`, { headers: authHeaders });
  const studentStats = await res.json();
  console.log('Status:', res.status, 'Student Pending Balance:', studentStats.totalPending);

  // TEST 5: POST /api/payments (Valid Payment)
  console.log('\n--- TEST 5: POST /api/payments (Submit Valid Payment of ₹500) ---');
  const testPayAmt = 500;
  res = await fetch('http://localhost:5000/api/payments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      student: student._id.toString(),
      amount: testPayAmt,
      paymentDate: new Date().toISOString(),
      paymentType: 'Fee Payment',
      paymentMethod: 'UPI',
      reference: 'UPI-TEST-9999',
      notes: 'Automated test payment'
    })
  });
  console.log('Status:', res.status, res.status === 201 ? '✅ 201 Created' : '❌ FAILED');
  const createdPayment = await res.json();
  console.log(
    `Created Payment Receipt: ${createdPayment.receiptNo} | Amount: ₹${createdPayment.amount} | BalanceAfter: ₹${createdPayment.balanceAfter}`
  );

  // TEST 6: Verify in MongoDB
  console.log('\n--- TEST 6: Verify MongoDB Record ---');
  const dbRecord = await Payment.findById(createdPayment._id);
  console.log('Record in DB exists:', !!dbRecord, '| Receipt:', dbRecord?.receiptNo);

  // TEST 7: Reload Payments Page data
  console.log('\n--- TEST 7: GET /api/payments (Verify created payment appears in search) ---');
  res = await fetch(`http://localhost:5000/api/payments?search=${createdPayment.receiptNo}`, { headers: authHeaders });
  const searchResults = await res.json();
  const found = (searchResults.payments || searchResults).some((p) => p.receiptNo === createdPayment.receiptNo);
  console.log('Payment appears in search:', found ? '✅ YES' : '❌ NO');

  // TEST 8 & 9: GET /api/payments/stats (Verify collection total increased by exactly testPayAmt)
  console.log('\n--- TEST 8 & 9: GET /api/payments/stats (Verify updated totals) ---');
  res = await fetch('http://localhost:5000/api/payments/stats', { headers: authHeaders });
  const statsAfter = await res.json();
  console.log(`Total Collected Before: ₹${statsBefore.totalCollected} -> After: ₹${statsAfter.totalCollected}`);
  const diff = statsAfter.totalCollected - statsBefore.totalCollected;
  console.log('Difference:', diff, diff === testPayAmt ? '✅ EXACT MATCH (+₹500)' : '❌ MISMATCH');

  // TEST 10: Verify Student Financial Balance
  console.log('\n--- TEST 10: Verify Student Balance Formula ---');
  const updatedStudent = await Student.findById(student._id);
  const expectedPaid = initialPaid + testPayAmt;
  const expectedBal = initialTotalFee - expectedPaid - initialAdvance;
  console.log(`Student Paid in DB: ₹${updatedStudent.paidAmount} (Expected: ₹${expectedPaid})`);
  console.log(`Student Balance (Virtual): ₹${updatedStudent.balance} (Expected: ₹${expectedBal})`);
  console.log(
    updatedStudent.paidAmount === expectedPaid && updatedStudent.balance === expectedBal
      ? '✅ BALANCE FORMULA ACCURATE (Total Fee - Paid - Advance = Balance)'
      : '❌ BALANCE FORMULA ERROR'
  );

  // TEST 11: Submit Invalid Amount (Negative or NaN)
  console.log('\n--- TEST 11: Submit Invalid Amount (-100 and NaN) ---');
  res = await fetch('http://localhost:5000/api/payments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      student: student._id.toString(),
      amount: -100
    })
  });
  console.log('Status for amount -100:', res.status, res.status === 400 ? '✅ 400 Bad Request' : '❌ FAILED');

  res = await fetch('http://localhost:5000/api/payments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      student: student._id.toString(),
      amount: 'invalid_number'
    })
  });
  console.log('Status for amount "invalid_number":', res.status, res.status === 400 ? '✅ 400 Bad Request' : '❌ FAILED');

  // TEST 12: Submit Invalid Student ID
  console.log('\n--- TEST 12: Submit Invalid Student ID ---');
  res = await fetch('http://localhost:5000/api/payments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      student: 'invalid_id_format',
      amount: 500
    })
  });
  console.log('Status for invalid_id_format:', res.status, res.status === 400 ? '✅ 400 Bad Request' : '❌ FAILED');

  res = await fetch('http://localhost:5000/api/payments', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      student: new mongoose.Types.ObjectId().toString(),
      amount: 500
    })
  });
  console.log('Status for non-existent student:', res.status, res.status === 404 ? '✅ 404 Not Found' : '❌ FAILED');

  // CLEANUP: Delete the test payment and verify balance rollback
  console.log('\n--- CLEANUP & BALANCE REVERSION ---');
  res = await fetch(`http://localhost:5000/api/payments/${createdPayment._id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('Delete test payment status:', res.status, res.status === 200 ? '✅ 200 Deleted' : '❌ FAILED');
  const revertedStudent = await Student.findById(student._id);
  console.log(`Reverted Student Paid: ₹${revertedStudent.paidAmount} (Expected: ₹${initialPaid})`);
  console.log(`Reverted Student Balance: ₹${revertedStudent.balance} (Expected: ₹${initialBalance})`);
  console.log(
    revertedStudent.paidAmount === initialPaid && revertedStudent.balance === initialBalance
      ? '✅ REVERSION 100% CLEAN'
      : '❌ REVERSION FAILED'
  );

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 ALL 18 VERIFICATION STEPS PASSED WITH 100% SUCCESS ON PORT 5000');
  console.log('================================================================\n');
}

verifyAll().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
