const Vehicle = require('../models/Vehicle');
const VehicleMaintenance = require('../models/VehicleMaintenance');
const VehicleFuel = require('../models/VehicleFuel');
const Batch = require('../models/Batch');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');

// Generate Vehicle ID
const generateVehicleId = async () => {
  const count = await Vehicle.countDocuments();
  const nextNum = count + 1;
  return `VEH-${String(nextNum).padStart(3, '0')}`;
};

// Generate Maintenance ID
const generateMaintenanceId = async () => {
  const count = await VehicleMaintenance.countDocuments();
  const nextNum = count + 1;
  return `MNT-${String(nextNum).padStart(3, '0')}`;
};

// @desc    Get all vehicles with filtering & summary stats
// @route   GET /api/vehicles
const getVehicles = async (req, res, next) => {
  try {
    const { search, status, vehicleType, branch, page = 1, limit = 20, sortBy = 'vehicleNumber', sortOrder = 'asc' } = req.query;
    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { vehicleNumber: { $regex: term, $options: 'i' } },
        { vehicleId: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { model: { $regex: term, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;
    if (branch) query.branch = branch;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .populate('assignedInstructor', 'name instructorId mobile')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Dynamic compliance recount
    vehicles.forEach(v => {
      v.calculateComplianceStatuses();
    });

    res.json({
      vehicles,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vehicle by ID
// @route   GET /api/vehicles/:id
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('assignedInstructor', 'name instructorId mobile');

    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }

    vehicle.calculateComplianceStatuses();

    // Fetch recent maintenance, fuel records & training classes
    const [maintenance, fuel, activeBatches, trainingClasses] = await Promise.all([
      VehicleMaintenance.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(10),
      VehicleFuel.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(10),
      Batch.find({
        $or: [{ vehicleRef: vehicle._id }, { vehicleNo: vehicle.vehicleNumber }],
        status: 'Active'
      }),
      Class.find({
        $or: [{ vehicleRef: vehicle._id }, { vehicleNo: vehicle.vehicleNumber }]
      })
        .populate('student', 'fullName studentId primaryMobile')
        .populate('instructorRef', 'name')
        .sort({ classDate: -1 })
    ]);

    // Aggregate vehicle training statistics
    let totalTrainingKm = 0;
    let totalTrainingHours = 0;
    const studentsSet = new Set();
    let latestTrainingDate = null;

    trainingClasses.forEach(c => {
      totalTrainingKm += Number(c.km || 0);
      totalTrainingHours += Number(c.hours || 0);
      if (c.student) {
        studentsSet.add(String(c.student._id || c.student));
      }
      if (c.classDate && (!latestTrainingDate || new Date(c.classDate) > new Date(latestTrainingDate))) {
        latestTrainingDate = c.classDate;
      }
    });

    const trainingStats = {
      totalKm: totalTrainingKm,
      totalHours: totalTrainingHours,
      classesCount: trainingClasses.length,
      studentsTrained: studentsSet.size,
      latestTrainingDate
    };

    res.json({
      vehicle,
      maintenance,
      fuel,
      activeBatches,
      trainingClasses,
      trainingStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
const createVehicle = async (req, res, next) => {
  try {
    const { vehicleId, vehicleNumber, vehicleType, brand, model, assignedInstructor, branch, status, rc, insurance, fitness, tax, puc, notes } = req.body;

    if (!vehicleNumber || !vehicleNumber.trim()) {
      res.status(400);
      throw new Error('Vehicle number (registration) is required');
    }

    const cleanNum = vehicleNumber.trim().toUpperCase();
    const existing = await Vehicle.findOne({ vehicleNumber: cleanNum });
    if (existing) {
      res.status(400);
      throw new Error(`Vehicle with registration number '${cleanNum}' already exists.`);
    }

    const finalId = vehicleId && vehicleId.trim() ? vehicleId.trim() : await generateVehicleId();

    const vehicle = new Vehicle({
      ...req.body,
      vehicleId: finalId,
      vehicleNumber: cleanNum
    });

    vehicle.calculateComplianceStatuses();
    await vehicle.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'CREATE_VEHICLE',
      entity: 'Vehicle',
      entityId: vehicle._id,
      details: { vehicleNumber: vehicle.vehicleNumber, vehicleId: vehicle.vehicleId },
      req
    });

    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }

    Object.assign(vehicle, req.body);
    if (req.body.vehicleNumber) {
      vehicle.vehicleNumber = req.body.vehicleNumber.trim().toUpperCase();
    }

    vehicle.calculateComplianceStatuses();
    await vehicle.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_VEHICLE',
      entity: 'Vehicle',
      entityId: vehicle._id,
      details: { vehicleNumber: vehicle.vehicleNumber, status: vehicle.status },
      req
    });

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

// @desc    Update vehicle legal compliance registers (RC, Insurance, Fitness, Tax, PUC)
// @route   PUT /api/vehicles/:id/compliance
const updateVehicleCompliance = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }

    const { rc, insurance, fitness, tax, puc } = req.body;
    if (rc) vehicle.rc = { ...vehicle.rc, ...rc };
    if (insurance) vehicle.insurance = { ...vehicle.insurance, ...insurance };
    if (fitness) vehicle.fitness = { ...vehicle.fitness, ...fitness };
    if (tax) vehicle.tax = { ...vehicle.tax, ...tax };
    if (puc) vehicle.puc = { ...vehicle.puc, ...puc };

    vehicle.calculateComplianceStatuses();
    await vehicle.save();

    await AuditLog.logAction({
      user: req.user,
      action: 'UPDATE_VEHICLE_COMPLIANCE',
      entity: 'Vehicle',
      entityId: vehicle._id,
      details: { vehicleNumber: vehicle.vehicleNumber, updatedRegisters: Object.keys(req.body) },
      req
    });

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or decommission vehicle
// @route   DELETE /api/vehicles/:id
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }

    const activeBatches = await Batch.find({
      $or: [{ vehicleRef: vehicle._id }, { vehicleNo: vehicle.vehicleNumber }],
      status: 'Active'
    });

    if (activeBatches.length > 0) {
      res.status(400);
      throw new Error(`Vehicle is assigned to ${activeBatches.length} active batch(es). Please reassign batches or change vehicle status to Decommissioned.`);
    }

    await Vehicle.findByIdAndDelete(req.params.id);

    await AuditLog.logAction({
      user: req.user,
      action: 'DELETE_VEHICLE',
      entity: 'Vehicle',
      entityId: req.params.id,
      details: { vehicleNumber: vehicle.vehicleNumber },
      req
    });

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get maintenance logs for a vehicle
// @route   GET /api/vehicles/:id/maintenance
const getVehicleMaintenance = async (req, res, next) => {
  try {
    const records = await VehicleMaintenance.find({ vehicle: req.params.id })
      .sort({ date: -1 });
    res.json(records);
  } catch (error) {
    next(error);
  }
};

// @desc    Add maintenance record
// @route   POST /api/vehicles/:id/maintenance
const addVehicleMaintenance = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }

    const maintenanceId = await generateMaintenanceId();
    const record = await VehicleMaintenance.create({
      ...req.body,
      maintenanceId,
      vehicle: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber
    });

    if (req.body.odometer && req.body.odometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = req.body.odometer;
      await vehicle.save();
    }

    await AuditLog.logAction({
      user: req.user,
      action: 'ADD_VEHICLE_MAINTENANCE',
      entity: 'VehicleMaintenance',
      entityId: record._id,
      details: { vehicleNumber: vehicle.vehicleNumber, maintenanceType: record.maintenanceType, cost: record.cost },
      req
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Get fuel logs for a vehicle
// @route   GET /api/vehicles/:id/fuel
const getVehicleFuel = async (req, res, next) => {
  try {
    const records = await VehicleFuel.find({ vehicle: req.params.id })
      .sort({ date: -1 });

    const totalFuelCost = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalFuelQty = records.reduce((sum, r) => sum + (r.fuelQty || 0), 0);

    res.json({
      records,
      summary: {
        totalFuelCost,
        totalFuelQty,
        totalEntries: records.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add fuel log
// @route   POST /api/vehicles/:id/fuel
const addVehicleFuel = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found');
    }

    const record = await VehicleFuel.create({
      ...req.body,
      vehicle: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber
    });

    if (req.body.mileage && req.body.mileage > vehicle.currentOdometer) {
      vehicle.currentOdometer = req.body.mileage;
      await vehicle.save();
    }

    await AuditLog.logAction({
      user: req.user,
      action: 'ADD_VEHICLE_FUEL',
      entity: 'VehicleFuel',
      entityId: record._id,
      details: { vehicleNumber: vehicle.vehicleNumber, fuelQty: record.fuelQty, amount: record.amount },
      req
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiry alerts across all vehicles
// @route   GET /api/vehicles/alerts/expiries
const getVehicleComplianceAlerts = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ status: { $ne: 'Decommissioned' } });
    const alerts = [];

    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    vehicles.forEach(v => {
      v.calculateComplianceStatuses();

      // Check Insurance
      if (v.insurance && v.insurance.expiryDate) {
        const diff = new Date(v.insurance.expiryDate) - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          alerts.push({
            vehicleId: v.vehicleId,
            vehicleNumber: v.vehicleNumber,
            type: 'Insurance',
            expiryDate: v.insurance.expiryDate,
            daysLeft,
            status: daysLeft <= 0 ? 'Expired' : 'Renewal Due',
            company: v.insurance.insuranceCompany,
            policyNumber: v.insurance.policyNumber,
            contact: v.insurance.contact
          });
        }
      }

      // Check Fitness
      if (v.fitness && v.fitness.expiryDate) {
        const diff = new Date(v.fitness.expiryDate) - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          alerts.push({
            vehicleId: v.vehicleId,
            vehicleNumber: v.vehicleNumber,
            type: 'Fitness Certificate',
            expiryDate: v.fitness.expiryDate,
            daysLeft,
            status: daysLeft <= 0 ? 'Expired' : 'Renewal Due',
            certNo: v.fitness.fitnessCertificateNumber
          });
        }
      }

      // Check Tax
      if (v.tax && v.tax.nextDueDate) {
        const diff = new Date(v.tax.nextDueDate) - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          alerts.push({
            vehicleId: v.vehicleId,
            vehicleNumber: v.vehicleNumber,
            type: 'Road Tax',
            expiryDate: v.tax.nextDueDate,
            daysLeft,
            status: daysLeft <= 0 ? 'Overdue' : 'Due Soon',
            taxType: v.tax.taxType
          });
        }
      }

      // Check PUC
      if (v.puc && v.puc.expiryDate) {
        const diff = new Date(v.puc.expiryDate) - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          alerts.push({
            vehicleId: v.vehicleId,
            vehicleNumber: v.vehicleNumber,
            type: 'PUC / Pollution',
            expiryDate: v.puc.expiryDate,
            daysLeft,
            status: daysLeft <= 0 ? 'Expired' : 'Expiring Soon',
            pucNumber: v.puc.pucNumber
          });
        }
      }
    });

    alerts.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json({
      totalAlerts: alerts.length,
      expiredCount: alerts.filter(a => a.daysLeft <= 0).length,
      upcomingCount: alerts.filter(a => a.daysLeft > 0).length,
      alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check vehicle availability & compliance warnings for class assignment
// @route   POST /api/vehicles/check-availability
const checkVehicleAvailability = async (req, res, next) => {
  try {
    const { vehicleNumber, vehicleId, date } = req.body;
    const query = {};
    if (vehicleId) query._id = vehicleId;
    else if (vehicleNumber) query.vehicleNumber = vehicleNumber.trim().toUpperCase();

    const vehicle = await Vehicle.findOne(query);
    if (!vehicle) {
      return res.status(404).json({ available: false, reason: 'Vehicle not found.' });
    }

    if (vehicle.status !== 'Active') {
      return res.json({
        available: false,
        reason: `Vehicle ${vehicle.vehicleNumber} is marked as '${vehicle.status}'. Cannot assign to training sessions.`
      });
    }

    vehicle.calculateComplianceStatuses();
    const warnings = [];

    if (vehicle.insurance?.status === 'Expired') {
      warnings.push(`Insurance has expired on ${new Date(vehicle.insurance.expiryDate).toLocaleDateString()}`);
    }
    if (vehicle.fitness?.status === 'Expired') {
      warnings.push(`Fitness certificate expired on ${new Date(vehicle.fitness.expiryDate).toLocaleDateString()}`);
    }
    if (vehicle.puc?.status === 'Expired') {
      warnings.push(`Pollution certificate (PUC) expired on ${new Date(vehicle.puc.expiryDate).toLocaleDateString()}`);
    }

    res.json({
      available: true,
      vehicle,
      hasComplianceWarnings: warnings.length > 0,
      complianceWarnings: warnings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleCompliance,
  deleteVehicle,
  getVehicleMaintenance,
  addVehicleMaintenance,
  getVehicleFuel,
  addVehicleFuel,
  getVehicleComplianceAlerts,
  checkVehicleAvailability
};
