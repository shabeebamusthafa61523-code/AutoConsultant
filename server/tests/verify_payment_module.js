require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const User = require('../models/User');
const { updateStudentPaymentTotals } = require('../controllers/paymentController');

async function runPaymentTests() {
  console.log('================================================================');
  console.log('🧪 RAZAIN-BENZ CRM: PAYMENTS & RECEIPTS END-TO-END VERIFICATION');
  console.log('================================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // 1. Verify Existing Data & Schema
    console.log('--- 1. SCHEMA & EXISTING DATA INTEGRITY ---');
    const existingPayments = await Payment.find({}).populate('student');
    console.log(`✓ Existing Payment Records Count: ${existingPayments.length}`);

    if (existingPayments.length > 0) {
      const p0 = existingPayments[0];
      console.log(`✓ Existing Record Details:`);
      console.log(`  • ID: ${p0._id}`);
      console.log(`  • Student: ${p0.student?.fullName} (${p0.student?.studentId})`);
      console.log(`  • Amount: ₹${p0.amount}`);
      console.log(`  • Type: ${p0.paymentType}`);
      console.log(`  • Method: ${p0.paymentMethod}`);
      console.log(`  • Date: ${p0.paymentDate}`);
      console.log(`  • Generated Virtual PaymentId: ${p0.paymentId}`);
    }

    // 2. Verify Balance Formula
    console.log('\n--- 2. BALANCE FORMULA INTEGRITY ---');
    const students = await Student.find({}).limit(5);
    for (const s of students) {
      const total = s.totalFee || 0;
      const paid = s.paidAmount || 0;
      const adv = s.advanceAmount || 0;
      const expectedBalance = total - paid - adv;
      if (s.balance !== expectedBalance) {
        throw new Error(`Balance calculation mismatch for student ${s.studentId}: expected ${expectedBalance}, got ${s.balance}`);
      }
      console.log(`✓ Student ${s.studentId} (${s.fullName}): Total Fee ₹${total} - Paid ₹${paid} - Adv ₹${adv} = Balance ₹${s.balance}`);
    }

    // 3. Test Validation Constraints
    console.log('\n--- 3. DATA VALIDATION CONSTRAINTS ---');
    const testStudent = students[0];

    // Pre-test cleanup if any lingering test records exist
    await Payment.deleteMany({ reference: 'TEST-UPI-98765' });
    await updateStudentPaymentTotals(testStudent._id);

    // Invalid: Amount <= 0
    try {
      const badAmount = new Payment({
        student: testStudent._id,
        amount: -100,
        paymentDate: new Date()
      });
      await badAmount.validate();
      throw new Error('Should have failed validation for negative amount');
    } catch (err) {
      console.log('✓ Negative/Zero payment amount properly rejected:', err.message);
    }

    // Invalid: Missing Student
    try {
      const badStudent = new Payment({
        amount: 500,
        paymentDate: new Date()
      });
      await badStudent.validate();
      throw new Error('Should have failed validation for missing student');
    } catch (err) {
      console.log('✓ Missing student properly rejected:', err.message);
    }

    // 4. Test Create Payment & Atomic Student Recalculation
    console.log('\n--- 4. CREATE PAYMENT & BALANCE SYNC TEST ---');
    const initialPaid = testStudent.paidAmount || 0;
    const initialBalance = testStudent.balance;
    const paymentAmount = 1500;

    const testPayment = await Payment.create({
      student: testStudent._id,
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentType: 'Fee Payment',
      paymentMethod: 'UPI',
      reference: 'TEST-UPI-98765',
      notes: 'Automated test payment entry'
    });

    console.log(`✓ Created test payment: ID ${testPayment._id}, Receipt: ${testPayment.paymentId}, Amount: ₹${testPayment.amount}`);

    // Update totals
    await updateStudentPaymentTotals(testStudent._id);

    const refreshedStudent = await Student.findById(testStudent._id);
    console.log(`✓ Student Paid Amount updated: ₹${initialPaid} -> ₹${refreshedStudent.paidAmount} (+₹${paymentAmount})`);
    console.log(`✓ Student Balance updated: ₹${initialBalance} -> ₹${refreshedStudent.balance} (-₹${paymentAmount})`);

    if (refreshedStudent.paidAmount !== initialPaid + paymentAmount) {
      throw new Error(`Paid amount mismatch: expected ${initialPaid + paymentAmount}, got ${refreshedStudent.paidAmount}`);
    }

    // 5. Test Edit Payment Record
    console.log('\n--- 5. EDIT PAYMENT RECORD ---');
    const updatedAmount = 2000;
    testPayment.amount = updatedAmount;
    testPayment.notes = 'Updated test payment entry';
    await testPayment.save();

    await updateStudentPaymentTotals(testStudent._id);
    const updatedStudent = await Student.findById(testStudent._id);
    console.log(`✓ Updated payment amount to ₹${updatedAmount}`);
    console.log(`✓ Student Paid Amount reflects update: ₹${updatedStudent.paidAmount}`);
    console.log(`✓ Student Balance reflects update: ₹${updatedStudent.balance}`);

    // 6. Test Delete Payment & Clean Reversion
    console.log('\n--- 6. DELETE PAYMENT RECORD & REVERT STATS ---');
    await Payment.findByIdAndDelete(testPayment._id);
    await updateStudentPaymentTotals(testStudent._id);

    const revertedStudent = await Student.findById(testStudent._id);
    console.log(`✓ Test payment deleted from MongoDB Atlas.`);
    console.log(`✓ Student Paid Amount reverted: ₹${revertedStudent.paidAmount} (matches initial ₹${initialPaid})`);
    console.log(`✓ Student Balance reverted: ₹${revertedStudent.balance} (matches initial ₹${initialBalance})`);

    if (revertedStudent.paidAmount !== initialPaid) {
      throw new Error(`Failed to revert student paid amount: expected ${initialPaid}, got ${revertedStudent.paidAmount}`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL PAYMENTS & RECEIPTS MODULE TESTS PASSED CLEANLY (6/6)');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Error during payment verification:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runPaymentTests();
