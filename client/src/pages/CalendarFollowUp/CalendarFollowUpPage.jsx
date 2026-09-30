import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import {
  getFollowUps,
  getFollowUpSummary,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  rescheduleFollowUp,
  deleteFollowUp
} from '../../services/followUpService';
import { getStudents } from '../../services/studentService';
import { getUsers } from '../../services/userService';
import {
  CalendarClock,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CalendarCheck,
  User,
  Phone,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const COMMON_TASKS = [
  'Call student regarding LL test slot',
  'Collect pending documents for DL application',
  'Confirm practical training schedule',
  'Remind student about upcoming DL test',
  'Follow up regarding pending fee balance'
];

const CalendarFollowUpPage = () => {
  const navigate = useNavigate();

  // Summary & Lists
  const [summary, setSummary] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [followUpsList, setFollowUpsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filter States
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // Metadata for forms
  const [studentOptions, setStudentOptions] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    student: '',
    task: '',
    dueDate: '',
    dueTime: '10:00 AM',
    assignedTo: '',
    priority: 'Medium',
    relatedStage: '',
    notes: ''
  });

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    task: '',
    dueDate: '',
    dueTime: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'Pending',
    relatedStage: '',
    notes: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch Metadata (Students & Users)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [stuRes, userRes] = await Promise.all([
          getStudents({ limit: 'all' }),
          getUsers()
        ]);
        const stuList = Array.isArray(stuRes) ? stuRes : (stuRes?.students || []);
        setStudentOptions(stuList);
        setStaffUsers(Array.isArray(userRes) ? userRes : (userRes?.users || []));
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch Summary Metrics and Upcoming/Overdue lists
  const fetchSummary = useCallback(async () => {
    try {
      const res = await getFollowUpSummary();
      setSummary(res.metrics || null);
      setUpcomingTasks(res.upcomingTasks || []);
      setOverdueTasks(res.overdueTasks || []);
    } catch (err) {
      console.error('Failed to load follow-up summary:', err);
    }
  }, []);

  // Fetch Follow-Up Register (Table)
  const fetchTable = useCallback(async (page = 1) => {
    try {
      setTableLoading(true);
      setError(null);

      const params = {
        page,
        limit: 15,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy: 'dueDate',
        sortOrder: 'asc'
      };

      const res = await getFollowUps(params);
      setFollowUpsList(res.followUps || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch follow-ups');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search, startDate, endDate]);

  useEffect(() => {
    fetchSummary();
    fetchTable(1);
  }, [fetchSummary, fetchTable]);

  // Handle Mark Completed
  const handleComplete = async (id) => {
    try {
      await completeFollowUp(id);
      await Promise.all([fetchSummary(), fetchTable(pagination.page)]);
    } catch (err) {
      alert(err.message || 'Failed to complete follow-up');
    }
  };

  // Open Reschedule Modal
  const openReschedule = (task) => {
    setRescheduleTarget(task);
    const currentDue = task.dueDate ? new Date(task.dueDate) : new Date();
    currentDue.setDate(currentDue.getDate() + 2);
    setNewDueDate(currentDue.toISOString().split('T')[0]);
    setNewDueTime(task.dueTime || '10:00 AM');
    setRescheduleReason('');
    setRescheduleModalOpen(true);
  };

  // Submit Reschedule
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget || !newDueDate) return;

    try {
      setRescheduleSubmitting(true);
      await rescheduleFollowUp(rescheduleTarget._id, {
        newDueDate,
        newDueTime,
        reason: rescheduleReason.trim()
      });
      setRescheduleModalOpen(false);
      await Promise.all([fetchSummary(), fetchTable(pagination.page)]);
    } catch (err) {
      alert(err.message || 'Failed to reschedule follow-up');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Open Add Modal
  const openAddModal = (prefillStudent = null) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);

    setAddForm({
      student: prefillStudent ? prefillStudent._id : (studentOptions[0]?._id || ''),
      task: '',
      dueDate: defaultDate.toISOString().split('T')[0],
      dueTime: '10:00 AM',
      assignedTo: staffUsers[0]?._id || '',
      priority: 'Medium',
      relatedStage: 'Training',
      notes: ''
    });
    setAddModalOpen(true);
  };

  // Submit Add Follow-up
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.student || !addForm.task || !addForm.dueDate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setAddSubmitting(true);
      await createFollowUp(addForm);
      setAddModalOpen(false);
      await Promise.all([fetchSummary(), fetchTable(1)]);
    } catch (err) {
      alert(err.message || 'Failed to create follow-up');
    } finally {
      setAddSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditTarget(item);
    setEditForm({
      task: item.task || '',
      dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
      dueTime: item.dueTime || '',
      assignedTo: item.assignedTo?._id || item.assignedTo || '',
      priority: item.priority || 'Medium',
      status: item.status || 'Pending',
      relatedStage: item.relatedStage || '',
      notes: item.notes || ''
    });
    setEditModalOpen(true);
  };

  // Submit Edit Modal
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setEditSubmitting(true);
      await updateFollowUp(editTarget._id, editForm);
      setEditModalOpen(false);
      await Promise.all([fetchSummary(), fetchTable(pagination.page)]);
    } catch (err) {
      alert(err.message || 'Failed to update follow-up');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (item) => {
    setDeleteTarget(item);
    setDeleteModalOpen(true);
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteSubmitting(true);
      await deleteFollowUp(deleteTarget._id);
      setDeleteModalOpen(false);
      await Promise.all([fetchSummary(), fetchTable(pagination.page)]);
    } catch (err) {
      alert(err.message || 'Failed to delete follow-up');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const isItemOverdue = (date, status) => {
    if (status !== 'Pending' || !date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
  };

  return (
    <MainLayout>
      <Navbar title="Calendar / Follow-Up" />

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <CalendarClock size={18} />
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Calendar / Follow-Up
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {summary?.totalPending || 0} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage scheduled calls, document collections, test bookings, and action items for students.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchSummary();
                fetchTable(pagination.page);
              }}
              title="Refresh Tasks"
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => openAddModal()}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={15} /> Add Follow-Up
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Pending
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {summary?.totalPending || 0}
              </span>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded">
              <Clock size={16} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                Overdue Tasks
              </span>
              <span className="text-xl font-black text-rose-600 font-mono">
                {summary?.overdueCount || 0}
              </span>
            </div>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded">
              <AlertTriangle size={16} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">
                Upcoming Ahead
              </span>
              <span className="text-xl font-black text-blue-600 font-mono">
                {summary?.upcomingCount || 0}
              </span>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">
              <Calendar size={16} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                Completed Today
              </span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                {summary?.completedTodayCount || 0}
              </span>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded">
              <CheckCircle2 size={16} />
            </div>
          </div>
        </div>

        {/* SECTION 1: OVERDUE FOLLOW-UPS */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Overdue Follow-Ups
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                {overdueTasks.length} Overdue
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Requires immediate office resolution</span>
          </div>

          {overdueTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle size={20} className="text-emerald-500 mx-auto mb-1.5 opacity-80" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No overdue follow-ups.</p>
              <p className="text-[11px] text-slate-400">All pending candidate actions are on schedule.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {overdueTasks.map((item) => (
                <div
                  key={item._id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {item.task}
                      </span>
                      <Badge type="priority" value={item.priority || 'High'} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <Link
                        to={`/students/${item.student?._id}`}
                        className="font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 flex items-center gap-1"
                      >
                        <User size={12} /> {item.student?.fullName || 'Student'} ({item.student?.studentId})
                      </Link>
                      <span>&bull;</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <Clock size={12} /> Due: {new Date(item.dueDate).toLocaleDateString()} {item.dueTime}
                      </span>
                      <span>&bull;</span>
                      <span>Assigned: {item.assignedToName || 'Admin'}</span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">"{item.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleComplete(item._id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 size={13} /> Complete
                    </button>
                    <button
                      onClick={() => openReschedule(item)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded text-xs font-bold transition flex items-center gap-1"
                    >
                      <Clock size={13} /> Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: UPCOMING FOLLOW-UPS PREVIEW */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Upcoming Follow-Ups
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Next scheduled student follow-up reminders</span>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              No upcoming follow-ups scheduled. Click "+ Add Follow-Up" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {upcomingTasks.map((item) => (
                <div
                  key={item._id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-3 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1 font-mono">
                        <Calendar size={10} />
                        {new Date(item.dueDate).toLocaleDateString()} {item.dueTime}
                      </span>
                      <Badge type="priority" value={item.priority || 'Medium'} />
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                      {item.task}
                    </h4>

                    <Link
                      to={`/students/${item.student?._id}`}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 flex items-center gap-1"
                    >
                      <User size={12} className="text-slate-400" />
                      {item.student?.fullName || 'Candidate'} ({item.student?.studentId})
                    </Link>

                    <div className="text-[11px] text-slate-400">
                      Assigned: {item.assignedToName || 'Staff'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Status: <span className="text-amber-600 dark:text-amber-400">{item.status}</span>
                    </span>
                    <button
                      onClick={() => handleComplete(item._id)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} /> Mark Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: COMPLETE FOLLOW-UP REGISTER TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Follow-Up Register
              </h3>
              <p className="text-[11px] text-slate-400">
                Complete log of all past, present, and future student tasks.
              </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search task or student..."
                  className="pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {tableLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading follow-up register..." />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorMessage message={error} onRetry={() => fetchTable(pagination.page)} />
            </div>
          ) : followUpsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No follow-up records found matching filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Task / Follow-up</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                  {followUpsList.map((item) => {
                    const overdue = isItemOverdue(item.dueDate, item.status);

                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition"
                      >
                        {/* Due Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`font-mono font-bold ${overdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                            {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.dueTime || 'Standard'}
                            {overdue && <span className="ml-1 text-rose-600 font-bold">(Overdue)</span>}
                          </div>
                        </td>

                        {/* Student */}
                        <td className="px-4 py-3">
                          <Link
                            to={`/students/${item.student?._id}`}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 flex items-center gap-1"
                          >
                            {item.student?.fullName || 'Student'}
                            <ExternalLink size={11} className="text-slate-400" />
                          </Link>
                          <div className="text-[11px] text-slate-400">
                            <span className="font-mono text-red-600 font-semibold">{item.student?.studentId}</span>
                            {item.student?.primaryMobile && ` • ${item.student.primaryMobile}`}
                          </div>
                        </td>

                        {/* Task */}
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.task}
                          </div>
                          {item.relatedStage && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Stage: {item.relatedStage}
                            </span>
                          )}
                        </td>

                        {/* Assigned */}
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {item.assignedToName || 'Unassigned'}
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge type="priority" value={item.priority || 'Medium'} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge value={item.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          {item.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleComplete(item._id)}
                                title="Complete Task"
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button
                                onClick={() => openReschedule(item)}
                                title="Reschedule"
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
                              >
                                <Clock size={15} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit"
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Delete"
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          {!tableLoading && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => fetchTable(page)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ADD FOLLOW-UP MODAL */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Create Student Follow-Up"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          {/* Select Student */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Student Candidate *
            </label>
            <select
              value={addForm.student}
              onChange={(e) => setAddForm({ ...addForm, student: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="">-- Choose Student --</option>
              {studentOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.studentId}) &bull; {s.primaryMobile}
                </option>
              ))}
            </select>
          </div>

          {/* Task / Follow-up */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task / Follow-up *
            </label>
            <input
              type="text"
              value={addForm.task}
              onChange={(e) => setAddForm({ ...addForm, task: e.target.value })}
              required
              placeholder="E.g., Call student regarding LL test slot..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
            />
            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_TASKS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAddForm({ ...addForm, task: t })}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={addForm.dueDate}
                onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Due Time (Optional)
              </label>
              <input
                type="text"
                value={addForm.dueTime}
                onChange={(e) => setAddForm({ ...addForm, dueTime: e.target.value })}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Assigned & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned To
              </label>
              <select
                value={addForm.assignedTo}
                onChange={(e) => setAddForm({ ...addForm, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={addForm.priority}
                onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Related Workflow Stage */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Related Workflow Stage (Optional)
            </label>
            <select
              value={addForm.relatedStage}
              onChange={(e) => setAddForm({ ...addForm, relatedStage: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            >
              <option value="">-- None / General --</option>
              <option value="Application">Application</option>
              <option value="Documents">Documents</option>
              <option value="LL Slot / Test">LL Slot / Test</option>
              <option value="LL Passed">LL Passed</option>
              <option value="Training">Training</option>
              <option value="DL Test">DL Test</option>
              <option value="Passed / Licence Processing">Passed / Licence Processing</option>
              <option value="Completed">Completed</option>
              <option value="Follow Up">Follow Up</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Instructions
            </label>
            <textarea
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              rows={2}
              placeholder="Additional internal instructions..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {addSubmitting ? 'Saving...' : 'Create Follow-Up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title={rescheduleTarget ? `Reschedule: ${rescheduleTarget.task}` : 'Reschedule Task'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Current Due Date</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {rescheduleTarget?.dueDate ? new Date(rescheduleTarget.dueDate).toLocaleDateString() : 'N/A'} {rescheduleTarget?.dueTime}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Due Date *
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
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
                value={newDueTime}
                onChange={(e) => setNewDueTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Rescheduling
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={2}
              placeholder="E.g., Student unavailable on original date; requested next Monday..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition disabled:opacity-50"
            >
              {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Follow-Up"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task Description *
            </label>
            <input
              type="text"
              value={editForm.task}
              onChange={(e) => setEditForm({ ...editForm, task: e.target.value })}
              required
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
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Staff
              </label>
              <select
                value={editForm.assignedTo}
                onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition disabled:opacity-50"
            >
              {editSubmitting ? 'Saving...' : 'Update Follow-Up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteSubmit}
        loading={deleteSubmitting}
        title="Delete Follow-Up Task"
        message={`Are you sure you want to delete follow-up "${deleteTarget?.task}"? This action cannot be undone.`}
      />
    </MainLayout>
  );
};

export default CalendarFollowUpPage;
