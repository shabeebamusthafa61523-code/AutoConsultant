import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import {
  getCourseFees,
  createCourseFee,
  updateCourseFee,
  deleteCourseFee
} from '../../services/courseFeeService';
import { Plus, Edit, Trash2, Search, Receipt } from 'lucide-react';

const CourseFeeListPage = () => {
  const [courseFees, setCourseFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    feeId: '',
    service: '',
    courseFee: '',
    govtFee: '',
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const res = await getCourseFees(params);
      setCourseFees(res || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch course fee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setEditingFee(null);
    setFormData({
      feeId: '',
      service: '',
      courseFee: '',
      govtFee: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (feeItem) => {
    setEditingFee(feeItem);
    setFormData({
      feeId: feeItem.feeId || '',
      service: feeItem.service || '',
      courseFee: feeItem.courseFee !== undefined ? feeItem.courseFee : '',
      govtFee: feeItem.govtFee !== undefined ? feeItem.govtFee : '',
      notes: feeItem.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service || formData.service.trim() === '') {
      alert('Please enter a service name.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        courseFee: Number(formData.courseFee) || 0,
        govtFee: Number(formData.govtFee) || 0
      };

      if (editingFee) {
        await updateCourseFee(editingFee._id, payload);
      } else {
        await createCourseFee(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save course fee record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteClass(deleteTarget._id); // wait deleteCourseFee
    } catch (err) {
      // call deleteCourseFee
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCourseFee(deleteTarget._id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete course fee record');
    } finally {
      setDeleting(false);
    }
  };

  // Preview total fee calculation
  const computedTotal = (Number(formData.courseFee) || 0) + (Number(formData.govtFee) || 0);

  const columns = [
    {
      header: 'Fee ID',
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {row.feeId}
        </span>
      )
    },
    {
      header: 'Service',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-sm">{row.service}</p>
          {row.notes && <p className="text-xs text-slate-400">{row.notes}</p>}
        </div>
      )
    },
    {
      header: 'Course Fee',
      cell: (row) => (
        <span className="font-medium text-slate-700">
          ₹ {Number(row.courseFee).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Govt Fee',
      cell: (row) => (
        <span className="font-medium text-slate-700">
          ₹ {Number(row.govtFee).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Total Fee',
      cell: (row) => (
        <span className="font-bold text-red-600 dark:text-red-400 text-base">
          ₹ {Number(row.totalFee).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Course Fee"
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            title="Delete Course Fee"
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
      <Navbar title="Course Fee Structure" />

      <div className="space-y-4">
        {/* Top Controls Header */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Fee ID or Service Name..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus size={18} />
            Add Course Fee
          </button>
        </div>

        {/* Content Table / Spinner / Error / Empty */}
        {loading ? (
          <LoadingSpinner message="Fetching Course Fee records from database..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
        ) : courseFees.length === 0 ? (
          <EmptyState
            title="No Course Fee records found"
            description={searchTerm ? `No fee structures match "${searchTerm}".` : "No course fee structures configured yet."}
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Add Course Fee
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={courseFees}
            emptyMessage="No course fee structures found."
          />
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFee ? `Edit Fee: ${editingFee.feeId}` : 'Add New Course Fee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fee ID (Optional)</label>
              <input
                type="text"
                value={formData.feeId}
                onChange={(e) => setFormData({ ...formData, feeId: e.target.value })}
                placeholder="Auto-generated (e.g. FEE-0001)"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono uppercase focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Service Name *</label>
              <input
                type="text"
                required
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="e.g. LMV Driving (Fresh)"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Course Fee (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.courseFee}
                onChange={(e) => setFormData({ ...formData, courseFee: e.target.value })}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Govt Fee (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.govtFee}
                onChange={(e) => setFormData({ ...formData, govtFee: e.target.value })}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Total Fee (Auto Computed)</label>
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm font-bold text-red-600 flex items-center justify-between">
                <span>₹ {computedTotal.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 font-normal">Calculated</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Description</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Includes simulator training & RTO fee"
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
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md shadow-sm transition"
            >
              {submitting ? 'Saving...' : editingFee ? 'Update Course Fee' : 'Save Course Fee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        isLoading={deleting}
        message={`Are you sure you want to delete the course fee record "${deleteTarget?.service}" (${deleteTarget?.feeId})?`}
      />
    </MainLayout>
  );
};

export default CourseFeeListPage;
