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

const { execSync } = require('child_process');

const PORT = process.env.PORT || 5000;

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = new Set();
      for (const line of result.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch (_) {}
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    }
  } catch (_) {}
}

let isListening = false;
let server = null;

const startServer = () => {
  if (isListening) return;
  isListening = true;

  server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${PORT} is in use. Auto-releasing port ${PORT}...`);
      freePort(PORT);
      isListening = false;
      setTimeout(() => {
        startServer();
      }, 1000);
    } else {
      console.error('🚨 HTTP Server Error:', err.message);
    }
  });
};

const handleGracefulShutdown = (signal) => {
  if (server) {
    server.close(() => {
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
};

process.once('SIGUSR2', () => handleGracefulShutdown('SIGUSR2'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

startServer();
