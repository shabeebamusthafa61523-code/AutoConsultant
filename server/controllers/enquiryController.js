const Enquiry = require('../models/Enquiry');
const Student = require('../models/Student');
const generateStudentId = require('../utils/generateStudentId');

// @desc    Get all enquiries
// @route   GET /api/enquiries
const getEnquiries = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { primaryMobile: { $regex: search, $options: 'i' } },
        { interestedLicence: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const enquiries = await Enquiry.find(query)
      .populate('preferredBatch', 'name vehicleType')
      .populate('convertedStudent', 'studentId fullName')
      .sort({ createdAt: -1 });

    res.json(enquiries);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single enquiry by ID
// @route   GET /api/enquiries/:id
const getEnquiryById = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('preferredBatch')
      .populate('convertedStudent');

    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    res.json(enquiry);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new enquiry
// @route   POST /api/enquiries
const createEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    const populatedEnquiry = await Enquiry.findById(enquiry._id).populate('preferredBatch', 'name vehicleType');

    res.status(201).json(populatedEnquiry);
  } catch (error) {
    next(error);
  }
};

// @desc    Update enquiry
// @route   PUT /api/enquiries/:id
const updateEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('preferredBatch', 'name vehicleType')
      .populate('convertedStudent', 'studentId fullName');

    res.json(updatedEnquiry);
  } catch (error) {
    next(error);
  }
};

// @desc    Convert Enquiry to Student record
// @route   POST /api/enquiries/:id/convert
const convertEnquiryToStudent = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    if (enquiry.status === 'Converted' && enquiry.convertedStudent) {
      res.status(400);
      throw new Error('Enquiry has already been converted to a student');
    }

    // Auto-generate next STU ID
    const studentId = await generateStudentId();

    // Map Enquiry fields to Student record
    const studentData = {
      studentId,
      fullName: enquiry.name,
      primaryMobile: enquiry.primaryMobile,
      alternateMobile: enquiry.alternateMobile,
      licenceServiceType: enquiry.interestedLicence || 'Fresh Licence',
      vehicleType: enquiry.vehicleType || '4 Wheeler',
      batch: enquiry.preferredBatch || undefined,
      notes: req.body.notes || enquiry.notes ? `Converted from enquiry: ${enquiry.notes || ''}` : '',
      enquiry: enquiry._id,
      totalFee: req.body.totalFee || 0,
      paidAmount: req.body.paidAmount || 0,
      advanceAmount: req.body.advanceAmount || 0,
      currentStatus: 'Active'
    };

    const newStudent = await Student.create(studentData);

    // Update enquiry record
    enquiry.status = 'Converted';
    enquiry.convertedStudent = newStudent._id;
    await enquiry.save();

    const populatedStudent = await Student.findById(newStudent._id).populate('batch');

    res.status(201).json({
      message: 'Enquiry converted to Student successfully',
      student: populatedStudent,
      enquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    await Enquiry.findByIdAndDelete(req.params.id);

    res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEnquiries,
  getEnquiryById,
  createEnquiry,
  updateEnquiry,
  convertEnquiryToStudent,
  deleteEnquiry
};
