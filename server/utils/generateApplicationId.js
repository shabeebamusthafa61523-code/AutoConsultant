const Counter = require('../models/Counter');

/**
 * Atomically generates next sequential Application ID: APP-0001, APP-0002, etc.
 */
const generateApplicationId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'applicationId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `APP-${formattedSeq}`;
};

module.exports = generateApplicationId;
