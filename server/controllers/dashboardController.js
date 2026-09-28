const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Schedule = require('../models/Schedule');
const Enquiry = require('../models/Enquiry');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');

// @desc    Get dashboard analytics & lists dynamically
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Total Students
    const totalStudents = await Student.countDocuments();

    // 2. New Enquiries
    const newEnquiriesCount = await Enquiry.countDocuments({ status: 'New' });

    // 3. Active Batches
    const activeBatchesCount = await Batch.countDocuments({ status: 'Active' });

    // 4. Today's Classes Count & List (Class records + Schedule sessions + Recent Fallback)
    let todayClasses = await Class.find({
      classDate: { $gte: todayStart, $lte: todayEnd }
    })
      .populate('student', 'studentId fullName primaryMobile vehicleType')
      .populate('batch', 'name');

    // Also fetch today's batch schedules
    const todaySchedules = await Schedule.find({
      date: { $gte: todayStart, $lte: todayEnd }
    })
      .populate('batch', 'name')
      .populate('students', 'studentId fullName primaryMobile vehicleType');

    todaySchedules.forEach((sch) => {
      if (sch.students && sch.students.length > 0) {
        sch.students.forEach((stu) => {
          todayClasses.push({
            _id: sch._id + '_' + stu._id,
            student: stu,
            classDate: sch.date,
            instructor: sch.instructor || 'Instructor',
            vehicleNo: sch.vehicleNo || 'KL-10-AB-5265',
            trainingType: sch.classType || 'Practical Driving',
            timeSlot: sch.timeSlot,
            batch: sch.batch
          });
        });
      } else {
        todayClasses.push({
          _id: sch._id,
          student: {
            fullName: sch.batch?.name ? `Batch Session (${sch.batch.name})` : 'Batch Practical Session',
            studentId: 'BATCH',
            primaryMobile: sch.timeSlot || 'Scheduled'
          },
          classDate: sch.date,
          instructor: sch.instructor || 'Instructor',
          vehicleNo: sch.vehicleNo || 'KL-10-AB-5265',
          trainingType: sch.classType || 'Practical Driving',
          timeSlot: sch.timeSlot,
          batch: sch.batch
        });
      }
    });

    // Fallback: If no classes or schedules for today, show most recent driving sessions
    if (todayClasses.length === 0) {
      todayClasses = await Class.find()
        .populate('student', 'studentId fullName primaryMobile vehicleType')
        .populate('batch', 'name')
        .sort({ classDate: -1, createdAt: -1 })
        .limit(10);
    }

    // 5. Students with pending payments & total pending due amount
    const allStudents = await Student.find();
    let pendingPaymentsCount = 0;
    let totalPendingAmount = 0;

    allStudents.forEach((s) => {
      const bal = (Number(s.totalFee) || 0) - (Number(s.paidAmount) || 0) - (Number(s.advanceAmount) || 0);
      if (bal > 0) {
        pendingPaymentsCount++;
        totalPendingAmount += bal;
      }
    });

    // 6. Upcoming Driving Tests & Candidates awaiting test (Test Pending, Test Scheduled, Retest)
    const upcomingTestsList = await Student.find({
      $and: [
        { currentStatus: { $nin: ['Passed', 'Completed', 'Dropped', 'Inactive'] } },
        {
          $or: [
            { testDate: { $gte: todayStart } },
            { currentStatus: { $in: ['Test Pending', 'Test Scheduled', 'Retest', 'Test Ready'] } },
            { testStatus: { $in: ['Scheduled', 'Retest Required', 'Pending'] } }
          ]
        }
      ]
    })
      .populate('batch', 'name')
      .sort({ testDate: 1 })
      .limit(10);

    // 7. Today's Collections Sum & Method Breakdown
    const todayPayments = await Payment.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          paymentDate: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let todaysCollectionsSum = 0;
    let todaysCashSum = 0;
    let todaysDigitalSum = 0;

    todayPayments.forEach((p) => {
      const amt = p.total || 0;
      todaysCollectionsSum += amt;
      if (p._id && p._id.toLowerCase() === 'cash') {
        todaysCashSum += amt;
      } else {
        todaysDigitalSum += amt;
      }
    });

    // 8. Today's Expenses Sum
    const todayExpenses = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: todayStart, $lte: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todaysExpensesSum = todayExpenses[0]?.total || 0;

    // 9. Follow-ups (Enquiries + Students with followUpDate >= todayStart)
    const enquiryFollowups = await Enquiry.find({
      followUpDate: { $gte: todayStart },
      status: { $ne: 'Closed' }
    }).sort({ followUpDate: 1 }).limit(10);

    const studentFollowups = await Student.find({
      followUpDate: { $gte: todayStart }
    }).sort({ followUpDate: 1 }).limit(10);

    res.json({
      stats: {
        totalStudents,
        newEnquiries: newEnquiriesCount,
        activeBatches: activeBatchesCount,
        todaysClasses: todayClasses.length,
        pendingPayments: pendingPaymentsCount,
        totalPendingAmount,
        upcomingTests: upcomingTestsList.length,
        todaysCollections: todaysCollectionsSum,
        todaysCash: todaysCashSum,
        todaysDigital: todaysDigitalSum,
        todaysExpenses: todaysExpensesSum
      },
      lists: {
        todayClasses,
        followUps: {
          enquiries: enquiryFollowups,
          students: studentFollowups
        },
        upcomingTests: upcomingTestsList
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
