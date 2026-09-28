import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import AssignStudentModal from '../../components/AssignStudentModal';
import TransferStudentModal from '../../components/TransferStudentModal';
import RecordAttendanceModal from '../../components/RecordAttendanceModal';
import AddScheduleModal from '../../components/AddScheduleModal';

import {
  getBatchById,
  updateBatch,
  getBatches,
  assignStudentToBatch,
  removeStudentFromBatch,
  transferStudentFromBatch,
  createBatchSchedule,
  updateBatchSchedule,
  deleteBatchSchedule,
  recordBatchAttendance
} from '../../services/batchService';
import { getUsers } from '../../services/userService';

import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  UserCheck,
  Car,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  CalendarPlus,
  CheckSquare,
  ArrowRightLeft,
  UserMinus,
  Eye,
  BookOpen,
  Award,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Clock3,
  Check,
  ChevronRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null);

  // Auxiliary data
  const [otherBatches, setOtherBatches] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Search filter for students tab
  const [studentSearch, setStudentSearch] = useState('');

  // Edit Batch Form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    batchNumber: '',
    courseLicenceType: '',
    vehicleType: '',
    session: 'Morning',
    instructor: '',
    secondaryInstructor: '',
    vehicleNo: '',
    meetingPoint: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    maxStudents: 15,
    status: 'Active',
    notes: ''
  });

  const showNotification = (msg) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBatchById(id);
      setBatch(res);

      // Pre-fill edit form
      setEditFormData({
        name: res.name || '',
        batchNumber: res.batchNumber || '',
        courseLicenceType: res.courseLicenceType || 'LMV - 4 Wheeler',
        vehicleType: res.vehicleType || '4 Wheeler',
        session: res.session || 'Morning',
        instructor: res.instructor || '',
        secondaryInstructor: res.secondaryInstructor || '',
        vehicleNo: res.vehicleNo || '',
        meetingPoint: res.meetingPoint || '',
        startDate: res.startDate ? res.startDate.split('T')[0] : '',
        endDate: res.endDate ? res.endDate.split('T')[0] : '',
        startTime: res.startTime || '07:00 AM',
        endTime: res.endTime || '08:30 AM',
        maxStudents: res.maxStudents || 15,
        status: res.status || 'Active',
        notes: res.notes || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch batch details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [batchesRes, usersRes] = await Promise.all([
        getBatches({ limit: 'all' }),
        getUsers()
      ]);
      const list = Array.isArray(batchesRes) ? batchesRes : (batchesRes?.batches || []);
      setOtherBatches(list.filter(b => b._id !== id));

      if (Array.isArray(usersRes)) {
        const eligible = usersRes.filter(u => u.role !== 'Superadmin');
        setInstructors(eligible);
      }
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    fetchBatchData();
    fetchAuxiliaryData();
  }, [id]);

  // Handle Assign Student
  const handleAssignStudent = async (studentId) => {
    try {
      await assignStudentToBatch(id, studentId);
      showNotification('Student successfully assigned to batch!');
      fetchBatchData();
    } catch (err) {
      throw new Error(err.message || 'Failed to assign student');
    }
  };

  // Handle Remove Student
  const handleConfirmRemoveStudent = async () => {
    if (!removeTarget) return;
    try {
      setActionLoading(true);
      await removeStudentFromBatch(id, removeTarget._id);
      showNotification(`Student ${removeTarget.fullName} unassigned from batch.`);
      setRemoveTarget(null);
      fetchBatchData();
    } catch (err) {
      setError(err.message || 'Failed to remove student');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Transfer Student
  const handleTransferStudent = async ({ studentId, targetBatchId, reason }) => {
    try {
      await transferStudentFromBatch(id, { studentId, targetBatchId, reason });
      showNotification('Student transferred to new batch successfully!');
      fetchBatchData();
    } catch (err) {
      throw new Error(err.message || 'Failed to transfer student');
    }
  };

  // Handle Add Schedule
  const handleAddSchedule = async (scheduleData) => {
    try {
      await createBatchSchedule(id, scheduleData);
      showNotification('Class schedule created successfully!');
      fetchBatchData();
    } catch (err) {
      throw new Error(err.message || 'Failed to create schedule');
    }
  };

  // Handle Toggle Schedule Status
  const handleToggleScheduleStatus = async (sched) => {
    try {
      const nextStatus = sched.status === 'Completed' ? 'Scheduled' : 'Completed';
      await updateBatchSchedule(id, sched._id, { status: nextStatus });
      showNotification(`Schedule marked as ${nextStatus}!`);
      fetchBatchData();
    } catch (err) {
      setError(err.message || 'Failed to update schedule');
    }
  };

  // Handle Delete Schedule
  const handleConfirmDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return;
    try {
      setActionLoading(true);
      await deleteBatchSchedule(id, deleteScheduleTarget._id);
      showNotification('Schedule deleted successfully.');
      setDeleteScheduleTarget(null);
      fetchBatchData();
    } catch (err) {
      setError(err.message || 'Failed to delete schedule');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Record Attendance
  const handleRecordAttendance = async (attendanceData) => {
    try {
      await recordBatchAttendance(id, attendanceData);
      showNotification('Batch attendance saved successfully!');
      fetchBatchData();
    } catch (err) {
      throw new Error(err.message || 'Failed to save attendance');
    }
  };

  // Handle Edit Batch Form Submit
  const handleEditBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await updateBatch(id, editFormData);
      showNotification('Batch information updated successfully!');
      setIsEditOpen(false);
      fetchBatchData();
    } catch (err) {
      setError(err.message || 'Failed to update batch');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Batch Details" />
        <LoadingSpinner message="Loading batch details & candidates..." />
      </MainLayout>
    );
  }

  if (error || !batch) {
    return (
      <MainLayout>
        <Navbar title="Batch Details" />
        <ErrorMessage message={error || 'Batch not found'} onRetry={fetchBatchData} />
      </MainLayout>
    );
  }

  // Filter enrolled students for Students tab
  const enrolledStudents = batch.students || [];
  const filteredStudents = enrolledStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const term = studentSearch.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(term)) ||
      (s.studentId && s.studentId.toLowerCase().includes(term)) ||
      (s.primaryMobile && s.primaryMobile.includes(term))
    );
  });

  const schedules = batch.schedules || [];
  const attendances = batch.recentAttendance || [];
  const feeSummary = batch.feeSummary || { totalExpected: 0, totalCollected: 0, totalPending: 0 };

  const capacityPercent = batch.maxStudents > 0
    ? Math.min(100, Math.round(((batch.enrolledCount || 0) / batch.maxStudents) * 100))
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen, count: null },
    { id: 'students', label: 'Enrolled Candidates', icon: Users, count: enrolledStudents.length },
    { id: 'schedules', label: 'Class Schedule', icon: Calendar, count: schedules.length },
    { id: 'attendance', label: 'Attendance Register', icon: CheckSquare, count: attendances.length },
    { id: 'training', label: 'Training Progress', icon: Award, count: null },
    { id: 'fees', label: 'Fee Summary', icon: DollarSign, count: null }
  ];

  return (
    <MainLayout>
      <Navbar title={`Batch: ${batch.name}`} />

      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Navigation & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/batches"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 w-fit"
          >
            <ArrowLeft size={16} /> Back to Batches
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAssignOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Assign Student
            </button>
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5"
            >
              <CalendarPlus size={14} className="text-purple-600 dark:text-purple-400" /> Schedule Class
            </button>
            <button
              onClick={() => setIsAttendanceOpen(true)}
              disabled={enrolledStudents.length === 0}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 disabled:opacity-50 text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5"
            >
              <CheckSquare size={14} className="text-emerald-600 dark:text-emerald-400" /> Record Attendance
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5"
            >
              <Edit size={14} /> Edit Batch
            </button>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-all">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Hero Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded border border-red-100 dark:border-red-900/50">
                  {batch.batchNumber || 'BATCH-001'}
                </span>
                <Badge variant={batch.session?.toLowerCase() || 'morning'}>
                  {batch.session || 'Morning'}
                </Badge>
                <Badge variant={batch.status?.toLowerCase() || 'active'}>
                  {batch.status || 'Active'}
                </Badge>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                {batch.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>{batch.courseLicenceType}</span>
                <span>&bull;</span>
                <span>{batch.vehicleType}</span>
                {batch.vehicleNo && (
                  <>
                    <span>&bull;</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {batch.vehicleNo}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Capacity Meter */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[220px]">
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Users size={14} className="text-red-600" /> Batch Roster
                </span>
                <span className="text-slate-900 dark:text-white font-mono">
                  {batch.enrolledCount || 0} / {batch.maxStudents || 15}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    capacityPercent >= 100
                      ? 'bg-rose-500'
                      : capacityPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 text-right font-medium">
                {capacityPercent}% filled {capacityPercent >= 100 ? '(Full)' : `(${batch.maxStudents - (batch.enrolledCount || 0)} spots left)`}
              </p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium block">Primary Instructor</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <UserCheck size={14} className="text-red-600 shrink-0" />
                {batch.instructor || 'Unassigned'}
              </span>
              {batch.secondaryInstructor && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Sec: {batch.secondaryInstructor}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium block">Daily Class Slot</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock3 size={14} className="text-amber-500 shrink-0" />
                {batch.startTime} - {batch.endTime}
              </span>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium block">Training Duration</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-purple-500 shrink-0" />
                {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'Immediate'}
                {batch.endDate ? ` → ${new Date(batch.endDate).toLocaleDateString()}` : ''}
              </span>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium block">Meeting / Ground</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <MapPin size={14} className="text-emerald-500 shrink-0" />
                {batch.meetingPoint || 'West Kodur Ground'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-1" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-bold text-xs whitespace-nowrap transition-all ${
                    isActive
                      ? 'border-red-600 text-red-600 dark:text-red-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Enrolled</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Users size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {enrolledStudents.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Max capacity: {batch.maxStudents}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Classes Scheduled</span>
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Calendar size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {schedules.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {schedules.filter(s => s.status === 'Completed').length} completed
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Attendance Logged</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <CheckSquare size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {attendances.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Individual candidate marks</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Batch Fees Collected</span>
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                    <DollarSign size={16} />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  ₹{feeSummary.totalCollected.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ₹{feeSummary.totalPending.toLocaleString()} pending
                </p>
              </div>
            </div>

            {/* Detailed Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batch Configuration Details */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <BookOpen size={16} className="text-red-600" /> Batch Specifications & Rules
                </h3>
                <dl className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Batch Code</dt>
                    <dd className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {batch.batchNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Curriculum / Licence</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {batch.courseLicenceType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Session Mode</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {batch.session} ({batch.startTime} - {batch.endTime})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Ground Location</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {batch.meetingPoint || 'West Kodur Track'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Assigned Vehicle Reg</dt>
                    <dd className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {batch.vehicleNo || 'KL-01-AB-1234'} ({batch.vehicleType})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Status</dt>
                    <dd className="mt-0.5">
                      <Badge variant={batch.status?.toLowerCase() || 'active'}>{batch.status}</Badge>
                    </dd>
                  </div>
                </dl>
                {batch.notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Notes & Instructions
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      {batch.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Candidate Roster Preview */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <Users size={16} className="text-red-600" /> Active Enrollees ({enrolledStudents.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('students')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    View All &rarr;
                  </button>
                </div>
                {enrolledStudents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No candidates assigned yet.
                    <button
                      onClick={() => setIsAssignOpen(true)}
                      className="block mx-auto mt-2 text-red-600 font-bold hover:underline"
                    >
                      + Assign candidate now
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-64 overflow-y-auto">
                    {enrolledStudents.slice(0, 5).map((stu) => (
                      <div key={stu._id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">
                            {stu.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {stu.studentId} &bull; {stu.primaryMobile}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={stu.currentStatus?.toLowerCase() || 'active'}>
                            {stu.currentStatus}
                          </Badge>
                          <Link
                            to={`/students/${stu._id}`}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                            title="View candidate"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ENROLLED CANDIDATES */}
        {activeTab === 'students' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Filter enrolled candidates by name, phone, or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full text-xs font-medium pl-3 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                onClick={() => setIsAssignOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <UserPlus size={14} /> Assign Candidate
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Enrolled Students"
                description={
                  studentSearch
                    ? 'No candidates match your search filter.'
                    : 'Assign candidates to this batch to manage classes, road driving sessions, and attendance.'
                }
                actionLabel="Assign Student"
                onAction={() => setIsAssignOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Student ID</th>
                      <th className="py-3 px-3">Candidate</th>
                      <th className="py-3 px-3">Vehicle</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Attendance %</th>
                      <th className="py-3 px-3">Fee Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((stu) => (
                      <tr key={stu._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="py-3 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                          {stu.studentId}
                        </td>
                        <td className="py-3 px-3">
                          <Link
                            to={`/students/${stu._id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-red-600 transition"
                          >
                            {stu.fullName}
                          </Link>
                          <div className="text-[11px] text-slate-400 font-mono">{stu.primaryMobile}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {stu.vehicleType}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={stu.currentStatus?.toLowerCase() || 'active'}>
                            {stu.currentStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${stu.attendanceRate || 0}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {stu.attendanceRate || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={stu.feeStatus?.toLowerCase() || 'unpaid'}>
                            {stu.feeStatus || 'Unpaid'}
                          </Badge>
                          {stu.balance > 0 && (
                            <span className="block text-[10px] text-rose-500 font-medium mt-0.5">
                              Bal: ₹{stu.balance.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setTransferTarget(stu)}
                              title="Transfer to Another Batch"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded transition"
                            >
                              <ArrowRightLeft size={15} />
                            </button>
                            <button
                              onClick={() => setRemoveTarget(stu)}
                              title="Remove from Batch"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition"
                            >
                              <UserMinus size={15} />
                            </button>
                            <Link
                              to={`/students/${stu._id}`}
                              title="View Full Profile"
                              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                            >
                              <Eye size={15} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLASS ROSTER & SCHEDULES */}
        {activeTab === 'schedules' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Scheduled Batch Classes ({schedules.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Plan ground track, simulator, highway driving, and theory sessions.
                </p>
              </div>
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <CalendarPlus size={14} /> Add Class Schedule
              </button>
            </div>

            {schedules.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Classes Scheduled"
                description="Create daily or weekly class schedules for this batch with vehicle and instructor allocations."
                actionLabel="Schedule First Class"
                onAction={() => setIsScheduleOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Date & Day</th>
                      <th className="py-3 px-3">Time Slot</th>
                      <th className="py-3 px-3">Class Type</th>
                      <th className="py-3 px-3">Instructor / Vehicle</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Topic / Remarks</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schedules.map((sched) => (
                      <tr key={sched._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 dark:text-slate-100 block">
                            {new Date(sched.date).toLocaleDateString()}
                          </span>
                          <span className="text-[11px] text-slate-400">{sched.day}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {sched.timeSlot}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px]">
                            {sched.classType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          <div className="font-medium">{sched.instructor || batch.instructor}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {sched.vehicleNo || batch.vehicleNo}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={sched.status === 'Completed' ? 'completed' : sched.status === 'Cancelled' ? 'danger' : 'active'}>
                            {sched.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 italic">
                          {sched.topicOrRemarks || sched.topic || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleScheduleStatus(sched)}
                              title={sched.status === 'Completed' ? 'Reopen Schedule' : 'Mark as Completed'}
                              className={`p-1.5 rounded transition ${
                                sched.status === 'Completed'
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteScheduleTarget(sched)}
                              title="Delete Schedule"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ATTENDANCE REGISTER */}
        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Batch Attendance Log ({attendances.length} records)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete historical record of attendance entries per candidate and class session.
                </p>
              </div>
              <button
                onClick={() => setIsAttendanceOpen(true)}
                disabled={enrolledStudents.length === 0}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <CheckSquare size={14} /> Record Batch Attendance
              </button>
            </div>

            {attendances.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="No Attendance Logged"
                description="Record daily attendance for the enrolled candidates in this batch."
                actionLabel="Take Attendance"
                onAction={() => setIsAttendanceOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Class Type</th>
                      <th className="py-3 px-3">Attendance</th>
                      <th className="py-3 px-3">Instructor</th>
                      <th className="py-3 px-3">Remarks / Topic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendances.map((att) => (
                      <tr key={att._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(att.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {att.student?.fullName || 'Candidate'}
                          </span>
                          <span className="block text-[11px] font-mono text-slate-400">
                            {att.student?.studentId}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-700 dark:text-slate-300">
                            {att.classType || 'Road & H'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {att.status === 'Present' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={12} /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                              <XCircle size={12} /> Absent
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {att.instructor || batch.instructor}
                        </td>
                        <td className="py-3 px-3 text-slate-500 italic">
                          {att.remarks || att.topic || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TRAINING PROGRESS MATRIX */}
        {activeTab === 'training' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Award size={16} className="text-red-600" /> Candidate Training & Test Readiness
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor ground 'H' track practice, road driving hours, and test eligibility for all candidates in this batch.
              </p>
            </div>

            {enrolledStudents.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No Candidates to Evaluate"
                description="Assign students to this batch to track their ground practice and test readiness."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Candidate</th>
                      <th className="py-3 px-3">Vehicle / Class</th>
                      <th className="py-3 px-3">Ground 'H' Track</th>
                      <th className="py-3 px-3">Road Driving Sessions</th>
                      <th className="py-3 px-3">Attendance</th>
                      <th className="py-3 px-3">Profile Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {enrolledStudents.map((stu) => {
                      const prog = stu.trainingProgress || {};
                      return (
                        <tr key={stu._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {stu.fullName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {stu.studentId}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            {stu.vehicleType}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={prog.groundPracticeStatus?.toLowerCase() || 'pending'}>
                              {prog.groundPracticeStatus || 'Pending'}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {prog.roadClassesCompleted || 0}
                            </span>
                            <span className="text-slate-400"> / {prog.totalRoadClassesRequired || 15} completed</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {stu.attendanceRate || 0}%
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <Link
                              to={`/students/${stu._id}`}
                              className="text-red-600 hover:text-red-700 font-bold inline-flex items-center gap-1"
                            >
                              View Card &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FEE SUMMARY */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Total Batch Fees</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  ₹{feeSummary.totalExpected.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Sum of student enrolled fees</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">Total Collected</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{feeSummary.totalCollected.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Includes advance + instalments</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">Outstanding Pending</span>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  ₹{feeSummary.totalPending.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Remaining fees to collect</p>
              </div>
            </div>

            {/* Candidate Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Candidate Fee Breakdown
              </h3>
              {enrolledStudents.length === 0 ? (
                <EmptyState icon={DollarSign} title="No Enrolled Candidates" description="Assign students to see fee collections." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">Candidate</th>
                        <th className="py-3 px-3">Total Fee</th>
                        <th className="py-3 px-3">Paid / Advance</th>
                        <th className="py-3 px-3">Pending Balance</th>
                        <th className="py-3 px-3">Fee Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {enrolledStudents.map((stu) => {
                        const paid = (stu.paidAmount || 0) + (stu.advanceAmount || 0);
                        const balance = (stu.totalFee || 0) - paid;
                        return (
                          <tr key={stu._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {stu.fullName}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {stu.studentId}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 font-mono">
                              ₹{(stu.totalFee || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              ₹{paid.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold">
                              {balance > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400">₹{balance.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">₹0</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={stu.feeStatus?.toLowerCase() || 'unpaid'}>
                                {stu.feeStatus || 'Unpaid'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                to={`/students/${stu._id}`}
                                className="text-xs font-bold text-red-600 hover:text-red-700"
                              >
                                View Ledger &rarr;
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Assign Student */}
        <AssignStudentModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          batchId={batch._id}
          batchName={batch.name}
          currentStudentIds={enrolledStudents.map(s => String(s._id))}
          onAssignSuccess={handleAssignStudent}
        />

        {/* MODAL: Transfer Student */}
        {transferTarget && (
          <TransferStudentModal
            isOpen={!!transferTarget}
            onClose={() => setTransferTarget(null)}
            student={transferTarget}
            batches={otherBatches}
            currentBatchId={batch._id}
            onTransferSuccess={handleTransferStudent}
          />
        )}

        {/* MODAL: Add Schedule */}
        <AddScheduleModal
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          batch={batch}
          students={enrolledStudents}
          onAddSchedule={handleAddSchedule}
        />

        {/* MODAL: Record Attendance */}
        <RecordAttendanceModal
          isOpen={isAttendanceOpen}
          onClose={() => setIsAttendanceOpen(false)}
          batch={batch}
          students={enrolledStudents}
          onSaveAttendance={handleRecordAttendance}
        />

        {/* MODAL: Confirm Remove Student */}
        <ConfirmDeleteModal
          isOpen={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleConfirmRemoveStudent}
          title="Remove Candidate from Batch"
          message={`Are you sure you want to remove ${removeTarget?.fullName} from this batch? Their attendance and fee records will be safely preserved.`}
          isLoading={actionLoading}
        />

        {/* MODAL: Confirm Delete Schedule */}
        <ConfirmDeleteModal
          isOpen={!!deleteScheduleTarget}
          onClose={() => setDeleteScheduleTarget(null)}
          onConfirm={handleConfirmDeleteSchedule}
          title="Delete Class Schedule"
          message="Are you sure you want to delete this class schedule?"
          isLoading={actionLoading}
        />

        {/* MODAL: Edit Batch Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Batch: ${batch.name}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleEditBatchSubmit} className="space-y-4 text-slate-800 dark:text-slate-100 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Batch Code / Number *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.batchNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, batchNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Course / Licence Category *
                </label>
                <select
                  value={editFormData.courseLicenceType}
                  onChange={(e) => setEditFormData({ ...editFormData, courseLicenceType: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                >
                  <option value="LMV - 4 Wheeler">LMV - 4 Wheeler</option>
                  <option value="MCWG - 2 Wheeler">MCWG - 2 Wheeler</option>
                  <option value="Both (LMV + MCWG)">Both (LMV + MCWG)</option>
                  <option value="3W / Auto Rickshaw">3W / Auto Rickshaw</option>
                  <option value="Heavy / Commercial">Heavy / Commercial</option>
                  <option value="Licence Only">Licence Only</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Session Slot *
                </label>
                <select
                  value={editFormData.session}
                  onChange={(e) => setEditFormData({ ...editFormData, session: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Weekend">Weekend</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Primary Instructor *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.instructor}
                  onChange={(e) => setEditFormData({ ...editFormData, instructor: e.target.value })}
                  placeholder="e.g. Jasim, Noushad, Ashraf"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Secondary Instructor
                </label>
                <input
                  type="text"
                  value={editFormData.secondaryInstructor}
                  onChange={(e) => setEditFormData({ ...editFormData, secondaryInstructor: e.target.value })}
                  placeholder="Optional co-trainer"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Vehicle Reg Number
                </label>
                <input
                  type="text"
                  value={editFormData.vehicleNo}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicleNo: e.target.value })}
                  placeholder="e.g. KL-01-AB-1234"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Meeting Ground / Location
                </label>
                <input
                  type="text"
                  value={editFormData.meetingPoint}
                  onChange={(e) => setEditFormData({ ...editFormData, meetingPoint: e.target.value })}
                  placeholder="e.g. West Kodur Ground"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Start Time
                </label>
                <input
                  type="text"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  placeholder="07:00 AM"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  End Time
                </label>
                <input
                  type="text"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                  placeholder="08:30 AM"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Max Students Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editFormData.maxStudents}
                  onChange={(e) => setEditFormData({ ...editFormData, maxStudents: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Batch Status *
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
                >
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Notes / Special Instructions
              </label>
              <textarea
                rows="2"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded font-bold transition shadow-sm"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default BatchDetailPage;
