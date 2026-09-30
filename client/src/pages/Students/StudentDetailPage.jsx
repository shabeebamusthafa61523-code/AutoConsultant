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
import { updateStudentStage } from '../../services/workflowService';
import { createFollowUp, completeFollowUp, rescheduleFollowUp } from '../../services/followUpService';
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
  X,
  Gauge,
  Car,
  CheckCircle2,
  AlertCircle,
  Percent,
  Workflow,
  CalendarClock,
  ChevronRight,
  AlertTriangle
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

  // Workflow Stage Modal State
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowTargetStage, setWorkflowTargetStage] = useState('');
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [workflowNextAction, setWorkflowNextAction] = useState('');
  const [workflowNextActionDate, setWorkflowNextActionDate] = useState('');
  const [workflowCreateFollowUp, setWorkflowCreateFollowUp] = useState(false);
  const [workflowFollowUpTask, setWorkflowFollowUpTask] = useState('');
  const [workflowFollowUpDate, setWorkflowFollowUpDate] = useState('');
  const [workflowFollowUpPriority, setWorkflowFollowUpPriority] = useState('High');
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);

  // Quick Add Follow-Up Modal State
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpTask, setFollowUpTask] = useState('');
  const [followUpDueDate, setFollowUpDueDate] = useState('');
  const [followUpDueTime, setFollowUpDueTime] = useState('10:00 AM');
  const [followUpPriority, setFollowUpPriority] = useState('Medium');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  // Reschedule Follow-Up Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState('');
  const [rescheduleNewTime, setRescheduleNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

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

  const openWorkflowModal = (currentStage) => {
    setWorkflowTargetStage(currentStage || student?.workflowStage || 'Application');
    setWorkflowNotes('');
    setWorkflowNextAction(details?.student?.nextAction || '');
    setWorkflowNextActionDate(details?.student?.followUpDate ? details.student.followUpDate.split('T')[0] : '');
    setWorkflowCreateFollowUp(false);
    setWorkflowFollowUpTask(`Action for ${currentStage || 'current stage'}`);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    setWorkflowFollowUpDate(nextDate.toISOString().split('T')[0]);
    setWorkflowFollowUpPriority('High');
    setWorkflowModalOpen(true);
  };

  const handleWorkflowStageSubmit = async (e) => {
    e.preventDefault();
    if (!workflowTargetStage) return;
    try {
      setWorkflowSubmitting(true);
      await updateStudentStage(id, {
        stage: workflowTargetStage,
        notes: workflowNotes.trim(),
        nextAction: workflowNextAction.trim(),
        nextActionDate: workflowNextActionDate || null,
        createFollowUp: workflowCreateFollowUp,
        followUpData: workflowCreateFollowUp ? {
          task: workflowFollowUpTask.trim(),
          dueDate: workflowFollowUpDate,
          priority: workflowFollowUpPriority,
          notes: workflowNotes.trim()
        } : null
      });
      setWorkflowModalOpen(false);
      await fetchDetails();
      alert('Workflow stage updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update workflow stage');
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  const openAddFollowUpModal = () => {
    setFollowUpTask(`Follow-up with ${details?.student?.fullName || 'student'}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    setFollowUpDueDate(tomorrow.toISOString().split('T')[0]);
    setFollowUpDueTime('10:00 AM');
    setFollowUpPriority('Medium');
    setFollowUpNotes('');
    setFollowUpModalOpen(true);
  };

  const handleCreateFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!followUpTask || !followUpDueDate) return;
    try {
      setFollowUpSubmitting(true);
      await createFollowUp({
        student: id,
        task: followUpTask.trim(),
        dueDate: followUpDueDate,
        dueTime: followUpDueTime,
        priority: followUpPriority,
        relatedStage: details?.student?.workflowStage || '',
        notes: followUpNotes.trim()
      });
      setFollowUpModalOpen(false);
      await fetchDetails();
      alert('Follow-up created successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create follow-up');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId) => {
    try {
      await completeFollowUp(followUpId);
      await fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to complete follow-up');
    }
  };

  const openRescheduleModal = (task) => {
    setRescheduleTarget(task);
    const d = task.dueDate ? new Date(task.dueDate) : new Date();
    d.setDate(d.getDate() + 2);
    setRescheduleNewDate(d.toISOString().split('T')[0]);
    setRescheduleNewTime(task.dueTime || '10:00 AM');
    setRescheduleReason('');
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleNewDate) return;
    try {
      setRescheduleSubmitting(true);
      await rescheduleFollowUp(rescheduleTarget._id, {
        newDueDate: rescheduleNewDate,
        newDueTime: rescheduleNewTime,
        reason: rescheduleReason.trim()
      });
      setRescheduleModalOpen(false);
      await fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to reschedule follow-up');
    } finally {
      setRescheduleSubmitting(false);
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

  const {
    student,
    classes = [],
    payments = [],
    attendance = [],
    stats = {},
    feeSummary = {},
    workflowHistory = [],
    followUps = []
  } = details;
  const docs = student.documentReadiness || {};

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'workflow', label: `Workflow & Follow-ups (${followUps.filter(f => f.status === 'Pending').length})` },
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

              {/* Workflow & Next Action Card in Overview */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Workflow size={16} className="text-red-600" />
                    Workflow & Operational Stage
                  </h3>
                  <button
                    onClick={() => openWorkflowModal(student.workflowStage)}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                  >
                    <ArrowRight size={13} /> Change
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Current Stage:</span>
                    <Badge value={student.workflowStage || 'Application'} />
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Next Action:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {student.nextAction || 'None scheduled'}
                    </span>
                  </div>
                  {student.followUpDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Action Date:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {new Date(student.followUpDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('workflow')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View All Follow-Ups ({followUps.length}) &rarr;
                    </button>
                    <button
                      onClick={openAddFollowUpModal}
                      className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold rounded text-[11px] border border-amber-200 dark:border-amber-900"
                    >
                      + Follow-Up
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: WORKFLOW & FOLLOW-UPS */}
        {/* ========================================================================= */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {/* Workflow Stage Control Banner */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Stage:</span>
                    <Badge value={student.workflowStage || 'Application'} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                    {student.previousWorkflowStage && (
                      <span>Previous: <span className="font-semibold text-slate-700 dark:text-slate-300">{student.previousWorkflowStage}</span></span>
                    )}
                    <span>&bull;</span>
                    <span>Last Updated: <span className="font-semibold text-slate-700 dark:text-slate-300">{student.workflowStageChangedAt ? new Date(student.workflowStageChangedAt).toLocaleDateString() : 'Initial'}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openWorkflowModal(student.workflowStage)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowRight size={14} /> Change Stage
                  </button>
                  <button
                    onClick={openAddFollowUpModal}
                    className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 rounded-md text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Follow-Up
                  </button>
                </div>
              </div>

              {/* Next Action Box */}
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Upcoming Next Action</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {student.nextAction || 'No pending action scheduled'}
                  </span>
                </div>
                {student.followUpDate && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-900">
                    <Calendar size={13} />
                    <span>Target Date: {new Date(student.followUpDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-Ups Register for Student */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-amber-600" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Student Follow-Ups ({followUps.length})
                  </h4>
                </div>
                <button
                  onClick={openAddFollowUpModal}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={13} /> New Follow-Up
                </button>
              </div>

              {followUps.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No follow-ups recorded for this student. Click "+ Add Follow-Up" to create a task reminder.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-[11px] text-slate-600 dark:text-slate-300">
                        <th className="px-4 py-2.5">Due Date</th>
                        <th className="px-4 py-2.5">Task Description</th>
                        <th className="px-4 py-2.5">Priority</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                      {followUps.map((fu) => (
                        <tr key={fu._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="font-mono font-bold">{new Date(fu.dueDate).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">{fu.dueTime || 'Standard'}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{fu.task}</div>
                            {fu.notes && <div className="text-[11px] text-slate-400 italic">"{fu.notes}"</div>}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <Badge type="priority" value={fu.priority} />
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <Badge value={fu.status} />
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-1">
                            {fu.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleCompleteFollowUp(fu._id)}
                                  className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-bold border border-emerald-200 dark:border-emerald-800"
                                >
                                  Done
                                </button>
                                <button
                                  onClick={() => openRescheduleModal(fu)}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded text-[11px] font-bold"
                                >
                                  Reschedule
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Workflow History Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History size={16} className="text-red-600" />
                Workflow Stage Transition History
              </h4>

              {workflowHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No past transitions recorded.</p>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {workflowHistory.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200/60 dark:border-slate-700 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {item.fromStage ? (
                            <>
                              <Badge value={item.fromStage} />
                              <ChevronRight size={14} className="text-slate-400" />
                              <Badge value={item.toStage} />
                            </>
                          ) : (
                            <Badge value={item.toStage} />
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">({item.action || 'Stage Transition'})</span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 shrink-0">
                        <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div>Changed by: <span className="font-semibold text-slate-600 dark:text-slate-400">{item.changedByName || item.changedBy?.name || 'Admin'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        {activeTab === 'training' && (() => {
          const tp = student.trainingProgress || {};
          const trainingStats = stats.training || {};
          const totalKm = trainingStats.totalKm || tp.totalKm || 0;
          const totalHours = trainingStats.totalHours || tp.totalHours || 0;
          const roadCount = trainingStats.roadCount || tp.roadClassesCount || 0;
          const hTrackCount = trainingStats.hTrackCount || tp.hTrackClassesCount || 0;
          const bikeCount = trainingStats.bikeCount || tp.bikeClassesCount || 0;

          // Reference Formula calculations
          const roadEq = Math.round((totalKm / 5) * 10) / 10;
          const hEq = Math.round((totalHours / 3) * 10) / 10;
          const totalEq = tp.equivalentClasses !== undefined
            ? Math.round(tp.equivalentClasses * 10) / 10
            : Math.round(((totalKm / 5) + (totalHours / 3) + bikeCount) * 10) / 10;
          const required = tp.requiredClasses || 20;
          const pending = Math.max(0, Math.round((required - totalEq) * 10) / 10);
          const completionPct = Math.min(100, Math.round((totalEq / required) * 100));

          return (
            <div className="space-y-5">
              {/* Training Progress & Quota Analytics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Road Training */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Road Training</span>
                    <Car size={16} className="text-blue-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {totalKm} <span className="text-xs font-normal text-slate-400">KM</span>
                  </p>
                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {roadEq} Eq. Classes <span className="text-slate-400 font-normal">({roadCount} sess)</span>
                  </p>
                </div>

                {/* 2. Track / H Training */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Track / H Training</span>
                    <Clock size={16} className="text-amber-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {totalHours} <span className="text-xs font-normal text-slate-400">hrs</span>
                  </p>
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                    {hEq} Eq. Classes <span className="text-slate-400 font-normal">({hTrackCount} sess)</span>
                  </p>
                </div>

                {/* 3. Bike Training */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Bike Classes</span>
                    <Award size={16} className="text-purple-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {bikeCount} <span className="text-xs font-normal text-slate-400">Classes</span>
                  </p>
                  <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                    2-Wheeler Practical
                  </p>
                </div>

                {/* 4. Total Equivalent Classes */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Total Equivalent</span>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {totalEq}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    (KM/5) + (H/3) + Bike
                  </p>
                </div>

                {/* 5. Pending Classes & Progress */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Pending Quota</span>
                    <Percent size={16} className="text-rose-500" />
                  </div>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {pending} <span className="text-xs font-normal text-slate-400">/ {required} req</span>
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right font-bold">{completionPct}% Complete</p>
                </div>

                {/* 6. Side-by-Side Fee Status */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Fee Status</span>
                    <CreditCard size={16} className={feeSummary.balance <= 0 ? 'text-emerald-500' : 'text-amber-500'} />
                  </div>
                  <p className={`text-xl font-black mt-1 ${feeSummary.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹ {feeSummary.balance}
                  </p>
                  <div className="flex items-center justify-between text-[11px] mt-1 font-medium">
                    <span className="text-slate-400">Total: ₹{feeSummary.totalFee}</span>
                    <span className={feeSummary.balance <= 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {feeSummary.balance <= 0 ? 'Paid' : 'Due'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Driving Sessions Ledger Table */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Practical Driving Sessions</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        {classes.length} Logged
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Session history showing actual kilometers logged, duration hours, instructor assignment and reference equivalents.
                    </p>
                  </div>
                  <button
                    onClick={() => setClassModalOpen(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} /> + Add Class Record
                  </button>
                </div>

                <DataTable
                  columns={[
                    {
                      header: 'Date',
                      cell: (row) => (
                        <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {row.classDate ? new Date(row.classDate).toLocaleDateString() : '—'}
                        </span>
                      )
                    },
                    {
                      header: 'Instructor',
                      accessor: 'instructor',
                      cell: (row) => (
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {row.instructor || 'Unassigned'}
                        </span>
                      )
                    },
                    {
                      header: 'Vehicle',
                      cell: (row) => (
                        <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                          {row.vehicleNo || 'KL-10-AB-5265'}
                        </span>
                      )
                    },
                    {
                      header: 'Training Type',
                      cell: (row) => <Badge type="class" value={row.trainingType || 'Practical Driving'} />
                    },
                    {
                      header: 'KM Driven',
                      cell: (row) => (
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                          {row.km || 0} KM
                        </span>
                      )
                    },
                    {
                      header: 'Duration',
                      cell: (row) => (
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                          {row.hours || 0} hr(s)
                        </span>
                      )
                    },
                    {
                      header: 'Equivalent Classes',
                      cell: (row) => {
                        const km = Number(row.km || 0);
                        const h = Number(row.hours || 0);
                        const bikes = Number(row.bikeClassCount || 0);
                        const eq = Math.round(((km / 5) + (h / 3) + bikes) * 10) / 10;
                        return (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                            {eq} Eq
                          </span>
                        );
                      }
                    },
                    {
                      header: 'Notes / Remarks',
                      cell: (row) => (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] block" title={row.notes || ''}>
                          {row.notes || '—'}
                        </span>
                      )
                    }
                  ]}
                  data={classes}
                  emptyMessage="No driving class sessions recorded yet for this student."
                />
              </div>
            </div>
          );
        })()}

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

      {/* WORKFLOW STAGE TRANSITION MODAL */}
      <Modal
        isOpen={workflowModalOpen}
        onClose={() => setWorkflowModalOpen(false)}
        title={`Change Workflow Stage: ${student.fullName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleWorkflowStageSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Current Stage</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {student.workflowStage || 'Application'}
              </span>
            </div>
            <ArrowRight size={16} className="text-slate-400" />
            <div>
              <span className="text-[11px] text-slate-400 block">New Stage</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {workflowTargetStage}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Stage *
            </label>
            <select
              value={workflowTargetStage}
              onChange={(e) => {
                setWorkflowTargetStage(e.target.value);
                setWorkflowFollowUpTask(`Prepare student for ${e.target.value}`);
              }}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-bold"
            >
              {[
                'Application',
                'Documents',
                'LL Slot / Test',
                'LL Passed',
                'Training',
                'DL Test',
                'Passed / Licence Processing',
                'Completed',
                'Renewal / Service',
                'Follow Up',
                'Other'
              ].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transition Notes
            </label>
            <textarea
              value={workflowNotes}
              onChange={(e) => setWorkflowNotes(e.target.value)}
              rows={2}
              placeholder="Notes on stage transition..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Next Action
              </label>
              <input
                type="text"
                value={workflowNextAction}
                onChange={(e) => setWorkflowNextAction(e.target.value)}
                placeholder="Next action..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={workflowNextActionDate}
                onChange={(e) => setWorkflowNextActionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Create follow-up toggle */}
          <div className="p-3 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-md space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={workflowCreateFollowUp}
                onChange={(e) => setWorkflowCreateFollowUp(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
              />
              <span>Create follow-up reminder for this stage?</span>
            </label>

            {workflowCreateFollowUp && (
              <div className="space-y-2 pt-2 border-t border-red-200/60">
                <input
                  type="text"
                  value={workflowFollowUpTask}
                  onChange={(e) => setWorkflowFollowUpTask(e.target.value)}
                  placeholder="Task description"
                  required={workflowCreateFollowUp}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={workflowFollowUpDate}
                    onChange={(e) => setWorkflowFollowUpDate(e.target.value)}
                    required={workflowCreateFollowUp}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                  <select
                    value={workflowFollowUpPriority}
                    onChange={(e) => setWorkflowFollowUpPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWorkflowModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={workflowSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold disabled:opacity-50"
            >
              {workflowSubmitting ? 'Updating...' : 'Update Stage'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD FOLLOW-UP MODAL */}
      <Modal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        title={`Add Follow-Up for ${student.fullName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateFollowUpSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task / Action *
            </label>
            <input
              type="text"
              value={followUpTask}
              onChange={(e) => setFollowUpTask(e.target.value)}
              required
              placeholder="e.g. Confirm driving test time slot"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={followUpDueDate}
                onChange={(e) => setFollowUpDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={followUpPriority}
                onChange={(e) => setFollowUpPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFollowUpModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={followUpSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold disabled:opacity-50"
            >
              {followUpSubmitting ? 'Saving...' : 'Save Follow-Up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESCHEDULE FOLLOW-UP MODAL */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Follow-Up"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Task</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{rescheduleTarget?.task}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Due Date *
              </label>
              <input
                type="date"
                value={rescheduleNewDate}
                onChange={(e) => setRescheduleNewDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Time
              </label>
              <input
                type="text"
                value={rescheduleNewTime}
                onChange={(e) => setRescheduleNewTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold disabled:opacity-50"
            >
              {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default StudentDetailPage;
