const Class = require('../models/Class');
const Student = require('../models/Student');
const Instructor = require('../models/Instructor');
const Vehicle = require('../models/Vehicle');
const Batch = require('../models/Batch');
const Schedule = require('../models/Schedule');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');

// Helper function to sync student training progress after any class creation, update, or deletion
// Implements the AUTO CONSULTANT reference formula:
// Road equivalent = Road KM / 5
// H equivalent = H / 3
// Total equivalent classes = (Road KM / 5) + (H / 3) + Bike Classes
// Pending classes = Required Classes - Total Equivalent Classes
const syncStudentTrainingProgress = async (studentId) => {
  if (!studentId) return;
  try {
    const student = await Student.findById(studentId);
    if (!student) return;

    const classes = await Class.find({ student: studentId, status: { $ne: 'Cancelled' } });

    let totalKm = 0;
    let totalHours = 0;
    let roadClassesCount = 0;
    let hTrackClassesCount = 0;
    let bikeClassesCount = 0;
    let latestClassDate = null;

    classes.forEach((c) => {
      const km = Number(c.km || 0);
      const hours = Number(c.hours || 0);
      const bikes = Number(c.bikeClassCount || 0);

      totalKm += km;
      totalHours += hours;
      bikeClassesCount += bikes;

      const t = (c.trainingType || '').toLowerCase();
      if (t.includes('road')) roadClassesCount++;
      if (t.includes('h') || t.includes('track') || t.includes('reverse') || t.includes('yard')) hTrackClassesCount++;
      if (t.includes('bike') || t.includes('2 wheeler') || t.includes('motorcycle')) {
        if (bikes === 0) bikeClassesCount += 1;
      }

      if (c.classDate && (!latestClassDate || new Date(c.classDate) > new Date(latestClassDate))) {
        latestClassDate = c.classDate;
      }
    });

    // Exact unrounded reference formula
    const equivalentClasses = (totalKm / 5) + (totalHours / 3) + bikeClassesCount;
    const requiredClasses = student.trainingProgress?.requiredClasses || 20;
    const pendingClasses = Math.max(0, requiredClasses - equivalentClasses);
    const completionPercentage = Math.min(100, Math.round((equivalentClasses / requiredClasses) * 100));

    let progressStatus = 'Not Started';
    if (completionPercentage >= 100) {
      progressStatus = 'Completed';
    } else if (completionPercentage >= 80) {
      progressStatus = 'Test Ready';
    } else if (classes.length > 0) {
      progressStatus = 'In Progress';
    }

    student.trainingProgress = {
      ...(student.trainingProgress || {}),
      status: progressStatus,
      roadClassesCount,
      hTrackClassesCount,
      bikeClassesCount,
      totalKm,
      totalHours,
      equivalentClasses,
      requiredClasses,
      pendingClasses,
      completionPercentage,
      latestClassDate
    };

    await student.save();
  } catch (error) {
    console.error('Failed to sync student training progress:', error.message);
  }
};

// @desc    Get classes with multi-field search, filtering & pagination
// @route   GET /api/classes
const getClasses = async (req, res, next) => {
  try {
    const {
      search,
      student,
      batch,
      instructor,
      vehicle,
      trainingType,
      status,
      date,
      startDate,
      endDate,
      sortBy = 'classDate',
      sortOrder = 'desc',
      page = 1,
      limit = 15,
      all
    } = req.query;

    const query = {};

    // 1. Text / Keyword search on Student Name, ID, Mobile, or Batch Name
    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');

      const [matchingStudents, matchingBatches] = await Promise.all([
        Student.find({
          $or: [
            { fullName: regex },
            { primaryMobile: regex },
            { studentId: regex },
            { applicationNo: regex }
          ]
        }).select('_id'),
        Batch.find({
          $or: [
            { name: regex },
            { batchNumber: regex }
          ]
        }).select('_id')
      ]);

      const studentIds = matchingStudents.map((st) => st._id);
      const batchIds = matchingBatches.map((b) => b._id);

      query.$or = [
        { student: { $in: studentIds } },
        { batch: { $in: batchIds } },
        { instructor: regex },
        { vehicleNo: regex },
        { notes: regex }
      ];
    }

    // 2. Exact student filter
    if (student) {
      query.student = student;
    }

    // 3. Exact batch filter
    if (batch) {
      query.batch = batch;
    }

    // 4. Instructor filter (by ID or string name)
    if (instructor) {
      query.$or = [
        { instructorRef: instructor },
        { instructor: new RegExp(instructor, 'i') }
      ];
    }

    // 5. Vehicle filter (by ID or reg no)
    if (vehicle) {
      const vehQuery = [
        { vehicleRef: vehicle },
        { vehicleNo: new RegExp(vehicle, 'i') }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: vehQuery }];
        delete query.$or;
      } else {
        query.$or = vehQuery;
      }
    }

    // 6. Training type filter
    if (trainingType) {
      query.trainingType = trainingType;
    }

    // 7. Status filter
    if (status) {
      query.status = status;
    }

    // 8. Date filtering
    if (date) {
      const dStart = new Date(date);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      query.classDate = { $gte: dStart, $lte: dEnd };
    } else if (startDate || endDate) {
      query.classDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.classDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.classDate.$lte = e;
      }
    }

    // Return unpaginated array if all=true or pagination=false
    if (all === 'true' || req.query.pagination === 'false') {
      const classes = await Class.find(query)
        .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo')
        .populate('batch', 'name batchNumber session')
        .populate('instructorRef', 'instructorId name mobile designation')
        .populate('vehicleRef', 'vehicleId vehicleNumber brand model')
        .populate('createdBy', 'name role')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, createdAt: -1 });

      return res.json(classes);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 15);
    const skip = (pageNum - 1) * limitNum;

    const total = await Class.countDocuments(query);
    const classes = await Class.find(query)
      .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo')
      .populate('batch', 'name batchNumber session')
      .populate('instructorRef', 'instructorId name mobile designation')
      .populate('vehicleRef', 'vehicleId vehicleNumber brand model')
      .populate('createdBy', 'name role')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      classes,
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

// @desc    Get dynamic training statistics (Total Records, Recorded KM, Recorded Hours, Dynamic Instructor KM/H, Equivalent Classes, Workload)
// @route   GET /api/classes/stats
const getClassStats = async (req, res, next) => {
  try {
    const { instructor: requestedInstructor, batch: requestedBatch, startDate, endDate, student } = req.query;

    const matchQuery = {};
    if (student) matchQuery.student = student;
    if (requestedBatch) matchQuery.batch = requestedBatch;
    if (startDate || endDate) {
      matchQuery.classDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        matchQuery.classDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchQuery.classDate.$lte = e;
      }
    }

    // 1. Overall Totals
    const overallAgg = await Class.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          recordedKm: { $sum: '$km' },
          recordedHours: { $sum: '$hours' },
          totalBikeClasses: { $sum: { $ifNull: ['$bikeClassCount', 0] } }
        }
      }
    ]);

    const totalRecords = overallAgg[0]?.totalRecords || 0;
    const recordedKm = overallAgg[0]?.recordedKm || 0;
    const recordedHours = overallAgg[0]?.recordedHours || 0;
    const totalBikeClasses = overallAgg[0]?.totalBikeClasses || 0;

    // Exact unrounded Equivalent Classes formula: (KM / 5) + (H / 3) + Bike
    const rawEquivalent = (recordedKm / 5) + (recordedHours / 3) + totalBikeClasses;
    const equivalentClasses = Math.round(rawEquivalent * 10) / 10;

    // 2. Instructor breakdown aggregation
    const instructorAgg = await Class.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $ifNull: ['$instructorRef', '$instructor'] },
          instructorName: { $first: '$instructor' },
          instructorRef: { $first: '$instructorRef' },
          km: { $sum: '$km' },
          hours: { $sum: '$hours' },
          totalClasses: { $sum: 1 },
          students: { $addToSet: '$student' }
        }
      },
      {
        $project: {
          _id: 1,
          name: '$instructorName',
          instructorRef: 1,
          km: 1,
          hours: 1,
          totalClasses: 1,
          studentsCount: { $size: '$students' }
        }
      },
      { $sort: { km: -1, hours: -1 } }
    ]);

    // Target instructor for Cards 4 & 5
    let selectedInstructorStats = null;
    if (requestedInstructor) {
      selectedInstructorStats = instructorAgg.find(
        (i) =>
          String(i.instructorRef) === String(requestedInstructor) ||
          i.name?.toLowerCase() === requestedInstructor.toLowerCase()
      );
      if (!selectedInstructorStats) {
        const insDoc = await Instructor.findById(requestedInstructor).select('name');
        selectedInstructorStats = {
          name: insDoc ? insDoc.name : requestedInstructor,
          km: 0,
          hours: 0,
          totalClasses: 0,
          studentsCount: 0
        };
      }
    } else if (instructorAgg.length > 0) {
      selectedInstructorStats = instructorAgg[0];
    } else {
      const firstInstructor = await Instructor.findOne({ status: 'Active' }).sort({ createdAt: 1 });
      selectedInstructorStats = {
        name: firstInstructor ? firstInstructor.name : 'Farhan',
        km: 0,
        hours: 0,
        totalClasses: 0,
        studentsCount: 0
      };
    }

    // 3. Vehicle breakdown aggregation
    const vehicleAgg = await Class.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $ifNull: ['$vehicleRef', '$vehicleNo'] },
          vehicleNo: { $first: '$vehicleNo' },
          vehicleRef: { $first: '$vehicleRef' },
          km: { $sum: '$km' },
          hours: { $sum: '$hours' },
          totalClasses: { $sum: 1 }
        }
      },
      { $sort: { km: -1 } }
    ]);

    // 4. Batch breakdown aggregation
    const batchAgg = await Class.aggregate([
      { $match: { ...matchQuery, batch: { $ne: null } } },
      {
        $group: {
          _id: '$batch',
          km: { $sum: '$km' },
          hours: { $sum: '$hours' },
          totalClasses: { $sum: 1 },
          students: { $addToSet: '$student' }
        }
      },
      {
        $lookup: {
          from: 'batches',
          localField: '_id',
          foreignField: '_id',
          as: 'batchDetails'
        }
      },
      { $unwind: { path: '$batchDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          batchName: '$batchDetails.name',
          batchNumber: '$batchDetails.batchNumber',
          session: '$batchDetails.session',
          km: 1,
          hours: 1,
          totalClasses: 1,
          studentsCount: { $size: '$students' }
        }
      },
      { $sort: { totalClasses: -1 } }
    ]);

    // 5. Active and Today's metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [activeTrainingStudents, completedTrainingStudents, todaysClassesCount] = await Promise.all([
      Student.countDocuments({ 'trainingProgress.status': 'In Progress' }),
      Student.countDocuments({ 'trainingProgress.status': 'Completed' }),
      Class.countDocuments({ classDate: { $gte: todayStart, $lte: todayEnd } })
    ]);

    res.json({
      totalRecords,
      recordedKm,
      recordedHours,
      totalBikeClasses,
      equivalentClasses,
      rawEquivalent,
      activeTrainingStudents,
      completedTrainingStudents,
      todaysClassesCount,
      instructor: selectedInstructorStats,
      instructorBreakdown: instructorAgg,
      vehicleBreakdown: vehicleAgg,
      batchBreakdown: batchAgg
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Student-Level Training Progress Tracker (Matches DDS_Operations_Training_Management_2026.xlsx)
// @route   GET /api/classes/progress-tracker
const getProgressTracker = async (req, res, next) => {
  try {
    const { search, batch, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { fullName: regex },
        { primaryMobile: regex },
        { studentId: regex },
        { applicationNo: regex }
      ];
    }

    if (batch) query.batch = batch;
    if (status) query['trainingProgress.status'] = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('batch', 'name batchNumber session instructor')
      .select('studentId fullName primaryMobile vehicleType coursePackage batch trainingProgress totalFee paidAmount advanceAmount currentStatus testDate testStatus')
      .sort({ 'trainingProgress.completionPercentage': -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const formattedStudents = students.map((s) => {
      const p = s.trainingProgress || {};
      const required = p.requiredClasses || 20;
      const roadKm = p.totalKm || 0;
      const hHours = p.totalHours || 0;
      const bikeClasses = p.bikeClassesCount || 0;
      const roadEq = Math.round((roadKm / 5) * 100) / 100;
      const hEq = Math.round((hHours / 3) * 100) / 100;
      const totalEq = Math.round(((roadKm / 5) + (hHours / 3) + bikeClasses) * 100) / 100;
      const pending = Math.max(0, Math.round((required - totalEq) * 100) / 100);
      const completionPct = Math.min(100, Math.round((totalEq / required) * 100));

      const totalFee = s.totalFee || 0;
      const paid = (s.paidAmount || 0) + (s.advanceAmount || 0);
      const balance = totalFee - paid;

      return {
        _id: s._id,
        studentId: s.studentId,
        fullName: s.fullName,
        primaryMobile: s.primaryMobile,
        vehicleType: s.vehicleType,
        coursePackage: s.coursePackage,
        batch: s.batch,
        roadKm,
        roadClassesCount: p.roadClassesCount || 0,
        roadEquivalent: roadEq,
        hHours,
        hTrackClassesCount: p.hTrackClassesCount || 0,
        hEquivalent: hEq,
        bikeClasses,
        equivalentClasses: totalEq,
        requiredClasses: required,
        pendingClasses: pending,
        completionPercentage: completionPct,
        trainingStatus: p.status || 'Not Started',
        latestClassDate: p.latestClassDate,
        totalFee,
        paidAmount: paid,
        balance,
        feeStatus: balance <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending',
        testDate: s.testDate,
        testStatus: s.testStatus
      };
    });

    res.json({
      students: formattedStudents,
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

// @desc    Get daily class schedule rosters (Matches Sorted_Driving_Schedule_With_Batches.xlsx)
// @route   GET /api/classes/schedules
const getSchedules = async (req, res, next) => {
  try {
    const { batch, date, status } = req.query;
    const query = {};

    if (batch) query.batch = batch;
    if (status) query.status = status;
    if (date) {
      const dStart = new Date(date);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      query.date = { $gte: dStart, $lte: dEnd };
    }

    const schedules = await Schedule.find(query)
      .populate('batch', 'name batchNumber session instructor')
      .populate('students', 'studentId fullName primaryMobile vehicleType')
      .populate('instructorRef', 'name instructorId mobile')
      .populate('vehicleRef', 'vehicleNumber model brand')
      .sort({ date: -1, createdAt: -1 });

    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new class schedule session
// @route   POST /api/classes/schedules
const createSchedule = async (req, res, next) => {
  try {
    const { batch, date, timeSlot, classType, instructor, instructorRef, vehicleNo, vehicleRef, students, remarks } = req.body;

    if (!batch) {
      res.status(400);
      throw new Error('Batch reference is required');
    }
    if (!date) {
      res.status(400);
      throw new Error('Schedule date is required');
    }

    const schedule = await Schedule.create({
      batch,
      date: new Date(date),
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      timeSlot: timeSlot || '07:00 AM - 08:30 AM',
      classType: classType || 'Road & H',
      instructor: instructor || 'Jasim',
      instructorRef: instructorRef || null,
      vehicleNo: vehicleNo || '',
      vehicleRef: vehicleRef || null,
      students: Array.isArray(students) ? students : [],
      status: req.body.status || 'Planned',
      remarks: remarks || ''
    });

    const populated = await Schedule.findById(schedule._id)
      .populate('batch', 'name batchNumber session')
      .populate('students', 'studentId fullName primaryMobile');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update schedule session
// @route   PUT /api/classes/schedules/:id
const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('batch', 'name batchNumber session')
      .populate('students', 'studentId fullName primaryMobile');

    if (!schedule) {
      res.status(404);
      throw new Error('Schedule session not found');
    }

    res.json(schedule);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Cancel schedule session
// @route   DELETE /api/classes/schedules/:id
const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      res.status(404);
      throw new Error('Schedule session not found');
    }
    res.json({ success: true, message: 'Schedule session removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete a schedule session and generate training records & attendance
// @route   POST /api/classes/schedules/:id/complete
const completeSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate('students');
    if (!schedule) {
      res.status(404);
      throw new Error('Schedule session not found');
    }

    const { km = 10, hours = 1, attendedStudentIds, notes = '' } = req.body;
    const attendees = Array.isArray(attendedStudentIds)
      ? attendedStudentIds
      : schedule.students.map((s) => s._id);

    schedule.status = 'Completed';
    await schedule.save();

    // Create individual class and attendance records for attending students
    const createdClassRecords = [];
    for (const studentId of attendees) {
      const cls = await Class.create({
        student: studentId,
        batch: schedule.batch,
        scheduleRef: schedule._id,
        classDate: schedule.date,
        timeSlot: schedule.timeSlot,
        instructor: schedule.instructor,
        instructorRef: schedule.instructorRef,
        vehicleNo: schedule.vehicleNo || 'KL-10-AB-5265',
        vehicleRef: schedule.vehicleRef,
        trainingType: schedule.classType || 'Practical Driving',
        km: Number(km) || 10,
        hours: Number(hours) || 1,
        status: 'Completed',
        notes: notes || `Session from ${schedule.timeSlot}`,
        createdBy: req.user?._id || null
      });

      // Also record Attendance
      await Attendance.create({
        student: studentId,
        batch: schedule.batch,
        schedule: schedule._id,
        date: schedule.date,
        status: 'Present',
        classType: schedule.classType,
        instructor: schedule.instructor,
        remarks: notes || 'Completed scheduled session'
      });

      // Sync student training progress
      await syncStudentTrainingProgress(studentId);
      createdClassRecords.push(cls);
    }

    res.json({
      success: true,
      message: `Completed session. Recorded classes for ${attendees.length} student(s).`,
      classesCount: createdClassRecords.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export classes to CSV format based on active filters
// @route   GET /api/classes/export
const exportClassesCSV = async (req, res, next) => {
  try {
    const {
      search,
      student,
      batch,
      instructor,
      vehicle,
      trainingType,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      const matchingStudents = await Student.find({
        $or: [
          { fullName: regex },
          { primaryMobile: regex },
          { studentId: regex },
          { applicationNo: regex }
        ]
      }).select('_id');

      const studentIds = matchingStudents.map((st) => st._id);
      query.$or = [
        { student: { $in: studentIds } },
        { instructor: regex },
        { vehicleNo: regex },
        { notes: regex }
      ];
    }

    if (student) query.student = student;
    if (batch) query.batch = batch;
    if (instructor) {
      query.$or = [
        { instructorRef: instructor },
        { instructor: new RegExp(instructor, 'i') }
      ];
    }
    if (vehicle) {
      const vehQuery = [
        { vehicleRef: vehicle },
        { vehicleNo: new RegExp(vehicle, 'i') }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: vehQuery }];
        delete query.$or;
      } else {
        query.$or = vehQuery;
      }
    }
    if (trainingType) query.trainingType = trainingType;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.classDate = {};
      if (startDate) query.classDate.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.classDate.$lte = e;
      }
    }

    const records = await Class.find(query)
      .populate('student', 'studentId fullName primaryMobile')
      .populate('batch', 'name batchNumber session')
      .sort({ classDate: -1, createdAt: -1 });

    const headers = [
      'ID',
      'Student ID',
      'Student Name',
      'Mobile',
      'Batch',
      'Date',
      'Time Slot',
      'Instructor',
      'Vehicle',
      'Training Type',
      'KM',
      'Hours',
      'Bike Count',
      'Equivalent Classes',
      'Status',
      'Notes'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [headers.join(',')];

    records.forEach((r, idx) => {
      const dateStr = r.classDate ? new Date(r.classDate).toISOString().split('T')[0] : '';
      const km = Number(r.km || 0);
      const hours = Number(r.hours || 0);
      const bikes = Number(r.bikeClassCount || 0);
      const eq = Math.round(((km / 5) + (hours / 3) + bikes) * 100) / 100;

      csvRows.push([
        escapeCsv(idx + 1),
        escapeCsv(r.student?.studentId || 'N/A'),
        escapeCsv(r.student?.fullName || 'N/A'),
        escapeCsv(r.student?.primaryMobile || 'N/A'),
        escapeCsv(r.batch?.name || 'Unassigned'),
        escapeCsv(dateStr),
        escapeCsv(r.timeSlot || '—'),
        escapeCsv(r.instructor || 'Unassigned'),
        escapeCsv(r.vehicleNo || 'N/A'),
        escapeCsv(r.trainingType || 'Practical Driving'),
        escapeCsv(km),
        escapeCsv(hours),
        escapeCsv(bikes),
        escapeCsv(eq),
        escapeCsv(r.status || 'Completed'),
        escapeCsv(r.notes || '')
      ].join(','));
    });

    const csvContent = csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="training_ledger_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single class by ID
// @route   GET /api/classes/:id
const getClassById = async (req, res, next) => {
  try {
    const classRecord = await Class.findById(req.params.id)
      .populate('student')
      .populate('batch')
      .populate('instructorRef')
      .populate('vehicleRef')
      .populate('createdBy', 'name role');

    if (!classRecord) {
      res.status(404);
      throw new Error('Class record not found');
    }

    res.json(classRecord);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new class record
// @route   POST /api/classes
const createClass = async (req, res, next) => {
  try {
    const {
      student,
      batch,
      instructorRef,
      vehicleRef,
      km,
      hours,
      bikeClassCount,
      hClassCount,
      classDate,
      startTime,
      endTime,
      timeSlot,
      section,
      trainingType,
      status
    } = req.body;

    if (!student) {
      res.status(400);
      throw new Error('Student is required for a class record');
    }

    const studentDoc = await Student.findById(student);
    if (!studentDoc) {
      res.status(404);
      throw new Error('Selected student does not exist');
    }

    const kmNum = Number(km !== undefined ? km : 0);
    const hoursNum = Number(hours !== undefined ? hours : 1);
    const bikeNum = Number(bikeClassCount !== undefined ? bikeClassCount : 0);
    const hNum = Number(hClassCount !== undefined ? hClassCount : 0);

    if (isNaN(kmNum) || kmNum < 0) {
      res.status(400);
      throw new Error('Kilometers cannot be negative');
    }
    if (isNaN(hoursNum) || hoursNum < 0) {
      res.status(400);
      throw new Error('Training hours cannot be negative');
    }

    let instructorName = req.body.instructor;
    if (instructorRef) {
      const ins = await Instructor.findById(instructorRef);
      if (ins) instructorName = ins.name;
    }

    let vehicleNo = req.body.vehicleNo;
    if (vehicleRef) {
      const veh = await Vehicle.findById(vehicleRef);
      if (veh) vehicleNo = veh.vehicleNumber;
    }

    const classData = {
      ...req.body,
      student,
      batch: batch || studentDoc.batch || null,
      km: kmNum,
      hours: hoursNum,
      bikeClassCount: bikeNum,
      hClassCount: hNum,
      startTime: startTime || '',
      endTime: endTime || '',
      timeSlot: timeSlot || (startTime && endTime ? `${startTime} - ${endTime}` : ''),
      section: section || 'General',
      instructor: instructorName || 'Instructor',
      vehicleNo: vehicleNo || 'KL-01-AB-1234',
      trainingType: trainingType || 'Practical Driving',
      status: status || 'Completed',
      classDate: classDate ? new Date(classDate) : new Date(),
      createdBy: req.user?._id || null
    };

    const classRecord = await Class.create(classData);

    // Sync student training progress
    await syncStudentTrainingProgress(student);

    // Log to AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'CREATE_CLASS_RECORD',
      entity: 'Class',
      entityId: classRecord._id,
      details: {
        student: studentDoc.fullName,
        studentId: studentDoc.studentId,
        km: kmNum,
        hours: hoursNum,
        instructor: classRecord.instructor,
        vehicleNo: classRecord.vehicleNo
      },
      req
    });

    const populatedClass = await Class.findById(classRecord._id)
      .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo')
      .populate('batch', 'name batchNumber session')
      .populate('instructorRef', 'instructorId name mobile')
      .populate('vehicleRef', 'vehicleId vehicleNumber brand model');

    res.status(201).json(populatedClass);
  } catch (error) {
    next(error);
  }
};

// @desc    Update class record
// @route   PUT /api/classes/:id
const updateClass = async (req, res, next) => {
  try {
    const classRecord = await Class.findById(req.params.id);

    if (!classRecord) {
      res.status(404);
      throw new Error('Class record not found');
    }

    const prevStudentId = classRecord.student;

    if (req.body.km !== undefined) {
      const kmNum = Number(req.body.km);
      if (isNaN(kmNum) || kmNum < 0) {
        res.status(400);
        throw new Error('Kilometers cannot be negative');
      }
      req.body.km = kmNum;
    }

    if (req.body.hours !== undefined) {
      const hoursNum = Number(req.body.hours);
      if (isNaN(hoursNum) || hoursNum < 0) {
        res.status(400);
        throw new Error('Training hours cannot be negative');
      }
      req.body.hours = hoursNum;
    }

    if (req.body.instructorRef) {
      const ins = await Instructor.findById(req.body.instructorRef);
      if (ins) req.body.instructor = ins.name;
    }

    if (req.body.vehicleRef) {
      const veh = await Vehicle.findById(req.body.vehicleRef);
      if (veh) req.body.vehicleNo = veh.vehicleNumber;
    }

    req.body.updatedBy = req.user?._id || null;

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('student', 'studentId fullName primaryMobile vehicleType applicationNo')
      .populate('batch', 'name batchNumber session')
      .populate('instructorRef', 'instructorId name mobile')
      .populate('vehicleRef', 'vehicleId vehicleNumber brand model');

    // Sync progress
    await syncStudentTrainingProgress(prevStudentId);
    if (String(prevStudentId) !== String(updatedClass.student?._id || updatedClass.student)) {
      await syncStudentTrainingProgress(updatedClass.student?._id || updatedClass.student);
    }

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_CLASS_RECORD',
      entity: 'Class',
      entityId: classRecord._id,
      details: {
        km: updatedClass.km,
        hours: updatedClass.hours,
        instructor: updatedClass.instructor,
        vehicleNo: updatedClass.vehicleNo
      },
      req
    });

    res.json(updatedClass);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete class record safely
// @route   DELETE /api/classes/:id
const deleteClass = async (req, res, next) => {
  try {
    const classRecord = await Class.findById(req.params.id);

    if (!classRecord) {
      res.status(404);
      throw new Error('Class record not found');
    }

    const studentId = classRecord.student;
    await Class.findByIdAndDelete(req.params.id);

    // Sync student training progress
    await syncStudentTrainingProgress(studentId);

    // Log to AuditLog
    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_CLASS_RECORD',
      entity: 'Class',
      entityId: req.params.id,
      details: {
        deletedClassDate: classRecord.classDate,
        instructor: classRecord.instructor,
        km: classRecord.km,
        hours: classRecord.hours
      },
      req
    });

    res.json({ success: true, message: 'Class record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClasses,
  getClassStats,
  getProgressTracker,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  completeSchedule,
  exportClassesCSV,
  getClassById,
  createClass,
  updateClass,
  deleteClass
};
