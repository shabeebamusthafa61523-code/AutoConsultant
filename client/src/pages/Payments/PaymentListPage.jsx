import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import ReceiptModal from '../../components/ReceiptModal';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import {
  getPayments,
  getPaymentStats,
  createPayment,
  updatePayment,
  deletePayment,
  exportPaymentsCSV
} from '../../services/paymentService';
import { getStudents } from '../../services/studentService';
import {
  Plus,
  Edit,
  Trash2,
  CreditCard,
  Search,
  Download,
  RotateCcw,
  Filter,
  Printer,
  FileText,
  CalendarCheck,
  Clock,
  CheckCircle2,
  User,
  ExternalLink,
  Receipt
} from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];
const DEFAULT_PAYMENT_TYPES = ['Fee Payment', 'Advance Payment', 'Registration Fee', 'Exam Fee', 'Other'];

const PaymentListPage = () => {
  const { user } = useAuth();
  const canDelete = user?.role === 'Superadmin' || user?.role === 'Admin';

  // Dynamic Payment Types with localStorage Persistence
  const [paymentTypes, setPaymentTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('benz_payment_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse payment types from localStorage', e);
    }
    return DEFAULT_PAYMENT_TYPES;
  });

  const savePaymentTypes = (types) => {
    setPaymentTypes(types);
    try {
      localStorage.setItem('benz_payment_types', JSON.stringify(types));
    } catch (e) {
      console.error('Failed to save payment types', e);
    }
  };

  // Manage Payment Types Modal State
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeIndex, setEditingTypeIndex] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [manageTypeError, setManageTypeError] = useState('');

  const handleAddPaymentType = (e) => {
    e?.preventDefault();
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      setManageTypeError('Please enter a valid payment type name.');
      return;
    }
    if (paymentTypes.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setManageTypeError('This payment type already exists.');
      return;
    }
    const updated = [...paymentTypes, trimmed];
    savePaymentTypes(updated);
    setNewTypeName('');
    setManageTypeError('');
  };

  const handleStartEditType = (index) => {
    setEditingTypeIndex(index);
    setEditingTypeName(paymentTypes[index]);
    setManageTypeError('');
  };

  const handleSaveEditType = (index) => {
    const trimmed = editingTypeName.trim();
    if (!trimmed) {
      setManageTypeError('Payment type name cannot be empty.');
      return;
    }
    if (
      paymentTypes.some(
        (t, i) => i !== index && t.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setManageTypeError('Another payment type already has this name.');
      return;
    }
    const oldName = paymentTypes[index];
    const updated = [...paymentTypes];
    updated[index] = trimmed;
    savePaymentTypes(updated);

    if (formData.paymentType === oldName) {
      setFormData((prev) => ({ ...prev, paymentType: trimmed }));
    }

    setEditingTypeIndex(null);
    setEditingTypeName('');
    setManageTypeError('');
  };

  const handleDeleteType = (index) => {
    if (paymentTypes.length <= 1) {
      setManageTypeError('At least one payment type must remain.');
      return;
    }
    const targetName = paymentTypes[index];
    const updated = paymentTypes.filter((_, i) => i !== index);
    savePaymentTypes(updated);

    if (formData.paymentType === targetName) {
      setFormData((prev) => ({ ...prev, paymentType: updated[0] || '' }));
    }
    setManageTypeError('');
  };

  const handleResetDefaultTypes = () => {
    savePaymentTypes(DEFAULT_PAYMENT_TYPES);
    setManageTypeError('');
  };

  // Data States
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalRecords: 0,
    todaysCollection: 0,
    todaysCount: 0,
    totalPending: 0,
    studentsWithPendingCount: 0
  });

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  // Modal State: Add / Edit Payment
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const [formData, setFormData] = useState({
    student: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'Fee Payment',
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });

  // Modal State: View / Print Receipt
  const [receiptTarget, setReceiptTarget] = useState(null);
  const receiptPrintRef = useRef(null);

  // Modal State: Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Students for Dropdown (Unpaginated / All Students)
  useEffect(() => {
    const fetchStudentsMaster = async () => {
      try {
        const stuRes = await getStudents({ limit: 'all' });
        // Safe extraction prevents Object vs Array runtime crashes
        const rawStudents = stuRes?.students || (Array.isArray(stuRes) ? stuRes : []);
        setStudents(rawStudents);
      } catch (err) {
        console.error('Failed to load students for payment selector:', err);
      }
    };
    fetchStudentsMaster();
  }, []);

  // Fetch Payments & Stats
  const fetchData = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: pageToLoad,
          limit: pagination.limit
        };

        if (search.trim()) params.search = search.trim();
        if (selectedStudent) params.student = selectedStudent;
        if (selectedMethod) params.paymentMethod = selectedMethod;
        if (selectedType) params.paymentType = selectedType;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;

        const statsParams = {};
        if (selectedStudent) statsParams.student = selectedStudent;
        if (filterStartDate) statsParams.startDate = filterStartDate;
        if (filterEndDate) statsParams.endDate = filterEndDate;

        const [paySettled, statsSettled] = await Promise.allSettled([
          getPayments(params),
          getPaymentStats(statsParams)
        ]);

        if (paySettled.status === 'fulfilled') {
          const payRes = paySettled.value;
          if (payRes && payRes.payments) {
            setPayments(payRes.payments);
            setPagination(payRes.pagination);
          } else if (Array.isArray(payRes)) {
            setPayments(payRes);
            setPagination({
              page: 1,
              limit: payRes.length,
              total: payRes.length,
              totalPages: 1
            });
          }
        } else {
          console.error('Error fetching payments ledger:', paySettled.reason);
          setError(paySettled.reason?.message || 'Failed to fetch payment transactions.');
        }

        if (statsSettled.status === 'fulfilled' && statsSettled.value) {
          setStats(statsSettled.value);
        } else if (statsSettled.status === 'rejected') {
          console.error('Error fetching payment statistics:', statsSettled.reason);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch payment transactions.');
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      selectedStudent,
      selectedMethod,
      selectedType,
      filterStartDate,
      filterEndDate,
      pagination.limit
    ]
  );

  useEffect(() => {
    fetchData(1);
  }, [
    selectedStudent,
    selectedMethod,
    selectedType,
    filterStartDate,
    filterEndDate
  ]);

  // Search & Filter Handlers
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStudent('');
    setSelectedMethod('');
    setSelectedType('');
    setFilterStartDate('');
    setFilterEndDate('');
    fetchData(1);
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStudent) params.student = selectedStudent;
      if (selectedMethod) params.paymentMethod = selectedMethod;
      if (selectedType) params.paymentType = selectedType;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      await exportPaymentsCSV(params);
    } catch (err) {
      alert(err.message || 'Failed to export CSV file.');
    } finally {
      setExporting(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setFormError(null);
    setModalStudentSearch('');
    setFormData({
      student: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentType: 'Fee Payment',
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (pay) => {
    setEditingPayment(pay);
    setFormError(null);
    setModalStudentSearch('');

    const stuId = pay.student?._id || pay.student || '';
    const dateFormatted = pay.paymentDate
      ? new Date(pay.paymentDate).toISOString().split('T')[0]
      : '';

    setFormData({
      student: stuId,
      paymentDate: dateFormatted,
      amount: pay.amount || '',
      paymentType: pay.paymentType || 'Fee Payment',
      paymentMethod: pay.paymentMethod || 'Cash',
      reference: pay.reference || '',
      notes: pay.notes || ''
    });
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.student) {
      setFormError('Please select a student.');
      return;
    }

    const amt = Number(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        amount: amt
      };

      if (editingPayment) {
        await updatePayment(editingPayment._id, payload);
      } else {
        await createPayment(payload);
      }

      setModalOpen(false);
      fetchData(pagination.page);

      // Refresh student master list to get updated balance indicators
      const stuRes = await getStudents({ limit: 'all' });
      setStudents(stuRes?.students || (Array.isArray(stuRes) ? stuRes : []));
    } catch (err) {
      setFormError(err.message || 'Failed to record payment transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Payment
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deletePayment(deleteTarget._id);
      setDeleteTarget(null);
      fetchData(pagination.page);

      const stuRes = await getStudents({ limit: 'all' });
      setStudents(stuRes?.students || (Array.isArray(stuRes) ? stuRes : []));
    } catch (err) {
      alert(err.message || 'Failed to delete payment record.');
    } finally {
      setDeleting(false);
    }
  };

  // Print Receipt Handler
  const handlePrintReceipt = () => {
    window.print();
  };

  // Filtered Students for Modal search
  const filteredModalStudents = students.filter((s) => {
    if (!modalStudentSearch.trim()) return true;
    const term = modalStudentSearch.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(term) ||
      s.studentId?.toLowerCase().includes(term) ||
      s.primaryMobile?.toLowerCase().includes(term) ||
      s.applicationNo?.toLowerCase().includes(term)
    );
  });

  // Table Columns
  const columns = [
    {
      header: 'Receipt #',
      cell: (row) => (
        <button
          onClick={() => setReceiptTarget(row)}
          title="Click to view printable receipt"
          className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded hover:underline inline-flex items-center gap-1"
        >
          <Receipt size={12} />
          <span>{row.receiptNo || row.paymentId || `REC-${String(row._id).slice(-4).toUpperCase()}`}</span>
        </button>
      )
    },
    {
      header: 'Student',
      cell: (row) => (
        <div>
          {row.student ? (
            <Link
              to={`/students/${row.student._id || row.student}`}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              {row.student.fullName || 'Student'}
            </Link>
          ) : (
            <span className="font-bold text-slate-800 dark:text-slate-200">Unknown Student</span>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span className="font-mono">{row.student?.studentId || '—'}</span>
            <span>&bull;</span>
            <span>{row.student?.primaryMobile || '—'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
          {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      header: 'Amount',
      cell: (row) => (
        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
          ₹ {row.amount}
        </span>
      )
    },
    {
      header: 'Payment Type',
      cell: (row) => <Badge type="status" value={row.paymentType || 'Fee Payment'} />
    },
    {
      header: 'Method',
      cell: (row) => (
        <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
          {row.paymentMethod || 'Cash'}
        </span>
      )
    },
    {
      header: 'Reference',
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono max-w-[130px] truncate block" title={row.reference || row.notes || ''}>
          {row.reference || row.notes || '—'}
        </span>
      )
    },
    {
      header: 'Recorded By',
      cell: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.recordedBy?.name || 'Staff'}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setReceiptTarget(row)}
            title="View & Print Official Receipt"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Payment"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition"
          >
            <Edit size={16} />
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteTarget(row)}
              title="Delete Payment Record"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Payment & Receipts" />

      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* ========================================================================= */}
        {/* PAGE HEADER: Search, Export CSV & + Record Payment */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Global Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student / mobile / student ID / receipt..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-md transition"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchData(1);
                }}
                title="Clear Search"
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </form>

          {/* Action Buttons: Export CSV & + Record Payment */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              title="Export filtered payment records to CSV"
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
            >
              <Download size={15} className="text-slate-500 dark:text-slate-300" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              onClick={() => window.print()}
              title="Export / Print Payment Ledger to PDF"
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={15} className="text-slate-500 dark:text-slate-300" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} />
              <span>+ Record Payment</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP STATISTICS CARDS (4 Live MongoDB Aggregation Cards) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Card 1: Total Collected */}
          <StatCard
            title="Total Collected"
            value={`₹ ${stats.totalCollected.toLocaleString()}`}
            icon={CreditCard}
            color="emerald"
            subtitle="Cumulative Receipts"
          />

          {/* Card 2: Total Pending */}
          <StatCard
            title="Total Pending"
            value={`₹ ${stats.totalPending.toLocaleString()}`}
            icon={Clock}
            color="rose"
            subtitle={`${stats.studentsWithPendingCount || 0} Candidates with Balance`}
          />

          {/* Card 3: Today's Collection */}
          <StatCard
            title="Today's Collection"
            value={`₹ ${stats.todaysCollection.toLocaleString()}`}
            icon={CalendarCheck}
            color="purple"
            subtitle={`${stats.todaysCount || 0} Payments Today`}
          />

          {/* Card 4: Total Payment Records */}
          <StatCard
            title="Total Receipts"
            value={stats.totalRecords}
            icon={FileText}
            color="dark"
            subtitle="Logged Transactions"
          />
        </div>

        {/* ========================================================================= */}
        {/* MAIN SECTION: PAYMENT LEDGER */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Payment & Receipts Ledger</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {pagination.total} records
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete chronological audit log of student tuition, deposits, advance receipts, and transaction methods.
              </p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter size={13} /> Filters:
            </span>

            {/* Student Filter */}
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[200px] focus:ring-1 focus:ring-red-500"
            >
              <option value="">All Students</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[160px] focus:ring-1 focus:ring-red-500"
            >
              <option value="">All Payment Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Payment Type Filter */}
            <div className="flex items-center gap-1">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[160px] focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Payment Types</option>
                {paymentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsManageTypesOpen(true)}
                className="p-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                title="Add / Edit / Delete Payment Types"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Date Range: Start Date */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>

            {/* Date Range: End Date */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>

            {/* Clear Filters Button */}
            {(selectedStudent ||
              selectedMethod ||
              selectedType ||
              filterStartDate ||
              filterEndDate ||
              search) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 font-semibold transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table / Loading / Empty Content */}
          {loading ? (
            <div className="p-8">
              <LoadingSpinner message="Fetching payment ledger from database..." />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorMessage message={error} onRetry={() => fetchData(pagination.page)} />
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              title="No payment records found"
              description={
                search || selectedStudent || selectedMethod || selectedType || filterStartDate
                  ? 'No transactions match your current search or filter criteria.'
                  : 'Start recording student fee receipts to build your payments ledger.'
              }
              actionButton={
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={16} />
                  <span>+ Record Payment</span>
                </button>
              }
            />
          ) : (
            <div>
              <DataTable
                columns={columns}
                data={payments}
                emptyMessage="No payment records found."
              />
              <Pagination
                pagination={pagination}
                onPageChange={(newPage) => fetchData(newPage)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT PAYMENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPayment ? 'Edit Payment Record' : 'Record New Student Payment'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-md text-red-600 dark:text-red-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Student Picker with fast search filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Candidate / Student <span className="text-red-500">*</span>
              </label>
              {students.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter student list..."
                  value={modalStudentSearch}
                  onChange={(e) => setModalStudentSearch(e.target.value)}
                  className="text-[11px] px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              )}
            </div>
            <select
              required
              value={formData.student}
              onChange={(e) => setFormData({ ...formData, student: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Choose Student from Database --</option>
              {filteredModalStudents.map((s) => {
                const bal = Math.max(0, (s.totalFee || 0) - (s.paidAmount || 0) - (s.advanceAmount || 0));
                return (
                  <option key={s._id} value={s._id}>
                    {s.fullName} ({s.studentId}) &bull; Bal: ₹{bal}
                  </option>
                );
              })}
            </select>

            {/* Live Selected Student Balance Preview */}
            {(() => {
              const sel = students.find((s) => s._id === formData.student);
              if (!sel) return null;
              const total = sel.totalFee || 0;
              const paid = (sel.paidAmount || 0) + (sel.advanceAmount || 0);
              const bal = Math.max(0, total - paid);
              const enteredAmt = Number(formData.amount) || 0;
              const projectedBal = Math.max(0, bal - enteredAmt);
              return (
                <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700/80 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-400 block">Total Fee:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Paid:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Due:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">₹{bal.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Due After:</span>
                    <span className={`font-bold ${projectedBal === 0 && bal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      ₹{projectedBal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Payment Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Amount in INR"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono font-bold"
              />
            </div>
          </div>

          {/* Payment Type & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsManageTypesOpen(true)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                  title="Add / Edit / Delete Payment Types"
                >
                  <Plus size={12} />
                  <span>Manage</span>
                </button>
              </div>
              <select
                required
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {paymentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction Reference ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Reference / Cheque No / UTR ID
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g. GPay-98234710293 or Cheque #00412"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Internal Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Paid installment towards LMV Fresh Licence syllabus"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Recording...' : editingPayment ? 'Update Payment' : 'Confirm & Save Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* UNIFIED PRINTABLE RECEIPT MODAL */}
      {/* ========================================================================= */}
      <ReceiptModal
        isOpen={Boolean(receiptTarget)}
        onClose={() => setReceiptTarget(null)}
        payment={receiptTarget}
      />

      {/* ========================================================================= */}
      {/* MANAGE PAYMENT TYPES MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isManageTypesOpen}
        onClose={() => {
          setIsManageTypesOpen(false);
          setEditingTypeIndex(null);
          setManageTypeError('');
        }}
        title="Manage Payment Types"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Add, edit, or remove custom payment type categories for student payment records and receipts.
          </p>

          {manageTypeError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-xs font-semibold">
              {manageTypeError}
            </div>
          )}

          {/* Add New Type Input */}
          <form onSubmit={handleAddPaymentType} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter new payment type name..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md flex items-center gap-1 shadow-xs transition"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>

          {/* Existing Types List */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-60 overflow-y-auto">
            {paymentTypes.map((type, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between gap-2 bg-white dark:bg-slate-800">
                {editingTypeIndex === idx ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingTypeName}
                      onChange={(e) => setEditingTypeName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-red-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditType(idx)}
                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded text-[11px] hover:bg-emerald-700 transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTypeIndex(null)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[11px] hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{type}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditType(idx)}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition"
                        title="Rename Payment Type"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteType(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition"
                        title="Delete Payment Type"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleResetDefaultTypes}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              Reset to default types
            </button>
            <button
              type="button"
              onClick={() => {
                setIsManageTypesOpen(false);
                setEditingTypeIndex(null);
                setManageTypeError('');
              }}
              className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-md text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRM DELETE MODAL */}
      {/* ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={
          deleteTarget
            ? `Are you sure you want to delete this payment record of ₹${deleteTarget.amount || 0} for ${deleteTarget.student?.fullName || 'the student'}? Student fee balance will automatically be recalculated.`
            : 'Are you sure you want to delete this payment record?'
        }
      />
    </MainLayout>
  );
};

export default PaymentListPage;
