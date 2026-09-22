import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { getPayments, createPayment, updatePayment, deletePayment } from '../../services/paymentService';
import { getStudents } from '../../services/studentService';
import { Plus, Edit, Trash2, CreditCard, DollarSign } from 'lucide-react';

const PaymentListPage = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedStudent, setSelectedStudent] = useState('');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'Fee Payment',
    paymentMethod: 'Cash',
    notes: ''
  });

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedStudent) params.student = selectedStudent;

      const [payRes, stuRes] = await Promise.all([
        getPayments(params),
        getStudents()
      ]);

      setPayments(payRes || []);
      setStudents(stuRes || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStudent]);

  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setFormData({
      student: students[0]?._id || '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentType: 'Fee Payment',
      paymentMethod: 'Cash',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (pay) => {
    setEditingPayment(pay);
    setFormData({
      student: pay.student?._id || pay.student || '',
      paymentDate: pay.paymentDate ? new Date(pay.paymentDate).toISOString().split('T')[0] : '',
      amount: pay.amount || '',
      paymentType: pay.paymentType || 'Fee Payment',
      paymentMethod: pay.paymentMethod || 'Cash',
      notes: pay.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student) {
      alert('Please select a student.');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        amount: Number(formData.amount)
      };

      if (editingPayment) {
        await updatePayment(editingPayment._id, payload);
      } else {
        await createPayment(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save payment record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deletePayment(deleteTarget._id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete payment record');
    } finally {
      setDeleting(false);
    }
  };

  // Total Payments Collected Sum
  const totalCollectedSum = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const columns = [
    {
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.student?.fullName || 'N/A'}</p>
          <p className="text-xs text-slate-400">{row.student?.studentId} &bull; {row.student?.primaryMobile}</p>
        </div>
      )
    },
    {
      header: 'Payment Date',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {new Date(row.paymentDate).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Amount',
      cell: (row) => <span className="font-bold text-emerald-700 text-sm">₹ {row.amount}</span>
    },
    { header: 'Payment Type', accessor: 'paymentType' },
    {
      header: 'Method',
      cell: (row) => <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{row.paymentMethod}</span>
    },
    { header: 'Notes', accessor: 'notes' },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
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
      <Navbar title="Fee & Payments Management" />

      <div className="space-y-4">
        {/* Header Summary & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-4 flex-1">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 max-w-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Students</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.studentId} - {s.fullName}</option>
              ))}
            </select>

            <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 text-xs">
              <span className="text-slate-500 font-medium">Logged Total:</span>
              <span className="font-bold text-emerald-800 text-sm">₹ {totalCollectedSum}</span>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-md transition flex items-center gap-1.5 shrink-0"
          >
            <Plus size={18} />
            Record Payment
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching payment transactions from MongoDB..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payment records found"
            description={selectedStudent ? "No payments found for this student." : "No payment receipts saved in MongoDB yet."}
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Record Payment
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            emptyMessage="No payments found."
          />
        )}
      </div>

      {/* ADD / EDIT PAYMENT MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPayment ? 'Edit Payment Record' : 'Record New Payment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Student *</label>
            <select
              required
              value={formData.student}
              onChange={(e) => setFormData({ ...formData, student: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Student from MongoDB --</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.studentId} - {s.fullName} (Bal: ₹{(s.totalFee || 0) - (s.paidAmount || 0) - (s.advanceAmount || 0)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Amount in Rupees"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Fee Payment">Fee Payment</option>
                <option value="Advance Payment">Advance Payment</option>
                <option value="Registration Fee">Registration Fee</option>
                <option value="Exam Fee">Exam Fee</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Transaction Reference</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Receipt #204"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md"
            >
              {submitting ? 'Saving...' : editingPayment ? 'Update Payment' : 'Save Payment'}
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
        message="Are you sure you want to delete this payment record? Student fee balance will automatically be recalculated."
      />
    </MainLayout>
  );
};

export default PaymentListPage;
