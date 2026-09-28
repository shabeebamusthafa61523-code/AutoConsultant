const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/vehicleController');

router.use(protect);

router.route('/')
  .get(getVehicles)
  .post(authorize('Superadmin', 'Admin'), createVehicle);

router.get('/alerts/expiries', getVehicleComplianceAlerts);
router.post('/check-availability', checkVehicleAvailability);

router.route('/:id')
  .get(getVehicleById)
  .put(authorize('Superadmin', 'Admin'), updateVehicle)
  .delete(authorize('Superadmin'), deleteVehicle);

router.put('/:id/compliance', authorize('Superadmin', 'Admin'), updateVehicleCompliance);

router.route('/:id/maintenance')
  .get(getVehicleMaintenance)
  .post(authorize('Superadmin', 'Admin'), addVehicleMaintenance);

router.route('/:id/fuel')
  .get(getVehicleFuel)
  .post(authorize('Superadmin', 'Admin'), addVehicleFuel);

module.exports = router;
