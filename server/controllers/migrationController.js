const {
  getSampleMigrationData,
  validateMigrationRecords,
  runDryRun,
  commitMigrationBatch,
  rollbackMigrationBatch,
  getMigrationBatches,
  runSampleMigration
} = require('../utils/migrationTool');

// @desc    Preview Phase 1 sample migration data without writing to database
// @route   GET /api/migration/sample-preview
const previewSample = async (req, res, next) => {
  try {
    const { sampleSize = 10 } = req.query;
    const sample = getSampleMigrationData(Number(sampleSize));
    res.json({
      success: true,
      message: `Phase 1 Sample Migration Preview (${sample.length} records from legacy backup)`,
      sampleSize: sample.length,
      data: sample
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate records and check for duplicates without database writes
// @route   POST /api/migration/validate
const validateData = async (req, res, next) => {
  try {
    const { records = [], sampleSize = 10 } = req.body;
    const dataToValidate = records.length > 0 ? records : getSampleMigrationData(Number(sampleSize));
    const validation = await validateMigrationRecords(dataToValidate);
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run full dry-run simulation of migration without writing to database
// @route   POST /api/migration/dry-run
const dryRun = async (req, res, next) => {
  try {
    const { sampleSize = 10, records = null } = req.body;
    const report = await runDryRun(Number(sampleSize), records);
    res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Commit migration batch with tracking batch ID and audit log
// @route   POST /api/migration/commit
const commitBatch = async (req, res, next) => {
  try {
    const { sampleSize = 10, records = null, batchId = null } = req.body;
    const result = await commitMigrationBatch({
      sampleSize: Number(sampleSize),
      customRecords: records,
      user: req.user,
      batchId,
      migrationStatus: 'Committed'
    });
    res.json({
      success: true,
      message: `Migration Batch committed successfully. Created ${result.migratedStudents} students, ${result.migratedApplications} applications, ${result.migratedPayments} payments.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Execute safe Phase 1 sample migration of 10 students (backward compatible)
// @route   POST /api/migration/sample-execute
const executeSample = async (req, res, next) => {
  try {
    const { sampleSize = 10 } = req.body;
    const result = await runSampleMigration(Number(sampleSize), req.user);
    res.json({
      success: true,
      message: `Phase 1 Sample Migration Complete: ${result.migratedStudents} students, ${result.migratedApplications} applications, ${result.migratedPayments} payments created.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Safely rollback / reverse a migration batch without touching organic CRM data
// @route   POST /api/migration/rollback
const rollbackBatch = async (req, res, next) => {
  try {
    const { batchId } = req.body;
    const result = await rollbackMigrationBatch({
      batchId,
      user: req.user
    });
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all migration batches in database
// @route   GET /api/migration/batches
const listBatches = async (req, res, next) => {
  try {
    const batches = await getMigrationBatches();
    res.json({
      success: true,
      batches
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  previewSample,
  validateData,
  dryRun,
  commitBatch,
  executeSample,
  rollbackBatch,
  listBatches
};
