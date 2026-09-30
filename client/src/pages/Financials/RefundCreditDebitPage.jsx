import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { getStudents, updateStudent } from '../../services/studentService';
import { getPayments, createPayment } from '../../services/paymentService';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  X,
  CreditCard,
  TrendingDown,
  TrendingUp,
  FileText,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

const NOTE_TYPES = [
  { id: 'Refund', label: 'Refund Note', desc: 'Fee refund returned to student', color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300' },
  { id: 'Credit Note', label: 'Credit Note', desc: 'Discount / credit balance adjustment', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' },
  { id: 'Debit Note', label: 'Debit Note', desc: 'Additional fee or retest surcharge', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' }
];

const RefundCreditDebitPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Issue Note Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    noteType: 'Refund',
    amount: '',
    paymentMethod: 'Cash',
    reason: '',
    remarks: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [stuRes, payRes] = await Promise.all([
        getStudents({ limit: 500 }),
        getPayments({ limit: 500 })
      ]);

      const stuList = stuRes && stuRes.students ? stuRes.students : (Array.isArray(stuRes) ? stuRes : []);
      const payList = payRes && payRes.payments ? payRes.payments : (Array.isArray(payRes) ? payRes : []);

      setStudents(stuList);
      setPayments(payList);
    } catch (err) {
      console.error('Error fetching financial note records:', err);
      setError('Failed to load financial notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter notes from payments (or custom note entries)
  const notesList = useMemo(() => {
    // Filter payments that represent refunds or credit/debit adjustments
    const list = payments.filter((p) =>
      p.paymentType === 'Refund' ||
      p.paymentType === 'Credit Note' ||
      p.paymentType === 'Debit Note' ||
      p.remarks?.toLowerCase().includes('refund') ||
      p.remarks?.toLowerCase().includes('credit') ||
      p.remarks?.toLowerCase().includes('debit')
    );

    // Format list items
    return list.map((p) => {
      const type = p.paymentType || (p.remarks?.includes('Credit') ? 'Credit Note' : p.remarks?.includes('Debit') ? 'Debit Note' : 'Refund');
      return {
        id: p._id,
        receiptNo: p.receiptNo || `NT-${p._id.slice(-6).toUpperCase()}`,
        date: p.paymentDate || p.createdAt,
        type,
        amount: Number(p.amount) || 0,
        studentName: p.student?.fullName || p.studentName || 'Student',
        studentCode: p.student?.studentId || p.studentId || '',
        phone: p.student?.primaryMobile || '',
        method: p.paymentMethod || 'Cash',
        reason: p.remarks || 'Financial Adjustment',
        status: p.status || 'Approved',
        rawPayment: p
      };
    });
  }, [payments]);

  // Compute Metrics
  const metrics = useMemo(() => {
    let refundTotal = 0;
    let creditTotal = 0;
    let debitTotal = 0;

    notesList.forEach((n) => {
      if (n.type === 'Refund') refundTotal += n.amount;
      else if (n.type === 'Credit Note') creditTotal += n.amount;
      else if (n.type === 'Debit Note') debitTotal += n.amount;
    });

    return {
      refundTotal,
      creditTotal,
      debitTotal,
      count: notesList.length
    };
  }, [notesList]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notesList.filter((n) => {
      if (selectedTypeFilter !== 'ALL' && n.type !== selectedTypeFilter) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        n.studentName?.toLowerCase().includes(term) ||
        n.studentCode?.toLowerCase().includes(term) ||
        n.receiptNo?.toLowerCase().includes(term) ||
        n.reason?.toLowerCase().includes(term)
      );
    });
  }, [notesList, selectedTypeFilter, searchTerm]);

  // Handle Form Submit for New Note
  const handleSubmitNote = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.amount || Number(formData.amount) <= 0) {
      alert('Please select a student and enter a valid positive amount.');
      return;
    }

    try {
      setSubmitting(true);
      const selStudent = students.find((s) => s._id === formData.studentId);
      
      const payload = {
        student: formData.studentId,
        amount: Number(formData.amount),
        paymentType: formData.noteType,
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date(),
        remarks: `${formData.noteType}: ${formData.reason || 'Financial Note'} ${formData.remarks ? `(${formData.remarks})` : ''}`
      };

      await createPayment(payload);

      // Also update student timeline if student exists
      if (selStudent) {
        let updatedPaid = selStudent.paidAmount || 0;
        if (formData.noteType === 'Refund') {
          updatedPaid = Math.max(0, updatedPaid - Number(formData.amount));
        }
        await updateStudent(selStudent._id, { paidAmount: updatedPaid });
      }

      await fetchData();
      setIsModalOpen(false);
      setFormData({
        studentId: '',
        noteType: 'Refund',
        amount: '',
        paymentMethod: 'Cash',
        reason: '',
        remarks: ''
      });
    } catch (err) {
      console.error('Error creating note:', err);
      alert('Failed to issue note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <Navbar title="Refund / Credit / Debit Notes" />

        {/* Top Control Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-6 w-6 text-red-600" />
              Refund, Credit & Debit Note Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Issue and track student fee refunds, credit adjustments, and retest debit charges.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate / note #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:text-red-600 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="h-4 w-4" />
              <span>Issue Note</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Refunds Issued</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">₹{metrics.refundTotal.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Credit Notes</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">₹{metrics.creditTotal.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Debit Notes</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">₹{metrics.debitTotal.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Total Notes Count</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.count}</h3>
            </div>
          </div>
        </div>

        {/* Note Register Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Financial Notes Register
            </h2>

            {/* Type Filters */}
            <div className="flex items-center gap-1.5 text-xs">
              {['ALL', 'Refund', 'Credit Note', 'Debit Note'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTypeFilter(t)}
                  className={`px-3 py-1 font-bold rounded-lg transition ${
                    selectedTypeFilter === t
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner message="Loading financial notes..." />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
              No financial refund, credit, or debit notes recorded yet. Click <strong>+ Issue Note</strong> to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Note # & Date</th>
                    <th className="py-3 px-4">Candidate Details</th>
                    <th className="py-3 px-4">Note Type</th>
                    <th className="py-3 px-4">Amount (₹)</th>
                    <th className="py-3 px-4">Reason / Particulars</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-xs">
                  {filteredNotes.map((n) => {
                    const typeObj = NOTE_TYPES.find((t) => t.id === n.type) || NOTE_TYPES[0];

                    return (
                      <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <div>{n.receiptNo}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {new Date(n.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{n.studentName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{n.studentCode}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${typeObj.color}`}>
                            {n.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                          ₹{n.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium max-w-xs truncate">
                          {n.reason}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                          {n.method}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => window.print()}
                            title="Print Note Slip"
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Issue Note Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Issue Refund / Credit / Debit Note
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Record a financial adjustment for a student.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitNote} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Candidate <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose Candidate --</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.fullName} ({s.studentId}) • {s.primaryMobile}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Note Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.noteType}
                      onChange={(e) => setFormData({ ...formData, noteType: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Refund">Refund Note</option>
                      <option value="Credit Note">Credit Note</option>
                      <option value="Debit Note">Debit Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 500"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / GPay">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Particulars <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Overpayment refund, Retest fee surcharge, Special discount..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
                  >
                    {submitting ? 'Issuing...' : 'Issue Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RefundCreditDebitPage;
