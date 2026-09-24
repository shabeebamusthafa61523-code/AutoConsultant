const Instructor = require('../models/Instructor');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const Vehicle = require('../models/Vehicle');
const AuditLog = require('../models/AuditLog');

// Generate Instructor ID
const generateInstructorId = async () => {
  const count = await Instructor.countDocuments();
  const nextNum = count + 1;
  return `INS${String(nextNum).padStart(3, '0')}`;
};

// @desc    Get all instructors with search & filter
// @route   GET /api/instructors
const getInstructors = async (req, res, next) => {
  try {
    const { search, status, department, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { instructorId: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (department) {
      query.department = department;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Instructor.countDocuments(query);
    const instructors = await Instructor.find(query)
      .populate('assignedVehicles', 'vehicleNumber vehicleType brand model status')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.json({
      instructors,
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

// @desc    Get single instructor by ID
// @route   GET /api/instructors/:id
const getInstructorById = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.params.id)
      .populate('assignedVehicles', 'vehicleNumber vehicleType brand model status rc insurance fitness puc');

    if (!instructor) {
      res.status(404);
      throw new Error('Instructor not found');
    }

    res.json(instructor);
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed operational profile with metrics, batches, classes, and students
// @route   GET /api/instructors/:id/profile
const getInstructorProfile = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.params.id)
      .populate('assignedVehicles');

    if (!instructor) {
      res.status(404);
      throw new Error('Instructor not found');
    }

    // Identify assigned batches (by ref or name)
    const batches = await Batch.find({
      $or: [
        { instructorRef: instructor._id },
        { instructor: instructor.name },
        { secondaryInstructor: instructor.name }
      ]
    }).sort({ startDate: -1 });

    // Identify classes conducted
    const classes = await Class.find({
      $or: [
        { instructorRef: instructor._id },
        { instructor: instructor.name }
      ]
    })
      .populate('student', 'studentId fullName primaryMobile vehicleType')
      .sort({ classDate: -1 })
      .limit(50);

    // Identify distinct students trained
    const studentIds = await Class.distinct('student', {
      $or: [
        { instructorRef: instructor._id },
        { instructor: instructor.name }
      ]
    });

    // Aggregate performance metrics
    const classMetrics = await Class.aggregate([
      {
        $match: {
          $or: [
            { instructorRef: instructor._id },
            { instructor: instructor.name }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          totalKm: { $sum: '$km' },
          totalHours: { $sum: '$hours' }
        }
      }
    ]);

    const metrics = classMetrics[0] || { totalClasses: 0, totalKm: 0, totalHours: 0 };
    metrics.studentsTrained = studentIds.length;
    metrics.activeBatchesCount = batches.filter(b => b.status === 'Active').length;

    // Assigned vehicles
    const vehicles = await Vehicle.find({
      $or: [
        { _id: { $in: instructor.assignedVehicles } },
        { assignedInstructor: instructor._id },
        { assignedInstructorName: instructor.name }
      ]
    });

    res.json({
      instructor,
      batches,
      classes,
      vehicles,
      metrics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new instructor
// @route   POST /api/instructors
const createInstructor = async (req, res, next) => {
  try {
    const { instructorId, name, mobile, licenceNo, badgeNo, experience, status, department, designation, joiningDate, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Instructor name is required');
    }
    if (!mobile || !mobile.trim()) {
      res.status(400);
      throw new Error('Instructor mobile is required');
    }

    const finalId = instructorId && instructorId.trim() ? instructorId.trim() : await generateInstructorId();

    const existingId = await Instructor.findOne({ instructorId: finalId });
    if (existingId) {
      res.status(400);
      throw new Error(`Instructor ID '${finalId}' is already in use.`);
    }

    const instructor = await Instructor.create({
      ...req.body,
      instructorId: finalId
    });

    await AuditLog.logAction({
      user: req.user,
      action: 'CREATE_INSTRUCTOR',
      entity: 'Instructor',
      entityId: instructor._id,
      details: { instructorId: instructor.instructorId, name: instructor.name },
      req
    });

    res.status(201).json(instructor);
  } catch (error) {
    next(error);
  }
};

// @desc    Update instructor
// @route   PUT /api/instructors/:id
const updateInstructor = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      res.status(404);
      throw new Error('Instructor not found');
    }

    const oldStatus = instructor.status;
    const updated = await Instructor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (req.body.status && req.body.status !== oldStatus) {
      await AuditLog.logAction({
        user: req.user,
        action: 'INSTRUCTOR_STATUS_CHANGED',
        entity: 'Instructor',
        entityId: updated._id,
        details: { previousStatus: oldStatus, newStatus: req.body.status },
        req
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate instructor
// @route   DELETE /api/instructors/:id
const deleteInstructor = async (req, res, next) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      res.status(404);
      throw new Error('Instructor not found');
    }

    // Check if instructor is assigned to any active batch
    const activeBatches = await Batch.find({
      $or: [
        { instructorRef: instructor._id },
        { instructor: instructor.name }
      ],
      status: 'Active'
    });

    if (activeBatches.length > 0) {
      res.status(400);
      throw new Error(`Cannot delete instructor. Currently assigned to ${activeBatches.length} active batch(es). Deactivate instead.`);
    }

    await Instructor.findByIdAndDelete(req.params.id);

    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_INSTRUCTOR',
      entity: 'Instructor',
      entityId: req.params.id,
      details: { instructorId: instructor.instructorId, name: instructor.name },
      req
    });

    res.json({ message: 'Instructor removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add certification / training record
// @route   POST /api/instructors/:id/certifications
const addCertification = async (req, res, next) => {
  try {
    const { trainingName, certificateNo, issueDate, validity, remarks } = req.body;
    if (!trainingName) {
      res.status(400);
      throw new Error('Training name is required');
    }

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      res.status(404);
      throw new Error('Instructor not found');
    }

    instructor.certifications.push({
      trainingName,
      certificateNo,
      issueDate,
      validity,
      remarks
    });

    await instructor.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'ADD_INSTRUCTOR_CERTIFICATION',
      entity: 'Instructor',
      entityId: instructor._id,
      details: { trainingName, certificateNo },
      req
    });

    res.status(201).json(instructor);
  } catch (error) {
    next(error);
  }
};

// @desc    Add staff document record
// @route   POST /api/instructors/:id/documents
const addStaffDocument = async (req, res, next) => {
  try {
    const { docType, docNumber, status, issueDate, expiryDate, remarks, fileUrl, fileName } = req.body;
    if (!docType) {
      res.status(400);
      throw new Error('Document type is required');
    }

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      res.status(404);
      throw new Error('Instructor not found');
    }

    instructor.staffDocuments.push({
      docType,
      docNumber,
      status: status || 'Submitted',
      issueDate,
      expiryDate,
      remarks,
      fileUrl,
      fileName
    });

    await instructor.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'ADD_INSTRUCTOR_DOCUMENT',
      entity: 'Instructor',
      entityId: instructor._id,
      details: { docType, docNumber },
      req
    });

    res.status(201).json(instructor);
  } catch (error) {
    next(error);
  }
};

// @desc    Check instructor availability and conflicts
// @route   POST /api/instructors/check-availability
const checkAvailability = async (req, res, next) => {
  try {
    const { instructorId, instructorName, date, timeSlot } = req.body;

    const query = {};
    if (instructorId) query._id = instructorId;
    else if (instructorName) query.name = instructorName;

    const instructor = await Instructor.findOne(query);
    if (!instructor) {
      return res.status(404).json({ available: false, reason: 'Instructor not found in database.' });
    }

    if (instructor.status !== 'Active') {
      return res.json({
        available: false,
        reason: `Instructor ${instructor.name} is currently ${instructor.status}. Cannot assign to sessions.`
      });
    }

    if (date) {
      const classDate = new Date(date);
      const startOfDay = new Date(classDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(classDate);
      endOfDay.setHours(23, 59, 59, 999);

      const conflicts = await Class.find({
        $or: [
          { instructorRef: instructor._id },
          { instructor: instructor.name }
        ],
        classDate: { $gte: startOfDay, $lte: endOfDay }
      }).populate('student', 'fullName');

      if (conflicts.length >= 8) {
        return res.json({
          available: false,
          conflicts,
          reason: `Instructor ${instructor.name} already has ${conflicts.length} classes scheduled on ${new Date(date).toLocaleDateString()}. Maximum capacity reached.`
        });
      }
    }

    res.json({ available: true, instructor });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstructors,
  getInstructorById,
  getInstructorProfile,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  addCertification,
  addStaffDocument,
  checkAvailability
};
