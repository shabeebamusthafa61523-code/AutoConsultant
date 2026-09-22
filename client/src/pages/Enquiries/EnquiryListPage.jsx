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
import { getEnquiries, createEnquiry, updateEnquiry, convertEnquiryToStudent, deleteEnquiry } from '../../services/enquiryService';
import { getBatches } from '../../services/batchService';
import { Plus, Edit, Trash2, UserPlus, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

const EnquiryListPage = () => {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    primaryMobile: '',
    alternateMobile: '',
    interestedLicence: 'LMV - 4 Wheeler',
    vehicleType: '4 Wheeler',
    preferredBatch: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    followUpDate: '',
    source: 'Walk-in',
    status: 'New',
    notes: ''
  });

  // Convert to Student Modal State
  const [convertTarget, setConvertTarget] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertFeeData, setConvertFeeData] = useState({
    totalFee: 8500,
    paidAmount: 0,
    advanceAmount: 1000,
    notes: ''
  });

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (selectedStatus) params.status = selectedStatus;

      const [enqRes, batchRes] = await Promise.all([
        getEnquiries(params),
        getBatches()
      ]);

      setEnquiries(enqRes || []);
      setBatches(batchRes || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEnquiries();
  };

  const handleOpenAddModal = () => {
    setEditingEnquiry(null);
    setFormData({
      name: '',
      primaryMobile: '',
      alternateMobile: '',
      interestedLicence: 'LMV - 4 Wheeler',
      vehicleType: '4 Wheeler',
      preferredBatch: batches[0]?._id || '',
      enquiryDate: new Date().toISOString().split('T')[0],
      followUpDate: '',
      source: 'Walk-in',
      status: 'New',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (enq) => {
    setEditingEnquiry(enq);
    setFormData({
      name: enq.name || '',
      primaryMobile: enq.primaryMobile || '',
      alternateMobile: enq.alternateMobile || '',
      interestedLicence: enq.interestedLicence || 'LMV - 4 Wheeler',
      vehicleType: enq.vehicleType || '4 Wheeler',
      preferredBatch: enq.preferredBatch?._id || enq.preferredBatch || '',
      enquiryDate: enq.enquiryDate ? new Date(enq.enquiryDate).toISOString().split('T')[0] : '',
      followUpDate: enq.followUpDate ? new Date(enq.followUpDate).toISOString().split('T')[0] : '',
      source: enq.source || 'Walk-in',
      status: enq.status || 'New',
      notes: enq.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.primaryMobile.trim()) {
      alert('Name and Primary Mobile are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        preferredBatch: formData.preferredBatch || null,
        followUpDate: formData.followUpDate || null
      };

      if (editingEnquiry) {
        await updateEnquiry(editingEnquiry._id, payload);
      } else {
        await createEnquiry(payload);
      }
      setModalOpen(false);
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Failed to save enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertTarget) return;

    try {
      setConverting(true);
      const res = await convertEnquiryToStudent(convertTarget._id, {
        totalFee: Number(convertFeeData.totalFee) || 0,
        paidAmount: Number(convertFeeData.paidAmount) || 0,
        advanceAmount: Number(convertFeeData.advanceAmount) || 0,
        notes: convertFeeData.notes
      });
      setConvertTarget(null);
      fetchEnquiries();
      navigate(`/students/${res.student._id}`);
    } catch (err) {
      alert(err.message || 'Failed to convert enquiry to student');
    } finally {
      setConverting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteEnquiry(deleteTarget._id);
      setDeleteTarget(null);
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Failed to delete enquiry');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Enquiry Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400">Src: {row.source}</p>
        </div>
      )
    },
    {
      header: 'Mobile',
      cell: (row) => <span className="font-mono text-xs text-slate-700">{row.primaryMobile}</span>
    },
    {
      header: 'Interested In',
      cell: (row) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.interestedLicence} ({row.vehicleType})
        </span>
      )
    },
    {
      header: 'Preferred Batch',
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.preferredBatch?.name || 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Follow-up Date',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.followUpDate ? new Date(row.followUpDate).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => {
        const statusColors = {
          New: 'bg-amber-100 text-amber-800',
          Contacted: 'bg-blue-100 text-blue-800',
          'In Progress': 'bg-purple-100 text-purple-800',
          Converted: 'bg-emerald-100 text-emerald-800',
          Closed: 'bg-slate-200 text-slate-700'
        };
        return (
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[row.status] || statusColors.New}`}>
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
          {row.status === 'Converted' ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
              <CheckCircle2 size={14} /> Converted
            </span>
          ) : (
            <button
              onClick={() => {
                setConvertTarget(row);
                setConvertFeeData({ totalFee: 8500, paidAmount: 0, advanceAmount: 1000, notes: '' });
              }}
              title="Convert to Student"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition flex items-center gap-1"
            >
              <UserPlus size={14} /> Convert to Student
            </button>
          )}

          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Enquiry"
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            title="Delete Enquiry"
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
      <Navbar title="Student Enquiries" />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name or Mobile..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="In Progress">In Progress</option>
              <option value="Converted">Converted</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus size={18} />
              Add Enquiry
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching enquiries from MongoDB..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchEnquiries} />
        ) : enquiries.length === 0 ? (
          <EmptyState
            title="No enquiries found"
            description="There are currently no enquiry logs stored in MongoDB."
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Add Enquiry
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={enquiries}
            emptyMessage="No enquiries found."
          />
        )}
      </div>

      {/* ADD / EDIT ENQUIRY MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingEnquiry ? 'Edit Enquiry' : 'Add New Enquiry'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Applicant name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Mobile *</label>
              <input
                type="text"
                required
                value={formData.primaryMobile}
                onChange={(e) => setFormData({ ...formData, primaryMobile: e.target.value })}
                placeholder="10 digit mobile"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alternate Mobile</label>
              <input
                type="text"
                value={formData.alternateMobile}
                onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                placeholder="Alternate phone"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Walk-in">Walk-in</option>
                <option value="Phone">Phone Call</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Social Media">Social Media</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Interested Licence / Course</label>
              <input
                type="text"
                value={formData.interestedLicence}
                onChange={(e) => setFormData({ ...formData, interestedLicence: e.target.value })}
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Batch</label>
              <select
                value={formData.preferredBatch}
                onChange={(e) => setFormData({ ...formData, preferredBatch: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="">-- Select Preferred Batch --</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Enquiry Date</label>
              <input
                type="date"
                value={formData.enquiryDate}
                onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
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
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="In Progress">In Progress</option>
                <option value="Converted">Converted</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Requirement notes"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            ></textarea>
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
              {submitting ? 'Saving...' : editingEnquiry ? 'Update Enquiry' : 'Save Enquiry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONVERT TO STUDENT MODAL */}
      <Modal isOpen={Boolean(convertTarget)} onClose={() => setConvertTarget(null)} title="Convert Enquiry to Active Student">
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-md text-xs text-indigo-900 space-y-1">
            <p className="font-bold text-sm">Converting: {convertTarget?.name}</p>
            <p>Mobile: {convertTarget?.primaryMobile} &bull; Licence: {convertTarget?.interestedLicence}</p>
            <p className="text-indigo-700">A new Student ID (e.g. STU-0003) will automatically be generated.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Total Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={convertFeeData.totalFee}
                onChange={(e) => setConvertFeeData({ ...convertFeeData, totalFee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Paid Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={convertFeeData.paidAmount}
                onChange={(e) => setConvertFeeData({ ...convertFeeData, paidAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advance (₹)</label>
              <input
                type="number"
                min="0"
                value={convertFeeData.advanceAmount}
                onChange={(e) => setConvertFeeData({ ...convertFeeData, advanceAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold text-blue-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Conversion Notes</label>
            <input
              type="text"
              value={convertFeeData.notes}
              onChange={(e) => setConvertFeeData({ ...convertFeeData, notes: e.target.value })}
              placeholder="e.g. Converted after phone discussion"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConvertTarget(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={converting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md flex items-center gap-1.5"
            >
              <UserPlus size={16} />
              {converting ? 'Creating Student...' : 'Create Student Record'}
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
        message={`Are you sure you want to delete enquiry for "${deleteTarget?.name}"?`}
      />
    </MainLayout>
  );
};

export default EnquiryListPage;
