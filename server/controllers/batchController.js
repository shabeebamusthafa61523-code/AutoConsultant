const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Schedule = require('../models/Schedule');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

// @desc    Get batch summary statistics for dashboard cards
// @route   GET /api/batches/stats
const getBatchStats = async (req, res, next) => {
  try {
    const [totalBatches, activeBatches, upcomingBatches, completedBatches] = await Promise.all([
      Batch.countDocuments(),
      Batch.countDocuments({ status: 'Active' }),
      Batch.countDocuments({ status: 'Upcoming' }),
      Batch.countDocuments({ status: 'Completed' })
    ]);

    // Active batches list to count enrolled students
    const activeBatchIds = (await Batch.find({ status: 'Active' }).select('_id')).map(b => b._id);
    const studentsInActiveBatches = await Student.countDocuments({ batch: { $in: activeBatchIds } });

    res.json({
      totalBatches,
      activeBatches,
      upcomingBatches,
      completedBatches,
      studentsInActiveBatches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all batches with dynamic enrolled counts and filters
// @route   GET /api/batches
const getBatches = async (req, res, next) => {
  try {
    const { search, status, session, instructor } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { batchNumber: { $regex: search.trim(), $options: 'i' } },
        { courseLicenceType: { $regex: search.trim(), $options: 'i' } },
        { instructor: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (session) query.session = session;
    if (instructor) query.instructor = { $regex: instructor.trim(), $options: 'i' };

    const batches = await Batch.find(query).sort({ createdAt: -1 });

    // Calculate dynamic counts for each batch
    const batchesWithMetrics = await Promise.all(
      batches.map(async (batch) => {
        const [totalStudents, activeStudents, completedStudents, schedulesCount] = await Promise.all([
          Student.countDocuments({ batch: batch._id }),
          Student.countDocuments({ batch: batch._id, currentStatus: { $in: ['Active', 'Training'] } }),
          Student.countDocuments({ batch: batch._id, currentStatus: { $in: ['Passed', 'Completed'] } }),
          Schedule.countDocuments({ batch: batch._id })
        ]);

        return {
          ...batch.toObject(),
          enrolledCount: totalStudents,
          activeCount: activeStudents,
          completedCount: completedStudents,
          pendingCount: totalStudents - activeStudents - completedStudents,
          schedulesCount
        };
      })
    );

    res.json(batchesWithMetrics);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single batch with operational data (students, schedules, attendance, fees)
// @route   GET /api/batches/:id
const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    const [students, schedules, attendances] = await Promise.all([
      Student.find({ batch: batch._id }).select('studentId fullName primaryMobile vehicleType licenceCategory currentStatus totalFee paidAmount advanceAmount trainingProgress'),
      Schedule.find({ batch: batch._id }).sort({ date: -1 }).populate('students', 'studentId fullName'),
      Attendance.find({ batch: batch._id }).sort({ date: -1 }).limit(100).populate('student', 'studentId fullName')
    ]);

    // Calculate batch-level financial metrics
    let totalExpected = 0;
    let totalCollected = 0;

    const studentsWithMetrics = await Promise.all(
      students.map(async (stu) => {
        const fee = stu.totalFee || 0;
        const paid = (stu.paidAmount || 0) + (stu.advanceAmount || 0);
        totalExpected += fee;
        totalCollected += paid;

        // Individual student attendance rate in this batch
        const stuTotalAttendance = attendances.filter(a => String(a.student?._id || a.student) === String(stu._id)).length;
        const stuPresent = attendances.filter(a => String(a.student?._id || a.student) === String(stu._id) && a.status === 'Present').length;
        const attendanceRate = stuTotalAttendance > 0 ? Math.round((stuPresent / stuTotalAttendance) * 100) : 0;

        return {
          ...stu.toObject(),
          balance: fee - paid,
          feeStatus: stu.feeStatus,
          attendanceRate
        };
      })
    );

    res.json({
      ...batch.toObject(),
      enrolledCount: students.length,
      students: studentsWithMetrics,
      schedules,
      recentAttendance: attendances,
      feeSummary: {
        totalExpected,
        totalCollected,
        totalPending: totalExpected - totalCollected
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new batch
// @route   POST /api/batches
const createBatch = async (req, res, next) => {
  try {
    let batchNumber = req.body.batchNumber;
    if (!batchNumber || !batchNumber.trim()) {
      const count = await Batch.countDocuments();
      batchNumber = `BATCH-${count + 1}`;
    }

    const batch = await Batch.create({
      ...req.body,
      batchNumber
    });

    res.status(201).json({
      ...batch.toObject(),
      enrolledCount: 0,
      activeCount: 0,
      completedCount: 0
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    const studentCount = await Student.countDocuments({ batch: updatedBatch._id });

    res.json({
      ...updatedBatch.toObject(),
      enrolledCount: studentCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch (safely unassigns students and removes schedules)
// @route   DELETE /api/batches/:id
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    // Safely unassign students from this batch
    await Student.updateMany(
      { batch: batch._id },
      {
        $unset: { batch: '' },
        $push: {
          timeline: {
            action: 'Batch Dissolved',
            category: 'Batch',
            description: `Batch ${batch.name} was removed. Student status set to unassigned.`,
            timestamp: new Date(),
            performedBy: req.user ? req.user.name : 'System'
          }
        }
      }
    );

    await Schedule.deleteMany({ batch: batch._id });
    await Batch.findByIdAndDelete(req.params.id);

    res.json({ message: 'Batch deleted successfully and students unassigned cleanly.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign a student to this batch
// @route   POST /api/batches/:id/students
const assignStudentToBatch = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    const student = await Student.findById(studentId);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Check capacity
    const currentEnrolled = await Student.countDocuments({ batch: batch._id });
    if (currentEnrolled >= (batch.maxStudents || 20)) {
      res.status(400);
      throw new Error(`Batch is at full capacity (${batch.maxStudents} students).`);
    }

    // If student was already in a batch, record history
    if (student.batch && String(student.batch) !== String(batch._id)) {
      const oldBatch = await Batch.findById(student.batch);
      student.batchHistory.push({
        batch: student.batch,
        batchName: oldBatch ? oldBatch.name : 'Previous Batch',
        assignedDate: student.updatedAt || student.createdAt,
        transferredDate: new Date(),
        reason: 'Assigned to new batch directly',
        transferredBy: req.user ? req.user._id : undefined
      });
    }

    student.batch = batch._id;
    student.timeline.push({
      action: 'Batch Assigned',
      category: 'Batch',
      description: `Assigned to ${batch.name} (${batch.session} Session)`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();

    res.json({
      message: 'Student assigned to batch successfully.',
      student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove student from batch (unassign)
// @route   DELETE /api/batches/:id/students/:studentId
const removeStudentFromBatch = async (req, res, next) => {
  try {
    const { id: batchId, studentId } = req.params;
    const batch = await Batch.findById(batchId);
    const student = await Student.findById(studentId);

    if (!batch || !student) {
      res.status(404);
      throw new Error('Batch or Student not found');
    }

    // Preserve in history
    student.batchHistory.push({
      batch: batch._id,
      batchName: batch.name,
      assignedDate: student.updatedAt || student.createdAt,
      transferredDate: new Date(),
      reason: 'Removed from batch (Unassigned)',
      transferredBy: req.user ? req.user._id : undefined
    });

    student.batch = null;
    student.timeline.push({
      action: 'Removed from Batch',
      category: 'Batch',
      description: `Unassigned from ${batch.name}`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();

    res.json({ message: 'Student removed from batch successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer student to another batch
// @route   POST /api/batches/:id/transfer-student
const transferStudentFromBatch = async (req, res, next) => {
  try {
    const { studentId, targetBatchId, reason } = req.body;
    const currentBatch = await Batch.findById(req.params.id);
    const targetBatch = await Batch.findById(targetBatchId);
    const student = await Student.findById(studentId);

    if (!currentBatch || !targetBatch || !student) {
      res.status(404);
      throw new Error('Current Batch, Target Batch, or Student not found.');
    }

    // Record previous batch history
    student.batchHistory.push({
      batch: currentBatch._id,
      batchName: currentBatch.name,
      assignedDate: student.updatedAt || student.createdAt,
      transferredDate: new Date(),
      reason: reason || 'Batch transfer requested',
      transferredBy: req.user ? req.user._id : undefined
    });

    student.batch = targetBatch._id;
    student.timeline.push({
      action: 'Batch Transfer',
      category: 'Batch',
      description: `Transferred from [${currentBatch.name}] to [${targetBatch.name}]. Reason: ${reason || 'Operational adjustment'}`,
      timestamp: new Date(),
      performedBy: req.user ? req.user.name : 'Staff'
    });

    await student.save();

    res.json({
      message: `Student successfully transferred to ${targetBatch.name}.`,
      student
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SCHEDULE MANAGEMENT
// ==========================================

// @desc    Get schedules for a batch
// @route   GET /api/batches/:id/schedules
const getBatchSchedules = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ batch: req.params.id })
      .sort({ date: -1 })
      .populate('students', 'studentId fullName primaryMobile');
    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

// @desc    Create schedule for a batch
// @route   POST /api/batches/:id/schedules
const createBatchSchedule = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    const { date, day, timeSlot, classType, instructor, vehicleNo, studentIds, remarks } = req.body;

    const schedule = await Schedule.create({
      batch: batch._id,
      date: date || new Date(),
      day: day || new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      timeSlot: timeSlot || `${batch.startTime} - ${batch.endTime}`,
      classType: classType || 'Road & H',
      instructor: instructor || batch.instructor || 'Jasim',
      vehicleNo: vehicleNo || batch.vehicleNo || '',
      students: studentIds && studentIds.length > 0 ? studentIds : (await Student.find({ batch: batch._id }).select('_id')).map(s => s._id),
      status: 'Planned',
      remarks: remarks || ''
    });

    const populated = await Schedule.findById(schedule._id).populate('students', 'studentId fullName');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update schedule (e.g. Mark Done, Cancel, or change timings)
// @route   PUT /api/batches/:id/schedules/:scheduleId
const updateBatchSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);
    if (!schedule) {
      res.status(404);
      throw new Error('Schedule not found');
    }

    const updated = await Schedule.findByIdAndUpdate(
      req.params.scheduleId,
      req.body,
      { new: true }
    ).populate('students', 'studentId fullName');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete schedule
// @route   DELETE /api/batches/:id/schedules/:scheduleId
const deleteBatchSchedule = async (req, res, next) => {
  try {
    await Schedule.findByIdAndDelete(req.params.scheduleId);
    res.json({ message: 'Schedule removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

// @desc    Get attendance records for a batch
// @route   GET /api/batches/:id/attendance
const getBatchAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    const query = { batch: req.params.id };

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('student', 'studentId fullName primaryMobile');

    res.json(attendances);
  } catch (error) {
    next(error);
  }
};

// @desc    Record batch attendance for multiple students
// @route   POST /api/batches/:id/attendance
const recordBatchAttendance = async (req, res, next) => {
  try {
    const { date, classType = 'Road & H', instructor, scheduleId, records = [] } = req.body;
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    if (!records || records.length === 0) {
      res.status(400);
      throw new Error('No attendance records provided.');
    }

    const attendanceDate = date ? new Date(date) : new Date();
    const savedRecords = [];

    for (const rec of records) {
      if (!rec.studentId) continue;

      // Upsert attendance for student on this date and batch
      const startOfDay = new Date(new Date(attendanceDate).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(attendanceDate).setHours(23, 59, 59, 999));

      let att = await Attendance.findOne({
        student: rec.studentId,
        batch: batch._id,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (att) {
        att.status = rec.status || 'Present';
        att.remarks = rec.remarks || '';
        att.classType = classType;
        att.instructor = instructor || batch.instructor;
        if (scheduleId) att.schedule = scheduleId;
        await att.save();
      } else {
        att = await Attendance.create({
          student: rec.studentId,
          batch: batch._id,
          schedule: scheduleId || undefined,
          date: attendanceDate,
          status: rec.status || 'Present',
          classType,
          instructor: instructor || batch.instructor,
          remarks: rec.remarks || ''
        });
      }
      savedRecords.push(att);

      // If present, optionally log class session to Class model if none exists for today
      if (rec.status === 'Present') {
        const existingClass = await Class.findOne({
          student: rec.studentId,
          classDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!existingClass) {
          await Class.create({
            student: rec.studentId,
            classDate: attendanceDate,
            instructor: instructor || batch.instructor || 'Jasim',
            vehicleNo: batch.vehicleNo || 'KL-01-AB-1234',
            trainingType: classType,
            km: 10,
            hours: 1,
            notes: `Recorded via Batch Attendance (${batch.name})`
          });
        }
      }
    }

    // If linked to a schedule, mark it Done
    if (scheduleId) {
      await Schedule.findByIdAndUpdate(scheduleId, { status: 'Done' });
    }

    res.status(201).json({
      message: `Recorded attendance for ${savedRecords.length} students.`,
      records: savedRecords
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBatchStats,
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  assignStudentToBatch,
  removeStudentFromBatch,
  transferStudentFromBatch,
  getBatchSchedules,
  createBatchSchedule,
  updateBatchSchedule,
  deleteBatchSchedule,
  getBatchAttendance,
  recordBatchAttendance
};
