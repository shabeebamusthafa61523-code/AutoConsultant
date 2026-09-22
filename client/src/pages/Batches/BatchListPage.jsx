import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { getBatches, createBatch, updateBatch, deleteBatch } from '../../services/batchService';
import { Plus, Eye, Edit, Trash2, Users } from 'lucide-react';

const BatchListPage = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for Add / Edit Batch
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    courseLicenceType: 'LMV - 4 Wheeler',
    vehicleType: '4 Wheeler',
    instructor: 'Unassigned',
    startDate: '',
    endDate: '',
    startTime: '07:00 AM',
    endTime: '08:30 AM',
    maxStudents: 20,
    status: 'Active',
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBatches();
      setBatches(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBatch(null);
    setFormData({
      name: '',
      courseLicenceType: 'LMV - 4 Wheeler',
      vehicleType: '4 Wheeler',
      instructor: 'Unassigned',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      startTime: '07:00 AM',
      endTime: '08:30 AM',
      maxStudents: 20,
      status: 'Active',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name || '',
      courseLicenceType: batch.courseLicenceType || 'LMV - 4 Wheeler',
      vehicleType: batch.vehicleType || '4 Wheeler',
      instructor: batch.instructor || 'Unassigned',
      startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
      endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : '',
      startTime: batch.startTime || '07:00 AM',
      endTime: batch.endTime || '08:30 AM',
      maxStudents: batch.maxStudents || 20,
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
      fetchBatches();
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
      fetchBatches();
    } catch (err) {
      alert(err.message || 'Failed to delete batch');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Batch Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400">{row.courseLicenceType}</p>
        </div>
      )
    },
    {
      header: 'Vehicle Type',
      cell: (row) => <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-medium">{row.vehicleType}</span>
    },
    { header: 'Instructor', accessor: 'instructor' },
    {
      header: 'Timings',
      cell: (row) => (
        <span className="text-xs text-slate-600 font-mono">
          {row.startTime} - {row.endTime}
        </span>
      )
    },
    {
      header: 'Enrolled Students',
      cell: (row) => (
        <div className="flex items-center gap-1.5 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded w-fit text-xs">
          <Users size={14} />
          <span>{row.enrolledCount !== undefined ? row.enrolledCount : 0} / {row.maxStudents || 20} Students</span>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => {
        const statusColors = {
          Active: 'bg-emerald-100 text-emerald-800',
          Upcoming: 'bg-blue-100 text-blue-800',
          Completed: 'bg-slate-200 text-slate-700',
          Inactive: 'bg-rose-100 text-rose-800'
        };
        return (
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[row.status] || statusColors.Active}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/batches/${row._id}`)}
            title="View Batch Details"
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Batch"
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            title="Delete Batch"
            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Batches Management" />

      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">All Training Batches & Enrolment</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={18} />
            Add Batch
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching batches from database..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchBatches} />
        ) : batches.length === 0 ? (
          <EmptyState
            title="No batches found"
            description="No training batches created in MongoDB yet."
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Add Batch
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={batches}
            emptyMessage="No batches found."
          />
        )}
      </div>

      {/* ADD / EDIT BATCH MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingBatch ? 'Edit Batch' : 'Add New Batch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Batch Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Batch A - Morning LMV"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Course / Licence Type</label>
              <input
                type="text"
                value={formData.courseLicenceType}
                onChange={(e) => setFormData({ ...formData, courseLicenceType: e.target.value })}
                placeholder="e.g. LMV - 4 Wheeler"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Type</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
                <option value="Both">Both (2 & 4 Wheeler)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Instructor</label>
              <input
                type="text"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="Instructor Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Students</label>
              <input
                type="number"
                min="1"
                value={formData.maxStudents}
                onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time</label>
              <input
                type="text"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="e.g. 07:00 AM"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Time</label>
              <input
                type="text"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="e.g. 08:30 AM"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Active">Active</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes or comments"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md"
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
