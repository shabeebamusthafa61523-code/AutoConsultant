import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { getBatches, getBatchStats, createBatch, updateBatch, deleteBatch } from '../../services/batchService';
import { getUsers } from '../../services/userService';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  Search,
  Filter,
  Calendar,
  Clock,
  Layers,
  CheckCircle,
  Clock3
} from 'lucide-react';

const BatchListPage = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    totalBatches: 0,
    activeBatches: 0,
    upcomingBatches: 0,
    completedBatches: 0,
    studentsInActiveBatches: 0
  });
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  // Modal State for Add / Edit Batch
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '',
    name: '',
    courseLicenceType: 'LMV - 4 Wheeler',
    vehicleType: '4 Wheeler',
    session: 'Morning',
    instructor: '',
    secondaryInstructor: '',
    vehicleNo: 'KL-01-AB-1234',
    startDate: '',
    endDate: '',
    startTime: '07:00 AM',
    endTime: '08:30 AM',
    maxStudents: 15,
    status: 'Active',
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBatchesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;
      if (selectedSession) params.session = selectedSession;

      const [data, statsRes, userRes] = await Promise.all([
        getBatches(params),
        getBatchStats(),
        instructors.length > 0 ? Promise.resolve(instructors) : getUsers()
      ]);

      setBatches(data || []);
      if (statsRes) setStats(statsRes);

      if (instructors.length === 0 && Array.isArray(userRes)) {
        const eligible = userRes.filter(u => u.role !== 'Superadmin');
        setInstructors(eligible);
      }
    } catch (err) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchesData();
  }, [selectedStatus, selectedSession]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBatchesData();
  };

  const handleOpenAddModal = () => {
    setEditingBatch(null);
    setFormData({
      batchNumber: `BATCH-${batches.length + 1}`,
      name: '',
      courseLicenceType: 'LMV - 4 Wheeler',
      vehicleType: '4 Wheeler',
      session: 'Morning',
      instructor: instructors[0]?.name || 'Jasim',
      secondaryInstructor: '',
      vehicleNo: 'KL-01-AB-1234',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      startTime: '07:00 AM',
      endTime: '08:30 AM',
      maxStudents: 15,
      status: 'Active',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batchNumber: batch.batchNumber || '',
      name: batch.name || '',
      courseLicenceType: batch.courseLicenceType || 'LMV - 4 Wheeler',
      vehicleType: batch.vehicleType || '4 Wheeler',
      session: batch.session || 'Morning',
      instructor: batch.instructor || 'Unassigned',
      secondaryInstructor: batch.secondaryInstructor || '',
      vehicleNo: batch.vehicleNo || '',
      startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
      endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : '',
      startTime: batch.startTime || '07:00 AM',
      endTime: batch.endTime || '08:30 AM',
      maxStudents: batch.maxStudents || 15,
      status: batch.status || 'Active',
      notes: batch.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Batch Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingBatch) {
        await updateBatch(editingBatch._id, formData);
      } else {
        await createBatch(formData);
      }
      setModalOpen(false);
      fetchBatchesData();
    } catch (err) {
      alert(err.message || 'Failed to save batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteBatch(deleteTarget._id);
      setDeleteTarget(null);
      fetchBatchesData();
    } catch (err) {
      alert(err.message || 'Failed to delete batch');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Batch & Session',
      cell: (row) => (
        <div>
          <button
            onClick={() => navigate(`/batches/${row._id}`)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 text-left transition"
          >
            {row.name}
          </button>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="font-mono text-red-600 dark:text-red-400 font-bold">{row.batchNumber || 'BATCH'}</span>
            <span>&bull;</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{row.session} Session</span>
          </div>
        </div>
      )
    },
    {
      header: 'Course / Vehicle',
      cell: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{row.courseLicenceType}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.vehicleType}</span>
        </div>
      )
    },
    {
      header: 'Timings',
      cell: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-medium">
          {row.startTime} - {row.endTime}
        </span>
      )
    },
    {
      header: 'Instructor',
      cell: (row) => (
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{row.instructor || 'Unassigned'}</span>
          {row.secondaryInstructor && (
            <span className="text-[10px] text-slate-400">Sec: {row.secondaryInstructor}</span>
          )}
        </div>
      )
    },
    {
      header: 'Enrolment & Progress',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-700 dark:text-indigo-400">
            <Users size={13} />
            <span>{row.enrolledCount || 0} / {row.maxStudents || 15} Students</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
            <span className="text-emerald-600 font-semibold">{row.activeCount || 0} Active</span>
            <span>&bull;</span>
            <span className="text-blue-600 font-semibold">{row.completedCount || 0} Passed</span>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => <Badge type="status" value={row.status || 'Active'} />
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/batches/${row._id}`)}
            title="View Operational Dashboard"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Batch"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            title="Delete Batch"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="BENZ Driving Batches" />

      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* Top Summary Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Batches</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.totalBatches}</p>
            <p className="text-[11px] text-slate-400 mt-1">Managed in CRM</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Active Batches</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeBatches}</p>
            <p className="text-[11px] text-slate-400 mt-1">In Daily Driving</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Upcoming Batches</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.upcomingBatches}</p>
            <p className="text-[11px] text-slate-400 mt-1">Enrolling Now</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completed</span>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{stats.completedBatches}</p>
            <p className="text-[11px] text-slate-400 mt-1">Concluded</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Enrolled Active</span>
            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{stats.studentsInActiveBatches}</p>
            <p className="text-[11px] text-slate-400 mt-1">Active Students</p>
          </div>
        </div>

        {/* Control Bar: Search, Filters & Add Batch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch by name, instructor, or number..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-md transition"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Session Filter */}
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
            >
              <option value="">All Sessions</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Weekend">Weekend</option>
            </select>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus size={16} />
              Add Batch
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingSpinner message="Fetching batch records from MongoDB..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchBatchesData} />
        ) : batches.length === 0 ? (
          <EmptyState
            title="No batches found"
            description={search || selectedStatus || selectedSession ? "No batches match your filter criteria." : "There are currently no training batches configured."}
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={16} />
                + Add Batch
              </button>
            }
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <DataTable
              columns={columns}
              data={batches}
              emptyMessage="No batches found."
            />
          </div>
        )}
      </div>

      {/* ADD / EDIT BATCH MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingBatch ? `Edit Batch: ${editingBatch.name}` : 'Create New Training Batch'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Batch Number</label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="e.g. BATCH-1"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Batch Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Morning Batch 1 - West Kodur"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Session</label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Weekend">Weekend</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Course / Licence</label>
              <input
                type="text"
                value={formData.courseLicenceType}
                onChange={(e) => setFormData({ ...formData, courseLicenceType: e.target.value })}
                placeholder="e.g. LMV+MCWG"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Vehicle Type</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
                <option value="Both">Both (2 & 4 Wheeler)</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Lead Instructor *</label>
              <select
                required
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
              >
                <option value="">-- Choose Instructor --</option>
                {instructors.map((u) => (
                  <option key={u._id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Secondary Instructor</label>
              <input
                type="text"
                value={formData.secondaryInstructor}
                onChange={(e) => setFormData({ ...formData, secondaryInstructor: e.target.value })}
                placeholder="e.g. Noushad, Ashraf"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Assigned Vehicle No</label>
              <input
                type="text"
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                placeholder="KL-01-AB-1234"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Time</label>
              <input
                type="text"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="e.g. 07:00 AM"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Time</label>
              <input
                type="text"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="e.g. 08:30 AM"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Max Capacity</label>
              <input
                type="number"
                min="1"
                value={formData.maxStudents}
                onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Batch Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-bold"
              >
                <option value="Active">Active</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Remarks / Location Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. West Kodur Ground, regular morning slot"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-sm"
            >
              {submitting ? 'Saving...' : editingBatch ? 'Update Batch' : 'Save Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={`Are you sure you want to delete batch "${deleteTarget?.name}"? Enrolled students will become unassigned.`}
      />
    </MainLayout>
  );
};

export default BatchListPage;
