const Counter = require('../models/Counter');

const generateComplaintId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'complaintId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `CMP-${formattedSeq}`;
};

module.exports = generateComplaintId;
