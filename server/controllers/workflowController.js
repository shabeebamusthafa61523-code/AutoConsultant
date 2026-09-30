const mongoose = require('mongoose');
const Student = require('../models/Student');
const WorkflowHistory = require('../models/WorkflowHistory');
const FollowUp = require('../models/FollowUp');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const VALID_WORKFLOW_STAGES = [
  'Application',
  'Documents',
  'LL Slot / Test',
  'LL Passed',
  'Training',
  'DL Test',
  'Passed / Licence Processing',
  'Completed',
  'Renewal / Service',
  'Follow Up',
  'Other'
];

// Normalize stage helper (handles legacy 'Registration')
const normalizeStage = (stage) => {
  if (!stage) return 'Application';
  if (stage === 'Registration') return 'Application';
  return stage;
};

// @desc    Get workflow stats & student distribution across all stages
// @route   GET /api/workflow/stats
const getWorkflowStats = async (req, res, next) => {
  try {
    const counts = await Student.aggregate([
      {
        $group: {
          _id: '$workflowStage',
          count: { $sum: 1 }
        }
      }
    ]);

    // Build stage map
    const stageCounts = {};
    VALID_WORKFLOW_STAGES.forEach((s) => {
      stageCounts[s] = 0;
    });

    let totalStudents = 0;
    let completedStudents = 0;

    counts.forEach((item) => {
      const stageName = normalizeStage(item._id);
      if (stageCounts[stageName] !== undefined) {
        stageCounts[stageName] += item.count;
      } else {
        stageCounts['Other'] = (stageCounts['Other'] || 0) + item.count;
      }
      totalStudents += item.count;
      if (stageName === 'Completed') {
        completedStudents += item.count;
      }
    });

    const stagesList = VALID_WORKFLOW_STAGES.map((stage) => ({
      stage,
      count: stageCounts[stage] || 0
    }));

    res.json({
      stages: stagesList,
      totalStudents,
      activeStudents: totalStudents - completedStudents,
      completedStudents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get students filtered by workflow stage with search & filters
// @route   GET /api/workflow
const getWorkflowStudents = async (req, res, next) => {
  try {
    const {
      stage,
      search,
      batch,
      instructor,
      assignedStaff,
      startDate,
      endDate,
      sortBy = 'workflowStageChangedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Filter by stage
    if (stage && stage !== 'all') {
      if (stage === 'Application') {
        query.workflowStage = { $in: ['Application', 'Registration', null, ''] };
      } else {
        query.workflowStage = stage;
      }
    }

    // Search by student name, ID, mobile, applicationNo
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { fullName: { $regex: s, $options: 'i' } },
        { studentId: { $regex: s, $options: 'i' } },
        { primaryMobile: { $regex: s, $options: 'i' } },
        { applicationNo: { $regex: s, $options: 'i' } },
        { admissionNumber: { $regex: s, $options: 'i' } }
      ];
    }

    // Filter by Batch
    if (batch && batch !== 'all') {
      if (batch === 'unassigned') {
        query.batch = { $in: [null, undefined] };
      } else if (mongoose.Types.ObjectId.isValid(batch)) {
        query.batch = batch;
      }
    }

    // Filter by Instructor
    if (instructor && instructor !== 'all') {
      // Find batches where instructor matches
      const matchedBatches = await Batch.find({
        $or: [
          { instructor: { $regex: instructor, $options: 'i' } },
          ...(mongoose.Types.ObjectId.isValid(instructor) ? [{ instructorRef: instructor }] : [])
        ]
      }).select('_id');
      const batchIds = matchedBatches.map((b) => b._id);
      query.batch = { $in: batchIds };
    }

    // Filter by Assigned Staff
    if (assignedStaff && assignedStaff !== 'all' && mongoose.Types.ObjectId.isValid(assignedStaff)) {
      query.workflowAssignedStaff = assignedStaff;
    }

    // Date range filter
    if (startDate || endDate) {
      query.workflowStageChangedAt = {};
      if (startDate) query.workflowStageChangedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.workflowStageChangedAt.$lte = end;
      }
    }

    // Sorting
    const sort = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name' || sortBy === 'fullName') {
      sort.fullName = order;
    } else if (sortBy === 'studentId') {
      sort.studentId = order;
    } else if (sortBy === 'stage') {
      sort.workflowStage = order;
    } else if (sortBy === 'createdAt') {
      sort.createdAt = order;
    } else {
      sort.workflowStageChangedAt = order;
    }

    if (limit === 'all') {
      const students = await Student.find(query)
        .populate('batch', 'name courseLicenceType session startTime endTime instructor instructorRef')
        .populate('workflowStageChangedBy', 'name role')
        .populate('workflowAssignedStaff', 'name role')
        .sort(sort);

      return res.json({
        students: students.map(s => {
          const doc = s.toObject();
          doc.workflowStage = normalizeStage(doc.workflowStage);
          return doc;
        }),
        pagination: {
          total: students.length,
          page: 1,
          totalPages: 1,
          limit: students.length
        }
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('batch', 'name courseLicenceType session startTime endTime instructor instructorRef')
      .populate('workflowStageChangedBy', 'name role')
      .populate('workflowAssignedStaff', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.json({
      students: students.map(s => {
        const doc = s.toObject();
        doc.workflowStage = normalizeStage(doc.workflowStage);
        return doc;
      }),
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

// @desc    Get student workflow record with details, recent history & follow-ups
// @route   GET /api/workflow/:studentId
const getStudentWorkflow = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId)
        .populate('batch', 'name courseLicenceType session startTime endTime instructor')
        .populate('workflowStageChangedBy', 'name role')
        .populate('workflowAssignedStaff', 'name role');
    }

    if (!student) {
      student = await Student.findOne({ studentId })
        .populate('batch', 'name courseLicenceType session startTime endTime instructor')
        .populate('workflowStageChangedBy', 'name role')
        .populate('workflowAssignedStaff', 'name role');
    }

    if (!student) {
      res.status(404);
      throw new Error(`Student not found with ID ${studentId}`);
    }

    const [history, followUps] = await Promise.all([
      WorkflowHistory.find({ student: student._id }).sort({ createdAt: -1 }).limit(10),
      FollowUp.find({ student: student._id }).sort({ dueDate: 1 }).limit(10)
    ]);

    const studentObj = student.toObject();
    studentObj.workflowStage = normalizeStage(studentObj.workflowStage);

    res.json({
      student: studentObj,
      history,
      followUps
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transition student workflow stage (forward or backward) with optional follow-up creation
// @route   PATCH /api/workflow/:studentId/stage
const updateStudentStage = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const {
      stage,
      notes = '',
      nextAction = '',
      nextActionDate = null,
      assignedStaff = null,
      createFollowUp = false,
      followUpData = null
    } = req.body;

    if (!stage || !VALID_WORKFLOW_STAGES.includes(stage)) {
      res.status(400);
      throw new Error(`Invalid workflow stage '${stage}'. Valid stages: ${VALID_WORKFLOW_STAGES.join(', ')}`);
    }

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    if (!student) {
      student = await Student.findOne({ studentId });
    }

    if (!student) {
      res.status(404);
      throw new Error(`Student not found with ID ${studentId}`);
    }

    const prevStage = normalizeStage(student.workflowStage);

    // Update student fields
    student.previousWorkflowStage = prevStage;
    student.workflowStage = stage;
    student.workflowStageChangedAt = new Date();
    student.workflowStageChangedBy = req.user ? req.user._id : null;

    if (notes && notes.trim()) {
      student.workflowNotes = notes.trim();
    }
    if (nextAction && nextAction.trim()) {
      student.nextAction = nextAction.trim();
    }
    if (nextActionDate) {
      student.followUpDate = new Date(nextActionDate);
    }
    if (assignedStaff && mongoose.Types.ObjectId.isValid(assignedStaff)) {
      student.workflowAssignedStaff = assignedStaff;
    }

    // Intelligently sync currentStatus with stage if appropriate
    if (stage === 'Training' && student.currentStatus !== 'Training') {
      student.currentStatus = 'Training';
    } else if (stage === 'DL Test' && !['Test Scheduled', 'Test Pending'].includes(student.currentStatus)) {
      student.currentStatus = 'Test Scheduled';
    } else if (stage === 'Completed' && student.currentStatus !== 'Completed') {
      student.currentStatus = 'Completed';
    } else if (stage === 'Passed / Licence Processing' && student.currentStatus !== 'Passed') {
      student.currentStatus = 'Passed';
    }

    // Add entry to student timeline
    student.timeline.push({
      action: 'Workflow Stage Transition',
      category: 'Licence',
      description: `Stage changed: ${prevStage} → ${stage}${notes ? ` (${notes.trim()})` : ''}`,
      timestamp: new Date(),
      performedBy: req.user ? `${req.user.name} (${req.user.role})` : 'System'
    });

    await student.save();

    // Create WorkflowHistory entry
    const historyEntry = await WorkflowHistory.create({
      student: student._id,
      fromStage: prevStage,
      toStage: stage,
      action: 'Stage Transition',
      changedBy: req.user ? req.user._id : null,
      changedByName: req.user ? req.user.name : 'System',
      changedByRole: req.user ? req.user.role : 'Staff',
      notes: notes.trim(),
      nextAction: nextAction ? nextAction.trim() : '',
      nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined
    });

    // Optionally create follow-up
    let createdFollowUp = null;
    if (createFollowUp && followUpData && followUpData.task && followUpData.dueDate) {
      let assignedUser = null;
      let assignedName = 'Unassigned';

      if (followUpData.assignedTo && mongoose.Types.ObjectId.isValid(followUpData.assignedTo)) {
        assignedUser = await User.findById(followUpData.assignedTo);
        if (assignedUser) assignedName = assignedUser.name;
      } else if (req.user) {
        assignedUser = req.user;
        assignedName = req.user.name;
      }

      createdFollowUp = await FollowUp.create({
        student: student._id,
        task: followUpData.task.trim(),
        dueDate: new Date(followUpData.dueDate),
        dueTime: followUpData.dueTime || '',
        assignedTo: assignedUser ? assignedUser._id : null,
        assignedToName: assignedName,
        priority: followUpData.priority || 'High',
        status: 'Pending',
        relatedStage: stage,
        notes: followUpData.notes ? followUpData.notes.trim() : '',
        createdBy: req.user ? req.user._id : null,
        createdByName: req.user ? req.user.name : 'System'
      });

      // Update student follow-up date and next action if needed
      student.nextAction = followUpData.task.trim();
      student.followUpDate = new Date(followUpData.dueDate);
      await student.save();
    }

    // Log to Centralized AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'WORKFLOW_STAGE_CHANGE',
      entity: 'Student',
      entityId: student.studentId,
      details: {
        studentId: student.studentId,
        fullName: student.fullName,
        fromStage: prevStage,
        toStage: stage,
        notes: notes.trim(),
        createdFollowUp: !!createdFollowUp
      },
      req
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('batch', 'name courseLicenceType session startTime endTime instructor')
      .populate('workflowStageChangedBy', 'name role')
      .populate('workflowAssignedStaff', 'name role');

    const result = populatedStudent.toObject();
    result.workflowStage = normalizeStage(result.workflowStage);

    res.json({
      message: `Workflow stage updated to '${stage}' successfully`,
      student: result,
      history: historyEntry,
      followUp: createdFollowUp
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get workflow history for a specific student
// @route   GET /api/workflow/:studentId/history
const getWorkflowHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    if (!student) {
      student = await Student.findOne({ studentId });
    }

    if (!student) {
      res.status(404);
      throw new Error(`Student not found with ID ${studentId}`);
    }

    const history = await WorkflowHistory.find({ student: student._id })
      .populate('changedBy', 'name role email')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    next(error);
  }
};

// @desc    Add note or next action to student workflow
// @route   POST /api/workflow/:studentId/note
const addWorkflowNote = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { notes = '', nextAction = '', nextActionDate = null } = req.body;

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    if (!student) {
      student = await Student.findOne({ studentId });
    }

    if (!student) {
      res.status(404);
      throw new Error(`Student not found with ID ${studentId}`);
    }

    if (notes) student.workflowNotes = notes.trim();
    if (nextAction) student.nextAction = nextAction.trim();
    if (nextActionDate) student.followUpDate = new Date(nextActionDate);

    student.timeline.push({
      action: 'Workflow Note Added',
      category: 'Note',
      description: notes || nextAction,
      timestamp: new Date(),
      performedBy: req.user ? `${req.user.name} (${req.user.role})` : 'System'
    });

    await student.save();

    const historyEntry = await WorkflowHistory.create({
      student: student._id,
      fromStage: normalizeStage(student.workflowStage),
      toStage: normalizeStage(student.workflowStage),
      action: 'Note Added',
      changedBy: req.user ? req.user._id : null,
      changedByName: req.user ? req.user.name : 'System',
      changedByRole: req.user ? req.user.role : 'Staff',
      notes: notes.trim(),
      nextAction: nextAction ? nextAction.trim() : '',
      nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined
    });

    res.json({
      message: 'Note saved successfully',
      student,
      history: historyEntry
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  VALID_WORKFLOW_STAGES,
  getWorkflowStats,
  getWorkflowStudents,
  getStudentWorkflow,
  updateStudentStage,
  getWorkflowHistory,
  addWorkflowNote
};
