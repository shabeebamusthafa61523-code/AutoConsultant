import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ReceiptModal from '../../components/ReceiptModal';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { getStudents, getStudentById } from '../../services/studentService';
import { getPayments, createPayment } from '../../services/paymentService';
import {
  Search,
  User,
  CreditCard,
  Plus,
  Printer,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Phone,
  BookOpen,
  Receipt,
  DollarSign,
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const StudentLedgerPage = () => {
  const { id: routeStudentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Master Student List for Selector
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // Selected Student & Ledger Data
  const [selectedStudentId, setSelectedStudentId] = useState(routeStudentId || '');
  const [studentData, setStudentData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [error, setError] = useState(null);

  // Print Statement Ref & Modal Ref
  const statementPrintRef = useRef(null);
  const receiptPrintRef = useRef(null);
  const [receiptTarget, setReceiptTarget] = useState(null);

  // Add Payment Modal State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');
  const [paymentTypes, setPaymentTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('benz_payment_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return ['Fee Payment', 'Advance Payment', 'Registration Fee', 'Exam Fee', 'Other'];
  });

  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'Fee Payment',
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });

  // 1. Fetch Students Master Dropdown List
  useEffect(() => {
    const fetchStudentsMaster = async () => {
      try {
        setLoadingStudents(true);
        const res = await getStudents({ limit: 'all' });
        const raw = res?.students || (Array.isArray(res) ? res : []);
        setStudents(raw);

        // If no student selected yet and students exist, pick first student
        if (!selectedStudentId && raw.length > 0) {
          setSelectedStudentId(raw[0]._id);
        }
      } catch (err) {
        console.error('Failed to load student list:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudentsMaster();
  }, []);

  // Update selected student when route param changes
  useEffect(() => {
    if (routeStudentId) {
      setSelectedStudentId(routeStudentId);
    }
  }, [routeStudentId]);

  // 2. Fetch Selected Student Details & Payment Ledger
  const fetchStudentLedger = async (studentId) => {
    if (!studentId) return;
    try {
      setLoadingLedger(true);
      setError(null);

      // Parallel fetch student details and payment ledger
      const [stuRes, payRes] = await Promise.all([
        getStudentById(studentId),
        getPayments({ student: studentId, limit: 'all' })
      ]);

      const candidate = stuRes?.data || stuRes;
      setStudentData(candidate);

      const paymentList = payRes?.payments || (Array.isArray(payRes) ? payRes : []);
      // Sort payments newest first
      paymentList.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      setPayments(paymentList);
    } catch (err) {
      setError(err.message || 'Failed to load student ledger details.');
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentLedger(selectedStudentId);
    }
  }, [selectedStudentId]);

  const handleStudentSelect = (e) => {
    const newId = e.target.value;
    setSelectedStudentId(newId);
    if (newId) {
      navigate(`/student-ledger/${newId}`);
    }
  };

  // Filter students by search term for dropdown
  const filteredStudents = students.filter((s) => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(q)) ||
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      (s.primaryMobile && s.primaryMobile.includes(q))
    );
  });

  // Handle Record New Payment for current student
  const handleOpenAddPayment = () => {
    setPaymentFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentType: paymentTypes[0] || 'Fee Payment',
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
    setPaymentFormError('');
    setIsAddPaymentOpen(true);
  };

  const handleCreatePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const numAmount = Number(paymentFormData.amount);
    if (!numAmount || numAmount <= 0) {
      setPaymentFormError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setSubmittingPayment(true);
      setPaymentFormError('');
      await createPayment({
        student: selectedStudentId,
        amount: numAmount,
        paymentDate: paymentFormData.paymentDate,
        paymentType: paymentFormData.paymentType,
        paymentMethod: paymentFormData.paymentMethod,
        reference: paymentFormData.reference,
        notes: paymentFormData.notes
      });
      setIsAddPaymentOpen(false);
      // Refresh ledger data
      fetchStudentLedger(selectedStudentId);
    } catch (err) {
      setPaymentFormError(err.message || 'Failed to record student payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Print Full Statement
  const handlePrintStatement = () => {
    window.print();
  };

  // Printable Receipt handler
  const handlePrintReceipt = () => {
    window.print();
  };

  // Financial Calculations
  const totalFee = Number(studentData?.totalFee) || 0;
  const advanceAmount = Number(studentData?.advanceAmount) || 0;
  const paidAmount = Number(studentData?.paidAmount) || 0;
  const pendingAmount = Math.max(0, totalFee - (paidAmount + advanceAmount));

  // Table Columns
  const columns = [
    {
      header: 'Receipt No / ID',
      accessor: 'receiptNo',
      cell: (row) => (
        <span className="font-mono font-bold text-red-600 dark:text-red-400">
          {row.receiptNo || row.paymentId || `REC-${String(row._id).slice(-4).toUpperCase()}`}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: 'paymentDate',
      cell: (row) => (
        <span className="text-slate-700 dark:text-slate-300 font-medium">
          {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '—'}
        </span>
      )
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
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
          {row.paymentMethod || 'Cash'}
        </span>
      )
    },
    {
      header: 'Amount Paid',
      accessor: 'amount',
      cell: (row) => (
        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
          ₹{(Number(row.amount) || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Balance After',
      accessor: 'balanceAfter',
      cell: (row) => (
        <span className="font-mono text-slate-600 dark:text-slate-400">
          ₹{(Number(row.balanceAfter) || 0).toLocaleString('en-IN')}
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

  return (
    <MainLayout>
      <Navbar title="Student Ledger & Financial Statement" />

      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* ========================================================================= */}
        {/* TOP TOOLBAR: Student Selector & Search */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="text-red-600 dark:text-red-400 shrink-0" size={22} />
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Select Candidate:
              </label>
            </div>

            {/* Candidate Dropdown Selector */}
            <div className="relative flex-1 max-w-md">
              <select
                value={selectedStudentId}
                onChange={handleStudentSelect}
                disabled={loadingStudents}
                className="w-full pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Select Student / Candidate --</option>
                {filteredStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.fullName} ({s.studentId || 'No ID'}) - {s.primaryMobile || 'No Mobile'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Print Statement & Record Payment */}
          {studentData && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrintStatement}
                className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
                title="Print Candidate Statement"
              >
                <Printer size={15} className="text-slate-500" />
                <span>Print Statement</span>
              </button>

              <button
                type="button"
                onClick={handlePrintStatement}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
                title="Export Statement to PDF"
              >
                <Download size={15} />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddPayment}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus size={15} />
                <span>+ Record Payment</span>
              </button>
            </div>
          )}
        </div>

        {/* Loading Spinner for Ledger */}
        {loadingLedger ? (
          <div className="p-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <LoadingSpinner message="Fetching candidate financial ledger..." />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => fetchStudentLedger(selectedStudentId)} />
        ) : !studentData ? (
          <EmptyState
            title="No Student Selected"
            message="Please select a student from the dropdown above to view their financial ledger and payment receipts history."
            icon={User}
          />
        ) : (
          <>
            {/* ========================================================================= */}
            {/* CANDIDATE HEADER SUMMARY CARD */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-lg shrink-0">
                    {studentData.fullName ? studentData.fullName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {studentData.fullName}
                      </h1>
                      <Badge type="status" value={studentData.status || 'Active'} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        ID: {studentData.studentId || '—'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Phone size={13} />
                        {studentData.primaryMobile || '—'}
                      </span>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Course: {studentData.coursePackage || studentData.vehicleType || 'LMV Fresh Licence'}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/students/${studentData._id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shrink-0"
                >
                  <span>Full Profile</span>
                  <ExternalLink size={14} />
                </Link>
              </div>

              {/* FINANCIAL METRICS GRID (4 CARDS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Agreed Fee */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Agreed Course Fee
                  </span>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                    ₹{totalFee.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Total Amount Paid */}
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Total Paid to Date
                  </span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    ₹{paidAmount.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    ({payments.length} Payments Received)
                  </span>
                </div>

                {/* Advance Amount */}
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/60">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                    Advance / Initial Deposit
                  </span>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    ₹{advanceAmount.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Outstanding Balance */}
                <div
                  className={`p-3.5 rounded-lg border ${
                    pendingAmount > 0
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider block ${
                      pendingAmount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    Remaining Due
                  </span>
                  <p
                    className={`text-xl font-black font-mono mt-0.5 ${
                      pendingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    ₹{pendingAmount.toLocaleString('en-IN')}
                  </p>
                  <span
                    className={`text-[10px] font-bold block mt-0.5 ${
                      pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {pendingAmount > 0 ? '⚠️ Pending Balance' : '✓ Fully Cleared'}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAYMENT HISTORY LEDGER TABLE */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Payment History & Receipts Ledger</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {payments.length} transactions
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Complete itemized record of tuition fee receipts, advance deposits, and balances for this candidate.
                  </p>
                </div>
              </div>

              {payments.length === 0 ? (
                <EmptyState
                  title="No payment records found for this candidate"
                  message="No fee payments or receipts have been recorded for this student yet."
                  actionLabel="+ Record First Payment"
                  onAction={handleOpenAddPayment}
                />
              ) : (
                <DataTable columns={columns} data={payments} emptyMessage="No payment records found." />
              )}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RECORD NEW PAYMENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        title={`Record Payment for ${studentData?.fullName || 'Student'}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreatePaymentSubmit} className="space-y-4 text-xs">
          {paymentFormError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 font-semibold">
              {paymentFormError}
            </div>
          )}

          {/* Student Info Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">{studentData?.fullName}</p>
              <p className="text-[11px] text-slate-500 font-mono">ID: {studentData?.studentId}</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block">Current Due</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">₹{pendingAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount Paid (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 2000"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentFormData.paymentType}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {paymentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Ref / Notes</label>
            <input
              type="text"
              placeholder="e.g. UPI Ref #987123 / Receipt remarks"
              value={paymentFormData.reference}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddPaymentOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPayment}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded disabled:opacity-50"
            >
              {submittingPayment ? 'Saving...' : 'Save & Record Payment'}
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
        student={studentData}
      />
    </MainLayout>
  );
};

export default StudentLedgerPage;
