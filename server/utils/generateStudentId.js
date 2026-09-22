const Counter = require('../models/Counter');

const generateStudentId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'studentId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `STU-${formattedSeq}`;
};

module.exports = generateStudentId;
