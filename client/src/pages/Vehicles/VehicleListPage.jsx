import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleComplianceAlerts
} from '../../services/vehicleService';
import { getInstructors } from '../../services/instructorService';
import {
  Car,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Fuel,
  ShieldCheck,
  Calendar
} from 'lucide-react';

const VehicleListPage = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState({ totalAlerts: 0, expiredCount: 0, upcomingCount: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    vehicleNumber: '',
    vehicleType: 'LMV',
    brand: 'Maruti Suzuki',
    model: 'Alto',
    assignedInstructor: '',
    branch: 'West Kodur',
    status: 'Active',
    fuelType: 'Petrol',
    currentOdometer: 0,
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehicles = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pageToLoad,
        limit: 15
      };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;
      if (selectedType) params.vehicleType = selectedType;

      const [res, alertRes, insRes] = await Promise.all([
        getVehicles(params),
        getVehicleComplianceAlerts().catch(() => ({ totalAlerts: 0, expiredCount: 0 })),
        getInstructors({ limit: 100 }).catch(() => ({ instructors: [] }))
      ]);

      if (res && res.vehicles) {
        setVehicles(res.vehicles);
        setPagination(res.pagination || { page: pageToLoad, limit: 15, total: res.vehicles.length, totalPages: 1 });
      } else {
        setVehicles([]);
      }

      if (alertRes) setAlertsSummary(alertRes);
      if (insRes?.instructors) setInstructors(insRes.instructors);
    } catch (err) {
      setError(err.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedType]);

  useEffect(() => {
    fetchVehicles(1);
  }, [fetchVehicles]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVehicles(1);
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      vehicleId: '',
      vehicleNumber: '',
      vehicleType: 'LMV',
      brand: 'Maruti Suzuki',
      model: 'Alto',
      assignedInstructor: '',
      branch: 'West Kodur',
      status: 'Active',
      fuelType: 'Petrol',
      currentOdometer: 0,
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVehicle(v);
    setFormData({
      vehicleId: v.vehicleId || '',
      vehicleNumber: v.vehicleNumber || '',
      vehicleType: v.vehicleType || 'LMV',
      brand: v.brand || 'Maruti Suzuki',
      model: v.model || 'Alto',
      assignedInstructor: v.assignedInstructor?._id || v.assignedInstructor || '',
      branch: v.branch || 'West Kodur',
      status: v.status || 'Active',
      fuelType: v.fuelType || 'Petrol',
      currentOdometer: v.currentOdometer || 0,
      notes: v.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingVehicle) {
        await updateVehicle(editingVehicle._id, formData);
      } else {
        await createVehicle(formData);
      }
      setModalOpen(false);
      fetchVehicles(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteVehicle(deleteTarget._id);
      setDeleteTarget(null);
      fetchVehicles(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete vehicle');
    } finally {
      setDeleting(false);
    }
  };

  const totalCount = pagination.total || vehicles.length;
  const activeCount = vehicles.filter(v => v.status === 'Active').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'Maintenance').length;

  const columns = [
    {
      header: 'Vehicle Identity',
      accessor: 'vehicleNumber',
      cell: (row) => (
        <div>
          <button
            onClick={() => navigate(`/vehicles/${row._id}`)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 text-left transition font-mono tracking-wide"
          >
            {row.vehicleNumber}
          </button>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {row.vehicleId}
            </span>
            <span>•</span>
            <span>{row.brand} {row.model}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Type & Branch',
      accessor: 'vehicleType',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.vehicleType}</div>
          <div className="text-slate-400 text-[11px]">{row.branch}</div>
        </div>
      )
    },
    {
      header: 'Assigned Instructor',
      accessor: 'assignedInstructor',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.assignedInstructor?.name || row.assignedInstructorName || 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Legal Compliance Status',
      accessor: 'rc',
      cell: (row) => {
        const rcOk = row.rc?.status === 'Valid';
        const insOk = row.insurance?.status === 'Valid';
        const fitOk = row.fitness?.status === 'Valid';
        const pucOk = row.puc?.status === 'Valid';
        const hasWarning = !rcOk || !insOk || !fitOk || !pucOk;

        return (
          <div className="flex items-center gap-1.5">
            <span
              title={`RC: ${row.rc?.status || 'Valid'}`}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                rcOk ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              RC
            </span>
            <span
              title={`Insurance: ${row.insurance?.status || 'Valid'}`}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                insOk ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              INS
            </span>
            <span
              title={`Fitness: ${row.fitness?.status || 'Valid'}`}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                fitOk ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              FC
            </span>
            <span
              title={`PUC: ${row.puc?.status || 'Valid'}`}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                pucOk ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              PUC
            </span>
            {hasWarning && (
              <AlertTriangle size={14} className="text-amber-500 ml-1" title="Action required on compliance" />
            )}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <Badge value={row.status} />
    },
    {
      header: 'Actions',
      accessor: '_id',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/vehicles/${row._id}`)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
            title="View Details & Compliance"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition"
            title="Edit Vehicle"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
            title="Delete / Decommission"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Vehicle Master & Asset Management" subtitle="Fleet inventory, RTO compliance registers, maintenance logs, and fuel tracking" />

      <div className="p-6 space-y-6">
        {/* Fleet Legal Expiry Alert Banner */}
        {alertsSummary.totalAlerts > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg flex items-center justify-between text-amber-900 dark:text-amber-200 text-sm shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Vehicle Legal Expiry Alert: </span>
                <span>
                  {alertsSummary.expiredCount} document(s) expired, {alertsSummary.upcomingCount} renewal(s) due soon across the fleet. Check individual vehicle records below for details.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Fleet"
            value={totalCount}
            icon={Car}
            color="red"
            description="All registered training vehicles"
          />
          <StatCard
            title="Active in Service"
            value={activeCount}
            icon={CheckCircle2}
            color="emerald"
            description="Available for practical classes"
          />
          <StatCard
            title="Under Maintenance"
            value={maintenanceCount}
            icon={Wrench}
            color="amber"
            description="Service / repairs ongoing"
          />
          <StatCard
            title="Compliance Alerts"
            value={alertsSummary.totalAlerts}
            icon={ShieldCheck}
            color={alertsSummary.expiredCount > 0 ? 'red' : 'blue'}
            description="Insurance, FC, Tax, PUC actions"
          />
        </div>

        {/* Action Header & Search */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by reg number, brand, model..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100 font-mono"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
            >
              <option value="">All Types</option>
              <option value="LMV">LMV (4 Wheeler)</option>
              <option value="Motorcycle Training">Motorcycle Training</option>
              <option value="2 Wheeler">2 Wheeler</option>
              <option value="3 Wheeler">3 Wheeler</option>
              <option value="Heavy">Heavy</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-md text-sm font-medium transition"
            >
              Filter
            </button>
          </form>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow-sm transition"
          >
            <Plus size={16} />
            <span>Add Vehicle</span>
          </button>
        </div>

        {/* Content Section */}
        {error && <ErrorMessage message={error} onRetry={() => fetchVehicles(1)} />}

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles found"
            description="Add training vehicles or adjust search filters to view records."
            actionLabel="Add First Vehicle"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="space-y-4">
            <DataTable columns={columns} data={vehicles} />
            {pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPageChange={(p) => fetchVehicles(p)}
              />
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? 'Edit Vehicle Master Details' : 'Add New Training Vehicle'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle ID
              </label>
              <input
                type="text"
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                placeholder="e.g. VEH-001 (Auto if blank)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Registration Number *
              </label>
              <input
                type="text"
                required
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. KL-10-AB-5265"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Type *
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="LMV">LMV (4 Wheeler)</option>
                <option value="Motorcycle Training">Motorcycle Training</option>
                <option value="2 Wheeler">2 Wheeler</option>
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="Both">Both (2 & 4 Wheeler)</option>
                <option value="3 Wheeler">3 Wheeler</option>
                <option value="Heavy">Heavy Vehicle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Maruti Suzuki, Hero"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. Alto, WagonR, Splendor"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Instructor
              </label>
              <select
                value={formData.assignedInstructor}
                onChange={(e) => setFormData({ ...formData, assignedInstructor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Unassigned</option>
                {instructors.map(ins => (
                  <option key={ins._id} value={ins._id}>
                    {ins.name} ({ins.instructorId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Operating Branch
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="e.g. West Kodur"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fuel Type
              </label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Odometer (KM)
              </label>
              <input
                type="number"
                value={formData.currentOdometer}
                onChange={(e) => setFormData({ ...formData, currentOdometer: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Vehicle Notes & Accessories
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dual controls, registration remarks..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow flex items-center gap-2"
            >
              {submitting && <LoadingSpinner size="sm" />}
              <span>{editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Decommission Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Vehicle"
        message={`Are you sure you want to remove vehicle ${deleteTarget?.vehicleNumber}? If this vehicle has active batch assignments or maintenance history, consider changing status to Decommissioned.`}
      />
    </MainLayout>
  );
};

export default VehicleListPage;
