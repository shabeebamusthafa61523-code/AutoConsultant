const Class = require('../models/Class');
const Student = require('../models/Student');

// @desc    Get classes (optionally filter by student or date)
// @route   GET /api/classes
const getClasses = async (req, res, next) => {
  try {
    const { student, date } = req.query;
    let query = {};

    if (student) {
      query.student = student;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.classDate = { $gte: startDate, $lte: endDate };
    }

    const classes = await Class.find(query)
      .populate('student', 'studentId fullName primaryMobile vehicleType')
      .sort({ classDate: -1, createdAt: -1 });

    res.json(classes);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single class by ID
// @route   GET /api/classes/:id
const getClassById = async (req, res, next) => {
  try {
    const classRecord = await Class.findById(req.params.id).populate('student');

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
    const { student } = req.body;
    const studentExists = await Student.findById(student);
    if (!studentExists) {
      res.status(404);
      throw new Error('Selected student does not exist');
    }

    const classRecord = await Class.create(req.body);
    const populatedClass = await Class.findById(classRecord._id).populate('student', 'studentId fullName primaryMobile vehicleType');

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

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('student', 'studentId fullName primaryMobile vehicleType');

    res.json(updatedClass);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete class record
// @route   DELETE /api/classes/:id
const deleteClass = async (req, res, next) => {
  try {
    const classRecord = await Class.findById(req.params.id);

    if (!classRecord) {
      res.status(404);
      throw new Error('Class record not found');
    }

    await Class.findByIdAndDelete(req.params.id);

    res.json({ message: 'Class record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass
};
