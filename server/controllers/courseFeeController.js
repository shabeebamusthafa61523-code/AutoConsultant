const CourseFee = require('../models/CourseFee');
const generateFeeId = require('../utils/generateFeeId');

// @desc    Get all course fees (with optional search filter)
// @route   GET /api/course-fees
const getCourseFees = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { service: { $regex: search, $options: 'i' } },
          { feeId: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const courseFees = await CourseFee.find(query).sort({ createdAt: -1 });
    res.json(courseFees);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course fee by ID
// @route   GET /api/course-fees/:id
const getCourseFeeById = async (req, res, next) => {
  try {
    const feeRecord = await CourseFee.findById(req.params.id);

    if (!feeRecord) {
      res.status(404);
      throw new Error('Course fee record not found');
    }

    res.json(feeRecord);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new course fee record
// @route   POST /api/course-fees
const createCourseFee = async (req, res, next) => {
  try {
    const { service, courseFee, govtFee, notes } = req.body;

    if (!service || service.trim() === '') {
      res.status(400);
      throw new Error('Service name is required');
    }

    let feeId = req.body.feeId ? req.body.feeId.trim().toUpperCase() : '';
    if (!feeId) {
      feeId = await generateFeeId();
    } else {
      // Check uniqueness if custom feeId provided
      const existing = await CourseFee.findOne({ feeId });
      if (existing) {
        res.status(400);
        throw new Error(`Fee ID "${feeId}" already exists.`);
      }
    }

    const courseFeeNum = Number(courseFee) || 0;
    const govtFeeNum = Number(govtFee) || 0;
    const totalFeeNum = courseFeeNum + govtFeeNum;

    const newCourseFee = await CourseFee.create({
      feeId,
      service: service.trim(),
      courseFee: courseFeeNum,
      govtFee: govtFeeNum,
      totalFee: totalFeeNum,
      notes: notes ? notes.trim() : ''
    });

    res.status(201).json(newCourseFee);
  } catch (error) {
    next(error);
  }
};

// @desc    Update course fee record
// @route   PUT /api/course-fees/:id
const updateCourseFee = async (req, res, next) => {
  try {
    const feeRecord = await CourseFee.findById(req.params.id);

    if (!feeRecord) {
      res.status(404);
      throw new Error('Course fee record not found');
    }

    if (req.body.feeId && req.body.feeId.trim().toUpperCase() !== feeRecord.feeId) {
      const newFeeId = req.body.feeId.trim().toUpperCase();
      const existing = await CourseFee.findOne({ feeId: newFeeId, _id: { $ne: req.params.id } });
      if (existing) {
        res.status(400);
        throw new Error(`Fee ID "${newFeeId}" is already used by another service.`);
      }
      feeRecord.feeId = newFeeId;
    }

    if (req.body.service !== undefined) feeRecord.service = req.body.service.trim();
    if (req.body.courseFee !== undefined) feeRecord.courseFee = Number(req.body.courseFee) || 0;
    if (req.body.govtFee !== undefined) feeRecord.govtFee = Number(req.body.govtFee) || 0;
    if (req.body.notes !== undefined) feeRecord.notes = req.body.notes.trim();

    feeRecord.totalFee = feeRecord.courseFee + feeRecord.govtFee;

    const updatedRecord = await feeRecord.save();
    res.json(updatedRecord);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course fee record
// @route   DELETE /api/course-fees/:id
const deleteCourseFee = async (req, res, next) => {
  try {
    const feeRecord = await CourseFee.findById(req.params.id);

    if (!feeRecord) {
      res.status(404);
      throw new Error('Course fee record not found');
    }

    await CourseFee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course fee record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourseFees,
  getCourseFeeById,
  createCourseFee,
  updateCourseFee,
  deleteCourseFee
};
