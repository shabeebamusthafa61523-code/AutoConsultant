import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';
import { getStudentDetails } from '../../services/studentService';
import { createClass } from '../../services/classService';
import { createPayment } from '../../services/paymentService';
import { getUsers } from '../../services/userService';
import { ArrowLeft, Edit, Plus, CheckCircle, XCircle, CreditCard, Calendar } from 'lucide-react';

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick Add Class modal state
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classFormData, setClassFormData] = useState({
    classDate: new Date().toISOString().split('T')[0],
    instructor: '',
    vehicleNo: '',
    trainingType: 'Practical Driving',
    km: 10,
    hours: 1,
    notes: ''
  });

  // Quick Add Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'Fee Payment',
    paymentMethod: 'Cash',
    notes: ''
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, userRes] = await Promise.all([
        getStudentDetails(id),
        getUsers()
      ]);

      setDetails(res);
      const eligibleInstructors = (userRes || []).filter(u => u.role !== 'Superadmin');
      setInstructors(eligibleInstructors);

      if (res.student?.batch?.instructor) {
        setClassFormData(prev => ({ ...prev, instructor: res.student.batch.instructor }));
      } else if (eligibleInstructors.length > 0) {
        setClassFormData(prev => ({ ...prev, instructor: eligibleInstructors[0].name }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch student details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      setClassSubmitting(true);
      await createClass({
        ...classFormData,
        student: id,
        km: Number(classFormData.km) || 0,
        hours: Number(classFormData.hours) || 1
      });
      setClassModalOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to record class');
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!paymentFormData.amount || Number(paymentFormData.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    try {
      setPaymentSubmitting(true);
      await createPayment({
        ...paymentFormData,
        student: id,
        amount: Number(paymentFormData.amount)
      });
      setPaymentModalOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Student Profile" />
        <LoadingSpinner message="Fetching student profile & history..." />
      </MainLayout>
    );
  }

  if (error || !details) {
    return (
      <MainLayout>
        <Navbar title="Student Profile" />
        <ErrorMessage message={error || 'Student not found'} onRetry={fetchDetails} />
      </MainLayout>
    );
  }

  const { student, classes, payments, feeSummary } = details;
  const docs = student.documentReadiness || {};

  const classColumns = [
    {
      header: 'Date',
      cell: (row) => new Date(row.classDate).toLocaleDateString()
    },
    { header: 'Instructor', accessor: 'instructor' },
    {
      header: 'Vehicle No.',
      cell: (row) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.vehicleNo}</span>
    },
    { header: 'Training Type', accessor: 'trainingType' },
    { header: 'KM', cell: (row) => `${row.km} KM` },
    { header: 'Hours', cell: (row) => `${row.hours} hr(s)` },
    { header: 'Notes', accessor: 'notes' }
  ];

  const paymentColumns = [
    {
      header: 'Date',
      cell: (row) => new Date(row.paymentDate).toLocaleDateString()
    },
    {
      header: 'Amount',
      cell: (row) => <span className="font-bold text-emerald-700">₹ {row.amount}</span>
    },
    { header: 'Type', accessor: 'paymentType' },
    {
      header: 'Method',
      cell: (row) => <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{row.paymentMethod}</span>
    },
    { header: 'Notes', accessor: 'notes' }
  ];

  return (
    <MainLayout>
      <Navbar title={`Student Profile: ${student.fullName} (${student.studentId})`} />

      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/students"
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back to Directory
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setClassModalOpen(true)}
              className="px-3.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-red-100"
            >
              <Plus size={16} /> Record Class
            </button>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-emerald-100"
            >
              <Plus size={16} /> Record Payment
            </button>
            <button
              onClick={() => navigate(`/students/${student._id}/edit`)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-md transition flex items-center gap-1.5"
            >
              <Edit size={16} /> Edit Student
            </button>
          </div>
        </div>

        {/* Student Info Card & Dynamic Fee Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                  {student.studentId}
                </span>
                <h2 className="text-xl font-bold text-slate-800 mt-1">{student.fullName}</h2>
                <p className="text-xs text-slate-500">Source / Alias: {student.aliasSourceName || 'N/A'}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                student.currentStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {student.currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Primary Mobile</span>
                <span className="font-semibold text-slate-800 font-mono">{student.primaryMobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Alternate Mobile</span>
                <span className="font-semibold text-slate-800 font-mono">{student.alternateMobile || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Vehicle & Licence</span>
                <span className="font-semibold text-slate-800">{student.vehicleType} ({student.licenceCategory || 'LMV'})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assigned Batch</span>
                <span className="font-semibold text-indigo-700">{student.batch ? student.batch.name : 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Workflow Stage</span>
                <span className="font-semibold text-slate-800">{student.workflowStage}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Application No.</span>
                <span className="font-semibold text-slate-800 font-mono">{student.applicationNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Next Action</span>
                <span className="font-semibold text-slate-800">{student.nextAction || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Follow-up Date</span>
                <span className="font-semibold text-slate-800">{student.followUpDate ? new Date(student.followUpDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Test Date / Status</span>
                <span className="font-semibold text-purple-700">
                  {student.testDate ? `${new Date(student.testDate).toLocaleDateString()} (${student.testStatus})` : 'Not Scheduled'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Application Info</span>
                <span className="font-semibold text-slate-800">
                  {student.application || (student.newApplication ? 'New Application' : 'Regular')}
                  {student.applicationOpen !== undefined && ` (${student.applicationOpen ? 'Open' : 'Closed'})`}
                </span>
              </div>
            </div>

            {/* Document Readiness Badges */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Document Readiness</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { label: 'Aadhaar Verified', status: docs.aadhaarVerified },
                  { label: 'Photo Verified', status: docs.photoVerified },
                  { label: 'Address Proof', status: docs.addressProofVerified },
                  { label: 'Blood Group', status: docs.bloodGroupRecorded },
                  { label: 'Form 15 Ready', status: docs.form15Ready }
                ].map((item, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                      item.status ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {item.status ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Fee Balance Summary */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-600" />
                Dynamic Fee Summary
              </h3>
              <div className="space-y-3 mt-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Total Fee:</span>
                  <span className="font-bold text-slate-800">₹ {feeSummary.totalFee}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid Amount:</span>
                  <span className="font-bold text-emerald-600">₹ {feeSummary.paidAmount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Advance Paid:</span>
                  <span className="font-bold text-blue-600">₹ {feeSummary.advanceAmount}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Calculated Balance:</span>
                  <span className={`text-xl font-bold ${feeSummary.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹ {feeSummary.balance}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-md transition flex items-center justify-center gap-2 mt-4"
            >
              <Plus size={16} /> Record New Payment
            </button>
          </div>
        </div>

        {/* Class History Section */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              Class History ({classes.length} Sessions)
            </h3>
            <button
              onClick={() => setClassModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition flex items-center gap-1.5"
            >
              <Plus size={16} /> + Add Class
            </button>
          </div>
          <DataTable
            columns={classColumns}
            data={classes}
            emptyMessage="No classes recorded yet for this student."
          />
        </div>

        {/* Payment History Section */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-600" />
              Payment History ({payments.length} Transactions)
            </h3>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition flex items-center gap-1.5"
            >
              <Plus size={16} /> + Add Payment
            </button>
          </div>
          <DataTable
            columns={paymentColumns}
            data={payments}
            emptyMessage="No payments recorded yet for this student."
          />
        </div>
      </div>

      {/* QUICK ADD CLASS MODAL */}
      <Modal isOpen={classModalOpen} onClose={() => setClassModalOpen(false)} title={`Add Class for ${student.fullName}`}>
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Class Date</label>
              <input
                type="date"
                required
                value={classFormData.classDate}
                onChange={(e) => setClassFormData({ ...classFormData, classDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Instructor *</label>
              <select
                required
                value={classFormData.instructor}
                onChange={(e) => setClassFormData({ ...classFormData, instructor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800"
              >
                <option value="">-- Select Instructor --</option>
                {instructors.map((u) => (
                  <option key={u._id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle No.</label>
              <input
                type="text"
                value={classFormData.vehicleNo}
                onChange={(e) => setClassFormData({ ...classFormData, vehicleNo: e.target.value })}
                placeholder="KL-01-AB-1234"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Training Type</label>
              <select
                value={classFormData.trainingType}
                onChange={(e) => setClassFormData({ ...classFormData, trainingType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Practical Driving">Practical Driving</option>
                <option value="Simulator">Simulator</option>
                <option value="Theory / Rules">Theory / Rules</option>
                <option value="Reverse Parking">Reverse Parking</option>
                <option value="Track Driving">Track Driving</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">KM Driven</label>
              <input
                type="number"
                min="0"
                value={classFormData.km}
                onChange={(e) => setClassFormData({ ...classFormData, km: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (Hours)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={classFormData.hours}
                onChange={(e) => setClassFormData({ ...classFormData, hours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Feedback</label>
            <input
              type="text"
              value={classFormData.notes}
              onChange={(e) => setClassFormData({ ...classFormData, notes: e.target.value })}
              placeholder="e.g. Reverse parking practice"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setClassModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={classSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md"
            >
              {classSubmitting ? 'Saving...' : 'Save Class Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK ADD PAYMENT MODAL */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Record Payment for ${student.fullName}`}>
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Type</label>
              <select
                value={paymentFormData.paymentType}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
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
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Transaction Ref</label>
            <input
              type="text"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              placeholder="e.g. Receipt #104 or UPI Ref"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md"
            >
              {paymentSubmitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default StudentDetailPage;
