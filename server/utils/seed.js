const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const Counter = require('../models/Counter');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Enquiry = require('../models/Enquiry');
const Payment = require('../models/Payment');
const User = require('../models/User');

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing existing collection records...');
    await Counter.deleteMany();
    await Batch.deleteMany();
    await Student.deleteMany();
    await Class.deleteMany();
    await Enquiry.deleteMany();
    await Payment.deleteMany();
    await User.deleteMany();

    console.log('Seeding SUPERADMIN user...');
    const superadmin = await User.create({
      name: 'Super Admin',
      username: 'superadmin',
      email: 'admin@benz.com',
      password: 'admin123',
      role: 'Superadmin',
      status: 'Active'
    });
    console.log(`Superadmin created: username="superadmin", email="admin@benz.com", password="admin123"`);

    console.log('Seeding initial Batches...');
    const batches = await Batch.insertMany([
      {
        name: 'Batch A - Morning LMV',
        courseLicenceType: 'LMV - 4 Wheeler',
        vehicleType: '4 Wheeler',
        instructor: 'Ramesh Kumar',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        startTime: '07:00 AM',
        endTime: '08:30 AM',
        maxStudents: 15,
        status: 'Active',
        notes: 'Morning shift batch for 4 wheeler training'
      },
      {
        name: 'Batch B - Evening MCWG',
        courseLicenceType: 'MCWG - 2 Wheeler',
        vehicleType: '2 Wheeler',
        instructor: 'Suresh Nair',
        startDate: new Date(),
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        startTime: '04:30 PM',
        endTime: '06:00 PM',
        maxStudents: 10,
        status: 'Active',
        notes: 'Evening 2 wheeler training batch'
      }
    ]);

    console.log('Seeding initial Counter...');
    await Counter.create({ _id: 'studentId', seq: 2 });

    console.log('Seeding initial Students...');
    const students = await Student.insertMany([
      {
        studentId: 'STU-0001',
        fullName: 'Anand Varma',
        aliasSourceName: 'Walk-in',
        primaryMobile: '9876543210',
        alternateMobile: '9876543211',
        dob: new Date('1998-05-15'),
        licenceServiceType: 'Fresh Licence',
        vehicleType: '4 Wheeler',
        applicationNo: 'KL-2026-00123',
        registrationDate: new Date(),
        licenceCategory: 'LMV',
        batch: batches[0]._id,
        workflowStage: 'DL Training',
        currentStatus: 'Active',
        applicationOpen: true,
        newApplication: true,
        nextAction: 'Practical driving class 5',
        followUpDate: new Date(),
        testDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        testStatus: 'Scheduled',
        totalFee: 8500,
        paidAmount: 5000,
        advanceAmount: 1000,
        documentReadiness: {
          aadhaarVerified: true,
          photoVerified: true,
          addressProofVerified: true,
          bloodGroupRecorded: true,
          form15Ready: true
        },
        notes: 'Student showing steady progress.'
      },
      {
        studentId: 'STU-0002',
        fullName: 'Priya Mohan',
        aliasSourceName: 'Referral',
        primaryMobile: '9123456789',
        dob: new Date('2001-09-20'),
        licenceServiceType: 'Fresh Licence',
        vehicleType: '2 Wheeler',
        applicationNo: 'KL-2026-00456',
        registrationDate: new Date(),
        licenceCategory: 'MCWG',
        batch: batches[1]._id,
        workflowStage: 'LL Approved',
        currentStatus: 'Active',
        applicationOpen: true,
        newApplication: false,
        nextAction: 'Schedule simulator training',
        followUpDate: new Date(),
        testDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        testStatus: 'Scheduled',
        totalFee: 4500,
        paidAmount: 4500,
        advanceAmount: 0,
        documentReadiness: {
          aadhaarVerified: true,
          photoVerified: true,
          addressProofVerified: false,
          bloodGroupRecorded: true,
          form15Ready: false
        },
        notes: 'Address proof copy pending verification.'
      }
    ]);

    console.log('Seeding initial Classes...');
    await Class.insertMany([
      {
        student: students[0]._id,
        classDate: new Date(),
        instructor: 'Ramesh Kumar',
        vehicleNo: 'KL-01-BK-9988',
        trainingType: 'Practical Driving',
        km: 12,
        hours: 1,
        notes: 'Steering control and gear shifting practice.'
      },
      {
        student: students[1]._id,
        classDate: new Date(),
        instructor: 'Suresh Nair',
        vehicleNo: 'KL-01-AT-4411',
        trainingType: 'Track Driving',
        km: 8,
        hours: 1,
        notes: 'Eight-shaped track practice.'
      }
    ]);

    console.log('Seeding initial Enquiries...');
    await Enquiry.insertMany([
      {
        name: 'Kiran Joseph',
        primaryMobile: '9988776655',
        interestedLicence: 'LMV & MCWG Combo',
        vehicleType: 'Both',
        preferredBatch: batches[0]._id,
        enquiryDate: new Date(),
        followUpDate: new Date(),
        source: 'Social Media',
        status: 'New',
        notes: 'Inquired about morning batch combo discount.'
      },
      {
        name: 'Deepa Raj',
        primaryMobile: '9744112233',
        interestedLicence: 'LMV - 4 Wheeler',
        vehicleType: '4 Wheeler',
        preferredBatch: batches[0]._id,
        enquiryDate: new Date(),
        followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        source: 'Walk-in',
        status: 'Contacted',
        notes: 'Will confirm joining after weekend.'
      }
    ]);

    console.log('Seeding initial Payments...');
    await Payment.insertMany([
      {
        student: students[0]._id,
        paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        amount: 1000,
        paymentType: 'Advance Payment',
        paymentMethod: 'UPI',
        notes: 'Registration advance payment'
      },
      {
        student: students[0]._id,
        paymentDate: new Date(),
        amount: 5000,
        paymentType: 'Fee Payment',
        paymentMethod: 'Cash',
        notes: 'First installment payment'
      },
      {
        student: students[1]._id,
        paymentDate: new Date(),
        amount: 4500,
        paymentType: 'Fee Payment',
        paymentMethod: 'Bank Transfer',
        notes: 'Full payment made'
      }
    ]);

    console.log('Database seeded successfully with Superadmin!');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seedData();
