const { getSampleMigrationData, runSampleMigration } = require('../utils/migrationTool');

// @desc    Preview Phase 1 sample migration data without writing to database
// @route   GET /api/migration/sample-preview
const previewSample = async (req, res, next) => {
  try {
    const sample = getSampleMigrationData(10);
    res.json({
      success: true,
      message: 'Phase 1 Sample Migration Preview (10 records from legacy backup)',
      sampleSize: sample.length,
      data: sample
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Execute safe Phase 1 sample migration of 10 students
// @route   POST /api/migration/sample-execute
const executeSample = async (req, res, next) => {
  try {
    const { sampleSize = 10 } = req.body;
    const result = await runSampleMigration(sampleSize, req.user);
    res.json({
      success: true,
      message: `Phase 1 Sample Migration Complete: ${result.migratedStudents} students, ${result.migratedApplications} applications, ${result.migratedPayments} payments created.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  previewSample,
  executeSample
};
