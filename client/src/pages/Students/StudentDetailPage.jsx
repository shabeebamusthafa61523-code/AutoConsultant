import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import TransferStudentModal from '../../components/TransferStudentModal';
import {
  getStudentDetails,
  updateStudentStatus,
  transferStudentBatch,
  addStudentDocument,
  updateDocumentStatus
} from '../../services/studentService';
import { createClass } from '../../services/classService';
import { createPayment } from '../../services/paymentService';
import { getBatches } from '../../services/batchService';
import { getUsers } from '../../services/userService';
import {
  ArrowLeft,
  Edit,
  Plus,
  CheckCircle,
  XCircle,
  CreditCard,
  Calendar,
  Layers,
  ArrowRightLeft,
  Clock,
  Phone,
  MapPin,
  ShieldCheck,
  FileText,
  Activity,
  Award,
  Check,
  X
} from 'lucide-react';

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [batches, setBatches] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Quick Add Class modal state
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classFormData, setClassFormData] = useState({
    classDate: new Date().toISOString().split('T')[0],
    instructor: '',
    vehicleNo: 'KL-01-AB-1234',
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

  // Transfer Batch Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Add Document Modal State
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docFormData, setDocFormData] = useState({
    docType: 'Aadhaar Card',
    fileName: '',
    verificationStatus: 'Verified',
    remarks: ''
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, batchRes, userRes] = await Promise.all([
        getStudentDetails(id),
        getBatches(),
        getUsers()
      ]);

      setDetails(res);
      setBatches(batchRes || []);

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

  const handleTransferBatch = async ({ targetBatchId, reason }) => {
    await transferStudentBatch(id, { newBatchId: targetBatchId, reason });
    fetchDetails();
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStudentStatus(id, { status: newStatus });
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to update student status');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    try {
      setDocSubmitting(true);
      await addStudentDocument(id, docFormData);
      setDocModalOpen(false);
      setDocFormData({ docType: 'Aadhaar Card', fileName: '', verificationStatus: 'Verified', remarks: '' });
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to add document record');
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleToggleDocVerification = async (docId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'Verified' ? 'Pending' : 'Verified';
      await updateDocumentStatus(id, docId, { verificationStatus: nextStatus });
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to update document verification');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Student Profile" />
        <LoadingSpinner message="Fetching comprehensive student profile & history..." />
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

  const { student, classes = [], payments = [], attendance = [], stats = {}, feeSummary = {} } = details;
  const docs = student.documentReadiness || {};

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'personal', label: 'Personal & Admission' },
    { id: 'licence', label: 'Licence & RTO' },
    { id: 'training', label: `Training (${classes.length})` },
    { id: 'attendance', label: `Attendance (${attendance.length})` },
    { id: 'fees', label: `Fees (₹${feeSummary.balance})` },
    { id: 'documents', label: `Documents (${student.documents?.length || 0})` },
    { id: 'timeline', label: `Activity Timeline (${student.timeline?.length || 0})` }
  ];

  return (
    <MainLayout>
      <Navbar title={`Student Profile: ${student.fullName} (${student.studentId})`} />

      <div className="space-y-5 max-w-7xl mx-auto pb-12">
        {/* Navigation & Header Actions Top Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <Link
            to="/students"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={16} /> Back to Student Directory
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setClassModalOpen(true)}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-red-200 dark:border-red-800"
            >
              <Plus size={15} /> Record Class
            </button>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
            >
              <Plus size={15} /> Record Payment
            </button>
            <button
              onClick={() => setTransferModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
            >
              <ArrowRightLeft size={15} /> Transfer Batch
            </button>
            <button
              onClick={() => navigate(`/students/${student._id}/edit`)}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-md transition flex items-center gap-1.5"
            >
              <Edit size={15} /> Edit Student
            </button>
          </div>
        </div>

        {/* Student Profile Identity Card Banner */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-xl flex items-center justify-center border-2 border-red-200 dark:border-red-800 shadow-inner">
                {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{student.fullName}</h1>
                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded">
                    {student.studentId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">{student.primaryMobile}</strong>
                  </span>
                  {student.address?.place && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" />
                      {student.address.place}, {student.address.district || 'Malappuram'}
                    </span>
                  )}
                  <span>&bull;</span>
                  <span>Enrolled: {student.coursePackage || `${student.vehicleType} (${student.licenceCategory || 'LMV'})`}</span>
                </div>
              </div>
            </div>

            {/* Quick Status Dropdown & Fee Indicator */}
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Student Status</label>
                <select
                  value={student.currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                >
                  <option value="New">New</option>
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
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Fee Balance</span>
                <span className={`text-base font-black ${feeSummary.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  ₹ {feeSummary.balance}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700 flex overflow-x-auto gap-2 bg-white dark:bg-slate-800 px-3 pt-2 rounded-t-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Top Operational Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Classes Completed</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {stats.training?.totalClasses || 0} <span className="text-xs font-normal text-slate-400">Sessions</span>
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  {stats.training?.roadCount || 0} Road &bull; {stats.training?.hTrackCount || 0} H-Track
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Attendance Rate</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.attendance?.percentage || 0}%
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  {stats.attendance?.present || 0} / {stats.attendance?.total || 0} Classes
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Distance & Hours</span>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {stats.training?.totalKm || 0} <span className="text-xs font-normal text-slate-400">KM</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {stats.training?.totalHours || 0} Driving Hours
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">RTO Test Date</span>
                <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  {student.testDate ? new Date(student.testDate).toLocaleDateString() : 'Not Fixed'}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  Status: {student.testStatus || 'Not Scheduled'}
                </p>
              </div>
            </div>

            {/* Current Batch Info & Key Dates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Batch Card */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Layers size={16} className="text-red-600" />
                    Current Batch Enrolment
                  </h3>
                  <button
                    onClick={() => setTransferModalOpen(true)}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                  >
                    <ArrowRightLeft size={13} /> Change
                  </button>
                </div>

                {student.batch ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Batch Name</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.batch.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Session & Timings</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {student.batch.startTime} - {student.batch.endTime} ({student.batch.session || 'Session'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Instructor Assigned</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{student.batch.instructor || 'Unassigned'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 rounded-md text-center text-xs space-y-2">
                    <p className="text-amber-800 dark:text-amber-300 font-bold">No Batch Currently Assigned</p>
                    <button
                      onClick={() => setTransferModalOpen(true)}
                      className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700"
                    >
                      Assign to Batch
                    </button>
                  </div>
                )}
              </div>

              {/* RTO Pipeline Snapshot */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  RTO Pipeline Snapshot
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Application No:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student.applicationNo || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Learner Licence (LL):</span>
                    <Badge type="status" value={student.learnerLicence?.status || 'Not Applied'} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Driving Licence (DL):</span>
                    <Badge type="status" value={student.drivingLicence?.status || 'Pending'} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Training Stage:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{student.workflowStage || 'Registration'}</span>
                  </div>
                </div>
              </div>

              {/* Document Readiness Card */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <FileText size={16} className="text-red-600" />
                  Document Readiness Checklist
                </h3>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { label: 'Aadhaar / ID Verified', ok: docs.aadhaarVerified },
                    { label: 'Photo Verified', ok: docs.photoVerified },
                    { label: 'Address Proof', ok: docs.addressProofVerified },
                    { label: 'Blood Group Recorded', ok: docs.bloodGroupRecorded },
                    { label: 'Form 15 Ready', ok: docs.form15Ready }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                      <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                      {item.ok ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <Check size={14} /> Ready
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                          <X size={14} /> Missing
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PERSONAL & ADMISSION */}
        {/* ========================================================================= */}
        {activeTab === 'personal' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                Personal Identity & Demographics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Gender</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.gender || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date of Birth</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Blood Group</span>
                  <span className="font-bold text-red-600 dark:text-red-400 font-mono">{student.bloodGroup || 'Not Recorded'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                Contact & Residential Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Primary Mobile</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{student.primaryMobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Alternate Mobile</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{student.alternateMobile || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Place / Locality</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.address?.place || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">District & Pincode</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.address?.district || 'Malappuram'} {student.address?.pincode ? `- ${student.address.pincode}` : ''}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block font-medium">House / Address</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.address?.houseName || '—'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block font-medium">Emergency Contact / Guardian</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.emergencyContact?.name ? `${student.emergencyContact.name} (${student.emergencyContact.relation || 'Guardian'}) - ${student.emergencyContact.phone || ''}` : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                Admission & Registration
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Registration Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(student.registrationDate || student.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Course Package</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{student.coursePackage || 'LMV+MCWG'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admission No</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{student.admissionNumber || student.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Referral / Source (Alias)</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.aliasSourceName || 'Direct Walk-in'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LICENCE & RTO */}
        {/* ========================================================================= */}
        {activeTab === 'licence' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Learner Licence Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Learner Licence (LL)</h3>
                <Badge type="status" value={student.learnerLicence?.status || 'Not Applied'} />
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">LL Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {student.learnerLicence?.llNumber || 'Pending Application'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Issue Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.learnerLicence?.issueDate ? new Date(student.learnerLicence.issueDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Expiry Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.learnerLicence?.expiryDate ? new Date(student.learnerLicence.expiryDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Remarks</span>
                  <p className="text-slate-600 dark:text-slate-400">{student.learnerLicence?.remarks || 'No notes'}</p>
                </div>
              </div>
            </div>

            {/* Driving Test Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">RTO Driving Test</h3>
                <Badge type="status" value={student.testStatus || 'Not Scheduled'} />
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Scheduled Test Date</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400 text-sm">
                    {student.testDate ? new Date(student.testDate).toLocaleDateString() : 'Not Scheduled'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Test Type</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.testDetails?.testType || 'Road & H Track'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Test Attempts</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.testDetails?.attempts || 1} Attempt(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Remarks</span>
                  <p className="text-slate-600 dark:text-slate-400">{student.testDetails?.remarks || student.nextAction || 'No test notes'}</p>
                </div>
              </div>
            </div>

            {/* Driving Licence Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Driving Licence (DL)</h3>
                <Badge type="status" value={student.drivingLicence?.status || 'Pending'} />
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">DL Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {student.drivingLicence?.dlNumber || 'Pending Test Completion'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Issue Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.drivingLicence?.issueDate ? new Date(student.drivingLicence.issueDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Delivery Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {student.drivingLicence?.deliveryDate ? new Date(student.drivingLicence.deliveryDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Remarks</span>
                  <p className="text-slate-600 dark:text-slate-400">{student.drivingLicence?.remarks || 'Awaiting issuance'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TRAINING & PROGRESS */}
        {/* ========================================================================= */}
        {activeTab === 'training' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Practical Driving Sessions ({classes.length})
                </h3>
                <p className="text-xs text-slate-400">Total KM Driven: {stats.training?.totalKm || 0} KM &bull; Hours: {stats.training?.totalHours || 0} hrs</p>
              </div>
              <button
                onClick={() => setClassModalOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={15} /> + Add Class
              </button>
            </div>

            <DataTable
              columns={[
                {
                  header: 'Date',
                  cell: (row) => new Date(row.classDate).toLocaleDateString()
                },
                { header: 'Instructor', accessor: 'instructor' },
                {
                  header: 'Vehicle',
                  cell: (row) => <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{row.vehicleNo}</span>
                },
                {
                  header: 'Training Type',
                  cell: (row) => <Badge type="class" value={row.trainingType} />
                },
                { header: 'KM Driven', cell: (row) => `${row.km} KM` },
                { header: 'Duration', cell: (row) => `${row.hours} hr(s)` },
                { header: 'Notes / Remarks', accessor: 'notes' }
              ]}
              data={classes}
              emptyMessage="No driving class sessions recorded yet for this student."
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ATTENDANCE */}
        {/* ========================================================================= */}
        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Attendance Records ({attendance.length} Days)
                </h3>
                <p className="text-xs text-slate-400">
                  Present: {stats.attendance?.present || 0} &bull; Attendance Rate: {stats.attendance?.percentage || 0}%
                </p>
              </div>
            </div>

            <DataTable
              columns={[
                {
                  header: 'Date',
                  cell: (row) => new Date(row.date).toLocaleDateString()
                },
                {
                  header: 'Status',
                  cell: (row) => (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      row.status === 'Present'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : row.status === 'Excused'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {row.status}
                    </span>
                  )
                },
                { header: 'Class Type', accessor: 'classType' },
                { header: 'Instructor', accessor: 'instructor' },
                { header: 'Remarks', accessor: 'remarks' }
              ]}
              data={attendance}
              emptyMessage="No attendance sessions logged for this candidate yet."
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: FEES & PAYMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'fees' && (
          <div className="space-y-5">
            {/* Fee Math Breakdown */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Total Course Fee</span>
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">₹ {feeSummary.totalFee}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Paid Amount</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹ {feeSummary.paidAmount}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Advance Deposit</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">₹ {feeSummary.advanceAmount}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Outstanding Balance</span>
                <span className={`text-lg font-black ${feeSummary.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  ₹ {feeSummary.balance}
                </span>
              </div>
            </div>

            {/* Payment Transactions Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Payment History ({payments.length} Transactions)
                </h3>
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} /> + Record Payment
                </button>
              </div>

              <DataTable
                columns={[
                  {
                    header: 'Payment Date',
                    cell: (row) => new Date(row.paymentDate).toLocaleDateString()
                  },
                  {
                    header: 'Amount',
                    cell: (row) => <span className="font-bold text-emerald-600 font-mono text-sm">₹ {row.amount}</span>
                  },
                  { header: 'Payment Type', accessor: 'paymentType' },
                  {
                    header: 'Method',
                    cell: (row) => (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {row.paymentMethod}
                      </span>
                    )
                  },
                  { header: 'Receipt / Notes', accessor: 'notes' }
                ]}
                data={payments}
                emptyMessage="No payments logged yet for this candidate."
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: DOCUMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Student Document Repository ({student.documents?.length || 0})
                </h3>
                <p className="text-xs text-slate-400">KYC, Medical Certificate, Eye Test, LL Acknowledgement</p>
              </div>
              <button
                onClick={() => setDocModalOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={15} /> + Add Document Record
              </button>
            </div>

            <DataTable
              columns={[
                {
                  header: 'Document Type',
                  cell: (row) => <span className="font-bold text-slate-800 dark:text-slate-100">{row.docType}</span>
                },
                { header: 'File / Reference', accessor: 'fileName' },
                {
                  header: 'Uploaded Date',
                  cell: (row) => new Date(row.uploadedDate || row.createdAt).toLocaleDateString()
                },
                {
                  header: 'Verification Status',
                  cell: (row) => (
                    <button
                      onClick={() => handleToggleDocVerification(row._id, row.verificationStatus)}
                      title="Click to toggle verification status"
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition ${
                        row.verificationStatus === 'Verified'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {row.verificationStatus}
                    </button>
                  )
                },
                { header: 'Remarks', accessor: 'remarks' }
              ]}
              data={student.documents || []}
              emptyMessage="No documents recorded yet for this candidate."
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: ACTIVITY TIMELINE */}
        {/* ========================================================================= */}
        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
              <Activity size={16} className="text-red-600" />
              Student Operational Audit Trail
            </h3>

            {student.timeline && student.timeline.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {[...student.timeline].reverse().map((item, idx) => (
                  <div key={idx} className="relative text-xs">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-red-600 ring-4 ring-white dark:ring-slate-800" />
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{item.action}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{item.description}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">By: {item.performedBy || 'System'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No timeline events logged yet.</p>
            )}
          </div>
        )}
      </div>

      {/* QUICK ADD CLASS MODAL */}
      <Modal isOpen={classModalOpen} onClose={() => setClassModalOpen(false)} title={`Record Class for ${student.fullName}`}>
        <form onSubmit={handleCreateClass} className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Class Date *</label>
              <input
                type="date"
                required
                value={classFormData.classDate}
                onChange={(e) => setClassFormData({ ...classFormData, classDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Instructor *</label>
              <select
                required
                value={classFormData.instructor}
                onChange={(e) => setClassFormData({ ...classFormData, instructor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
              >
                <option value="">-- Choose Instructor --</option>
                {instructors.map((u) => (
                  <option key={u._id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Vehicle No.</label>
              <input
                type="text"
                value={classFormData.vehicleNo}
                onChange={(e) => setClassFormData({ ...classFormData, vehicleNo: e.target.value })}
                placeholder="KL-01-AB-1234"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Training Type</label>
              <select
                value={classFormData.trainingType}
                onChange={(e) => setClassFormData({ ...classFormData, trainingType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="Practical Driving">Practical Driving</option>
                <option value="Road">Road Class</option>
                <option value="H-Track">H-Track (Ground)</option>
                <option value="Road & H">Road & H</option>
                <option value="Highway Drive">Highway Drive</option>
                <option value="Simulator">Simulator</option>
                <option value="Theory / Rules">Theory / Rules</option>
                <option value="Bike Training">Bike Training</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">KM Driven</label>
              <input
                type="number"
                min="0"
                value={classFormData.km}
                onChange={(e) => setClassFormData({ ...classFormData, km: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Duration (Hours)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={classFormData.hours}
                onChange={(e) => setClassFormData({ ...classFormData, hours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Notes / Feedback</label>
            <input
              type="text"
              value={classFormData.notes}
              onChange={(e) => setClassFormData({ ...classFormData, notes: e.target.value })}
              placeholder="e.g. Reverse parking practice, gear shifting feedback"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setClassModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={classSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-sm"
            >
              {classSubmitting ? 'Saving...' : 'Save Class Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK ADD PAYMENT MODAL */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Record Payment for ${student.fullName}`}>
        <form onSubmit={handleCreatePayment} className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Type</label>
              <select
                value={paymentFormData.paymentType}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="Fee Payment">Fee Payment (Installment)</option>
                <option value="Advance Payment">Advance Payment</option>
                <option value="Registration Fee">Registration Fee</option>
                <option value="Exam Fee">Exam Fee</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Method</label>
              <select
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
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
            <label className="block text-xs font-semibold mb-1">Receipt No / Transaction Reference</label>
            <input
              type="text"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              placeholder="e.g. Receipt #204, GPay Ref ID"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-sm"
            >
              {paymentSubmitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD DOCUMENT MODAL */}
      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title={`Add Document: ${student.fullName}`}>
        <form onSubmit={handleAddDocument} className="space-y-4 text-slate-800 dark:text-slate-100">
          <div>
            <label className="block text-xs font-semibold mb-1">Document Type *</label>
            <select
              value={docFormData.docType}
              onChange={(e) => setDocFormData({ ...docFormData, docType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
            >
              <option value="Aadhaar Card">Aadhaar Card</option>
              <option value="Passport Photo">Passport Photo</option>
              <option value="Medical Certificate Form 1A">Medical Certificate Form 1A</option>
              <option value="Eye Test Certificate">Eye Test Certificate</option>
              <option value="Form 15">Form 15</option>
              <option value="LL Acknowledgement">LL Acknowledgement</option>
              <option value="DL Copy">Driving Licence Copy</option>
              <option value="Address Proof">Address Proof</option>
              <option value="Other">Other Certificate</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">File Name / Reference</label>
            <input
              type="text"
              value={docFormData.fileName}
              onChange={(e) => setDocFormData({ ...docFormData, fileName: e.target.value })}
              placeholder="e.g. aadhaar_scan.pdf"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Verification Status</label>
            <select
              value={docFormData.verificationStatus}
              onChange={(e) => setDocFormData({ ...docFormData, verificationStatus: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending Verification</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Remarks</label>
            <input
              type="text"
              value={docFormData.remarks}
              onChange={(e) => setDocFormData({ ...docFormData, remarks: e.target.value })}
              placeholder="Verification remarks"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={docSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-sm"
            >
              {docSubmitting ? 'Saving...' : 'Add Document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* TRANSFER STUDENT BATCH MODAL */}
      <TransferStudentModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        student={student}
        batches={batches}
        currentBatchId={student.batch?._id || student.batch}
        onTransferSuccess={handleTransferBatch}
      />
    </MainLayout>
  );
};

export default StudentDetailPage;
