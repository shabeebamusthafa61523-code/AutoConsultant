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

const cleanDatabase = async () => {
  try {
    await connectDB();

    console.log('Removing all test data from MongoDB Atlas...');

    // Clear all business collections
    const counterRes = await Counter.deleteMany();
    const batchRes = await Batch.deleteMany();
    const studentRes = await Student.deleteMany();
    const classRes = await Class.deleteMany();
    const enquiryRes = await Enquiry.deleteMany();
    const paymentRes = await Payment.deleteMany();

    console.log(`Deleted ${batchRes.deletedCount} Batches`);
    console.log(`Deleted ${studentRes.deletedCount} Students`);
    console.log(`Deleted ${classRes.deletedCount} Classes`);
    console.log(`Deleted ${enquiryRes.deletedCount} Enquiries`);
    console.log(`Deleted ${paymentRes.deletedCount} Payments`);
    console.log(`Deleted ${counterRes.deletedCount} Counters`);

    // Ensure Superadmin exists so login works
    const superadminExists = await User.findOne({ username: 'superadmin' });
    if (!superadminExists) {
      await User.create({
        name: 'Super Admin',
        username: 'superadmin',
        email: 'admin@benz.com',
        password: 'admin123',
        role: 'Superadmin',
        status: 'Active'
      });
      console.log('Re-created default Superadmin account (superadmin / admin123)');
    }

    // Remove any extra non-superadmin test users
    const nonSuperadminRes = await User.deleteMany({ role: { $ne: 'Superadmin' } });
    console.log(`Deleted ${nonSuperadminRes.deletedCount} non-Superadmin test users`);

    console.log('Database successfully cleaned! All business test data removed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to clean database:', error);
    process.exit(1);
  }
};

cleanDatabase();
