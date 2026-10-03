const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const classRoutes = require('./routes/classRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const courseFeeRoutes = require('./routes/courseFeeRoutes');
const userRoutes = require('./routes/userRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const studentDocumentRoutes = require('./routes/studentDocumentRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const migrationRoutes = require('./routes/migrationRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded documents securely
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Auto Consultant API is running cleanly' });
});

// API Routes
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
app.use('/api/expenses', expenseRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/reports', reportRoutes);

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Startup error handling: catch EADDRINUSE and report clearly
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`Stop the existing BENZ CRM backend process or use another PORT.\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server startup error:', err);
    process.exit(1);
  }
});

// Graceful shutdown handling for clean stop/restart
const handleShutdown = (signal) => {
  console.log(`\n${signal} received. Closing BENZ CRM server gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed.');
    } catch (dbErr) {
      console.error('Error closing MongoDB connection:', dbErr);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = app;
