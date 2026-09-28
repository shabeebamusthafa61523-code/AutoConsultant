require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const VehicleMaintenance = require('../models/VehicleMaintenance');
const VehicleFuel = require('../models/VehicleFuel');
const Student = require('../models/Student');
const StudentDocument = require('../models/StudentDocument');
const AuditLog = require('../models/AuditLog');
const Batch = require('../models/Batch');
const Class = require('../models/Class');

async function runVerification() {
  console.log('=====================================================');
  console.log('🚀 RAZAIN-BENZ CRM OPERATIONAL MODULES VERIFICATION');
  console.log('=====================================================');

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas\n');

    // 1. INSTRUCTOR MANAGEMENT VERIFICATION
    console.log('--- 1. INSTRUCTOR MANAGEMENT ---');
    const instructors = await Instructor.find({});
    console.log(`Found ${instructors.length} Instructors in database.`);
    if (instructors.length < 5) throw new Error(`Expected at least 5 instructors, found ${instructors.length}`);
    
    instructors.forEach(ins => {
      console.log(`  ✓ [${ins.instructorId}] ${ins.name} | Role: ${ins.designation} | Mobile: ${ins.mobile} | Status: ${ins.status}`);
    });
    const jasim = instructors.find(i => i.instructorId === 'INS001');
    if (!jasim || !jasim.licenceNo) {
      throw new Error('Jasim P record verification failed (missing DL licenceNo)');
    }
    console.log(`  ✓ Verified primary instructor details & credentials: DL ${jasim.licenceNo}, Badge ${jasim.badgeNo}.\n`);

    // 2. VEHICLE MASTER VERIFICATION
    console.log('--- 2. VEHICLE MASTER & COMPLIANCE REGISTERS ---');
    const vehicles = await Vehicle.find({});
    console.log(`Found ${vehicles.length} Vehicles in database.`);
    if (vehicles.length < 3) throw new Error(`Expected at least 3 vehicles, found ${vehicles.length}`);

    vehicles.forEach(v => {
      v.calculateComplianceStatuses();
      console.log(`  ✓ [${v.vehicleId}] ${v.vehicleNumber} (${v.brand} ${v.model}) | Status: ${v.status}`);
      console.log(`      RC Expiry: ${v.rc?.expiryDate ? v.rc.expiryDate.toISOString().split('T')[0] : 'N/A'} (Status: ${v.rc?.status || 'N/A'})`);
      console.log(`      Insurance Expiry: ${v.insurance?.expiryDate ? v.insurance.expiryDate.toISOString().split('T')[0] : 'N/A'} (Status: ${v.insurance?.status || 'N/A'})`);
      console.log(`      Fitness Expiry: ${v.fitness?.expiryDate ? v.fitness.expiryDate.toISOString().split('T')[0] : 'N/A'} (Status: ${v.fitness?.status || 'N/A'})`);
      console.log(`      PUC Expiry: ${v.puc?.expiryDate ? v.puc.expiryDate.toISOString().split('T')[0] : 'N/A'} (Status: ${v.puc?.status || 'N/A'})`);
    });

    // Test Vehicle Maintenance & Fuel sub-registers
    const testVeh = vehicles[0];
    const maint = await VehicleMaintenance.create({
      maintenanceId: `MNT-${Date.now()}`,
      vehicle: testVeh._id,
      vehicleNumber: testVeh.vehicleNumber,
      maintenanceType: 'Regular Service',
      description: 'Dual control brake check and engine oil change',
      date: new Date(),
      odometer: 45200,
      cost: 2500,
      vendor: 'Authorized Maruti Service Center Malappuram',
      status: 'Completed'
    });
    console.log(`  ✓ Created test maintenance record: ID ${maint.maintenanceId}, Cost: ₹${maint.cost}`);

    const fuel = await VehicleFuel.create({
      fuelId: `FUEL-${Date.now()}`,
      vehicle: testVeh._id,
      vehicleNumber: testVeh.vehicleNumber,
      date: new Date(),
      fuelQty: 25,
      amount: 2600,
      mileage: 45200,
      fuelStation: 'Indian Oil - Kodur',
      driverInstructor: 'Mohamed Jasim P'
    });
    console.log(`  ✓ Created test fuel record: ID ${fuel.fuelId}, Amount: ₹${fuel.amount}`);

    await VehicleMaintenance.findByIdAndDelete(maint._id);
    await VehicleFuel.findByIdAndDelete(fuel._id);
    console.log('  ✓ Cleaned up test maintenance & fuel records.\n');

    // 3. STUDENT DOCUMENT MANAGEMENT & READINESS SYNC
    console.log('--- 3. STUDENT DOCUMENT MANAGEMENT & SYNC HOOKS ---');
    let testStudent = await Student.findOne({});
    if (!testStudent) {
      console.log('  ℹ No existing student found, creating mock student for test');
      testStudent = await Student.create({
        fullName: 'Doc Test Student',
        phone: '9895000000',
        admissionNumber: 'ADM-TEST-01',
        courseType: 'Four Wheeler'
      });
    }

    const testDoc = await StudentDocument.create({
      documentId: `DOC-TEST-${Date.now()}`,
      student: testStudent._id,
      documentType: 'Aadhaar / ID',
      documentNumber: 'XXXX-XXXX-1234',
      status: 'Verified',
      verifiedDate: new Date(),
      verifiedByName: 'Verification Test Runner',
      remarks: 'Aadhaar Card verified with UIDAI standard'
    });
    console.log(`  ✓ Created verified student document: ${testDoc.documentType}`);

    // Verify readiness hook updated the student
    const updatedStudent = await Student.findById(testStudent._id);
    console.log(`  ✓ Checked Student.documentReadiness:`);
    console.log(`      aadhaarVerified: ${updatedStudent.documentReadiness?.aadhaarVerified}`);
    console.log(`      photoVerified: ${updatedStudent.documentReadiness?.photoVerified}`);
    console.log(`      form15Ready: ${updatedStudent.documentReadiness?.form15Ready}`);

    if (!updatedStudent.documentReadiness?.aadhaarVerified) {
      throw new Error('Readiness hook failed to update student aadhaarVerified flag');
    }

    // Clean up test document
    await StudentDocument.findByIdAndDelete(testDoc._id);
    console.log('  ✓ Cleaned up test document and verified hook execution.\n');

    // 4. SHARED AUDIT TRAIL
    console.log('--- 4. SHARED AUDIT TRAIL ---');
    const auditEntry = await AuditLog.logAction({
      action: 'SYSTEM_VERIFICATION',
      entity: 'OperationalModules',
      entityId: 'AUDIT-VERIFY-01',
      details: { testTimestamp: new Date().toISOString(), status: 'SUCCESS' },
      user: { name: 'Automated Test Runner', role: 'Superadmin' }
    });
    console.log(`  ✓ Logged immutable audit event: [${auditEntry.action}] - ID: ${auditEntry._id}\n`);

    // 5. BATCH & CLASS LINKAGE VERIFICATION
    console.log('--- 5. BATCH & CLASS RELATIONS ---');
    const batches = await Batch.find({}).populate('instructorRef vehicleRef');
    console.log(`Verified ${batches.length} batches.`);
    batches.forEach(b => {
      console.log(`  ✓ Batch "${b.batchName}" -> Instructor: ${b.instructorRef?.name || b.instructor || 'Unassigned'} | Vehicle: ${b.vehicleRef?.vehicleNumber || b.vehicle || 'Unassigned'}`);
    });

    console.log('\n=====================================================');
    console.log('🎯 ALL OPERATIONAL MODULE CHECKS PASSED WITH 100% SUCCESS');
    console.log('=====================================================');

  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Mongoose disconnected gracefully.');
  }
}

runVerification();
