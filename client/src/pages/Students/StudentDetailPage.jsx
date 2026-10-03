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
import ReceiptModal from '../../components/ReceiptModal';
import AddServiceModal from '../../components/AddServiceModal';
import ClassSlipModal from '../../components/ClassSlipModal';
import {
  getStudentDetails,
  updateStudentStatus,
  transferStudentBatch,
  addStudentDocument,
  updateDocumentStatus,
  addStudentService
  getStudentClassSlip
} from '../../services/studentService';
import { createClass } from '../../services/classService';
import { createPayment } from '../../services/paymentService';
import {
  createApplication,
  updateApplicationStage,
  updateApplication,
  updateNextAction
} from '../../services/applicationService';
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
  X,
  Gauge,
  Car,
  CheckCircle2,
  AlertCircle,
  Percent,
  Printer,
  Receipt,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  FileCheck,
  HelpCircle,
  Shield,
  AlertTriangle,
  FolderPlus,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [batches, setBatches] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active 360° Tab (7 R&D Architecture Tabs)
  const [activeTab, setActiveTab] = useState('overview');

  // Quick Add Class modal state
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classFormData, setClassFormData] = useState({
    classDate: new Date().toISOString().split('T')[0],
    instructor: '',
    vehicleNo: 'KL-10-AB-5265',
    trainingType: 'Road Training',
    kmStart: '',
    kmEnd: '',
    km: 5,
    hPracticeCount: 0,
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
    referenceNumber: '',
    receivedBy: 'Office Staff',
    notes: ''
  });

  // New Application Modal State
  const [newAppModalOpen, setNewAppModalOpen] = useState(false);
  const [newAppSubmitting, setNewAppSubmitting] = useState(false);
  const [newAppFormData, setNewAppFormData] = useState({
    serviceType: 'Fresh Licence',
    licenceType: 'LMV+MCWG',
    vehicleClass: '4 Wheeler',
    coursePackage: 'LMV+MCWG (Fresh Licence)',
    packageFee: 9000,
    rtoServiceFee: 0,
    nextAction: 'Verify Documents',
    nextActionDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextActionPriority: 'Medium',
    notes: ''
  });

  // Update Test Stages Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [selectedAppForTest, setSelectedAppForTest] = useState(null);
  const [testFormData, setTestFormData] = useState({
    llNumber: '',
    llStatus: 'Pending',
    llTestDate: '',
    llIssueDate: '',
    llExpiryDate: '',
    drivingTestDate: '',
    drivingTestSlot: 'Morning (09:00 AM)',
    drivingTestResult: 'Pending',
    retestDate: '',
    dlNumber: '',
    licenceStatus: 'Under Processing',
    dlIssueDate: '',
    dlDispatchStatus: 'Pending'
  });

  // Class Slip Modal State
  const [classSlipModalOpen, setClassSlipModalOpen] = useState(false);
  const [classSlipData, setClassSlipData] = useState(null);
  const [classSlipLoading, setClassSlipLoading] = useState(false);

  // Selected Receipt Modal State for Payment History Ledger
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);

  // Transfer Batch Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Add Service Modal State
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);

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
      const kmStartNum = classFormData.kmStart ? Number(classFormData.kmStart) : 0;
      const kmEndNum = classFormData.kmEnd ? Number(classFormData.kmEnd) : 0;
      const kmDiff = (kmEndNum > kmStartNum) ? (kmEndNum - kmStartNum) : Number(classFormData.km || 0);

      await createClass({
        ...classFormData,
        student: id,
        kmStart: kmStartNum,
        kmEnd: kmEndNum,
        km: kmDiff,
        hPracticeCount: Number(classFormData.hPracticeCount || 0),
        hours: Number(classFormData.hours) || 1
      });
      setClassModalOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to record class session');
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

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    try {
      setNewAppSubmitting(true);
      await createApplication({
        ...newAppFormData,
        student: details.student._id,
        studentId: details.student.studentId,
        packageFee: Number(newAppFormData.packageFee) || 9000,
        rtoServiceFee: Number(newAppFormData.rtoServiceFee) || 0
      });
      setNewAppModalOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to create application');
    } finally {
      setNewAppSubmitting(false);
    }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      await updateApplicationStage(appId, { lifecycleStatus: newStatus });
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to update application stage');
    }
  };

  const handleOpenTestModal = (app) => {
    setSelectedAppForTest(app);
    setTestFormData({
      llNumber: app?.learnerLicence?.llNumber || '',
      llStatus: app?.learnerLicence?.status || 'Pending',
      llTestDate: app?.learnerLicence?.llTestDate ? new Date(app.learnerLicence.llTestDate).toISOString().split('T')[0] : '',
      llIssueDate: app?.learnerLicence?.issueDate ? new Date(app.learnerLicence.issueDate).toISOString().split('T')[0] : '',
      llExpiryDate: app?.learnerLicence?.expiryDate ? new Date(app.learnerLicence.expiryDate).toISOString().split('T')[0] : '',
      drivingTestDate: app?.drivingTest?.drivingTestDate ? new Date(app.drivingTest.drivingTestDate).toISOString().split('T')[0] : '',
      drivingTestSlot: app?.drivingTest?.testSlot || 'Morning (09:00 AM)',
      drivingTestResult: app?.drivingTest?.testResult || 'Pending',
      retestDate: app?.drivingTest?.retestDate ? new Date(app.drivingTest.retestDate).toISOString().split('T')[0] : '',
      dlNumber: app?.licence?.dlNumber || '',
      licenceStatus: app?.licence?.status || 'Under Processing',
      dlIssueDate: app?.licence?.issueDate ? new Date(app.licence.issueDate).toISOString().split('T')[0] : '',
      dlDispatchStatus: app?.licence?.dispatchStatus || 'Pending'
    });
    setTestModalOpen(true);
  };

  const handleSaveTestStages = async (e) => {
    e.preventDefault();
    if (!selectedAppForTest) return;
    try {
      setTestSubmitting(true);
      await updateApplication(selectedAppForTest._id, {
        learnerLicence: {
          llNumber: testFormData.llNumber,
          status: testFormData.llStatus,
          llTestDate: testFormData.llTestDate || null,
          issueDate: testFormData.llIssueDate || null,
          expiryDate: testFormData.llExpiryDate || null
        },
        drivingTest: {
          drivingTestDate: testFormData.drivingTestDate || null,
          testSlot: testFormData.drivingTestSlot,
          testResult: testFormData.drivingTestResult,
          retestDate: testFormData.retestDate || null
        },
        licence: {
          dlNumber: testFormData.dlNumber,
          status: testFormData.licenceStatus,
          issueDate: testFormData.dlIssueDate || null,
          dispatchStatus: testFormData.dlDispatchStatus
        }
      });
      setTestModalOpen(false);
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to update test stages');
    } finally {
      setTestSubmitting(false);
    }
  };

  const handleOpenClassSlip = async () => {
    try {
      setClassSlipLoading(true);
      const slipData = await getStudentClassSlip(id);
      setClassSlipData(slipData?.data || slipData);
      setClassSlipModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to generate class slip');
    } finally {
      setClassSlipLoading(false);
    }
  };

  const handleTransferBatch = async ({ targetBatchId, reason }) => {
    await transferStudentBatch(id, { newBatchId: targetBatchId, reason });
    fetchDetails();
  };

  const handleAddService = async ({ service, fee, notes }) => {
    await addStudentService(id, { service, fee, notes });
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
        <Navbar title="Student 360° Profile" />
        <LoadingSpinner message="Fetching comprehensive student profile & application pipeline..." />
      </MainLayout>
    );
  }

  if (error || !details) {
    return (
      <MainLayout>
        <Navbar title="Student 360° Profile" />
        <ErrorMessage message={error || 'Student not found'} onRetry={fetchDetails} />
      </MainLayout>
    );
  }

  const {
    student,
    classes = [],
    payments = [],
    attendance = [],
    applications = [],
    timeline = [],
    stats = {},
    feeSummary = {},
    documents = []
  } = details;

  // Active / Most recent application
  const activeApp = applications.find(a => a.lifecycleStatus !== 'Completed' && a.lifecycleStatus !== 'Cancelled') || applications[0] || null;

  // Dynamic Financial Ledger Values
  const effectiveTotalFee = activeApp?.feeStructure?.packageFee ?? (student.totalFee || 9000);
  const effectiveNetPayable = activeApp?.feeStructure?.netPayable ?? (student.totalFee || 9000);
  const effectiveReceived = activeApp?.feeStructure?.totalReceived ?? ((student.paidAmount || 0) + (student.advanceAmount || 0));
  const effectiveBalance = activeApp?.feeStructure?.balanceDue ?? feeSummary.balance ?? 0;

  // Exact R&D Calculation: 5 KM = 1 Road Class, 3 H practices = 1 H Class
  let totalKmDriven = 0;
  let totalHPracticesCount = 0;
  classes.forEach(c => {
    totalKmDriven += Number(c.kmDriven || c.km || 0);
    totalHPracticesCount += Number(c.hPracticeCount || ((c.trainingType || '').toLowerCase().includes('h') ? 1 : 0));
  });
  const calculatedRoadClasses = Math.floor(totalKmDriven / 5);
  const calculatedHClasses = Math.floor(totalHPracticesCount / 3);
  const totalCombinedClasses = calculatedRoadClasses + calculatedHClasses;
  const trainingTargetClasses = 20;
  const trainingPct = Math.min(100, Math.round((totalCombinedClasses / trainingTargetClasses) * 100));

  // Document Readiness Calculation
  const docFlags = student.documentReadiness || {};
  const docChecklist = [
    { label: 'Aadhaar Card / ID', ready: Boolean(docFlags.aadhaarVerified) },
    { label: 'Passport Photo', ready: Boolean(docFlags.photoVerified) },
    { label: 'Address Proof', ready: Boolean(docFlags.addressProofVerified) },
    { label: 'Blood Group', ready: Boolean(docFlags.bloodGroupRecorded) },
    { label: 'Form 15 / Medical 1A', ready: Boolean(docFlags.form15Ready) }
  ];
  const readyDocsCount = docChecklist.filter(d => d.ready).length;
  const docReadinessPct = Math.round((readyDocsCount / docChecklist.length) * 100);

  // Mandatory Next Action State
  const currentNextAction = activeApp?.nextAction || student.nextAction || 'Verify Documents';
  const currentNextDueDate = activeApp?.nextActionDueDate || student.followUpDate;
  const currentNextPriority = activeApp?.nextActionPriority || 'Medium';
  const isOverdue = currentNextDueDate && new Date(currentNextDueDate) < new Date();

  // WhatsApp quick trigger generator
  const cleanPhone = (student.primaryMobile || '').replace(/\D/g, '');
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const generateWhatsAppLink = (template) => {
    let msg = '';
    const candName = student.fullName || 'Candidate';
    if (template === 'payment') {
      msg = `Dear ${candName}, this is a reminder from BENZ Auto Consultant regarding your pending balance of ₹${effectiveBalance}. Kindly clear the balance at your earliest convenience. Thank you!`;
    } else if (template === 'test') {
      const testD = activeApp?.drivingTest?.drivingTestDate ? new Date(activeApp.drivingTest.drivingTestDate).toLocaleDateString() : (student.testDate ? new Date(student.testDate).toLocaleDateString() : 'scheduled soon');
      msg = `Dear ${candName}, your Driving Test is scheduled for ${testD}. Please arrive on time at the RTO test ground with your original documents. Best wishes from BENZ Driving School!`;
    } else if (template === 'class') {
      msg = `Dear ${candName}, your upcoming driving session has been scheduled. Please confirm your availability or contact office for rescheduling. - BENZ Driving School`;
    } else if (template === 'documents') {
      msg = `Dear ${candName}, please submit your pending documents (Aadhaar / Photo / Medical Form) at the BENZ Auto Consultant office to continue RTO processing.`;
    } else if (template === 'licence') {
      msg = `Dear ${candName}, Congratulations! Your Driving Licence is ready for collection at the BENZ Auto Consultant office. Please bring your original LL / token.`;
    }
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  // The 7 Dedicated R&D Architecture Tabs
  const tabs = [
    { id: 'overview', label: '1. Overview' },
    { id: 'applications', label: `2. Applications (${applications.length})` },
    { id: 'training', label: `3. Training (${classes.length})` },
    { id: 'payments', label: `4. Payments (₹${effectiveBalance})` },
    { id: 'tests', label: '5. Tests & Licence' },
    { id: 'documents', label: `6. Documents (${documents.length + readyDocsCount})` },
    { id: 'timeline', label: `7. Timeline (${timeline.length})` }
  ];

  return (
    <MainLayout>
      <Navbar title={`Student 360° Profile: ${student.fullName} (${student.studentId})`} />

      <div className="space-y-5 max-w-7xl mx-auto pb-16">
        {/* Top Header Navigation & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
          <Link
            to="/students"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={16} /> Back to Student Directory
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setNewAppModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
            >
              <FolderPlus size={15} /> + New Application
            </button>
            <button
              onClick={() => setClassModalOpen(true)}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-red-200 dark:border-red-800"
            >
              <Plus size={15} /> + Record Class
            </button>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
            >
              <Plus size={15} /> + Record Payment
            </button>
            <button
              onClick={handleOpenClassSlip}
              disabled={classSlipLoading}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-md transition flex items-center gap-1.5"
            >
              <Printer size={15} />
              {classSlipLoading ? 'Generating...' : 'Print Class Slip'}
            </button>
            <button
              onClick={() => setAddServiceModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs rounded-md transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
            >
              <Plus size={15} /> Add Service
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

        {/* ========================================================================= */}
        {/* STUDENT 360° TOP KPI HEADER */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Identity Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-xl flex items-center justify-center border-2 border-red-200 dark:border-red-800 shadow-inner shrink-0">
                {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{student.fullName}</h1>
                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded">
                    {student.studentId}
                  </span>
                  {student.category && (
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {student.category}
                    </span>
                  )}
                  {student.bloodGroup && (
                    <span className="text-[10px] font-mono font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                      Blood: {student.bloodGroup}
                  {activeApp && (
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded">
                      {activeApp.applicationId}
                    </span>
                  )}
                  {student.aliasSourceName && (
                    <span className="text-xs text-slate-500 font-medium italic">
                      ({student.aliasSourceName})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                    <Phone size={13} className="text-slate-400" />
                    <span className="font-mono">{student.primaryMobile}</span>
                  </span>
                  {student.address?.place && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" />
                      {student.address.place}, {student.address.district || 'Malappuram'}
                    </span>
                  )}
                  <span>&bull;</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle / COV: <strong className="text-red-600 dark:text-red-400">{student.vehicleType || 'LMV+MCWG'}</strong>
                  </span>
                  {(student.services?.length > 0 || student.licenceServiceType) && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-slate-400 font-semibold">&bull; Services:</span>
                      {(student.services && student.services.length > 0 ? student.services : student.licenceServiceType.split(',').map(s => s.trim())).map((srv, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 font-bold text-[10px]">
                          {srv}
                        </span>
                      ))}
                    </div>
                  )}
                  <span>Lead Source: <strong>{student.leadSource || 'Walk-in'}</strong></span>
                </div>
              </div>
            </div>

            {/* Financial Summary & Status Selector */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Quick Status Picker */}
            <div className="flex items-center gap-3 self-end lg:self-center">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Application Status</label>
                <select
                  value={activeApp ? activeApp.lifecycleStatus : student.currentStatus}
                  onChange={(e) => {
                    if (activeApp) {
                      handleUpdateApplicationStatus(activeApp._id, e.target.value);
                    } else {
                      handleStatusChange(e.target.value);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Registered">Registered</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="LL Processing">LL Processing</option>
                  <option value="LL Approved">LL Approved</option>
                  <option value="Training">Training</option>
                  <option value="Test Scheduled">Test Scheduled</option>
                  <option value="Retest">Retest</option>
                  <option value="Test Passed">Test Passed</option>
                  <option value="Licence Processing">Licence Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Top 5 KPI Metrics Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            {/* 1. Balance Due */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Due</span>
              <p className={`text-xl font-black mt-1 ${effectiveBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                ₹ {effectiveBalance}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Recv: ₹{effectiveReceived} / Net: ₹{effectiveNetPayable}
              </span>
            </div>

            {/* 2. Training Progress */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Training Progress</span>
                <span className="text-[10px] font-black text-blue-600">{trainingPct}%</span>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {totalCombinedClasses} <span className="text-xs font-normal text-slate-400">/ 20 Cls</span>
              </p>
              <span className="text-[10px] text-slate-500">
                {calculatedRoadClasses} Road ({totalKmDriven}KM) + {calculatedHClasses} H
              </span>
            </div>

            {/* 3. Next Test */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Test</span>
              <p className="text-sm font-black text-purple-700 dark:text-purple-400 mt-1 truncate">
                {activeApp?.drivingTest?.drivingTestDate
                  ? new Date(activeApp.drivingTest.drivingTestDate).toLocaleDateString()
                  : student.testDate
                  ? new Date(student.testDate).toLocaleDateString()
                  : 'Not Scheduled'}
              </p>
              <span className="text-[10px] text-slate-500">
                Result: <strong>{activeApp?.drivingTest?.testResult || student.testStatus || 'Pending'}</strong>
              </span>
            </div>

            {/* 4. Document Readiness */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doc Readiness</span>
                <span className={`text-[10px] font-black ${docReadinessPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {docReadinessPct}%
                </span>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {readyDocsCount} <span className="text-xs font-normal text-slate-400">/ {docChecklist.length} Verified</span>
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-1">
                <div
                  className={`h-1 rounded-full ${docReadinessPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${docReadinessPct}%` }}
                />
              </div>
            </div>

              {/* Fee Breakdown Box */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 font-mono text-xs flex items-center gap-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Fee / Paid</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{(student.totalFee !== undefined ? student.totalFee : 9000).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Paid: ₹{(student.paidAmount || 0) + (student.advanceAmount || 0)}</span>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance</span>
                  <span className={`text-base font-black ${feeSummary.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹ {feeSummary.balance ? feeSummary.balance.toLocaleString('en-IN') : '0'}
                  </span>
                </div>
            {/* 5. Mandatory Next Action */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              isOverdue
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-rose-700' : 'text-amber-700'}`}>
                  Next Action
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isOverdue ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                  {currentNextPriority}
                </span>
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 truncate" title={currentNextAction}>
                {currentNextAction}
              </p>
              <span className={`text-[10px] font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                Due: {currentNextDueDate ? new Date(currentNextDueDate).toLocaleDateString() : 'Set Date'} {isOverdue && '(OVERDUE)'}
              </span>
            </div>
          </div>

          {/* Contextual WhatsApp Quick Action Buttons */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageCircle size={15} className="text-emerald-600" />
              WhatsApp Quick Actions:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <a
                href={generateWhatsAppLink('payment')}
                target="_blank"
                rel="noreferrer"
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  effectiveBalance > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                onClick={(e) => effectiveBalance <= 0 && e.preventDefault()}
              >
                Fee Reminder
              </a>
              <a
                href={generateWhatsAppLink('test')}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 text-purple-800 dark:text-purple-300 rounded text-[11px] font-bold transition flex items-center gap-1 border border-purple-200 dark:border-purple-800"
              >
                Test Reminder
              </a>
              <a
                href={generateWhatsAppLink('class')}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 text-blue-800 dark:text-blue-300 rounded text-[11px] font-bold transition flex items-center gap-1 border border-blue-200 dark:border-blue-800"
              >
                Class Schedule
              </a>
              <a
                href={generateWhatsAppLink('documents')}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-800 dark:text-amber-300 rounded text-[11px] font-bold transition flex items-center gap-1 border border-amber-200 dark:border-amber-800"
              >
                Document Reminder
              </a>
              <a
                href={generateWhatsAppLink('licence')}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-800 dark:text-rose-300 rounded text-[11px] font-bold transition flex items-center gap-1 border border-rose-200 dark:border-rose-800"
              >
                Licence Ready
              </a>
            </div>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="border-b border-slate-200 dark:border-slate-700 flex overflow-x-auto gap-1 bg-white dark:bg-slate-800 px-3 pt-2 rounded-t-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition ${
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
            {/* Active Application Lifecycle Stepper Banner */}
            {activeApp && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers size={16} className="text-red-600" />
                      Active Application: {activeApp.applicationId} ({activeApp.serviceType})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Enrolled: {activeApp.coursePackage || 'LMV+MCWG'} &bull; Vehicle: {activeApp.vehicleClass || '4 Wheeler'} &bull; Date: {new Date(activeApp.applicationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge type="status" value={activeApp.lifecycleStatus} />
                </div>

                {/* Lifecycle Pipeline Progress Bar */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 overflow-x-auto pb-1 gap-2">
                    {['Lead', 'Registered', 'Docs Pending', 'LL Approved', 'Training', 'Test Scheduled', 'Test Passed', 'Licence Ready', 'Completed'].map((stage, idx) => {
                      const stageKey = stage === 'Docs Pending' ? 'Documents Pending' : stage === 'Licence Ready' ? 'Licence Processing' : stage;
                      const isCurrent = activeApp.lifecycleStatus === stageKey;
                      return (
                        <div key={idx} className="flex items-center gap-1 shrink-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isCurrent
                              ? 'bg-red-600 text-white ring-2 ring-red-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className={isCurrent ? 'font-extrabold text-red-600 dark:text-red-400' : 'text-slate-500'}>
                            {stage}
                          </span>
                          {idx < 8 && <ChevronRight size={13} className="text-slate-300 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Candidate Details & Identity Snapshot */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                  Student Master & Demographic Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Permanent Student ID</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">{student.studentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Full Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Alias / Pet Name</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{student.aliasSourceName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Gender</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{student.gender || 'Male'}</span>
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
                  <div>
                    <span className="text-slate-400 block font-medium">Lead Acquisition Source</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{student.leadSource || 'Walk-in'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Referral Details</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{student.referral || '—'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                  Contact & Residential Address
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
                    <span className="text-slate-400 block font-medium">House / Street Address</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{student.address?.houseName || '—'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block font-medium">Guardian / Emergency Contact</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {student.emergencyContact?.name ? `${student.emergencyContact.name} (${student.emergencyContact.relation || 'Parent'}) - ${student.emergencyContact.phone || ''}` : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: APPLICATIONS (P0: Student vs Application Separation) */}
        {/* ========================================================================= */}
        {activeTab === 'personal' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                Personal Identity & Demographics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Register Category</span>
                  <span className="font-bold text-red-600 dark:text-red-400 text-xs">{student.category || 'A – New Application'}</span>
                </div>
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
                <div>
                  <span className="text-slate-400 block font-medium">Guardian Name & Relation</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.guardian || student.emergencyContact?.name || 'Not Specified'}</span>
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
                  <span className="text-slate-400 block font-medium">Verification Status / Details</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{student.verificationNotes || 'Source Verified'}</span>
        {activeTab === 'applications' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers size={17} className="text-red-600" />
                    Student Licence Applications Pipeline ({applications.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1-to-Many architecture: Permanent Student ID remains attached to person, while each service receives its own Application ID.
                  </p>
                </div>
                <button
                  onClick={() => setNewAppModalOpen(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} /> + New Service Application
                </button>
              </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                Admission, Sarathi & Test Pipeline
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
                  <span className="text-slate-400 block font-medium">Sarathi App No</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{student.sarathiAppNo || student.applicationNo || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">LL Test Date</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{student.llTestDate ? new Date(student.llTestDate).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Final Test Date</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{student.finalTestDate || student.testDate ? new Date(student.finalTestDate || student.testDate).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Next Action</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.nextAction || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Next Action Date</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{student.followUpDate ? new Date(student.followUpDate).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Referral / Source (Alias)</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{student.aliasSourceName || 'Direct Walk-in'}</span>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No applications found. Click "+ New Service Application" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {applications.map((app) => (
                    <div
                      key={app._id}
                      className="p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded border border-red-200 dark:border-red-900">
                            {app.applicationId}
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                            {app.serviceType}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            ({app.coursePackage || `${app.vehicleClass} - ${app.licenceType}`})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={app.lifecycleStatus}
                            onChange={(e) => handleUpdateApplicationStatus(app._id, e.target.value)}
                            className="px-2.5 py-1 text-xs font-bold rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                          >
                            <option value="Lead">Lead</option>
                            <option value="Registered">Registered</option>
                            <option value="Documents Pending">Documents Pending</option>
                            <option value="LL Processing">LL Processing</option>
                            <option value="LL Approved">LL Approved</option>
                            <option value="Training">Training</option>
                            <option value="Test Scheduled">Test Scheduled</option>
                            <option value="Retest">Retest</option>
                            <option value="Test Passed">Test Passed</option>
                            <option value="Licence Processing">Licence Processing</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>

                          <button
                            onClick={() => handleOpenTestModal(app)}
                            className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold rounded-md border border-purple-200 dark:border-purple-800 transition"
                          >
                            Edit Stages
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="text-slate-400 block font-medium">Package Fee</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ₹ {app.feeStructure?.packageFee ?? app.packageFee ?? 9000}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Total Received</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ₹ {app.feeStructure?.totalReceived ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Balance Due</span>
                          <span className={`font-bold ${app.feeStructure?.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹ {app.feeStructure?.balanceDue ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Application Date</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {new Date(app.applicationDate || app.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Next Action Bar */}
                      <div className="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-amber-600 shrink-0" />
                          <span className="text-slate-600 dark:text-slate-300">
                            Next Action: <strong>{app.nextAction || 'Verify Documents'}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                          Due: {app.nextActionDueDate ? new Date(app.nextActionDueDate).toLocaleDateString() : 'N/A'} ({app.nextActionPriority || 'Medium'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {student.notes && (
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">
                  Notes & Remarks
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                  {student.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TRAINING LEDGER (P0: 5 KM = 1 Road, 3 H = 1 H Class) */}
        {/* ========================================================================= */}
        {activeTab === 'training' && (
          <div className="space-y-5">
            {/* Class Formula Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Total Road Driven</span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {totalKmDriven} <span className="text-xs font-normal text-slate-400">KM</span>
                </p>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                  = {calculatedRoadClasses} Road Classes <span className="text-[10px] text-slate-400 font-mono">(5 KM = 1 Cls)</span>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">H Practice Sessions</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {totalHPracticesCount} <span className="text-xs font-normal text-slate-400">Practices</span>
                </p>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                  = {calculatedHClasses} H Classes <span className="text-[10px] text-slate-400 font-mono">(3 H = 1 Cls)</span>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Total Combined Classes</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {totalCombinedClasses} <span className="text-xs font-normal text-slate-400">/ 20</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {trainingPct}% Quota Completed
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Training Class Slip</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Official Printable Certificate
                  </p>
                </div>
                <button
                  onClick={handleOpenClassSlip}
                  disabled={classSlipLoading}
                  className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet size={14} />
                  {classSlipLoading ? 'Loading...' : 'Print Class Slip'}
                </button>
              </div>
            </div>

            {/* Practical Driving Class Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Training Sessions Ledger ({classes.length} Sessions)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Track start KM, end KM, distance driven, H-practice counts, and auto-derived class equivalents.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenClassSlip}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-md transition flex items-center gap-1.5"
                  >
                    <Printer size={15} /> Print Slip
                  </button>
                  <button
                    onClick={() => setClassModalOpen(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} /> + Add Class Session
                  </button>
                </div>
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
                        {row.instructor || 'Instructor'}
                      </span>
                    )
                  },
                  {
                    header: 'Type',
                    cell: (row) => <Badge type="class" value={row.trainingType || 'Practical Driving'} />
                  },
                  {
                    header: 'KM Reading',
                    cell: (row) => (
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {row.kmStart ? `${row.kmStart} - ${row.kmEnd}` : '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Road KM',
                    cell: (row) => (
                      <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">
                        {row.kmDriven || row.km || 0} KM
                      </span>
                    )
                  },
                  {
                    header: 'H Practices',
                    cell: (row) => (
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                        {row.hPracticeCount || 0}
                      </span>
                    )
                  },
                  {
                    header: 'Derived Eq',
                    cell: (row) => {
                      const km = Number(row.kmDriven || row.km || 0);
                      const h = Number(row.hPracticeCount || 0);
                      const eq = Math.round(((km / 5) + (h / 3)) * 10) / 10;
                      return (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {eq} Eq
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Notes',
                    cell: (row) => (
                      <span className="text-xs text-slate-500 truncate max-w-[180px] block" title={row.notes || ''}>
                        {row.notes || '—'}
                      </span>
                    )
                  }
                ]}
                data={classes}
                emptyMessage="No training sessions logged yet."
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PAYMENTS (P0: Transaction-Based Payment Accounting) */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            {/* Itemized Fee Breakdown Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard size={17} className="text-red-600" />
                  Itemized Fee Structure & Balance Calculation
                </h3>
                <span className="text-xs text-slate-400">Strict Transaction-Based Accounting</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Package Fee</span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                    ₹ {activeApp?.feeStructure?.packageFee ?? student.totalFee ?? 9000}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">+ RTO Fee</span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                    ₹ {activeApp?.feeStructure?.rtoServiceFee ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">+ Retest Fee</span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                    ₹ {activeApp?.feeStructure?.retestFee ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">+ Other Chg</span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                    ₹ {activeApp?.feeStructure?.otherCharges ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">- Discount</span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                    ₹ {activeApp?.feeStructure?.discount ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">= Net Payable</span>
                  <p className="font-black text-blue-900 dark:text-blue-200 text-base mt-0.5">
                    ₹ {effectiveNetPayable}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Total Received</span>
                  <p className="font-black text-emerald-900 dark:text-emerald-200 text-base mt-0.5">
                    ₹ {effectiveReceived}
                  </p>
                </div>
                <div className={`p-3 rounded border ${effectiveBalance > 0 ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'}`}>
                  <span className={`text-[10px] font-bold uppercase ${effectiveBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    Balance Due
                  </span>
                  <p className={`font-black text-base mt-0.5 ${effectiveBalance > 0 ? 'text-rose-900 dark:text-rose-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                    ₹ {effectiveBalance}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Transactions Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Transaction Payment Ledger ({payments.length} Transactions)
                </h3>
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={15} /> + Add Payment
                </button>
              </div>

              <DataTable
                columns={[
                  {
                    header: 'Receipt #',
                    cell: (row) => (
                      <button
                        onClick={() => setSelectedReceiptPayment(row)}
                        title="Click to view printable receipt"
                        className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded hover:underline inline-flex items-center gap-1"
                      >
                        <Receipt size={12} />
                        <span>{row.receiptNo || row.paymentId || `BENZ-REC-${String(row._id).slice(-4).toUpperCase()}`}</span>
                      </button>
                    )
                  },
                  {
                    header: 'Date',
                    cell: (row) => (
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Amount Received',
                    cell: (row) => (
                      <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        ₹ {row.amount}
                      </span>
                    )
                  },
                  {
                    header: 'Payment Mode',
                    cell: (row) => (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {row.paymentMethod || 'Cash'}
                      </span>
                    )
                  },
                  {
                    header: 'Reference #',
                    cell: (row) => (
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {row.referenceNumber || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Received By',
                    cell: (row) => (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {row.receivedBy || 'Office Desk'}
                      </span>
                    )
                  },
                  {
                    header: 'Receipt Action',
                    className: 'text-right',
                    cell: (row) => (
                      <button
                        onClick={() => setSelectedReceiptPayment(row)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-bold inline-flex items-center gap-1 transition"
                      >
                        <Printer size={13} />
                        <span>Receipt</span>
                      </button>
                    )
                  }
                ]}
                data={payments}
                emptyMessage="No payment transactions logged yet."
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: TESTS & LICENCE (P0: Split LL, Driving Test, DL) */}
        {/* ========================================================================= */}
        {activeTab === 'tests' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  RTO Milestone Architecture
                </h3>
                <p className="text-xs text-slate-400">
                  Three independent stages: Learner Licence, Driving Test, and Final Driving Licence.
                </p>
              </div>
              <button
                onClick={() => handleOpenTestModal(activeApp)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
              >
                <Edit size={14} /> Update Test / Licence Details
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Panel 1: Learner Licence (LL) */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    1. Learner Licence (LL)
                  </h4>
                  <Badge type="status" value={activeApp?.learnerLicence?.status || student.learnerLicence?.status || 'Pending'} />
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">LL Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {activeApp?.learnerLicence?.llNumber || student.learnerLicence?.llNumber || 'Pending Application'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">LL Application Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.learnerLicence?.llApplicationDate ? new Date(activeApp.learnerLicence.llApplicationDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">LL Test Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.learnerLicence?.llTestDate ? new Date(activeApp.learnerLicence.llTestDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">LL Issue Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.learnerLicence?.issueDate ? new Date(activeApp.learnerLicence.issueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">LL Expiry Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.learnerLicence?.expiryDate ? new Date(activeApp.learnerLicence.expiryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel 2: Driving Test */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    2. RTO Driving Test
                  </h4>
                  <Badge type="status" value={activeApp?.drivingTest?.testResult || student.testStatus || 'Pending'} />
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Scheduled Test Date</span>
                    <span className="font-bold text-purple-700 dark:text-purple-400 text-sm">
                      {activeApp?.drivingTest?.drivingTestDate
                        ? new Date(activeApp.drivingTest.drivingTestDate).toLocaleDateString()
                        : student.testDate
                        ? new Date(student.testDate).toLocaleDateString()
                        : 'Not Scheduled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Test Time / Slot</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.drivingTest?.testSlot || 'Morning Slot (09:00 AM)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Vehicle Class</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.vehicleClass || student.vehicleType || '4 Wheeler'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Retest Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.drivingTest?.retestDate ? new Date(activeApp.drivingTest.retestDate).toLocaleDateString() : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Retest Count</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.drivingTest?.retestCount || 0} Retest(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel 3: Driving Licence (DL) */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                    3. Driving Licence (DL)
                  </h4>
                  <Badge type="status" value={activeApp?.licence?.status || student.drivingLicence?.status || 'Pending'} />
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">DL Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {activeApp?.licence?.dlNumber || student.drivingLicence?.dlNumber || 'Pending Test Completion'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">DL Issue Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.licence?.issueDate ? new Date(activeApp.licence.issueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Received / Dispatch Status</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.licence?.dispatchStatus || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Completion Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeApp?.licence?.completionDate ? new Date(activeApp.licence.completionDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: DOCUMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-5">
            {/* Smart Document Readiness Checklist */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck size={17} className="text-red-600" />
                    Mandatory Compliance Checklist
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official Parivahan/RTO prerequisites verification status.
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-black ${docReadinessPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {docReadinessPct}% Ready
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {docChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                      item.ready
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.ready ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-slate-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Records Repository Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Uploaded Document Repository ({documents.length} Files)
                </h3>
                <button
                  onClick={() => setDocModalOpen(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
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
                    header: 'Recorded Date',
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
                  {
                    header: 'Verified By',
                    cell: (row) => row.verifiedBy?.name || 'Staff'
                  },
                  { header: 'Remarks', accessor: 'remarks' }
                ]}
                data={documents}
                emptyMessage="No uploaded document records registered yet."
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: TIMELINE (Central AuditLog & Activity) */}
        {/* ========================================================================= */}
        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
              <Activity size={17} className="text-red-600" />
              Central Operational Audit Trail ({timeline.length} Entries)
            </h3>

            {timeline.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit trail records found.</p>
            ) : (
              <div className="space-y-4 pt-2">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 border-l-2 border-red-600 pl-4 py-1">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                          {item.action || item.actionType || 'Action Logged'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp || item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {item.description || item.entity || 'System Update'}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        By: {item.performedBy || item.user || 'System'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. ADD CLASS MODAL */}
      <Modal isOpen={classModalOpen} onClose={() => setClassModalOpen(false)} title={`Record Training Class: ${student.fullName}`}>
        <form onSubmit={handleCreateClass} className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Class Date *</label>
              <input
                type="date"
                required
                value={classFormData.classDate}
                onChange={(e) => setClassFormData({ ...classFormData, classDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Training Type</label>
              <select
                value={classFormData.trainingType}
                onChange={(e) => setClassFormData({ ...classFormData, trainingType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="Road Training">Road Training</option>
                <option value="H Track / Ground">H Track / Ground</option>
                <option value="Simulator">Simulator</option>
                <option value="Theory">Theory Session</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Start KM</label>
              <input
                type="number"
                value={classFormData.kmStart}
                onChange={(e) => setClassFormData({ ...classFormData, kmStart: e.target.value })}
                placeholder="e.g. 10250"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End KM</label>
              <input
                type="number"
                value={classFormData.kmEnd}
                onChange={(e) => setClassFormData({ ...classFormData, kmEnd: e.target.value })}
                placeholder="e.g. 10255"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">KM Driven *</label>
              <input
                type="number"
                value={classFormData.km}
                onChange={(e) => setClassFormData({ ...classFormData, km: e.target.value })}
                placeholder="e.g. 5"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">H Practice Count</label>
              <input
                type="number"
                value={classFormData.hPracticeCount}
                onChange={(e) => setClassFormData({ ...classFormData, hPracticeCount: e.target.value })}
                placeholder="e.g. 3"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Duration (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={classFormData.hours}
                onChange={(e) => setClassFormData({ ...classFormData, hours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Vehicle No</label>
              <input
                type="text"
                value={classFormData.vehicleNo}
                onChange={(e) => setClassFormData({ ...classFormData, vehicleNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Instructor</label>
              <select
                value={classFormData.instructor}
                onChange={(e) => setClassFormData({ ...classFormData, instructor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="">-- Select Instructor --</option>
                {instructors.map((ins) => (
                  <option key={ins._id} value={ins.name}>{ins.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Remarks</label>
            <textarea
              rows="2"
              value={classFormData.notes}
              onChange={(e) => setClassFormData({ ...classFormData, notes: e.target.value })}
              placeholder="Session performance remarks"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
            ></textarea>
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
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-md shadow-xs"
            >
              {classSubmitting ? 'Recording...' : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. RECORD PAYMENT MODAL */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={`Record Fee Payment: ${student.fullName}`}>
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
                placeholder="e.g. 3000"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Mode</label>
              <select
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank">Bank Transfer / NEFT</option>
                <option value="Card">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Type</label>
              <select
                value={paymentFormData.paymentType}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="Fee Payment">Fee Payment</option>
                <option value="Advance Payment">Advance Payment</option>
                <option value="RTO Fee">RTO Fee</option>
                <option value="Retest Fee">Retest Fee</option>
                <option value="Other">Other Charges</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Reference / UTR Number</label>
              <input
                type="text"
                value={paymentFormData.referenceNumber}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                placeholder="e.g. UPI Ref / Txn ID"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Received By</label>
              <input
                type="text"
                value={paymentFormData.receivedBy}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, receivedBy: e.target.value })}
                placeholder="Staff Name"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              placeholder="Payment remarks"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-md shadow-xs"
            >
              {paymentSubmitting ? 'Generating Receipt...' : 'Save & Generate Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. NEW APPLICATION MODAL */}
      <Modal isOpen={newAppModalOpen} onClose={() => setNewAppModalOpen(false)} title={`Create Service Application for ${student.fullName}`}>
        <form onSubmit={handleCreateApplication} className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Service Type *</label>
              <select
                value={newAppFormData.serviceType}
                onChange={(e) => setNewAppFormData({ ...newAppFormData, serviceType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-semibold"
              >
                <option value="Fresh Licence">Fresh Licence</option>
                <option value="Additional Class">Additional Class / Endorsement</option>
                <option value="Retest">Retest</option>
                <option value="Licence Renewal">Licence Renewal</option>
                <option value="3W Addition">3W Addition</option>
                <option value="Post Licence Training">Post Licence Training</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Licence Type</label>
              <select
                value={newAppFormData.licenceType}
                onChange={(e) => setNewAppFormData({ ...newAppFormData, licenceType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs"
              >
                <option value="LMV+MCWG">LMV + MCWG</option>
                <option value="LMV">LMV (4 Wheeler)</option>
                <option value="MCWG">MCWG (2 Wheeler)</option>
                <option value="3W">3 Wheeler</option>
                <option value="Heavy">Heavy Vehicle</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Package Fee (₹)</label>
              <input
                type="number"
                value={newAppFormData.packageFee}
                onChange={(e) => setNewAppFormData({ ...newAppFormData, packageFee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">RTO Service Fee (₹)</label>
              <input
                type="number"
                value={newAppFormData.rtoServiceFee}
                onChange={(e) => setNewAppFormData({ ...newAppFormData, rtoServiceFee: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/60 space-y-3">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase block">
              Mandatory Next Action (P0 Requirement)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold mb-0.5">Next Action *</label>
                <input
                  type="text"
                  required
                  value={newAppFormData.nextAction}
                  onChange={(e) => setNewAppFormData({ ...newAppFormData, nextAction: e.target.value })}
                  placeholder="e.g. Verify Documents"
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">Due Date *</label>
                <input
                  type="date"
                  required
                  value={newAppFormData.nextActionDueDate}
                  onChange={(e) => setNewAppFormData({ ...newAppFormData, nextActionDueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setNewAppModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={newAppSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-md shadow-xs"
            >
              {newAppSubmitting ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. UPDATE TEST & LICENCE STAGES MODAL */}
      <Modal isOpen={testModalOpen} onClose={() => setTestModalOpen(false)} title="Update RTO Test & Licence Stages">
        <form onSubmit={handleSaveTestStages} className="space-y-4 text-slate-800 dark:text-slate-100 max-h-[75vh] overflow-y-auto px-1">
          {/* Section A: LL */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">1. Learner Licence (LL)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">LL Number</label>
                <input
                  type="text"
                  value={testFormData.llNumber}
                  onChange={(e) => setTestFormData({ ...testFormData, llNumber: e.target.value })}
                  placeholder="e.g. KL102026000123"
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">LL Status</label>
                <select
                  value={testFormData.llStatus}
                  onChange={(e) => setTestFormData({ ...testFormData, llStatus: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Passed">Passed</option>
                  <option value="Issued">Issued</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">LL Issue Date</label>
                <input
                  type="date"
                  value={testFormData.llIssueDate}
                  onChange={(e) => setTestFormData({ ...testFormData, llIssueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">LL Expiry Date</label>
                <input
                  type="date"
                  value={testFormData.llExpiryDate}
                  onChange={(e) => setTestFormData({ ...testFormData, llExpiryDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section B: Driving Test */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">2. Driving Test</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">Driving Test Date</label>
                <input
                  type="date"
                  value={testFormData.drivingTestDate}
                  onChange={(e) => setTestFormData({ ...testFormData, drivingTestDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">Test Result</label>
                <select
                  value={testFormData.drivingTestResult}
                  onChange={(e) => setTestFormData({ ...testFormData, drivingTestResult: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs font-bold"
                >
                  <option value="Pending">Pending</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">Retest Date (If Failed)</label>
                <input
                  type="date"
                  value={testFormData.retestDate}
                  onChange={(e) => setTestFormData({ ...testFormData, retestDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">Slot</label>
                <input
                  type="text"
                  value={testFormData.drivingTestSlot}
                  onChange={(e) => setTestFormData({ ...testFormData, drivingTestSlot: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section C: Final DL */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">3. Final Licence (DL)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">DL Number</label>
                <input
                  type="text"
                  value={testFormData.dlNumber}
                  onChange={(e) => setTestFormData({ ...testFormData, dlNumber: e.target.value })}
                  placeholder="e.g. KL102026DL0045"
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">DL Status</label>
                <select
                  value={testFormData.licenceStatus}
                  onChange={(e) => setTestFormData({ ...testFormData, licenceStatus: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs font-bold"
                >
                  <option value="Under Processing">Under Processing</option>
                  <option value="Approved">Approved</option>
                  <option value="Printed">Printed</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">DL Issue Date</label>
                <input
                  type="date"
                  value={testFormData.dlIssueDate}
                  onChange={(e) => setTestFormData({ ...testFormData, dlIssueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5">Dispatch / Collection Status</label>
                <select
                  value={testFormData.dlDispatchStatus}
                  onChange={(e) => setTestFormData({ ...testFormData, dlDispatchStatus: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Received at Office">Received at Office</option>
                  <option value="Delivered to Candidate">Delivered to Candidate</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTestModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-bold rounded-md shadow-xs"
            >
              {testSubmitting ? 'Updating...' : 'Save Stage Details'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. ADD DOCUMENT MODAL */}
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

      {/* ADD EXTRA SERVICE MODAL */}
      <AddServiceModal
        isOpen={addServiceModalOpen}
        onClose={() => setAddServiceModalOpen(false)}
        student={student}
        onServiceAdded={handleAddService}
      />

      {/* TRANSFER STUDENT BATCH MODAL */}
      {/* 6. TRANSFER STUDENT BATCH MODAL */}
      <TransferStudentModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        student={student}
        batches={batches}
        currentBatchId={student.batch?._id || student.batch}
        onTransferSuccess={handleTransferBatch}
      />

      {/* 7. OFFICIAL RECEIPT MODAL */}
      {selectedReceiptPayment && (
        <ReceiptModal
          isOpen={!!selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
          payment={selectedReceiptPayment}
          student={student}
        />
      )}

      {/* 8. OFFICIAL CLASS SLIP MODAL */}
      {classSlipModalOpen && (
        <ClassSlipModal
          isOpen={classSlipModalOpen}
          onClose={() => setClassSlipModalOpen(false)}
          data={classSlipData}
        />
      )}
    </MainLayout>
  );
};

export default StudentDetailPage;
