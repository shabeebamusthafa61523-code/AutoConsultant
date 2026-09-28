import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import {
  getExpenses,
  getExpenseStats,
  createExpense,
  updateExpense,
  deleteExpense
} from '../../services/expenseService';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RotateCcw,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
  Receipt,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];
const DEFAULT_EXPENSE_CATEGORIES = [
  'Office Expense',
  'Fuel',
  'Vehicle Maintenance',
  'Office Rent',
  'Utilities / Electricity',
  'Instructor Salary',
  'RTO Fees',
  'Equipment / Spares',
  'Marketing / Ads',
  'Other'
];

const ExpenseListPage = () => {
  const { user } = useAuth();
  const canDelete = user?.role === 'Superadmin' || user?.role === 'Admin';

  // Dynamic Expense Categories with localStorage Persistence
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('benz_expense_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load expense categories from localStorage:', e);
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  });

  const saveCategories = (cats) => {
    setCategories(cats);
    try {
      localStorage.setItem('benz_expense_categories', JSON.stringify(cats));
    } catch (e) {
      console.error(e);
    }
  };

  // Manage Categories Modal State
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [manageCatError, setManageCatError] = useState('');

  // Data States
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalVouchers: 0,
    todaysAmount: 0,
    todaysCount: 0,
    byCategory: []
  });

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  // Modal State: Add / Edit Expense
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Office Expense',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });

  // Modal State: Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Expenses & Statistics
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedMethod) params.paymentMethod = selectedMethod;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const [listRes, statsRes] = await Promise.all([
        getExpenses(params),
        getExpenseStats({
          category: selectedCategory,
          startDate: filterStartDate,
          endDate: filterEndDate
        })
      ]);

      if (listRes?.expenses) {
        setExpenses(listRes.expenses);
        setPagination((prev) => ({
          ...prev,
          total: listRes.pagination?.total || 0,
          totalPages: listRes.pagination?.totalPages || 1
        }));
      } else if (Array.isArray(listRes)) {
        setExpenses(listRes);
        setPagination((prev) => ({ ...prev, total: listRes.length, totalPages: 1 }));
      }

      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, selectedCategory, selectedMethod, filterStartDate, filterEndDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedMethod('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Add / Edit Handlers
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: categories[0] || 'Office Expense',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpense(exp);
    const dateFormatted = exp.expenseDate
      ? new Date(exp.expenseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setFormData({
      title: exp.title || '',
      category: exp.category || 'Office Expense',
      amount: exp.amount || '',
      expenseDate: dateFormatted,
      paymentMethod: exp.paymentMethod || 'Cash',
      reference: exp.reference || '',
      notes: exp.notes || ''
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.title.trim()) {
      setFormError('Please enter a valid expense title.');
      return;
    }
    const numAmount = Number(formData.amount);
    if (!numAmount || numAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        amount: numAmount,
        expenseDate: formData.expenseDate,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        notes: formData.notes
      };

      if (editingExpense) {
        await updateExpense(editingExpense._id, payload);
      } else {
        await createExpense(payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to record expense transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  // Category Manager Handlers
  const handleAddCategory = (e) => {
    e?.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setManageCatError('Category name cannot be empty.');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setManageCatError('Category already exists.');
      return;
    }
    const updated = [...categories, trimmed];
    saveCategories(updated);
    setNewCatName('');
    setManageCatError('');
  };

  const handleSaveEditCat = (index) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) {
      setManageCatError('Category name cannot be empty.');
      return;
    }
    const updated = [...categories];
    updated[index] = trimmed;
    saveCategories(updated);
    setEditingCatIndex(null);
    setEditingCatName('');
    setManageCatError('');
  };

  const handleDeleteCat = (index) => {
    if (categories.length <= 1) {
      setManageCatError('At least one category must remain.');
      return;
    }
    const updated = categories.filter((_, i) => i !== index);
    saveCategories(updated);
    setManageCatError('');
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteExpense(deleteTarget._id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete expense record.');
    } finally {
      setDeleting(false);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Voucher ID',
      accessor: 'expenseId',
      cell: (row) => (
        <span className="font-mono font-bold text-red-600 dark:text-red-400">
          {row.expenseId || `EXP-${String(row._id).slice(-4).toUpperCase()}`}
        </span>
      )
    },
    {
      header: 'Title / Description',
      accessor: 'title',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{row.title}</p>
          {row.reference && <p className="text-[11px] font-mono text-slate-500">Ref: {row.reference}</p>}
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      cell: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          {row.category || 'Office Expense'}
        </span>
      )
    },
    {
      header: 'Method',
      accessor: 'paymentMethod',
      cell: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
          {row.paymentMethod || 'Cash'}
        </span>
      )
    },
    {
      header: 'Expense Date',
      accessor: 'expenseDate',
      cell: (row) => (
        <span className="text-slate-700 dark:text-slate-300 font-medium">
          {row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => (
        <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
          ₹{(Number(row.amount) || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded transition"
            title="Edit Expense"
          >
            <Edit size={15} />
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteTarget(row)}
              className="p-1.5 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded transition"
              title="Delete Expense Record"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )
    }
  ];

  const topCategory = stats.byCategory && stats.byCategory.length > 0 ? stats.byCategory[0]._id : 'N/A';

  return (
    <MainLayout>
      <Navbar title="Expenses & Expenditure Ledger" />

      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* ========================================================================= */}
        {/* PAGE HEADER & CONTROLS */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Global Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expense title, voucher ID, reference, or notes..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-md transition shadow-xs"
            >
              Search
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsManageCatsOpen(true)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1 shadow-xs"
              title="Manage Expense Categories"
            >
              <Tag size={14} className="text-amber-500" />
              <span>Manage Categories</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
              title="Export Expenses Ledger to PDF"
            >
              <Printer size={15} className="text-slate-500 dark:text-slate-300" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={15} />
              <span>+ Record Expense</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KPI OVERVIEW (4 STAT CARDS) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Expenditure"
            value={`₹ ${(stats.totalAmount || 0).toLocaleString('en-IN')}`}
            icon={TrendingDown}
            iconBgColor="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            subtitle={`${stats.totalVouchers || 0} Total Expense Vouchers`}
          />
          <StatCard
            title="Today's Expenditure"
            value={`₹ ${(stats.todaysAmount || 0).toLocaleString('en-IN')}`}
            icon={DollarSign}
            iconBgColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            subtitle={`${stats.todaysCount || 0} Vouchers Today`}
          />
          <StatCard
            title="Total Expense Vouchers"
            value={stats.totalVouchers || 0}
            icon={Receipt}
            iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            subtitle="Recorded in system"
          />
          <StatCard
            title="Top Expense Category"
            value={topCategory}
            icon={Tag}
            iconBgColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            subtitle="Highest operational spend"
          />
        </div>

        {/* ========================================================================= */}
        {/* MAIN SECTION: EXPENSE LEDGER */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Expenses Ledger</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {pagination.total} vouchers
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete chronological audit log of office operational costs, fuel, maintenance, salaries, and RTO expenditure.
              </p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">Filters:</span>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-red-500"
            >
              <option value="">All Payment Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>

            {(selectedCategory || selectedMethod || filterStartDate || filterEndDate || search) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-slate-500 hover:text-red-600 font-medium flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Table Data View */}
          {loading ? (
            <div className="p-12">
              <LoadingSpinner message="Fetching expense ledger from database..." />
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchData} />
          ) : expenses.length === 0 ? (
            <EmptyState
              title="No expense records found"
              message={
                search || selectedCategory || filterStartDate
                  ? 'No expense vouchers matched your active filter criteria.'
                  : 'Start recording operational expenses to build your expenditure ledger.'
              }
              actionLabel="+ Record Expense"
              onAction={handleOpenAddModal}
            />
          ) : (
            <>
              <DataTable columns={columns} data={expenses} emptyMessage="No expense records found." />

              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT EXPENSE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense Record' : 'Record New Operational Expense'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 font-semibold">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Expense Title / Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Generator Fuel / Office Electricity Bill"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ref / Bill No / Cheque No
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g. Invoice #9821 or UPI Ref"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional expense notes..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

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
              {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Confirm & Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MANAGE EXPENSE CATEGORIES MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isManageCatsOpen}
        onClose={() => {
          setIsManageCatsOpen(false);
          setEditingCatIndex(null);
          setManageCatError('');
        }}
        title="Manage Expense Categories"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Add, rename, or delete custom expenditure categories for your driving school ledger.
          </p>

          {manageCatError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-xs font-semibold">
              {manageCatError}
            </div>
          )}

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter new category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-red-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>

          <div className="border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-200 dark:divide-slate-700 max-h-60 overflow-y-auto">
            {categories.map((cat, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between gap-2 bg-white dark:bg-slate-800">
                {editingCatIndex === idx ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditCat(idx)}
                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded text-[11px]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCatIndex(null)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cat}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatIndex(idx);
                          setEditingCatName(cat);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                        title="Rename Category"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCat(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                        title="Delete Category"
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
              onClick={() => {
                saveCategories(DEFAULT_EXPENSE_CATEGORIES);
                setManageCatError('');
              }}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              Reset to default categories
            </button>
            <button
              type="button"
              onClick={() => setIsManageCatsOpen(false)}
              className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-md text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={
          deleteTarget
            ? `Are you sure you want to delete expense voucher ${deleteTarget.expenseId || ''} (${deleteTarget.title}) of ₹${deleteTarget.amount || 0}?`
            : 'Are you sure you want to delete this expense record?'
        }
      />
    </MainLayout>
  );
};

export default ExpenseListPage;
