const mongoose = require('mongoose');
const FollowUp = require('../models/FollowUp');
const Student = require('../models/Student');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get follow-ups with comprehensive filters, search, and pagination
// @route   GET /api/follow-ups
const getFollowUps = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      student: studentFilter,
      isOverdue,
      isUpcoming,
      startDate,
      endDate,
      search,
      sortBy = 'dueDate',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Assigned staff filter
    if (assignedTo && assignedTo !== 'all') {
      if (assignedTo === 'unassigned') {
        query.assignedTo = { $in: [null, undefined] };
      } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        query.assignedTo = assignedTo;
      }
    }

    // Student filter
    if (studentFilter && studentFilter !== 'all') {
      if (mongoose.Types.ObjectId.isValid(studentFilter)) {
        query.student = studentFilter;
      } else {
        const matched = await Student.findOne({ studentId: studentFilter });
        if (matched) query.student = matched._id;
      }
    }

    // Overdue filter
    if (isOverdue === 'true') {
      query.status = 'Pending';
      query.dueDate = { $lt: todayStart };
    } else if (isUpcoming === 'true') {
      query.status = 'Pending';
      query.dueDate = { $gte: todayStart };
    }

    // Date range filter
    if (startDate || endDate) {
      query.dueDate = query.dueDate || {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.dueDate.$lte = end;
      }
    }

    // Search filter: task or student name / mobile / id
    if (search && search.trim()) {
      const s = search.trim();
      const matchedStudents = await Student.find({
        $or: [
          { fullName: { $regex: s, $options: 'i' } },
          { studentId: { $regex: s, $options: 'i' } },
          { primaryMobile: { $regex: s, $options: 'i' } }
        ]
      }).select('_id');

      const studentIds = matchedStudents.map((stu) => stu._id);

      query.$or = [
        { task: { $regex: s, $options: 'i' } },
        { notes: { $regex: s, $options: 'i' } },
        { student: { $in: studentIds } }
      ];
    }

    // Sorting
    const sort = {};
    const order = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'priority') {
      sort.priority = order;
    } else if (sortBy === 'createdAt') {
      sort.createdAt = order;
    } else {
      sort.dueDate = order;
    }

    if (limit === 'all') {
      const followUps = await FollowUp.find(query)
        .populate({
          path: 'student',
          select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
          populate: { path: 'batch', select: 'name' }
        })
        .populate('assignedTo', 'name role email')
        .populate('createdBy', 'name role')
        .populate('completedBy', 'name role')
        .sort(sort);

      return res.json({
        followUps,
        pagination: {
          total: followUps.length,
          page: 1,
          totalPages: 1,
          limit: followUps.length
        }
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await FollowUp.countDocuments(query);
    const followUps = await FollowUp.find(query)
      .populate({
        path: 'student',
        select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
        populate: { path: 'batch', select: 'name' }
      })
      .populate('assignedTo', 'name role email')
      .populate('createdBy', 'name role')
      .populate('completedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.json({
      followUps,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary metrics for Follow-Up dashboard & calendar
// @route   GET /api/follow-ups/summary
const getFollowUpSummary = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalPending, overdueCount, upcomingCount, completedTodayCount, urgentCount] = await Promise.all([
      FollowUp.countDocuments({ status: 'Pending' }),
      FollowUp.countDocuments({ status: 'Pending', dueDate: { $lt: todayStart } }),
      FollowUp.countDocuments({ status: 'Pending', dueDate: { $gte: todayStart } }),
      FollowUp.countDocuments({ status: 'Completed', completedAt: { $gte: todayStart, $lte: todayEnd } }),
      FollowUp.countDocuments({ status: 'Pending', priority: 'Urgent' })
    ]);

    // Also get upcoming 5 tasks and overdue top 5
    const upcomingTasks = await FollowUp.find({
      status: 'Pending',
      dueDate: { $gte: todayStart }
    })
      .populate('student', 'studentId fullName primaryMobile vehicleType')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    const overdueTasks = await FollowUp.find({
      status: 'Pending',
      dueDate: { $lt: todayStart }
    })
      .populate('student', 'studentId fullName primaryMobile vehicleType')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .limit(5);

    res.json({
      metrics: {
        totalPending,
        overdueCount,
        upcomingCount,
        completedTodayCount,
        urgentCount
      },
      upcomingTasks,
      overdueTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single follow-up by ID
// @route   GET /api/follow-ups/:id
const getFollowUpById = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate({
        path: 'student',
        select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
        populate: { path: 'batch', select: 'name' }
      })
      .populate('assignedTo', 'name role email')
      .populate('createdBy', 'name role')
      .populate('completedBy', 'name role');

    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up record not found');
    }

    res.json(followUp);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new follow-up
// @route   POST /api/follow-ups
const createFollowUp = async (req, res, next) => {
  try {
    const {
      student,
      task,
      dueDate,
      dueTime = '',
      assignedTo = null,
      priority = 'Medium',
      relatedStage = '',
      notes = ''
    } = req.body;

    if (!student) {
      res.status(400);
      throw new Error('Student reference is required');
    }

    if (!task || !task.trim()) {
      res.status(400);
      throw new Error('Task / Follow-up description is required');
    }

    if (!dueDate) {
      res.status(400);
      throw new Error('Due date is required');
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      res.status(400);
      throw new Error('Invalid due date format');
    }

    // Verify student exists
    let studentDoc = null;
    if (mongoose.Types.ObjectId.isValid(student)) {
      studentDoc = await Student.findById(student);
    }
    if (!studentDoc) {
      studentDoc = await Student.findOne({ studentId: student });
    }

    if (!studentDoc) {
      res.status(404);
      throw new Error(`Student not found with ID ${student}`);
    }

    // Resolve assigned user name
    let assignedUserName = 'Unassigned';
    let assignedUserId = null;
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      const assignedUser = await User.findById(assignedTo);
      if (assignedUser) {
        assignedUserId = assignedUser._id;
        assignedUserName = assignedUser.name;
      }
    } else if (req.user) {
      assignedUserId = req.user._id;
      assignedUserName = req.user.name;
    }

    const followUp = await FollowUp.create({
      student: studentDoc._id,
      task: task.trim(),
      dueDate: parsedDueDate,
      dueTime: dueTime ? dueTime.trim() : '',
      assignedTo: assignedUserId,
      assignedToName: assignedUserName,
      priority,
      status: 'Pending',
      relatedStage: relatedStage.trim(),
      notes: notes.trim(),
      createdBy: req.user ? req.user._id : null,
      createdByName: req.user ? req.user.name : 'System'
    });

    // Update student next action and followUpDate if appropriate
    studentDoc.nextAction = task.trim();
    studentDoc.followUpDate = parsedDueDate;

    studentDoc.timeline.push({
      action: 'Follow-Up Created',
      category: 'General',
      description: `Task: ${task.trim()} (Due: ${parsedDueDate.toLocaleDateString()})`,
      timestamp: new Date(),
      performedBy: req.user ? `${req.user.name} (${req.user.role})` : 'System'
    });

    await studentDoc.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'FOLLOW_UP_CREATED',
      entity: 'FollowUp',
      entityId: followUp._id,
      details: {
        task: followUp.task,
        studentId: studentDoc.studentId,
        studentName: studentDoc.fullName,
        dueDate: parsedDueDate,
        priority
      },
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate({
        path: 'student',
        select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
        populate: { path: 'batch', select: 'name' }
      })
      .populate('assignedTo', 'name role email');

    res.status(201).json({
      message: 'Follow-up created successfully',
      followUp: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update follow-up details
// @route   PUT /api/follow-ups/:id
const updateFollowUp = async (req, res, next) => {
  try {
    const { task, dueDate, dueTime, assignedTo, priority, relatedStage, notes, status } = req.body;

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up record not found');
    }

    if (task) followUp.task = task.trim();
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        res.status(400);
        throw new Error('Invalid due date format');
      }
      followUp.dueDate = parsed;
    }
    if (dueTime !== undefined) followUp.dueTime = dueTime.trim();
    if (priority) followUp.priority = priority;
    if (relatedStage !== undefined) followUp.relatedStage = relatedStage.trim();
    if (notes !== undefined) followUp.notes = notes.trim();

    if (assignedTo !== undefined) {
      if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
        const u = await User.findById(assignedTo);
        if (u) {
          followUp.assignedTo = u._id;
          followUp.assignedToName = u.name;
        }
      } else {
        followUp.assignedTo = null;
        followUp.assignedToName = 'Unassigned';
      }
    }

    if (status && ['Pending', 'Completed', 'Cancelled'].includes(status)) {
      followUp.status = status;
      if (status === 'Completed') {
        followUp.completedAt = new Date();
        followUp.completedBy = req.user ? req.user._id : null;
        followUp.completedByName = req.user ? req.user.name : 'System';
      }
    }

    await followUp.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'FOLLOW_UP_UPDATED',
      entity: 'FollowUp',
      entityId: followUp._id,
      details: { task: followUp.task, status: followUp.status, dueDate: followUp.dueDate },
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate({
        path: 'student',
        select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
        populate: { path: 'batch', select: 'name' }
      })
      .populate('assignedTo', 'name role email');

    res.json({
      message: 'Follow-up updated successfully',
      followUp: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark follow-up as Completed
// @route   PATCH /api/follow-ups/:id/complete
const completeFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up record not found');
    }

    followUp.status = 'Completed';
    followUp.completedAt = new Date();
    followUp.completedBy = req.user ? req.user._id : null;
    followUp.completedByName = req.user ? req.user.name : 'Staff';

    await followUp.save();

    // Check student and update timeline / nextAction
    const student = await Student.findById(followUp.student);
    if (student) {
      student.timeline.push({
        action: 'Follow-Up Completed',
        category: 'General',
        description: `Completed: ${followUp.task}`,
        timestamp: new Date(),
        performedBy: req.user ? `${req.user.name} (${req.user.role})` : 'System'
      });

      // Find if student has another pending follow-up
      const nextPending = await FollowUp.findOne({
        student: student._id,
        status: 'Pending'
      }).sort({ dueDate: 1 });

      if (nextPending) {
        student.nextAction = nextPending.task;
        student.followUpDate = nextPending.dueDate;
      } else {
        student.nextAction = '';
        student.followUpDate = null;
      }

      await student.save();
    }

    await AuditLog.logAction({
      user: req.user,
      action: 'FOLLOW_UP_COMPLETED',
      entity: 'FollowUp',
      entityId: followUp._id,
      details: { task: followUp.task, completedByName: followUp.completedByName },
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate({
        path: 'student',
        select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
        populate: { path: 'batch', select: 'name' }
      })
      .populate('assignedTo', 'name role email');

    res.json({
      message: 'Follow-up marked as completed',
      followUp: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule a follow-up with new date and reason
// @route   PATCH /api/follow-ups/:id/reschedule
const rescheduleFollowUp = async (req, res, next) => {
  try {
    const { newDueDate, newDueTime = '', reason = '' } = req.body;

    if (!newDueDate) {
      res.status(400);
      throw new Error('New due date is required for rescheduling');
    }

    const parsedNewDate = new Date(newDueDate);
    if (isNaN(parsedNewDate.getTime())) {
      res.status(400);
      throw new Error('Invalid new due date format');
    }

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up record not found');
    }

    const prevDate = followUp.dueDate;

    followUp.rescheduleHistory.push({
      previousDate: prevDate,
      newDate: parsedNewDate,
      reason: reason.trim(),
      rescheduledBy: req.user ? req.user._id : null,
      rescheduledByName: req.user ? req.user.name : 'System',
      rescheduledAt: new Date()
    });

    followUp.dueDate = parsedNewDate;
    if (newDueTime !== undefined) followUp.dueTime = newDueTime.trim();
    followUp.status = 'Pending';
    followUp.rescheduledCount = (followUp.rescheduledCount || 0) + 1;

    await followUp.save();

    // Update student followUpDate
    const student = await Student.findById(followUp.student);
    if (student) {
      student.followUpDate = parsedNewDate;
      student.timeline.push({
        action: 'Follow-Up Rescheduled',
        category: 'General',
        description: `Task "${followUp.task}" rescheduled from ${prevDate.toLocaleDateString()} to ${parsedNewDate.toLocaleDateString()}${reason ? ` (${reason.trim()})` : ''}`,
        timestamp: new Date(),
        performedBy: req.user ? `${req.user.name} (${req.user.role})` : 'System'
      });
      await student.save();
    }

    await AuditLog.logAction({
      user: req.user,
      action: 'FOLLOW_UP_RESCHEDULED',
      entity: 'FollowUp',
      entityId: followUp._id,
      details: {
        task: followUp.task,
        from: prevDate,
        to: parsedNewDate,
        reason: reason.trim()
      },
      req
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate({
        path: 'student',
        select: 'studentId fullName primaryMobile vehicleType coursePackage workflowStage batch',
        populate: { path: 'batch', select: 'name' }
      })
      .populate('assignedTo', 'name role email');

    res.json({
      message: 'Follow-up rescheduled successfully',
      followUp: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a follow-up
// @route   PATCH /api/follow-ups/:id/cancel
const cancelFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up record not found');
    }

    followUp.status = 'Cancelled';
    await followUp.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'FOLLOW_UP_CANCELLED',
      entity: 'FollowUp',
      entityId: followUp._id,
      details: { task: followUp.task },
      req
    });

    res.json({
      message: 'Follow-up marked as cancelled',
      followUp
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a follow-up
// @route   DELETE /api/follow-ups/:id
const deleteFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      res.status(404);
      throw new Error('Follow-up record not found');
    }

    // Role check: Admin, Superadmin, or creator
    const isOwner = req.user && followUp.createdBy && String(req.user._id) === String(followUp.createdBy);
    const isAdmin = req.user && ['Superadmin', 'Admin'].includes(req.user.role);

    if (!isAdmin && !isOwner) {
      res.status(403);
      throw new Error('You do not have permission to delete this follow-up');
    }

    await FollowUp.findByIdAndDelete(req.params.id);

    await AuditLog.logAction({
      user: req.user,
      action: 'FOLLOW_UP_DELETED',
      entity: 'FollowUp',
      entityId: req.params.id,
      details: { task: followUp.task },
      req
    });

    res.json({
      message: 'Follow-up deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFollowUps,
  getFollowUpSummary,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  rescheduleFollowUp,
  cancelFollowUp,
  deleteFollowUp
};
