import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { getStudents, deleteStudent } from '../../services/studentService';
import { getBatches } from '../../services/batchService';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';

const StudentListPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedStatus) params.status = selectedStatus;

      const [stuRes, batchRes] = await Promise.all([
        getStudents(params),
        getBatches()
      ]);

      setStudents(stuRes || []);
      setBatches(batchRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, [selectedBatch, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudentsData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteStudent(deleteTarget._id);
      setDeleteTarget(null);
      fetchStudentsData();
    } catch (err) {
      alert(err.message || 'Failed to delete student record.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Student ID',
      cell: (row) => (
        <span className="font-mono text-xs font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 px-2 py-0.5 rounded">
          {row.studentId}
        </span>
      )
    },
    {
      header: 'Name',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{row.fullName}</p>
          {row.aliasSourceName && <p className="text-xs text-slate-400 dark:text-slate-500">Src: {row.aliasSourceName}</p>}
        </div>
      )
    },
    {
      header: 'Mobile',
      cell: (row) => (
        <span className="text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">{row.primaryMobile}</span>
      )
    },
    {
      header: 'Licence',
      cell: (row) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600">
          {row.vehicleType} &bull; {row.licenceCategory || 'LMV'}
        </span>
      )
    },
    {
      header: 'Batch',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.batch ? row.batch.name : <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => {
        const statusColors = {
          Active: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400',
          Pending: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400',
          Passed: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400',
          Failed: 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400',
          Dropped: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
        };
        return (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${statusColors[row.currentStatus] || statusColors.Active}`}>
            {row.currentStatus}
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
            onClick={() => navigate(`/students/${row._id}`)}
            title="View Student Details"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => navigate(`/students/${row._id}/edit`)}
            title="Edit Student"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            title="Delete Student"
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
      <Navbar title="BENZ Student Directory" />

      <div className="space-y-4">
        {/* Header Action & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, Name, Mobile..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-sm font-bold rounded-md transition"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3">
            {/* Batch Filter */}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-sm font-medium focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-sm font-medium focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Dropped">Dropped</option>
            </select>

            {/* Add Student Button */}
            <Link
              to="/students/add"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus size={18} />
              Add Student
            </Link>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingSpinner message="Fetching BENZ students from MongoDB..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchStudentsData} />
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description={search || selectedBatch || selectedStatus ? "No students match your filter criteria." : "There are currently no student records in MongoDB."}
            actionButton={
              <Link
                to="/students/add"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Add Student
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={students}
            emptyMessage="No students found."
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={`Are you sure you want to delete student "${deleteTarget?.fullName}" (${deleteTarget?.studentId})?`}
      />
    </MainLayout>
  );
};

export default StudentListPage;
