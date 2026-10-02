const mongoose = require('mongoose');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Class = require('../models/Class');
const Instructor = require('../models/Instructor');

// @desc    Get Daily Reports (Admission, Collection, Training, Test)
// @route   GET /api/reports/daily
const getDailyReports = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [admissions, payments, classes, applicationsWithTest] = await Promise.all([
      // 1. Daily Admissions
      Student.find({
        registrationDate: { $gte: startOfDay, $lte: endOfDay }
      }).select('studentId fullName primaryMobile vehicleType coursePackage totalFee paidAmount'),

      // 2. Daily Collections
      Payment.find({
        paymentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'Cancelled' }
      }).populate('student', 'studentId fullName primaryMobile'),

      // 3. Daily Training Sessions
      Class.find({
        classDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'Cancelled' }
      }).populate('student', 'studentId fullName primaryMobile'),

      // 4. Daily RTO & Driving Tests
      Application.find({
        $or: [
          { 'drivingTest.drivingTestDate': { $gte: startOfDay, $lte: endOfDay } },
          { 'learnerLicence.llTestDate': { $gte: startOfDay, $lte: endOfDay } }
        ]
      }).populate('student', 'studentId fullName primaryMobile vehicleType')
    ]);

    // Financial calculations
    const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const cashCollected = payments.filter(p => (p.paymentMethod || '').toLowerCase() === 'cash').reduce((acc, p) => acc + (p.amount || 0), 0);
    const digitalCollected = totalCollected - cashCollected;

    // Training calculations
    let totalKm = 0;
    let totalHPractices = 0;
    classes.forEach(c => {
      totalKm += Number(c.kmDriven || c.km || 0);
      totalHPractices += Number(c.hPracticeCount || 0);
    });

    res.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        newAdmissionsCount: admissions.length,
        totalCollectionsAmount: totalCollected,
        cashCollectionsAmount: cashCollected,
        digitalCollectionsAmount: digitalCollected,
        paymentsCount: payments.length,
        trainingSessionsCount: classes.length,
        totalKmDriven: totalKm,
        totalHPractices,
        testsCount: applicationsWithTest.length
      },
      data: {
        admissions,
        collections: payments,
        training: classes,
        tests: applicationsWithTest
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Monthly Reports (Student, Fee, Outstanding, Instructor, RTO)
// @route   GET /api/reports/monthly
const getMonthlyReports = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const [monthlyStudents, monthlyPayments, allStudents, monthlyClasses, instructors, monthlyTests] = await Promise.all([
      // 1. Monthly Admissions
      Student.find({
        registrationDate: { $gte: startOfMonth, $lte: endOfMonth }
      }),

      // 2. Monthly Payments
      Payment.find({
        paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $ne: 'Cancelled' }
      }),

      // 3. Outstanding Balances across all active students
      Student.find({
        currentStatus: { $ne: 'Dropped' }
      }).select('studentId fullName primaryMobile coursePackage totalFee paidAmount advanceAmount currentStatus nextAction'),

      // 4. Monthly Training Classes
      Class.find({
        classDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $ne: 'Cancelled' }
      }),

      // 5. Instructors
      Instructor.find({ status: 'Active' }),

      // 6. Monthly Tests
      Application.find({
        $or: [
          { 'drivingTest.drivingTestDate': { $gte: startOfMonth, $lte: endOfMonth } },
          { 'learnerLicence.llTestDate': { $gte: startOfMonth, $lte: endOfMonth } }
        ]
      }).populate('student', 'studentId fullName primaryMobile vehicleType')
    ]);

    // Financial aggregates
    const totalCollectedMonth = monthlyPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    let totalOutstanding = 0;
    const outstandingCandidates = [];

    allStudents.forEach(s => {
      const tot = Number(s.totalFee) || 0;
      const rec = (Number(s.paidAmount) || 0) + (Number(s.advanceAmount) || 0);
      const bal = tot - rec;
      if (bal > 0) {
        totalOutstanding += bal;
        outstandingCandidates.push({
          _id: s._id,
          studentId: s.studentId,
          fullName: s.fullName,
          primaryMobile: s.primaryMobile,
          coursePackage: s.coursePackage,
          totalFee: tot,
          paidAmount: rec,
          balance: bal,
          currentStatus: s.currentStatus,
          nextAction: s.nextAction || 'Collect Balance'
        });
      }
    });

    // Instructor workload breakdown
    const instructorStats = instructors.map(ins => {
      const insClasses = monthlyClasses.filter(c =>
        (c.instructorRef && String(c.instructorRef) === String(ins._id)) ||
        (c.instructor && c.instructor.toLowerCase() === ins.name.toLowerCase())
      );
      const km = insClasses.reduce((acc, c) => acc + Number(c.kmDriven || c.km || 0), 0);
      const h = insClasses.reduce((acc, c) => acc + Number(c.hPracticeCount || 0), 0);
      return {
        _id: ins._id,
        name: ins.name,
        mobile: ins.mobile,
        classesCount: insClasses.length,
        kmCovered: km,
        hPracticesCount: h
      };
    });

    // RTO stats breakdown
    const rtoPassed = monthlyTests.filter(t => t.drivingTest?.testResult === 'Passed').length;
    const rtoFailed = monthlyTests.filter(t => t.drivingTest?.testResult === 'Failed').length;
    const rtoScheduled = monthlyTests.filter(t => ['Scheduled', 'Pending'].includes(t.drivingTest?.testResult)).length;

    res.json({
      success: true,
      year: targetYear,
      month: targetMonth + 1,
      summary: {
        totalAdmissions: monthlyStudents.length,
        totalCollected: totalCollectedMonth,
        totalOutstanding,
        outstandingCount: outstandingCandidates.length,
        totalClassesConducted: monthlyClasses.length,
        testsConducted: monthlyTests.length,
        testsPassed: rtoPassed,
        testsFailed: rtoFailed
      },
      data: {
        admissions: monthlyStudents,
        outstandingCandidates: outstandingCandidates.sort((a, b) => b.balance - a.balance),
        instructorPerformance: instructorStats,
        rtoMetrics: {
          total: monthlyTests.length,
          passed: rtoPassed,
          failed: rtoFailed,
          scheduled: rtoScheduled,
          tests: monthlyTests
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyReports,
  getMonthlyReports
};
