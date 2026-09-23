const Counter = require('../models/Counter');

const generateFeeId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'feeId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `FEE-${formattedSeq}`;
};

module.exports = generateFeeId;
