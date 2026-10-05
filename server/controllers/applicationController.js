const mongoose = require('mongoose');
const Application = require('../models/Application');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');
const generateApplicationId = require('../utils/generateApplicationId');

// @desc    Create a new service/licence application for a student
// @route   POST /api/applications
const createApplication = async (req, res, next) => {
  try {
    const {
      student,
      studentId,
      serviceType,
      licenceType,
      vehicleClass,
      coursePackage,
      applicationDate,
      lifecycleStatus = 'Registered',
      batch,
      primaryInstructor,
      secondaryInstructor,
      assignedVehicle,
      assignedStaff,
      learnerLicence,
      drivingTest,
      licence,
      feeStructure,
      nextAction,
      nextActionDueDate,
      nextActionAssignedTo,
      nextActionPriority,
      nextActionStatus,
      notes
    } = req.body;

    // 1. Verify Student
    let stuDoc = null;
    if (student && mongoose.Types.ObjectId.isValid(student)) {
      stuDoc = await Student.findById(student);
    } else if (studentId) {
      stuDoc = await Student.findOne({ studentId });
    }

    if (!stuDoc) {
      res.status(404);
      throw new Error('Student not found. Application must belong to an existing Student Master.');
    }

    // 2. Mandatory Next Action Check for Active Applications
    const activeStatuses = ['Lead', 'Registered', 'Documents Pending', 'LL Processing', 'LL Approved', 'Training', 'Test Scheduled', 'Retest', 'Test Passed', 'Licence Processing'];
    const currentStatus = lifecycleStatus || 'Registered';

    if (activeStatuses.includes(currentStatus)) {
      if (!nextAction || !String(nextAction).trim()) {
        res.status(400);
        throw new Error('Next Action is mandatory for all active applications.');
      }
      if (!nextActionDueDate) {
        res.status(400);
        throw new Error('Next Action Due Date is mandatory for all active applications.');
      }
    }

    // 3. Generate Sequential Atomic Application ID
    const newAppId = await generateApplicationId();

    // 4. Initial Fee Calculation
    const pkgFee = Number(feeStructure?.packageFee ?? 9000);
    const rtoFee = Number(feeStructure?.rtoServiceFee ?? 0);
    const retFee = Number(feeStructure?.retestFee ?? 0);
    const othFee = Number(feeStructure?.otherCharges ?? 0);
    const disc = Number(feeStructure?.discount ?? 0);
    const net = Math.max(0, pkgFee + rtoFee + retFee + othFee - disc);

    const app = new Application({
      applicationId: newAppId,
      student: stuDoc._id,
      studentId: stuDoc.studentId,
      serviceType: serviceType || 'Fresh Licence',
      licenceType: licenceType || 'LMV+MCWG',
      vehicleClass: vehicleClass || '4 Wheeler',
      coursePackage: coursePackage || 'LMV+MCWG (Fresh Licence)',
      applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
      lifecycleStatus: currentStatus,
      batch: batch || null,
      primaryInstructor: primaryInstructor || null,
      secondaryInstructor: secondaryInstructor || null,
      assignedVehicle: assignedVehicle || null,
      assignedStaff: assignedStaff || null,
      createdBy: req.user?._id || null,
      learnerLicence: learnerLicence || {},
      drivingTest: drivingTest || {},
      licence: licence || {},
      feeStructure: {
        packageFee: pkgFee,
        rtoServiceFee: rtoFee,
        retestFee: retFee,
        otherCharges: othFee,
        discount: disc,
        netPayable: net,
        totalReceived: 0,
        balanceDue: net
      },
      nextAction: nextAction || 'Submit Documents',
      nextActionDueDate: nextActionDueDate ? new Date(nextActionDueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      nextActionAssignedTo: nextActionAssignedTo || 'Office Desk',
      nextActionPriority: nextActionPriority || 'Medium',
      nextActionStatus: nextActionStatus || 'Pending',
      notes: notes || ''
    });

    const savedApp = await app.save();

    // Audit Log
    await AuditLog.logAction({
      user: req.user,
      action: 'Application Created',
      entity: 'Application',
      entityId: savedApp.applicationId,
      details: {
        applicationId: savedApp.applicationId,
        studentId: stuDoc.studentId,
        serviceType: savedApp.serviceType,
        lifecycleStatus: savedApp.lifecycleStatus,
        netPayable: net
      },
      req
    });

    res.status(201).json({
      success: true,
      message: `Application ${savedApp.applicationId} registered successfully`,
      data: savedApp
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all applications with filters & pagination
// @route   GET /api/applications
const getApplications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      lifecycleStatus,
      serviceType,
      student,
      studentId,
      batch,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (lifecycleStatus) {
      if (lifecycleStatus === 'Active') {
        query.lifecycleStatus = { $nin: ['Completed', 'Cancelled', 'On Hold'] };
      } else {
        query.lifecycleStatus = lifecycleStatus;
      }
    }

    if (serviceType) query.serviceType = serviceType;
    if (batch && mongoose.Types.ObjectId.isValid(batch)) query.batch = batch;
    if (student && mongoose.Types.ObjectId.isValid(student)) query.student = student;
    if (studentId) query.studentId = studentId;

    if (search && search.trim() !== '') {
      const term = search.trim();
      const regex = new RegExp(term, 'i');

      // Find matching students by name or phone first
      const matchedStudents = await Student.find({
        $or: [{ fullName: regex }, { primaryMobile: regex }, { studentId: regex }]
      }).select('_id');

      const studentIds = matchedStudents.map((s) => s._id);

      query.$or = [
        { applicationId: regex },
        { studentId: regex },
        { 'learnerLicence.llNumber': regex },
        { 'licence.dlNumber': regex },
        { student: { $in: studentIds } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('student', 'fullName studentId primaryMobile vehicleType')
        .populate('batch', 'name batchNumber startTime endTime')
        .populate('primaryInstructor', 'name mobile')
        .populate('assignedVehicle', 'vehicleNumber model brand')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Application.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single application with complete profile, payments & classes
// @route   GET /api/applications/:id
const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let app = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      app = await Application.findById(id)
        .populate('student')
        .populate('batch')
        .populate('primaryInstructor')
        .populate('secondaryInstructor')
        .populate('assignedVehicle')
        .populate('assignedStaff', 'name email');
    } else {
      app = await Application.findOne({ applicationId: id })
        .populate('student')
        .populate('batch')
        .populate('primaryInstructor')
        .populate('secondaryInstructor')
        .populate('assignedVehicle')
        .populate('assignedStaff', 'name email');
    }

    if (!app) {
      res.status(404);
      throw new Error(`Application '${id}' not found`);
    }

    // Fetch related payments and training sessions
    const [payments, classes] = await Promise.all([
      Payment.find({
        $or: [{ application: app._id }, { student: app.student?._id }]
      }).sort({ paymentDate: -1 }),
      Class.find({
        $or: [{ application: app._id }, { student: app.student?._id }]
      }).sort({ classDate: -1 })
    ]);

    res.json({
      success: true,
      data: {
        application: app,
        payments,
        classes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application
// @route   PUT /api/applications/:id
const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await Application.findById(id);

    if (!app) {
      res.status(404);
      throw new Error('Application not found');
    }

    const {
      serviceType,
      licenceType,
      vehicleClass,
      coursePackage,
      lifecycleStatus,
      batch,
      primaryInstructor,
      secondaryInstructor,
      assignedVehicle,
      assignedStaff,
      feeStructure,
      learnerLicence,
      drivingTest,
      licence,
      nextAction,
      nextActionDueDate,
      nextActionAssignedTo,
      nextActionPriority,
      nextActionStatus,
      notes
    } = req.body;

    const oldStatus = app.lifecycleStatus;

    if (serviceType) app.serviceType = serviceType;
    if (licenceType) app.licenceType = licenceType;
    if (vehicleClass) app.vehicleClass = vehicleClass;
    if (coursePackage) app.coursePackage = coursePackage;
    if (lifecycleStatus) app.lifecycleStatus = lifecycleStatus;
    if (batch !== undefined) app.batch = batch || null;
    if (primaryInstructor !== undefined) app.primaryInstructor = primaryInstructor || null;
    if (secondaryInstructor !== undefined) app.secondaryInstructor = secondaryInstructor || null;
    if (assignedVehicle !== undefined) app.assignedVehicle = assignedVehicle || null;
    if (assignedStaff !== undefined) app.assignedStaff = assignedStaff || null;
    if (notes !== undefined) app.notes = notes;

    if (learnerLicence) app.learnerLicence = { ...app.learnerLicence.toObject(), ...learnerLicence };
    if (drivingTest) app.drivingTest = { ...app.drivingTest.toObject(), ...drivingTest };
    if (licence) app.licence = { ...app.licence.toObject(), ...licence };

    // Fee structure updates (preserving payments received)
    if (feeStructure) {
      app.feeStructure.packageFee = Number(feeStructure.packageFee ?? app.feeStructure.packageFee);
      app.feeStructure.rtoServiceFee = Number(feeStructure.rtoServiceFee ?? app.feeStructure.rtoServiceFee);
      app.feeStructure.retestFee = Number(feeStructure.retestFee ?? app.feeStructure.retestFee);
      app.feeStructure.otherCharges = Number(feeStructure.otherCharges ?? app.feeStructure.otherCharges);
      app.feeStructure.discount = Number(feeStructure.discount ?? app.feeStructure.discount);

      const net = Math.max(
        0,
        app.feeStructure.packageFee +
          app.feeStructure.rtoServiceFee +
          app.feeStructure.retestFee +
          app.feeStructure.otherCharges -
          app.feeStructure.discount
      );
      app.feeStructure.netPayable = net;
      app.feeStructure.balanceDue = Math.max(0, net - (app.feeStructure.totalReceived || 0));
    }

    // Next Action validation
    if (nextAction !== undefined) app.nextAction = nextAction;
    if (nextActionDueDate !== undefined) app.nextActionDueDate = new Date(nextActionDueDate);
    if (nextActionAssignedTo !== undefined) app.nextActionAssignedTo = nextActionAssignedTo;
    if (nextActionPriority !== undefined) app.nextActionPriority = nextActionPriority;
    if (nextActionStatus !== undefined) app.nextActionStatus = nextActionStatus;

    const activeStatuses = ['Lead', 'Registered', 'Documents Pending', 'LL Processing', 'LL Approved', 'Training', 'Test Scheduled', 'Retest', 'Test Passed', 'Licence Processing'];
    if (activeStatuses.includes(app.lifecycleStatus)) {
      if (!app.nextAction || !String(app.nextAction).trim()) {
        res.status(400);
        throw new Error('Next Action is mandatory for active applications.');
      }
      if (!app.nextActionDueDate) {
        res.status(400);
        throw new Error('Next Action Due Date is mandatory for active applications.');
      }
    }

    const updated = await app.save();

    // Audit log
    await AuditLog.logAction({
      user: req.user,
      action: 'Application Updated',
      entity: 'Application',
      entityId: updated.applicationId,
      details: {
        applicationId: updated.applicationId,
        oldStatus,
        newStatus: updated.lifecycleStatus,
        nextAction: updated.nextAction
      },
      req
    });

    res.json({
      success: true,
      message: `Application ${updated.applicationId} updated successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update specific stage (LL, Driving Test, or Licence) independently
// @route   PATCH /api/applications/:id/stage
const updateApplicationStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, stageData } = req.body; // stage: 'll' | 'test' | 'licence' | 'lifecycle'

    const app = await Application.findById(id);
    if (!app) {
      res.status(404);
      throw new Error('Application not found');
    }

    if (stage === 'll') {
      app.learnerLicence = { ...app.learnerLicence.toObject(), ...stageData };
      if (stageData.llStatus === 'Approved' || stageData.llStatus === 'Issued') {
        app.lifecycleStatus = 'LL Approved';
      } else if (stageData.llStatus === 'Processing' || stageData.llStatus === 'Applied') {
        app.lifecycleStatus = 'LL Processing';
      }
    } else if (stage === 'test') {
      app.drivingTest = { ...app.drivingTest.toObject(), ...stageData };
      if (stageData.testResult === 'Passed') {
        app.lifecycleStatus = 'Test Passed';
      } else if (stageData.testResult === 'Failed') {
        app.lifecycleStatus = 'Retest';
        app.drivingTest.retestCount = (app.drivingTest.retestCount || 0) + 1;
      } else if (stageData.testResult === 'Scheduled' || stageData.drivingTestDate) {
        app.lifecycleStatus = 'Test Scheduled';
      }
    } else if (stage === 'licence') {
      app.licence = { ...app.licence.toObject(), ...stageData };
      if (stageData.licenceStatus === 'Delivered') {
        app.lifecycleStatus = 'Completed';
        if (!app.licence.completionDate) app.licence.completionDate = new Date();
      } else if (stageData.licenceStatus === 'Under Processing' || stageData.licenceStatus === 'Printed') {
        app.lifecycleStatus = 'Licence Processing';
      }
    } else if (stage === 'lifecycle') {
      if (stageData.lifecycleStatus) {
        app.lifecycleStatus = stageData.lifecycleStatus;
      }
    }

    // Auto-update next action if provided in stageData
    if (stageData.nextAction) app.nextAction = stageData.nextAction;
    if (stageData.nextActionDueDate) app.nextActionDueDate = new Date(stageData.nextActionDueDate);
    if (stageData.nextActionPriority) app.nextActionPriority = stageData.nextActionPriority;
    if (stageData.nextActionAssignedTo) app.nextActionAssignedTo = stageData.nextActionAssignedTo;

    const updated = await app.save();

    await AuditLog.logAction({
      user: req.user,
      action: `Application Stage Updated (${stage.toUpperCase()})`,
      entity: 'Application',
      entityId: updated.applicationId,
      details: { stage, stageData },
      req
    });

    res.json({
      success: true,
      message: `${stage.toUpperCase()} details updated successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Next Action on application
// @route   PATCH /api/applications/:id/next-action
const updateNextAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nextAction, nextActionDueDate, nextActionAssignedTo, nextActionPriority, nextActionStatus } = req.body;

    const app = await Application.findById(id);
    if (!app) {
      res.status(404);
      throw new Error('Application not found');
    }

    if (!nextAction || !String(nextAction).trim()) {
      res.status(400);
      throw new Error('Next Action text is required.');
    }

    app.nextAction = nextAction.trim();
    if (nextActionDueDate) app.nextActionDueDate = new Date(nextActionDueDate);
    if (nextActionAssignedTo) app.nextActionAssignedTo = nextActionAssignedTo;
    if (nextActionPriority) app.nextActionPriority = nextActionPriority;
    if (nextActionStatus) app.nextActionStatus = nextActionStatus;

    const updated = await app.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'Next Action Updated',
      entity: 'Application',
      entityId: updated.applicationId,
      details: {
        applicationId: updated.applicationId,
        nextAction: updated.nextAction,
        dueDate: updated.nextActionDueDate,
        priority: updated.nextActionPriority
      },
      req
    });

    res.json({
      success: true,
      message: 'Next Action updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all applications for a student
// @route   GET /api/applications/student/:studentId
const getStudentApplications = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    let query = {};
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      query = { $or: [{ student: studentId }, { studentId: studentId }] };
    } else {
      query = { studentId };
    }

    const applications = await Application.find(query)
      .populate('batch', 'name startTime endTime')
      .populate('primaryInstructor', 'name mobile')
      .populate('assignedVehicle', 'vehicleNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await Application.findById(id);

    if (!app) {
      res.status(404);
      throw new Error('Application not found');
    }

    await Application.findByIdAndDelete(id);

    await AuditLog.logAction({
      user: req.user,
      action: 'Application Deleted',
      entity: 'Application',
      entityId: app.applicationId,
      details: { applicationId: app.applicationId, studentId: app.studentId },
      req
    });

    res.json({
      success: true,
      message: `Application ${app.applicationId} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStage,
  updateNextAction,
  getStudentApplications,
  deleteApplication
};
