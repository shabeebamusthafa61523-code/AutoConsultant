import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import TransferStudentModal from '../../components/TransferStudentModal';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { getStudents, deleteStudent, transferStudentBatch } from '../../services/studentService';
import { getBatches } from '../../services/batchService';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Phone,
  Filter,
  RotateCcw
} from 'lucide-react';

const StudentListPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFeeStatus, setSelectedFeeStatus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Transfer modal state
  const [transferTarget, setTransferTarget] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudentsData = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pageToLoad,
        limit: 15,
        sortBy,
        sortOrder
      };
      if (search.trim()) params.search = search.trim();
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedFeeStatus) params.feeStatus = selectedFeeStatus;
      if (selectedCourse) params.course = selectedCourse;

      const [stuRes, batchRes] = await Promise.all([
        getStudents(params),
        batches.length > 0 ? Promise.resolve(batches) : getBatches()
      ]);

      if (stuRes && stuRes.students) {
        setStudents(stuRes.students);
        setPagination(stuRes.pagination || { page: pageToLoad, limit: 15, total: stuRes.students.length, totalPages: 1 });
      } else if (Array.isArray(stuRes)) {
        setStudents(stuRes);
        setPagination({ page: 1, limit: stuRes.length, total: stuRes.length, totalPages: 1 });
      } else {
        setStudents([]);
      }

      if (batches.length === 0 && Array.isArray(batchRes)) {
        setBatches(batchRes);
      }
    } catch (err) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedBatch, selectedStatus, selectedFeeStatus, selectedCourse, sortBy, sortOrder, batches]);

  useEffect(() => {
    fetchStudentsData(1);
  }, [selectedBatch, selectedStatus, selectedFeeStatus, selectedCourse, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudentsData(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBatch('');
    setSelectedStatus('');
    setSelectedFeeStatus('');
    setSelectedCourse('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const handlePageChange = (newPage) => {
    fetchStudentsData(newPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteStudent(deleteTarget._id);
      setDeleteTarget(null);
      fetchStudentsData(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete student record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleTransferBatch = async ({ studentId, targetBatchId, reason }) => {
    await transferStudentBatch(studentId, { newBatchId: targetBatchId, reason });
    fetchStudentsData(pagination.page);
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
      header: 'Student Name & Source',
      cell: (row) => (
        <div>
          <button
            onClick={() => navigate(`/students/${row._id}`)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 text-left transition"
          >
            {row.fullName}
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            {row.gender && <span>{row.gender}</span>}
            {row.aliasSourceName && <span>&bull; {row.aliasSourceName}</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Mobile',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
            <Phone size={12} className="text-slate-400" />
            <span>{row.primaryMobile}</span>
          </div>
          {row.alternateMobile && (
            <span className="text-[10px] text-slate-400 font-mono block">Alt: {row.alternateMobile}</span>
          )}
        </div>
      )
    },
    {
      header: 'Batch',
      cell: (row) => (
        <div>
          {row.batch ? (
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {row.batch.name}
              </span>
              <p className="text-[10px] text-slate-400 font-mono">
                {row.batch.startTime ? `${row.batch.startTime} - ${row.batch.endTime}` : (row.batch.session || '')}
              </p>
            </div>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400 italic font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/50">
              Unassigned
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Course / Vehicle',
      cell: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {row.coursePackage || `${row.vehicleType} (${row.licenceCategory || 'LMV'})`}
          </span>
          <span className="text-[10px] text-slate-400 block">{row.licenceServiceType || 'Fresh Licence'}</span>
        </div>
      )
    },
    {
      header: 'Fee Status',
      cell: (row) => {
        const feeStatus = row.feeStatus || (row.balance <= 0 ? 'Paid' : (row.paidAmount > 0 ? 'Partially Paid' : 'Pending'));
        return (
          <div>
            <Badge type="fee" value={feeStatus} />
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              Bal: ₹{row.balance !== undefined ? row.balance : ((row.totalFee || 9000) - (row.paidAmount || 0) - (row.advanceAmount || 0))}
            </p>
          </div>
        );
      }
    },
    {
      header: 'Student Status',
      cell: (row) => <Badge type="status" value={row.currentStatus || 'Active'} />
    },
    {
      header: 'Next Action / Date',
      cell: (row) => (
        <div className="text-xs max-w-[150px]">
          <p className="truncate font-medium text-slate-700 dark:text-slate-300" title={row.nextAction || 'None'}>
            {row.nextAction || '—'}
          </p>
          {(row.testDate || row.followUpDate) && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
              <Calendar size={10} />
              {row.testDate ? `Test: ${new Date(row.testDate).toLocaleDateString()}` : `Follow: ${new Date(row.followUpDate).toLocaleDateString()}`}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/students/${row._id}`)}
            title="View Full Profile"
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
            onClick={() => setTransferTarget(row)}
            title="Transfer Batch"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition"
          >
            <ArrowRightLeft size={16} />
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

      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        {/* Search, Filter Bar & Actions */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Student ID, Name, Mobile, Application No..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-md transition"
              >
                Search
              </button>
              {(search || selectedBatch || selectedStatus || selectedFeeStatus || selectedCourse) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset all filters"
                  className="p-2 text-slate-500 hover:text-red-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </form>

            {/* Primary Action Button */}
            <Link
              to="/students/add"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <Plus size={16} />
              Add Student
            </Link>
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter size={13} /> Filters:
            </span>

            {/* Batch Filter */}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Batches</option>
              <option value="unassigned">Unassigned Only</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Student Statuses</option>
              <option value="Active">Active</option>
              <option value="Training">Training</option>
              <option value="Test Pending">Test Pending</option>
              <option value="Test Scheduled">Test Scheduled</option>
              <option value="Passed">Passed</option>
              <option value="Completed">Completed</option>
              <option value="Retest">Retest</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Fee Status Filter */}
            <select
              value={selectedFeeStatus}
              onChange={(e) => setSelectedFeeStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Fee Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Payment Pending</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium ml-auto"
            >
              <option value="createdAt">Sort: Recent Admission</option>
              <option value="fullName">Sort: Student Name</option>
              <option value="studentId">Sort: Student ID</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingSpinner message="Fetching students from MongoDB..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => fetchStudentsData(pagination.page)} />
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description={
              search || selectedBatch || selectedStatus || selectedFeeStatus
                ? "No students match your active filter criteria."
                : "There are currently no student records in the CRM database."
            }
            actionButton={
              <Link
                to="/students/add"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={16} />
                + Add Student
              </Link>
            }
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <DataTable
              columns={columns}
              data={students}
              emptyMessage="No students found."
            />
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Transfer Batch Modal */}
      <TransferStudentModal
        isOpen={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        student={transferTarget}
        batches={batches}
        currentBatchId={transferTarget?.batch?._id || transferTarget?.batch}
        onTransferSuccess={handleTransferBatch}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={`Are you sure you want to delete student "${deleteTarget?.fullName}" (${deleteTarget?.studentId})? All linked records will be removed.`}
      />
    </MainLayout>
  );
};

export default StudentListPage;
