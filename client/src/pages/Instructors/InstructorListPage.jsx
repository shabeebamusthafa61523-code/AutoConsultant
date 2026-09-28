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
  getInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructor
} from '../../services/instructorService';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Award,
  CheckCircle2,
  Calendar,
  Phone,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

const InstructorListPage = () => {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    instructorId: '',
    name: '',
    mobile: '',
    licenceNo: '',
    badgeNo: '',
    experience: '5 Years',
    department: 'Instructor Team',
    designation: 'Road & H-Class Instructor',
    status: 'Active',
    bloodGroup: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInstructors = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pageToLoad,
        limit: 15
      };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;
      if (selectedDept) params.department = selectedDept;

      const res = await getInstructors(params);
      if (res && res.instructors) {
        setInstructors(res.instructors);
        setPagination(res.pagination || { page: pageToLoad, limit: 15, total: res.instructors.length, totalPages: 1 });
      } else {
        setInstructors([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load instructors');
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedDept]);

  useEffect(() => {
    fetchInstructors(1);
  }, [fetchInstructors]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInstructors(1);
  };

  const handleOpenAdd = () => {
    setEditingInstructor(null);
    setFormData({
      instructorId: '',
      name: '',
      mobile: '',
      licenceNo: '',
      badgeNo: '',
      experience: '5 Years',
      department: 'Instructor Team',
      designation: 'Road & H-Class Instructor',
      status: 'Active',
      bloodGroup: '',
      address: '',
      emergencyContact: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (ins) => {
    setEditingInstructor(ins);
    setFormData({
      instructorId: ins.instructorId || '',
      name: ins.name || '',
      mobile: ins.mobile || '',
      licenceNo: ins.licenceNo || '',
      badgeNo: ins.badgeNo || '',
      experience: ins.experience || '',
      department: ins.department || 'Instructor Team',
      designation: ins.designation || 'Road & H-Class Instructor',
      status: ins.status || 'Active',
      bloodGroup: ins.bloodGroup || '',
      address: ins.address || '',
      emergencyContact: ins.emergencyContact || '',
      notes: ins.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingInstructor) {
        await updateInstructor(editingInstructor._id, formData);
      } else {
        await createInstructor(formData);
      }
      setModalOpen(false);
      fetchInstructors(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to save instructor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteInstructor(deleteTarget._id);
      setDeleteTarget(null);
      fetchInstructors(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete instructor');
    } finally {
      setDeleting(false);
    }
  };

  // Stats calculation
  const totalCount = pagination.total || instructors.length;
  const activeCount = instructors.filter(i => i.status === 'Active').length;
  const onLeaveCount = instructors.filter(i => i.status === 'On Leave').length;

  const columns = [
    {
      header: 'Instructor',
      accessor: 'name',
      cell: (row) => (
        <div>
          <button
            onClick={() => navigate(`/instructors/${row._id}`)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 text-left transition"
          >
            {row.name}
          </button>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300">
              {row.instructorId}
            </span>
            <span>•</span>
            <span>{row.designation}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: 'mobile',
      cell: (row) => (
        <div className="text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            <Phone size={13} className="text-slate-400" />
            <span>{row.mobile}</span>
          </div>
          {row.emergencyContact && (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Alt: {row.emergencyContact}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Licence & Badge',
      accessor: 'licenceNo',
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-mono text-slate-700 dark:text-slate-300">
            DL: {row.licenceNo || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Badge: {row.badgeNo || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Experience',
      accessor: 'experience',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {row.experience || '—'}
        </span>
      )
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
            onClick={() => navigate(`/instructors/${row._id}`)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
            title="View Profile & Performance"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition"
            title="Edit Instructor"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
            title="Delete / Deactivate"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Instructor Management" subtitle="Driving instructors, credentials, allocations, and performance tracking" />

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Instructors"
            value={totalCount}
            icon={GraduationCap}
            color="red"
            description="Registered teaching faculty"
          />
          <StatCard
            title="Active on Duty"
            value={activeCount}
            icon={CheckCircle2}
            color="emerald"
            description="Available for sessions"
          />
          <StatCard
            title="On Leave"
            value={onLeaveCount}
            icon={Calendar}
            color="amber"
            description="Temporary absence"
          />
          <StatCard
            title="Operational Fleet"
            value="3 Active"
            icon={ShieldCheck}
            color="blue"
            description="Vehicles synchronized"
          />
        </div>

        {/* Action Header & Search Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, or mobile..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
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
            <span>Add Instructor</span>
          </button>
        </div>

        {/* Content Section */}
        {error && <ErrorMessage message={error} onRetry={() => fetchInstructors(1)} />}

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : instructors.length === 0 ? (
          <EmptyState
            title="No instructors found"
            description="Add an instructor or clear filters to see records."
            actionLabel="Add First Instructor"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="space-y-4">
            <DataTable columns={columns} data={instructors} />
            {pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPageChange={(p) => fetchInstructors(p)}
              />
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Instructor Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingInstructor ? 'Edit Instructor Details' : 'Add New Driving Instructor'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instructor ID
              </label>
              <input
                type="text"
                value={formData.instructorId}
                onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                placeholder="e.g. INS001 (Auto if blank)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mohamed Jasim P"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. 6282892320"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Road & H-Class Instructor"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Driving Licence Number
              </label>
              <input
                type="text"
                value={formData.licenceNo}
                onChange={(e) => setFormData({ ...formData, licenceNo: e.target.value })}
                placeholder="e.g. KL-10-2015001234"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instructor Badge Number
              </label>
              <input
                type="text"
                value={formData.badgeNo}
                onChange={(e) => setFormData({ ...formData, badgeNo: e.target.value })}
                placeholder="e.g. BDG-7891"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Experience
              </label>
              <input
                type="text"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="e.g. 5 Years"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Internal Operational Notes
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Specialized categories, certifications, timing preferences..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow transition flex items-center gap-2"
            >
              {submitting && <LoadingSpinner size="sm" />}
              <span>{editingInstructor ? 'Update Instructor' : 'Save Instructor'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Instructor"
        message={`Are you sure you want to remove ${deleteTarget?.name}? If this instructor has past training classes or assigned batches, consider setting their status to Inactive instead.`}
      />
    </MainLayout>
  );
};

export default InstructorListPage;
