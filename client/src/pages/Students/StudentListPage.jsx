import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
import BulkIntakeTab from './BulkIntakeTab';
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
  RotateCcw,
  FileSpreadsheet,
  Users,
  Download
} from 'lucide-react';

const StudentListPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'bulk'
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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
      if (selectedCategory) params.category = selectedCategory;
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
  }, [search, selectedCategory, selectedBatch, selectedStatus, selectedFeeStatus, selectedCourse, sortBy, sortOrder, batches]);

  useEffect(() => {
    fetchStudentsData(1);
  }, [selectedCategory, selectedBatch, selectedStatus, selectedFeeStatus, selectedCourse, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudentsData(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBatch('');
    setSelectedStatus('');
    setSelectedFeeStatus('');
    setSelectedCourse('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const handleExportDirectory = async () => {
    try {
      const params = { limit: 'all', sortBy, sortOrder };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedFeeStatus) params.feeStatus = selectedFeeStatus;
      if (selectedCourse) params.course = selectedCourse;

      const res = await getStudents(params);
      const list = Array.isArray(res) ? res : (res?.students || []);

      if (list.length === 0) {
        alert('No student records found to export.');
        return;
      }

      const exportRows = list.map((s, idx) => {
        const total = s.totalFee !== undefined ? s.totalFee : 9000;
        const paid = s.paidAmount || 0;
        const adv = s.advanceAmount || 0;
        const bal = s.balance !== undefined ? s.balance : (total - paid - adv);
        const addrStr = s.address
          ? [s.address.houseName, s.address.place, s.address.postOffice, s.address.district].filter(Boolean).join(', ')
          : '';

        return {
          'Sl': idx + 1,
          'Category': s.category || 'A – New Application',
          'Student ID': s.studentId || '',
          'Name': s.fullName || '',
          'Mobile': s.primaryMobile || '',
          'Status': s.currentStatus || 'Active',
          'Next Action': s.nextAction || '',
          'Next Action Date': s.followUpDate ? new Date(s.followUpDate).toISOString().split('T')[0] : '',
          'Total Fee': total,
          'Paid': paid,
          'Advance Amount': adv,
          'Balance': bal,
          'Service': s.licenceServiceType || s.coursePackage || 'New Driving Licence',
          'Vehicle / COV': s.vehicleType || 'LMV+MCWG',
          'Batch': s.batch ? (typeof s.batch === 'object' ? s.batch.name : s.batch) : (s.batchName || ''),
          'Sarathi App No': s.sarathiAppNo || s.applicationNo || '',
          'LL Test Date': s.llTestDate ? new Date(s.llTestDate).toISOString().split('T')[0] : '',
          'Final Test Date': s.finalTestDate ? new Date(s.finalTestDate).toISOString().split('T')[0] : '',
          'Gender': s.gender || 'Male',
          'DOB': s.dob ? new Date(s.dob).toISOString().split('T')[0] : '',
          'Blood': s.bloodGroup || '',
          'Guardian': s.guardian || '',
          'Alt Mobile': s.alternateMobile || '',
          'Address': addrStr,
          'Pincode': s.address?.pincode || '',
          'Verification': s.verificationNotes || '',
          'Notes': s.notes || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'BENZ_Student_Directory');
      XLSX.writeFile(workbook, `BENZ_Student_Register_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      alert('Failed to export student directory: ' + e.message);
    }
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
      header: 'Category & Student ID',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 px-2 py-0.5 rounded block w-fit">
            {row.studentId}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold block mt-1 truncate max-w-[120px]" title={row.category || 'N/A'}>
            {row.category || 'A – New Application'}
          </span>
        </div>
      )
    },
    {
      header: 'Name, Gender & Guardian',
      cell: (row) => {
        const dobStr = row.dob ? new Date(row.dob).toLocaleDateString('en-IN') : '';
        return (
          <div className="max-w-[160px]">
            <button
              onClick={() => navigate(`/students/${row._id}`)}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 text-left transition block"
            >
              {row.fullName}
            </button>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-medium">
              {row.gender && <span>{row.gender}</span>}
              {row.bloodGroup && <span className="text-red-500 font-bold">&bull; {row.bloodGroup}</span>}
              {dobStr && <span className="text-slate-600 dark:text-slate-300 font-bold font-mono">&bull; DOB: {dobStr}</span>}
              {row.guardian && <span className="text-slate-500 block w-full truncate" title={`Guardian: ${row.guardian}`}>Guardian: {row.guardian}</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Contact & Address',
      cell: (row) => {
        let addrStr = '';
        if (row.address) {
          if (typeof row.address === 'string') {
            addrStr = row.address;
          } else if (typeof row.address === 'object') {
            addrStr = [row.address.houseName, row.address.place, row.address.postOffice, row.address.district].filter(Boolean).join(', ');
          }
        }
        const pin = row.address?.pincode || row.pincode || '';

        return (
          <div className="max-w-[170px]">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
              <Phone size={11} className="text-slate-400 shrink-0" />
              <span>{row.primaryMobile}</span>
            </div>
            {row.alternateMobile && (
              <span className="text-[10px] text-slate-400 font-mono block">Alt: {row.alternateMobile}</span>
            )}
            {addrStr && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5 font-medium" title={addrStr}>
                Addr: {addrStr}
              </span>
            )}
            {pin && (
              <span className="text-[10px] text-slate-400 font-mono block">Pin: {pin}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Service & Vehicle (COV)',
      cell: (row) => (
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            {row.vehicleType || row.vehicleCov || 'LMV+MCWG'}
          </span>
          <span className="text-[10px] text-slate-400 block">{row.licenceServiceType || row.service || '—'}</span>
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
          ) : row.batchName ? (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {row.batchName}
            </span>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400 italic font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/50">
              Unassigned
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Sarathi App No',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          {row.sarathiAppNo || row.applicationNo || '—'}
        </span>
      )
    },
    {
      header: 'LL Test Date',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {row.llTestDate ? new Date(row.llTestDate).toLocaleDateString('en-IN') : '—'}
        </span>
      )
    },
    {
      header: 'Final Test Date',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {row.finalTestDate ? new Date(row.finalTestDate).toLocaleDateString('en-IN') : '—'}
        </span>
      )
    },
    {
      header: 'Total Fee',
      cell: (row) => {
        const total = row.totalFee !== undefined ? Number(row.totalFee) : 9000;
        return (
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            ₹{total.toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      header: 'Paid Amount',
      cell: (row) => {
        const paid = Number(row.paidAmount) || 0;
        const adv = Number(row.advanceAmount) || 0;
        const totalPaid = paid + adv;
        return (
          <div className="font-mono text-xs">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
              ₹{totalPaid.toLocaleString('en-IN')}
            </span>
            {adv > 0 && (
              <span className="text-[9px] text-blue-500 block">(Adv: ₹{adv})</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Balance',
      cell: (row) => {
        const total = row.totalFee !== undefined ? Number(row.totalFee) : 9000;
        const paid = Number(row.paidAmount) || 0;
        const adv = Number(row.advanceAmount) || 0;
        const bal = row.balance !== undefined ? Number(row.balance) : (total - paid - adv);
        const feeStatus = row.feeStatus || (bal <= 0 ? 'Paid' : ((paid + adv) > 0 ? 'Partially Paid' : 'Pending'));

        return (
          <div className="font-mono text-xs">
            <span className={`font-black block text-sm ${bal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ₹{bal.toLocaleString('en-IN')}
            </span>
            <div className="mt-0.5">
              <Badge type="fee" value={feeStatus} />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge type="status" value={row.currentStatus || 'Active'} />
      )
    },
    {
      header: 'Next Action',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[150px] block truncate" title={row.nextAction || ''}>
          {row.nextAction || '—'}
        </span>
      )
    },
    {
      header: 'Next Action Date',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
          {row.followUpDate ? (
            <>
              <Calendar size={12} className="text-slate-400" />
              {new Date(row.followUpDate).toLocaleDateString('en-IN')}
            </>
          ) : (
            '—'
          )}
        </span>
      )
    },
    {
      header: 'Verification & Notes',
      cell: (row) => (
        <div className="text-[10px] max-w-[130px]">
          {row.verificationNotes && (
            <span className="text-slate-700 dark:text-slate-300 block font-semibold truncate" title={row.verificationNotes}>
              {row.verificationNotes}
            </span>
          )}
          {row.notes && (
            <span className="text-slate-400 block truncate" title={row.notes}>
              {row.notes}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${row._id}`);
            }}
            title="View Full Profile"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${row._id}/edit`);
            }}
            title="Edit Student"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTransferTarget(row);
            }}
            title="Transfer Batch"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition"
          >
            <ArrowRightLeft size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
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
        {/* TOP TAB SWITCHER (STUDENT DIRECTORY vs BULK INTAKE) */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 rounded-md transition flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Users size={16} />
            <span>Student Directory ({pagination.total || students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2.5 rounded-md transition flex items-center gap-2 ${
              activeTab === 'bulk'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Bulk Intake (Excel / CSV)</span>
          </button>
        </div>

        {activeTab === 'bulk' ? (
          <BulkIntakeTab
            batches={batches}
            onImportSuccess={() => {
              fetchStudentsData(1);
            }}
          />
        ) : (
          <>
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
                      placeholder="Search by Student ID, Name, Mobile, Sarathi App No, Category, Notes, Address..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-md transition"
                  >
                    Search
                  </button>
                  {(search || selectedCategory || selectedBatch || selectedStatus || selectedFeeStatus || selectedCourse) && (
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

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportDirectory}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                    title="Export all 26 fields of student directory to Excel"
                  >
                    <Download size={16} />
                    <span>Export Directory (26 Fields)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('bulk')}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-600 shadow-xs"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Bulk Intake</span>
                  </button>
                  <Link
                    to="/students/add"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus size={16} />
                    Add Student
                  </Link>
                </div>
              </div>

              {/* Quick Filters Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Filter size={13} /> Filters:
                </span>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Categories</option>
                  <option value="A – New Application">A – New Application</option>
                  <option value="B – LL Done, Test Pending">B – LL Done, Test Pending</option>
                  <option value="Fee Collection Follow Up">Fee Collection Follow Up</option>
                  <option value="Passed">Passed</option>
                  <option value="C – Final Test Done">C – Final Test Done</option>
                </select>

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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('bulk')}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-md transition inline-flex items-center gap-1.5"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-600" />
                      Bulk Intake
                    </button>
                    <Link
                      to="/students/add"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition inline-flex items-center gap-1.5"
                    >
                      <Plus size={16} />
                      + Add Student
                    </Link>
                  </div>
                }
              />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <DataTable
                  columns={columns}
                  data={students}
                  onRowClick={(row) => navigate(`/students/${row._id}`)}
                  emptyMessage="No students found."
                />
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
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
