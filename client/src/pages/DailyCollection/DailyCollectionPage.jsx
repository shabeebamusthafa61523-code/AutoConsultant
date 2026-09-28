import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import ReceiptModal from '../../components/ReceiptModal';
import { getPayments, getPaymentStats, exportPaymentsCSV } from '../../services/paymentService';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Receipt,
  DollarSign,
  CreditCard,
  Wallet,
  CheckCircle2,
  Search,
  Filter
} from 'lucide-react';

const DailyCollectionPage = () => {
  // Date State (Defaults to Today's ISO Date)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data States
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalCount: 0,
    cashTotal: 0,
    digitalTotal: 0,
    byMethod: []
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);

  // Search / Filter inside the day
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch Payments for the Selected Date
  const fetchDailyData = async (dateStr) => {
    if (!dateStr) return;
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: dateStr,
        endDate: dateStr,
        limit: 'all'
      };

      const [listRes, statsRes] = await Promise.all([
        getPayments(params),
        getPaymentStats({ startDate: dateStr, endDate: dateStr })
      ]);

      const rawPayments = listRes?.payments || (Array.isArray(listRes) ? listRes : []);
      // Sort newest first
      rawPayments.sort((a, b) => new Date(b.createdAt || b.paymentDate) - new Date(a.createdAt || a.paymentDate));
      setPayments(rawPayments);

      // Compute Method Breakdown (Cash vs Digital)
      let cash = 0;
      let digital = 0;
      const methodMap = {};

      rawPayments.forEach((p) => {
        const amt = Number(p.amount) || 0;
        const method = p.paymentMethod || 'Cash';
        methodMap[method] = (methodMap[method] || 0) + amt;

        if (method.toLowerCase() === 'cash') {
          cash += amt;
        } else {
          digital += amt;
        }
      });

      setStats({
        totalCollected: statsRes?.totalCollected || rawPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        totalCount: rawPayments.length,
        cashTotal: cash,
        digitalTotal: digital,
        byMethod: Object.entries(methodMap).map(([method, total]) => ({ method, total }))
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch daily collection records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // CSV Export for the day
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await exportPaymentsCSV({ startDate: selectedDate, endDate: selectedDate });
    } catch (err) {
      alert(err.message || 'Failed to export daily collection CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Filtered Payments Table Data
  const filteredPayments = payments.filter((p) => {
    if (methodFilter && p.paymentMethod !== methodFilter) return false;
    if (typeFilter && p.paymentType !== typeFilter) return false;
    return true;
  });

  // Table Columns
  const columns = [
    {
      header: 'Receipt No',
      accessor: 'receiptNo',
      cell: (row) => (
        <span className="font-mono font-bold text-red-600 dark:text-red-400">
          {row.receiptNo || row.paymentId || `REC-${String(row._id).slice(-4).toUpperCase()}`}
        </span>
      )
    },
    {
      header: 'Candidate Name',
      accessor: 'student',
      cell: (row) => {
        const stu = row.student || {};
        return (
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{stu.fullName || '—'}</p>
            <p className="text-[11px] text-slate-500 font-mono">ID: {stu.studentId || '—'}</p>
          </div>
        );
      }
    },
    {
      header: 'Payment Type',
      accessor: 'paymentType',
      cell: (row) => <Badge type="status" value={row.paymentType || 'Fee Payment'} />
    },
    {
      header: 'Method',
      accessor: 'paymentMethod',
      cell: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
            row.paymentMethod === 'Cash'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200'
          }`}
        >
          {row.paymentMethod || 'Cash'}
        </span>
      )
    },
    {
      header: 'Amount Collected',
      accessor: 'amount',
      cell: (row) => (
        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
          ₹{(Number(row.amount) || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Recorded By',
      accessor: 'recordedBy',
      cell: (row) => (
        <span className="text-slate-600 dark:text-slate-400 text-xs">
          {row.recordedBy?.name || 'Staff'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <button
          type="button"
          onClick={() => setReceiptTarget(row)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 transition"
          title="View & Print Receipt"
        >
          <Receipt size={13} />
          <span>Receipt</span>
        </button>
      )
    }
  ];

  const formattedDateTitle = new Date(selectedDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <MainLayout>
      <Navbar title="Daily Collection & Cash Register" />

      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* ========================================================================= */}
        {/* TOP TOOLBAR: Date Selector & EOD Actions */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={20} className="text-red-600 dark:text-red-400 shrink-0" />

            {/* Date Nav Controls */}
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleNextDay}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-md transition"
            >
              Today
            </button>
          </div>

          {/* Action Buttons: Print EOD Report & Export CSV */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Download size={15} className="text-slate-500" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
              title="Print End-Of-Day Cash Collection Sheet"
            >
              <Printer size={15} />
              <span>Print EOD Sheet</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FINANCIAL SUMMARY CARDS (4 CARDS) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Collection"
            value={`₹ ${(stats.totalCollected || 0).toLocaleString('en-IN')}`}
            icon={DollarSign}
            iconBgColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            subtitle={`${stats.totalCount || 0} Receipts Collected`}
          />

          <StatCard
            title="Cash In Hand"
            value={`₹ ${(stats.cashTotal || 0).toLocaleString('en-IN')}`}
            icon={Wallet}
            iconBgColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            subtitle="Physical cash transactions"
          />

          <StatCard
            title="Digital / Bank Collections"
            value={`₹ ${(stats.digitalTotal || 0).toLocaleString('en-IN')}`}
            icon={CreditCard}
            iconBgColor="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            subtitle="UPI, Bank Transfer, Card"
          />

          <StatCard
            title="Total Receipts Recorded"
            value={stats.totalCount || 0}
            icon={Receipt}
            iconBgColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            subtitle={formattedDateTitle}
          />
        </div>

        {/* ========================================================================= */}
        {/* TABLE SECTION: DAILY COLLECTION REGISTER */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Daily Cash & Collection Register</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  {formattedDateTitle}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Itemized transaction record of all student payments and receipts collected on this date.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">Filter Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
            >
              <option value="">All Methods (Cash & Digital)</option>
              <option value="Cash">Cash Only</option>
              <option value="UPI">UPI Only</option>
              <option value="Bank Transfer">Bank Transfer Only</option>
              <option value="Card">Card Only</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
            >
              <option value="">All Payment Types</option>
              <option value="Fee Payment">Fee Payment</option>
              <option value="Advance Payment">Advance Payment</option>
              <option value="Registration Fee">Registration Fee</option>
              <option value="Exam Fee">Exam Fee</option>
            </select>
          </div>

          {/* Table Data View */}
          {loading ? (
            <div className="p-12">
              <LoadingSpinner message="Fetching daily collections from cash register..." />
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={() => fetchDailyData(selectedDate)} />
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              title={`No collections recorded for ${selectedDate}`}
              message="No student fee receipts or payments were recorded on this date."
              icon={Receipt}
            />
          ) : (
            <DataTable columns={columns} data={filteredPayments} emptyMessage="No receipts found for this date." />
          )}
        </div>
      </div>

      {/* UNIFIED PRINTABLE RECEIPT MODAL */}
      <ReceiptModal
        isOpen={Boolean(receiptTarget)}
        onClose={() => setReceiptTarget(null)}
        payment={receiptTarget}
      />
    </MainLayout>
  );
};

export default DailyCollectionPage;
