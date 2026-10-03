const mongoose = require('mongoose');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Schedule = require('../models/Schedule');
const Enquiry = require('../models/Enquiry');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const StudentDocument = require('../models/StudentDocument');

// @desc    Get dashboard analytics & lists dynamically
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    // 1. Overall Student & Application Counts
    const totalStudents = await Student.countDocuments();
    const activeApplicationsCount = await Application.countDocuments({
      lifecycleStatus: { $nin: ['Completed', 'Cancelled', 'On Hold'] }
    });
    const newEnquiriesCount = await Enquiry.countDocuments({ status: 'New' });
    const activeBatchesCount = await Batch.countDocuments({ status: 'Active' });

    // 2. Today's Classes Count & List
    let todayClasses = await Class.find({
      classDate: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: 'Cancelled' }
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
      }
    });

    if (todayClasses.length === 0) {
      todayClasses = await Class.find({ status: { $ne: 'Cancelled' } })
        .populate('student', 'studentId fullName primaryMobile vehicleType')
        .populate('batch', 'name')
        .sort({ classDate: -1, createdAt: -1 })
        .limit(8);
    }

    // 3. Financial Totals (Calculated transaction-based ledger)
    const [allStudents, allApps] = await Promise.all([
      Student.find().select('totalFee paidAmount advanceAmount balance feeStatus'),
      Application.find().select('feeStructure lifecycleStatus')
    ]);

    let pendingPaymentsCount = 0;
    let totalPendingAmount = 0;
    let totalFeesSum = 0;
    let totalReceivedSum = 0;

    allStudents.forEach((s) => {
      const bal = (Number(s.totalFee) || 0) - (Number(s.paidAmount) || 0) - (Number(s.advanceAmount) || 0);
      totalFeesSum += Number(s.totalFee) || 0;
      totalReceivedSum += (Number(s.paidAmount) || 0) + (Number(s.advanceAmount) || 0);
      if (bal > 0) {
        pendingPaymentsCount++;
        totalPendingAmount += bal;
      }
    });

    // 4. Today's Collections
    const todayPaymentsAgg = await Payment.aggregate([
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

    todayPaymentsAgg.forEach((p) => {
      const amt = p.total || 0;
      todaysCollectionsSum += amt;
      if (p._id && p._id.toLowerCase() === 'cash') {
        todaysCashSum += amt;
      } else {
        todaysDigitalSum += amt;
      }
    });

    // This Month's Collections
    const monthPaymentsAgg = await Payment.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          paymentDate: { $gte: monthStart, $lte: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const thisMonthsCollection = monthPaymentsAgg[0]?.total || 0;

    // Today's Expenses Sum
    const todayExpenses = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: todayStart, $lte: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todaysExpensesSum = todayExpenses[0]?.total || 0;

    // 5. Operations Lifecycle Breakdown
    const [trainingStudentsCount, testReadyCount, llPendingCount, retestPendingCount, licencePendingCount] = await Promise.all([
      Application.countDocuments({ lifecycleStatus: 'Training' }),
      Application.countDocuments({ lifecycleStatus: { $in: ['Test Scheduled', 'Test Ready'] } }),
      Application.countDocuments({ lifecycleStatus: { $in: ['LL Processing', 'Documents Pending', 'Registered'] } }),
      Application.countDocuments({ lifecycleStatus: 'Retest' }),
      Application.countDocuments({ lifecycleStatus: 'Licence Processing' })
    ]);

    // 6. Today Command Centre Items
    // A. Overdue Next Actions
    const overdueNextActions = await Application.find({
      lifecycleStatus: { $nin: ['Completed', 'Cancelled'] },
      nextActionDueDate: { $lte: todayEnd },
      nextActionStatus: { $ne: 'Completed' }
    })
      .populate('student', 'fullName studentId primaryMobile')
      .sort({ nextActionDueDate: 1 })
      .limit(15);

    // B. RTO Tests Today & Upcoming
    const upcomingTestsList = await Application.find({
      lifecycleStatus: { $nin: ['Completed', 'Cancelled', 'Test Passed'] },
      $or: [
        { 'drivingTest.drivingTestDate': { $gte: todayStart } },
        { 'learnerLicence.llTestDate': { $gte: todayStart } },
        { lifecycleStatus: { $in: ['Test Scheduled', 'Retest'] } }
      ]
    })
      .populate('student', 'fullName studentId primaryMobile vehicleType')
      .populate('batch', 'name')
      .sort({ 'drivingTest.drivingTestDate': 1 })
      .limit(10);

    // C. Payment Follow-ups
    const paymentFollowups = await Application.find({
      'feeStructure.balanceDue': { $gt: 0 },
      lifecycleStatus: { $nin: ['Cancelled'] }
    })
      .populate('student', 'fullName studentId primaryMobile')
      .sort({ 'feeStructure.balanceDue': -1 })
      .limit(10);

    // D. Documents Pending
    const documentsPending = await Application.find({
      lifecycleStatus: 'Documents Pending'
    })
      .populate('student', 'fullName studentId primaryMobile')
      .limit(10);

    // Today's Admissions
    const newAdmissionsToday = await Student.countDocuments({
      registrationDate: { $gte: todayStart, $lte: todayEnd }
    });

    res.json({
      stats: {
        totalStudents,
        activeApplications: activeApplicationsCount,
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
      // R&D Guide Section 4: Management Dashboard Categorized KPIs
      managementKPI: {
        today: {
          newAdmissions: newAdmissionsToday,
          todaysCollection: todaysCollectionsSum,
          outstandingBalance: totalPendingAmount,
          todaysTraining: todayClasses.length,
          todaysRtoTests: upcomingTestsList.filter(t => t.drivingTest?.drivingTestDate && new Date(t.drivingTest.drivingTestDate) <= todayEnd).length,
          pendingDocuments: documentsPending.length
        },
        operations: {
          activeStudents: activeApplicationsCount || totalStudents,
          trainingStudents: trainingStudentsCount,
          testReady: testReadyCount,
          llPending: llPendingCount,
          retestPending: retestPendingCount,
          licencePending: licencePendingCount
        },
        finance: {
          totalFees: totalFeesSum,
          collected: totalReceivedSum,
          outstanding: totalPendingAmount,
          todaysCollection: todaysCollectionsSum,
          thisMonthsCollection: thisMonthsCollection
        },
        alerts: {
          overdueBalances: pendingPaymentsCount,
          incompleteDocuments: documentsPending.length,
          overdueNextActions: overdueNextActions.length,
          upcomingTests: upcomingTestsList.length
        }
      },
      // R&D Guide Section 5: Today Command Centre Office Lists
      todayCommandCentre: {
        trainingToday: todayClasses.map((c) => ({
          studentName: c.student?.fullName || 'Batch Session',
          studentId: c.student?.studentId || 'N/A',
          action: `${c.trainingType || 'Driving Practice'} (${c.vehicleNo || 'Vehicle'})`,
          dueDate: c.classDate || new Date(),
          assignedPerson: c.instructor || 'Instructor',
          priority: 'Medium',
          studentMongoId: c.student?._id || null
        })),
        rtoTestsToday: upcomingTestsList.map((t) => ({
          studentName: t.student?.fullName || 'Candidate',
          studentId: t.student?.studentId || 'N/A',
          action: `RTO Driving Test (${t.drivingTest?.vehicleClass || t.vehicleClass || '4W'}) - Slot: ${t.drivingTest?.testTimeSlot || 'General'}`,
          dueDate: t.drivingTest?.drivingTestDate || t.applicationDate,
          assignedPerson: 'RTO Officer',
          priority: 'High',
          studentMongoId: t.student?._id || null,
          applicationMongoId: t._id
        })),
        paymentFollowups: paymentFollowups.map((p) => ({
          studentName: p.student?.fullName || 'Candidate',
          studentId: p.student?.studentId || 'N/A',
          action: `Collect Balance ₹${p.feeStructure?.balanceDue?.toLocaleString('en-IN') || '0'}`,
          dueDate: p.nextActionDueDate || new Date(),
          assignedPerson: p.nextActionAssignedTo || 'Desk Staff',
          priority: 'High',
          studentMongoId: p.student?._id || null,
          applicationMongoId: p._id
        })),
        documentsPending: documentsPending.map((d) => ({
          studentName: d.student?.fullName || 'Candidate',
          studentId: d.student?.studentId || 'N/A',
          action: `Submit & Verify Aadhaar, Photo & Form 15`,
          dueDate: d.nextActionDueDate || new Date(),
          assignedPerson: 'Verification Desk',
          priority: 'Medium',
          studentMongoId: d.student?._id || null,
          applicationMongoId: d._id
        })),
        nextActionsOverdue: overdueNextActions.map((o) => ({
          studentName: o.student?.fullName || 'Candidate',
          studentId: o.student?.studentId || 'N/A',
          action: o.nextAction || 'Follow up with Candidate',
          dueDate: o.nextActionDueDate,
          assignedPerson: o.nextActionAssignedTo || 'Staff',
          priority: o.nextActionPriority || 'Urgent',
          studentMongoId: o.student?._id || null,
          applicationMongoId: o._id
        }))
      },
      lists: {
        todayClasses,
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
