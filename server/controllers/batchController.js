const Batch = require('../models/Batch');
const Student = require('../models/Student');

// @desc    Get all batches with dynamic enrolled student count
// @route   GET /api/batches
const getBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });

    // Calculate dynamic enrolled count for each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (batch) => {
        const studentCount = await Student.countDocuments({ batch: batch._id });
        return {
          ...batch.toObject(),
          enrolledCount: studentCount
        };
      })
    );

    res.json(batchesWithCount);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single batch with enrolled students
// @route   GET /api/batches/:id
const getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    const students = await Student.find({ batch: batch._id }).select('studentId fullName primaryMobile vehicleType currentStatus');

    res.json({
      ...batch.toObject(),
      enrolledCount: students.length,
      students
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new batch
// @route   POST /api/batches
const createBatch = async (req, res, next) => {
  try {
    const batch = await Batch.create(req.body);
    res.status(201).json({
      ...batch.toObject(),
      enrolledCount: 0
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

// @desc    Delete batch
// @route   DELETE /api/batches/:id
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      res.status(404);
      throw new Error('Batch not found');
    }

    // Unassign students from this batch
    await Student.updateMany({ batch: batch._id }, { $unset: { batch: '' } });
    await Batch.findByIdAndDelete(req.params.id);

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
};
