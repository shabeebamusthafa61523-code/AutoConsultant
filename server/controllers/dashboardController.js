const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Enquiry = require('../models/Enquiry');
const Payment = require('../models/Payment');

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

    // 4. Today's Classes Count & List
    const todayClasses = await Class.find({
      classDate: { $gte: todayStart, $lte: todayEnd }
    }).populate('student', 'studentId fullName primaryMobile vehicleType');

    // 5. Students with pending payments (balance > 0)
    const allStudents = await Student.find();
    const pendingPaymentsCount = allStudents.filter(s => s.balance > 0).length;

    // 6. Upcoming Tests (testDate >= todayStart)
    const upcomingTestsList = await Student.find({
      testDate: { $gte: todayStart }
    })
      .populate('batch', 'name')
      .sort({ testDate: 1 })
      .limit(10);

    // 7. Follow-ups (Enquiries + Students with followUpDate >= todayStart)
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
        upcomingTests: upcomingTestsList.length
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
