const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const generateComplaintId = require('../utils/generateComplaintId');

// ==========================================
// 1. GET ALL COMPLAINTS (SEARCH & FILTERED)
// ==========================================
const getComplaints = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      dateRange,
      startDate,
      endDate,
      relatedEntityType,
      isOverdue,
      page = 1,
      limit = 15,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // 1. Server-side Search
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { complaintId: { $regex: term, $options: 'i' } },
        { complainantName: { $regex: term, $options: 'i' } },
        { complainantMobile: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ];
    }

    // 2. Direct Filters
    if (status && status !== 'All') {
      query.status = status;
    }

    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (assignedTo && assignedTo !== 'All') {
      if (assignedTo === 'Unassigned') {
        query.assignedTo = null;
      } else {
        query.assignedTo = assignedTo;
      }
    }

    // 3. Overdue Filter
    if (isOverdue === 'true') {
      query.status = { $nin: ['Resolved', 'Closed'] };
      query.expectedResolutionDate = { $lt: new Date() };
    }

    // 4. Date Range Filters
    const now = new Date();
    if (dateRange === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));
      query.complaintDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - 7);
      query.complaintDate = { $gte: startOfWeek };
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.complaintDate = { $gte: startOfMonth };
    } else if (startDate || endDate) {
      query.complaintDate = {};
      if (startDate) query.complaintDate.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.complaintDate.$lte = eDate;
      }
    }

    // 5. Related Entity Type Filter
    if (relatedEntityType) {
      if (relatedEntityType === 'Student') query.relatedStudent = { $ne: null };
      else if (relatedEntityType === 'Instructor') query.relatedInstructor = { $ne: null };
      else if (relatedEntityType === 'Vehicle') query.relatedVehicle = { $ne: null };
      else if (relatedEntityType === 'Batch') query.relatedBatch = { $ne: null };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('student', 'fullName studentId phone courseType')
      .populate('instructor', 'name instructorId mobile designation')
      .populate('assignedTo', 'name email role')
      .populate('relatedStudent', 'fullName studentId phone')
      .populate('relatedInstructor', 'name instructorId')
      .populate('relatedVehicle', 'vehicleNumber brand model vehicleType')
      .populate('relatedBatch', 'batchName name session')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.json({
      complaints,
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

// ==========================================
// 2. GET COMPLAINT DASHBOARD / KPI STATS
// ==========================================
const getComplaintDashboard = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalComplaints,
      openComplaints,
      inProgressComplaints,
      pendingComplaints,
      escalatedComplaints,
      resolvedComplaints,
      closedComplaints,
      overdueComplaints,
      categoryStats,
      priorityStats,
      recentComplaints
    ] = await Promise.all([
      Complaint.countDocuments({}),
      Complaint.countDocuments({ status: 'Open' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'Escalated' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Closed' }),
      Complaint.countDocuments({
        status: { $nin: ['Resolved', 'Closed'] },
        expectedResolutionDate: { $lt: now }
      }),
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Complaint.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('assignedTo', 'name')
    ]);

    // Attention Required: Open high/urgent priority + escalated + overdue
    const attentionRequired = await Complaint.countDocuments({
      $or: [
        { status: 'Escalated' },
        { status: { $nin: ['Resolved', 'Closed'] }, expectedResolutionDate: { $lt: now } },
        { status: 'Open', priority: { $in: ['High', 'Urgent'] } }
      ]
    });

    res.json({
      summary: {
        totalComplaints,
        open: openComplaints,
        inProgress: inProgressComplaints,
        pending: pendingComplaints,
        escalated: escalatedComplaints,
        resolved: resolvedComplaints,
        closed: closedComplaints,
        overdue: overdueComplaints,
        attentionRequired
      },
      byCategory: categoryStats,
      byPriority: priorityStats,
      recentComplaints
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. GET SINGLE COMPLAINT DETAILS
// ==========================================
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'fullName studentId phone email courseType')
      .populate('instructor', 'name instructorId mobile designation licenceNo')
      .populate('userRef', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('relatedStudent', 'fullName studentId phone courseType')
      .populate('relatedInstructor', 'name instructorId mobile designation')
      .populate('relatedVehicle', 'vehicleNumber brand model vehicleType status')
      .populate('relatedBatch', 'batchName name session')
      .populate('relatedClass', 'classDate sessionName km')
      .populate('relatedPayment', 'amount paymentMode status date receiptNo')
      .populate('relatedEnquiry', 'fullName phone courseType status')
      .populate('resolution.resolvedBy', 'name email role')
      .populate('escalation.escalatedTo', 'name email role')
      .populate('comments.createdBy', 'name role')
      .populate('activities.performedBy', 'name role');

    if (!complaint) {
      res.status(404);
      throw new Error('Complaint record not found');
    }

    res.json(complaint);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. CREATE NEW COMPLAINT
// ==========================================
const createComplaint = async (req, res, next) => {
  try {
    const {
      complaintDate,
      source,
      complainantType,
      student,
      instructor,
      userRef,
      complainantName,
      complainantMobile,
      category,
      description,
      relatedStudent,
      relatedInstructor,
      relatedVehicle,
      relatedBatch,
      relatedClass,
      relatedPayment,
      relatedEnquiry,
      priority,
      assignedTo,
      expectedResolutionDate
    } = req.body;

    if (!category) {
      res.status(400);
      throw new Error('Complaint category is required');
    }

    if (!description || !description.trim()) {
      res.status(400);
      throw new Error('Detailed complaint description is required');
    }

    let resolvedName = complainantName ? complainantName.trim() : '';
    let resolvedMobile = complainantMobile ? complainantMobile.trim() : '';

    // If linking an existing student, pre-fill missing details
    if (student) {
      const stuObj = await Student.findById(student);
      if (stuObj) {
        if (!resolvedName) resolvedName = stuObj.fullName;
        if (!resolvedMobile) resolvedMobile = stuObj.phone || stuObj.primaryMobile || '';
      }
    } else if (instructor) {
      const insObj = await Instructor.findById(instructor);
      if (insObj) {
        if (!resolvedName) resolvedName = insObj.name;
        if (!resolvedMobile) resolvedMobile = insObj.mobile || '';
      }
    } else if (userRef) {
      const userObj = await User.findById(userRef);
      if (userObj) {
        if (!resolvedName) resolvedName = userObj.name;
      }
    }

    if (!resolvedName) {
      res.status(400);
      throw new Error('Complainant name is required');
    }

    // Resolve assigned user name
    let assignedToName = 'Unassigned';
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (assignedUser) {
        assignedToName = assignedUser.name;
      }
    }

    const complaintId = await generateComplaintId();

    const newComplaint = new Complaint({
      complaintId,
      complaintDate: complaintDate || new Date(),
      source: source || 'Phone',
      complainantType: complainantType || 'Student',
      student: student || null,
      instructor: instructor || null,
      userRef: userRef || null,
      complainantName: resolvedName,
      complainantMobile: resolvedMobile,
      category,
      description: description.trim(),
      relatedStudent: relatedStudent || (student ? student : null),
      relatedInstructor: relatedInstructor || (instructor ? instructor : null),
      relatedVehicle: relatedVehicle || null,
      relatedBatch: relatedBatch || null,
      relatedClass: relatedClass || null,
      relatedPayment: relatedPayment || null,
      relatedEnquiry: relatedEnquiry || null,
      priority: priority || 'Medium',
      status: 'Open',
      assignedTo: assignedTo || null,
      assignedToName,
      expectedResolutionDate: expectedResolutionDate || null,
      createdBy: req.user?._id,
      createdByName: req.user?.name || 'Staff',
      activities: [
        {
          action: 'Created',
          performedBy: req.user?._id,
          performedByName: req.user?.name || 'Staff',
          performedByRole: req.user?.role || 'Staff',
          details: `Complaint ${complaintId} created by ${req.user?.name || 'Staff'}. Assigned to: ${assignedToName}`,
          timestamp: new Date()
        }
      ]
    });

    const savedComplaint = await newComplaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'CREATE_COMPLAINT',
      entity: 'Complaint',
      entityId: savedComplaint._id,
      details: {
        complaintId: savedComplaint.complaintId,
        category: savedComplaint.category,
        priority: savedComplaint.priority,
        complainantName: savedComplaint.complainantName
      },
      req
    });

    res.status(201).json(savedComplaint);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. UPDATE COMPLAINT CORE DETAILS
// ==========================================
const updateComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    const {
      category,
      priority,
      description,
      expectedResolutionDate,
      complainantName,
      complainantMobile,
      source
    } = req.body;

    const changes = [];
    if (category && category !== complaint.category) {
      changes.push(`Category: ${complaint.category} → ${category}`);
      complaint.category = category;
    }
    if (priority && priority !== complaint.priority) {
      changes.push(`Priority: ${complaint.priority} → ${priority}`);
      complaint.priority = priority;
    }
    if (description && description.trim() !== complaint.description) {
      changes.push('Description updated');
      complaint.description = description.trim();
    }
    if (expectedResolutionDate) {
      complaint.expectedResolutionDate = expectedResolutionDate;
      changes.push('Target resolution date updated');
    }
    if (complainantName) complaint.complainantName = complainantName;
    if (complainantMobile !== undefined) complaint.complainantMobile = complainantMobile;
    if (source) complaint.source = source;

    if (changes.length > 0) {
      complaint.activities.push({
        action: 'Updated',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Staff',
        performedByRole: req.user?.role || 'Staff',
        details: changes.join(', '),
        timestamp: new Date()
      });
    }

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_COMPLAINT',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId, changes },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. ASSIGN / REASSIGN COMPLAINT
// ==========================================
const assignComplaint = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    let targetUserName = 'Unassigned';
    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user) {
        res.status(404);
        throw new Error('Assignee user not found');
      }
      targetUserName = user.name;
    }

    const previousAssignee = complaint.assignedToName || 'Unassigned';
    complaint.assignedTo = assignedTo || null;
    complaint.assignedToName = targetUserName;

    complaint.activities.push({
      action: 'Assigned',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Reassigned from ${previousAssignee} to ${targetUserName}`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'ASSIGN_COMPLAINT',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId, assignedTo: targetUserName },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. UPDATE COMPLAINT STATUS
// ==========================================
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    const prevStatus = complaint.status;
    complaint.status = status;

    complaint.activities.push({
      action: 'Status Changed',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Status changed from ${prevStatus} to ${status}${remarks ? `. Note: ${remarks}` : ''}`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_COMPLAINT_STATUS',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId, from: prevStatus, to: status },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. ESCALATE COMPLAINT
// ==========================================
const escalateComplaint = async (req, res, next) => {
  try {
    const { escalatedTo, escalationReason } = req.body;
    if (!escalationReason || !escalationReason.trim()) {
      res.status(400);
      throw new Error('Escalation reason is required');
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    let escalatedToName = 'Senior Management';
    if (escalatedTo) {
      const managerUser = await User.findById(escalatedTo);
      if (managerUser) escalatedToName = managerUser.name;
    }

    complaint.status = 'Escalated';
    complaint.escalation = {
      isEscalated: true,
      escalatedTo: escalatedTo || null,
      escalatedToName,
      escalatedDate: new Date(),
      escalationReason: escalationReason.trim()
    };

    complaint.activities.push({
      action: 'Escalated',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Escalated to ${escalatedToName}. Reason: ${escalationReason.trim()}`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'ESCALATE_COMPLAINT',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId, escalatedToName, escalationReason },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. RESOLVE COMPLAINT
// ==========================================
const resolveComplaint = async (req, res, next) => {
  try {
    const { resolutionNotes, correctiveActionTaken, satisfactionRating } = req.body;
    if (!resolutionNotes || !resolutionNotes.trim()) {
      res.status(400);
      throw new Error('Resolution notes are required');
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    complaint.status = 'Resolved';
    complaint.resolution = {
      resolutionNotes: resolutionNotes.trim(),
      resolvedBy: req.user?._id,
      resolvedByName: req.user?.name || 'Staff',
      resolvedDate: new Date(),
      correctiveActionTaken: (correctiveActionTaken || '').trim(),
      satisfactionRating: satisfactionRating || 'Satisfied'
    };

    complaint.activities.push({
      action: 'Resolved',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Complaint resolved by ${req.user?.name || 'Staff'}. Resolution: ${resolutionNotes.trim()}${correctiveActionTaken ? ` | CAPA: ${correctiveActionTaken}` : ''}`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'RESOLVE_COMPLAINT',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId, resolutionNotes },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 10. CLOSE COMPLAINT
// ==========================================
const closeComplaint = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    complaint.status = 'Closed';
    complaint.activities.push({
      action: 'Closed',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Complaint closed and archived${remarks ? `. Note: ${remarks}` : ''}`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'CLOSE_COMPLAINT',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 11. REOPEN COMPLAINT
// ==========================================
const reopenComplaint = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400);
      throw new Error('Reason for reopening complaint is required');
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    complaint.status = 'In Progress';
    complaint.activities.push({
      action: 'Reopened',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Complaint reopened by ${req.user?.name || 'Staff'}. Reason: ${reason.trim()}`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'REOPEN_COMPLAINT',
      entity: 'Complaint',
      entityId: updated._id,
      details: { complaintId: updated.complaintId, reason },
      req
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 12. ADD INTERNAL COMMENT
// ==========================================
const addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      res.status(400);
      throw new Error('Comment text is required');
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    const commentObj = {
      comment: comment.trim(),
      createdBy: req.user?._id,
      createdByName: req.user?.name || 'Staff',
      createdAt: new Date()
    };

    complaint.comments.push(commentObj);

    complaint.activities.push({
      action: 'Comment Added',
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Staff',
      performedByRole: req.user?.role || 'Staff',
      details: `Comment added by ${req.user?.name || 'Staff'}: "${comment.trim().slice(0, 80)}${comment.length > 80 ? '...' : ''}"`,
      timestamp: new Date()
    });

    const updated = await complaint.save();

    res.status(201).json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 13. DELETE COMPLAINT (SUPERADMIN ONLY)
// ==========================================
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    await Complaint.findByIdAndDelete(req.params.id);

    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_COMPLAINT',
      entity: 'Complaint',
      entityId: req.params.id,
      details: { complaintId: complaint.complaintId, complainantName: complaint.complainantName },
      req
    });

    res.json({ success: true, message: `Complaint ${complaint.complaintId} permanently removed` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComplaints,
  getComplaintDashboard,
  getComplaintById,
  createComplaint,
  updateComplaint,
  assignComplaint,
  updateComplaintStatus,
  escalateComplaint,
  resolveComplaint,
  closeComplaint,
  reopenComplaint,
  addComment,
  deleteComplaint
};
