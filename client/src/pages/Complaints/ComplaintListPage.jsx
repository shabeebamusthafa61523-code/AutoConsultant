import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaints,
  getComplaintDashboard,
  createComplaint,
  assignComplaint,
  updateComplaintStatus,
  resolveComplaint,
  escalateComplaint
} from '../../services/complaintService';
import API from '../../services/api';
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  PlayCircle,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Eye,
  UserCheck,
  Calendar,
  MessageSquare,
  ArrowRight,
  User,
  Car,
  GraduationCap,
  Layers,
  X
} from 'lucide-react';

const ComplaintListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === 'Admin' || user?.role === 'Superadmin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Entities for creation dropdowns
  const [usersList, setUsersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [instructorsList, setInstructorsList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);

  // Modals state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // New Complaint Form
  const [formData, setFormData] = useState({
    complaintDate: new Date().toISOString().split('T')[0],
    source: 'Phone',
    complainantType: 'Student',
    student: '',
    instructor: '',
    complainantName: '',
    complainantMobile: '',
    category: 'Training',
    description: '',
    relatedVehicle: '',
    relatedInstructor: '',
    priority: 'Medium',
    assignedTo: '',
    expectedResolutionDate: ''
  });

  // Assign Form
  const [assigneeId, setAssigneeId] = useState('');

  // Status/Resolution Form
  const [newStatus, setNewStatus] = useState('In Progress');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState('Satisfied');
  const [escalatedTo, setEscalatedTo] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  // Load KPI Dashboard & Complaints
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, compRes] = await Promise.all([
        getComplaintDashboard(),
        getComplaints({
          search,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
          isOverdue: isOverdueOnly ? 'true' : undefined,
          page,
          limit: 15
        })
      ]);

      setDashboard(dashRes.data || dashRes);
      const listData = compRes.data || compRes;
      setComplaints(listData.complaints || []);
      setPagination(listData.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, categoryFilter, dateRangeFilter, isOverdueOnly, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load helper entities once for modal dropdowns
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [uRes, sRes, iRes, vRes] = await Promise.allSettled([
          API.get('/users'),
          API.get('/students?limit=100'),
          API.get('/instructors?limit=50'),
          API.get('/vehicles?limit=50')
        ]);

        if (uRes.status === 'fulfilled') {
          const uData = uRes.value.data || uRes.value;
          setUsersList(Array.isArray(uData) ? uData : (uData.users || []));
        }
        if (sRes.status === 'fulfilled') {
          const sData = sRes.value.data || sRes.value;
          setStudentsList(sData.students || (Array.isArray(sData) ? sData : []));
        }
        if (iRes.status === 'fulfilled') {
          const iData = iRes.value.data || iRes.value;
          setInstructorsList(iData.instructors || (Array.isArray(iData) ? iData : []));
        }
        if (vRes.status === 'fulfilled') {
          const vData = vRes.value.data || vRes.value;
          setVehiclesList(vData.vehicles || (Array.isArray(vData) ? vData : []));
        }
      } catch (err) {
        console.error('Helper entity fetch error:', err);
      }
    };
    fetchEntities();
  }, []);

  // Handle Create Complaint
  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    try {
      await createComplaint(formData);
      setNewModalOpen(false);
      setFormData({
        complaintDate: new Date().toISOString().split('T')[0],
        source: 'Phone',
        complainantType: 'Student',
        student: '',
        instructor: '',
        complainantName: '',
        complainantMobile: '',
        category: 'Training',
        description: '',
        relatedVehicle: '',
        relatedInstructor: '',
        priority: 'Medium',
        assignedTo: '',
        expectedResolutionDate: ''
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to register complaint');
    }
  };

  // Handle Quick Reassign
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      await assignComplaint(selectedComplaint._id, { assignedTo: assigneeId });
      setAssignModalOpen(false);
      setSelectedComplaint(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to reassign complaint');
    }
  };

  // Handle Quick Status / Resolution / Escalation
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      if (newStatus === 'Resolved') {
        if (!resolutionNotes.trim()) {
          alert('Resolution notes are required to resolve a complaint.');
          return;
        }
        await resolveComplaint(selectedComplaint._id, {
          resolutionNotes,
          correctiveActionTaken: correctiveAction,
          satisfactionRating
        });
      } else if (newStatus === 'Escalated') {
        if (!escalationReason.trim()) {
          alert('Escalation reason is required.');
          return;
        }
        await escalateComplaint(selectedComplaint._id, {
          escalatedTo: escalatedTo || null,
          escalationReason
        });
      } else {
        await updateComplaintStatus(selectedComplaint._id, {
          status: newStatus,
          remarks: statusRemarks
        });
      }

      setStatusModalOpen(false);
      setSelectedComplaint(null);
      setResolutionNotes('');
      setCorrectiveAction('');
      setEscalationReason('');
      setStatusRemarks('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update complaint status');
    }
  };

  // Auto-fill Complainant when Student or Instructor is chosen
  const handleStudentSelect = (studentId) => {
    const st = studentsList.find(s => s._id === studentId);
    setFormData(prev => ({
      ...prev,
      student: studentId,
      complainantName: st ? st.fullName : prev.complainantName,
      complainantMobile: st ? (st.phone || st.primaryMobile || '') : prev.complainantMobile
    }));
  };

  const handleInstructorSelect = (insId) => {
    const ins = instructorsList.find(i => i._id === insId);
    setFormData(prev => ({
      ...prev,
      instructor: insId,
      complainantName: ins ? ins.name : prev.complainantName,
      complainantMobile: ins ? (ins.mobile || '') : prev.complainantMobile
    }));
  };

  // Table Columns Definition
  const columns = [
    {
      header: 'Complaint ID',
      accessor: 'complaintId',
      cell: (row) => (
        <button
          onClick={() => navigate(`/complaints/${row._id}`)}
          className="font-mono font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
        >
          <span>{row.complaintId}</span>
          <ArrowRight size={12} />
        </button>
      )
    },
    {
      header: 'Date',
      accessor: 'complaintDate',
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.complaintDate ? new Date(row.complaintDate).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Complainant',
      accessor: 'complainantName',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{row.complainantName}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.complainantMobile || 'No phone'}</p>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">{row.complainantType}</span>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      cell: (row) => (
        <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold">
          {row.category}
        </span>
      )
    },
    {
      header: 'Related Entity',
      accessor: 'related',
      cell: (row) => {
        if (row.relatedStudent) {
          return (
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1" title="Linked Student">
              <User size={12} className="text-blue-500" />
              <span>{row.relatedStudent.fullName || 'Student'}</span>
            </span>
          );
        }
        if (row.relatedVehicle) {
          return (
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono font-semibold" title="Linked Vehicle">
              <Car size={12} className="text-emerald-500" />
              <span>{row.relatedVehicle.vehicleNumber}</span>
            </span>
          );
        }
        if (row.relatedInstructor) {
          return (
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1" title="Linked Instructor">
              <GraduationCap size={12} className="text-amber-500" />
              <span>{row.relatedInstructor.name}</span>
            </span>
          );
        }
        return <span className="text-xs text-slate-400 italic">None</span>;
      }
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => <Badge type="priority" value={row.priority} />
    },
    {
      header: 'Assigned To',
      accessor: 'assignedToName',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.assignedToName || 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <Badge value={row.status} />
    },
    {
      header: 'Target / SLA',
      accessor: 'expectedResolutionDate',
      cell: (row) => {
        const isOverdue = row.isOverdue || (row.status !== 'Resolved' && row.status !== 'Closed' && row.expectedResolutionDate && new Date(row.expectedResolutionDate) < new Date());
        return (
          <div>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {row.expectedResolutionDate ? new Date(row.expectedResolutionDate).toLocaleDateString() : 'None'}
            </span>
            {isOverdue && (
              <span className="block text-[10px] text-red-600 font-extrabold uppercase animate-pulse">
                OVERDUE
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/complaints/${row._id}`)}
            title="View Complaint Details"
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => {
              setSelectedComplaint(row);
              setNewStatus(row.status);
              setStatusModalOpen(true);
            }}
            title="Update Status / Resolve"
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
          >
            <PlayCircle size={15} />
          </button>
          {isAdminOrSuper && (
            <button
              onClick={() => {
                setSelectedComplaint(row);
                setAssigneeId(row.assignedTo?._id || row.assignedTo || '');
                setAssignModalOpen(true);
              }}
              title="Assign Staff"
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
            >
              <UserCheck size={15} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar
        title="Complaint Control Centre"
        subtitle="Monitor, manage and resolve student, instructor, vehicle and operational complaints."
      />

      <div className="p-6 space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <AlertCircle className="text-red-600" size={24} />
              <span>Complaint Management</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Service quality assurance, corrective action tracking, and escalation resolution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 transition"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setNewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow transition cursor-pointer"
            >
              <Plus size={16} />
              <span>New Complaint</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={loadData} />}

        {/* KPI Dashboard Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div
              onClick={() => { setStatusFilter('All'); setIsOverdueOnly(false); }}
              className="cursor-pointer transition transform hover:-translate-y-0.5"
            >
              <StatCard
                title="Total"
                value={dashboard.summary.totalComplaints}
                icon={AlertCircle}
                color="dark"
              />
            </div>
            <div
              onClick={() => { setStatusFilter('Open'); setIsOverdueOnly(false); }}
              className="cursor-pointer transition transform hover:-translate-y-0.5"
            >
              <StatCard
                title="Open"
                value={dashboard.summary.open}
                icon={Clock}
                color="blue"
              />
            </div>
            <div
              onClick={() => { setStatusFilter('In Progress'); setIsOverdueOnly(false); }}
              className="cursor-pointer transition transform hover:-translate-y-0.5"
            >
              <StatCard
                title="In Progress"
                value={dashboard.summary.inProgress}
                icon={PlayCircle}
                color="purple"
              />
            </div>
            <div
              onClick={() => { setStatusFilter('Escalated'); setIsOverdueOnly(false); }}
              className="cursor-pointer transition transform hover:-translate-y-0.5"
            >
              <StatCard
                title="Escalated"
                value={dashboard.summary.escalated}
                icon={AlertTriangle}
                color="rose"
              />
            </div>
            <div
              onClick={() => { setIsOverdueOnly(true); setStatusFilter('All'); }}
              className="cursor-pointer transition transform hover:-translate-y-0.5"
            >
              <StatCard
                title="Overdue"
                value={dashboard.summary.overdue}
                icon={AlertOctagon}
                color={dashboard.summary.overdue > 0 ? 'red' : 'emerald'}
              />
            </div>
            <div
              onClick={() => { setStatusFilter('Resolved'); setIsOverdueOnly(false); }}
              className="cursor-pointer transition transform hover:-translate-y-0.5"
            >
              <StatCard
                title="Resolved"
                value={dashboard.summary.resolved}
                icon={CheckCircle}
                color="emerald"
              />
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search ID, name, mobile, issue..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Priority */}
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>

              {/* Category */}
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none max-w-[150px]"
              >
                <option value="All">All Categories</option>
                <option value="Training">Training</option>
                <option value="Instructor">Instructor</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Scheduling">Scheduling</option>
                <option value="Fees / Payment">Fees / Payment</option>
                <option value="Staff">Staff</option>
                <option value="Documentation">Documentation</option>
                <option value="Licence Service">Licence Service</option>
                <option value="Behaviour">Behaviour</option>
                <option value="Safety">Safety</option>
                <option value="Facility">Facility</option>
                <option value="Service Quality">Service Quality</option>
                <option value="Other">Other</option>
              </select>

              {/* Date Range */}
              <select
                value={dateRangeFilter}
                onChange={(e) => { setDateRangeFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">This Month</option>
              </select>

              {/* Overdue Checkbox */}
              <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOverdueOnly}
                  onChange={(e) => { setIsOverdueOnly(e.target.checked); setPage(1); }}
                  className="rounded text-red-600 focus:ring-0"
                />
                <span className={isOverdueOnly ? 'text-red-600' : ''}>Overdue Only</span>
              </label>

              {/* Clear filters */}
              {(search || statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || dateRangeFilter !== 'all' || isOverdueOnly) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setCategoryFilter('All');
                    setDateRangeFilter('all');
                    setIsOverdueOnly(false);
                    setPage(1);
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 transition"
                  title="Clear Filters"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Complaints Data Table */}
        {loading && complaints.length === 0 ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={complaints}
              keyField="_id"
              emptyMessage="No complaint records found matching current criteria."
            />

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>
                  Showing page <strong className="text-slate-900 dark:text-slate-100">{pagination.page}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{pagination.totalPages}</strong> (Total{' '}
                  {pagination.total} records)
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NEW COMPLAINT FORM */}
      {/* ========================================================================= */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Register New Complaint"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
          {/* Section: Complainant Details */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              1. Complainant Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Complainant Type</label>
                <select
                  value={formData.complainantType}
                  onChange={(e) => setFormData({ ...formData, complainantType: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                >
                  <option value="Student">Student</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Employee">Employee</option>
                  <option value="Customer/Visitor">Customer / Visitor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.complainantType === 'Student' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pick Enrolled Student</label>
                  <select
                    value={formData.student}
                    onChange={(e) => handleStudentSelect(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                  >
                    <option value="">-- Choose Student --</option>
                    {studentsList.map(s => (
                      <option key={s._id} value={s._id}>{s.fullName} ({s.studentId || 'No ID'})</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.complainantType === 'Instructor' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pick Instructor</label>
                  <select
                    value={formData.instructor}
                    onChange={(e) => handleInstructorSelect(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                  >
                    <option value="">-- Choose Instructor --</option>
                    {instructorsList.map(i => (
                      <option key={i._id} value={i._id}>{i.name} ({i.instructorId})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Complainant Name *</label>
                <input
                  type="text"
                  required
                  value={formData.complainantName}
                  onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                  placeholder="Full Name"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Mobile</label>
                <input
                  type="text"
                  value={formData.complainantMobile}
                  onChange={(e) => setFormData({ ...formData, complainantMobile: e.target.value })}
                  placeholder="10-digit mobile"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Complaint Details */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              2. Complaint Categorization & Severity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Complaint Date</label>
                <input
                  type="date"
                  value={formData.complaintDate}
                  onChange={(e) => setFormData({ ...formData, complaintDate: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Channel / Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                >
                  <option value="Phone">Phone Call</option>
                  <option value="Walk-in">Walk-in Office</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Staff">Staff Escalation</option>
                  <option value="Student">Student Portal/Desk</option>
                  <option value="Management">Management Review</option>
                  <option value="Email">Email</option>
                  <option value="Website">Website Form</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                >
                  <option value="Training">Training (Road / Track / Simulator)</option>
                  <option value="Instructor">Instructor Conduct / Punctuality</option>
                  <option value="Vehicle">Vehicle AC / Mechanical / Dual-Brake</option>
                  <option value="Scheduling">Batch / Session Scheduling</option>
                  <option value="Fees / Payment">Fees / Payment / Receipts</option>
                  <option value="Staff">Office Staff / Front Desk</option>
                  <option value="Documentation">Parivahan / Medical Docs / RTO</option>
                  <option value="Licence Service">Licence Service Delays</option>
                  <option value="Behaviour">Behaviour / Conduct</option>
                  <option value="Safety">Safety & Compliance Incident</option>
                  <option value="Facility">Office & Track Facility</option>
                  <option value="Service Quality">General Service Quality</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority Level</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none font-bold"
                >
                  <option value="Low">Low - Minor feedback</option>
                  <option value="Medium">Medium - Standard operational issue</option>
                  <option value="High">High - Impairing training / vehicle</option>
                  <option value="Urgent">Urgent - Immediate safety / test dispute</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Related Vehicle (Optional)</label>
                <select
                  value={formData.relatedVehicle}
                  onChange={(e) => setFormData({ ...formData, relatedVehicle: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                >
                  <option value="">-- None --</option>
                  {vehiclesList.map(v => (
                    <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.brand} {v.model})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Related Instructor (Optional)</label>
                <select
                  value={formData.relatedInstructor}
                  onChange={(e) => setFormData({ ...formData, relatedInstructor: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                >
                  <option value="">-- None --</option>
                  {instructorsList.map(i => (
                    <option key={i._id} value={i._id}>{i.name} ({i.instructorId})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Detailed Description *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain what happened, relevant session/vehicle/instructor, and customer's requested outcome..."
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
              />
            </div>
          </div>

          {/* Section: Assignment & Target */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              3. Assignment & Target SLA
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign Responsible Staff</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {usersList.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Resolution Date</label>
                <input
                  type="date"
                  value={formData.expectedResolutionDate}
                  onChange={(e) => setFormData({ ...formData, expectedResolutionDate: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition"
            >
              Register Complaint
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK ASSIGN MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Reassign Complaint: ${selectedComplaint?.complaintId || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssign} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Currently assigned to: <strong>{selectedComplaint?.assignedToName || 'Unassigned'}</strong>
          </p>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select New Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none font-medium"
            >
              <option value="">-- Unassign --</option>
              {usersList.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
            >
              Save Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK STATUS / RESOLVE / ESCALATE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Status: ${selectedComplaint?.complaintId || ''}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none font-bold text-sm"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending (Awaiting Customer/RTO)</option>
              <option value="Escalated">Escalated (Management Attention)</option>
              <option value="Resolved">Resolved (Resolution Complete)</option>
              <option value="Closed">Closed (Archived)</option>
            </select>
          </div>

          {/* Conditional: If Resolving */}
          {newStatus === 'Resolved' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 space-y-3">
              <h5 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Resolution Record Details</h5>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolution Summary *</label>
                <textarea
                  required
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain how the issue was resolved with the customer/staff..."
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Corrective Action Taken (CAPA)</label>
                <input
                  type="text"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Adjusted instructor roster, repaired vehicle AC, updated SOP"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Satisfaction</label>
                <select
                  value={satisfactionRating}
                  onChange={(e) => setSatisfactionRating(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                >
                  <option value="Satisfied">Satisfied</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Unsatisfied">Unsatisfied</option>
                </select>
              </div>
            </div>
          )}

          {/* Conditional: If Escalating */}
          {newStatus === 'Escalated' && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-200 dark:border-purple-800 space-y-3">
              <h5 className="font-bold text-purple-800 dark:text-purple-300 text-xs">Escalation Routing Details</h5>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Escalate To Manager/MD</label>
                <select
                  value={escalatedTo}
                  onChange={(e) => setEscalatedTo(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                >
                  <option value="">Managing Director / Executive Board</option>
                  {usersList.filter(u => u.role === 'Superadmin' || u.role === 'Admin').map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Escalation Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Specify why normal resolution is insufficient (e.g. legal dispute, RTO sanction, safety hazard)..."
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                />
              </div>
            </div>
          )}

          {/* Standard Status Remarks */}
          {newStatus !== 'Resolved' && newStatus !== 'Escalated' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Update Remarks</label>
              <textarea
                rows={2}
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="Optional notes regarding this status change..."
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
            >
              Update Status
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default ComplaintListPage;
