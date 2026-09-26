import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import {
  getClasses,
  getClassStats,
  getProgressTracker,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  completeSchedule,
  createClass,
  updateClass,
  deleteClass,
  exportClassesCSV,
  backupClassesJSON
} from '../../services/classService';
import { getStudents } from '../../services/studentService';
import { getInstructors } from '../../services/instructorService';
import { getVehicles } from '../../services/vehicleService';
import { getBatches } from '../../services/batchService';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  CalendarCheck,
  Search,
  Download,
  Database,
  UserPlus,
  RotateCcw,
  Gauge,
  Clock,
  Award,
  Filter,
  Car,
  User,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertCircle,
  Percent,
  FileSpreadsheet,
  BarChart3,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ClipboardList,
  Sparkles
} from 'lucide-react';

const TRAINING_TYPES = [
  'Practical Driving',
  'Road Training',
  'Track / H Training',
  'Track Driving',
  'Reverse Parking',
  'Simulator',
  'Theory / Rules',
  'Bike Training',
  'Test Training'
];

const ClassListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDelete = user?.role === 'Superadmin' || user?.role === 'Admin';

  // Navigation Tabs: Ledger | Progress Tracker | Daily Schedules | Operations & Workload
  const [activeTab, setActiveTab] = useState('ledger');

  // Master Data State
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [batches, setBatches] = useState([]);

  // =========================================================================
  // TAB 1: TRAINING LEDGER STATE
  // =========================================================================
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    recordedKm: 0,
    recordedHours: 0,
    equivalentClasses: 0,
    totalBikeClasses: 0,
    instructor: { name: 'Farhan', km: 0, hours: 0 },
    instructorBreakdown: [],
    vehicleBreakdown: [],
    batchBreakdown: [],
    activeTrainingStudents: 0,
    completedTrainingStudents: 0,
    todaysClassesCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filters for Ledger
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Server-side Pagination for Ledger
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  // Modal State for Add / Edit Class
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    student: '',
    batch: '',
    classDate: new Date().toISOString().split('T')[0],
    timeSlot: '07:00 AM - 08:30 AM',
    instructorRef: '',
    instructor: '',
    vehicleRef: '',
    vehicleNo: '',
    trainingType: 'Practical Driving',
    km: 10,
    hours: 1,
    bikeClassCount: 0,
    notes: ''
  });

  const [modalStudentSearch, setModalStudentSearch] = useState('');

  // Delete Class Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // =========================================================================
  // TAB 2: TRAINING PROGRESS TRACKER STATE
  // =========================================================================
  const [trackerStudents, setTrackerStudents] = useState([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerError, setTrackerError] = useState(null);
  const [trackerSearch, setTrackerSearch] = useState('');
  const [trackerBatch, setTrackerBatch] = useState('');
  const [trackerStatus, setTrackerStatus] = useState('');
  const [trackerPagination, setTrackerPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  // =========================================================================
  // TAB 3: DAILY CLASS SCHEDULES STATE
  // =========================================================================
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState(null);
  const [scheduleFilterDate, setScheduleFilterDate] = useState('');
  const [scheduleFilterBatch, setScheduleFilterBatch] = useState('');
  const [scheduleFilterStatus, setScheduleFilterStatus] = useState('');

  // Add Schedule Modal
  const [addScheduleModalOpen, setAddScheduleModalOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    batch: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '07:00 AM - 08:30 AM',
    classType: 'Road & H',
    instructor: '',
    instructorRef: '',
    vehicleNo: '',
    vehicleRef: '',
    students: [],
    status: 'Planned',
    remarks: ''
  });

  // Complete Schedule Modal
  const [completeScheduleTarget, setCompleteScheduleTarget] = useState(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [completeFormData, setCompleteFormData] = useState({
    km: 10,
    hours: 1,
    attendedStudentIds: [],
    notes: ''
  });

  // =========================================================================
  // FETCH AUXILIARY MASTERS (Students, Instructors, Vehicles, Batches)
  // =========================================================================
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [stuRes, insRes, vehRes, batchRes] = await Promise.all([
          getStudents({ limit: 500 }),
          getInstructors(),
          getVehicles({ limit: 100 }),
          getBatches()
        ]);

        const rawStudents = stuRes?.students || (Array.isArray(stuRes) ? stuRes : []);
        setStudents(rawStudents);

        const rawInstructors = insRes?.instructors || (Array.isArray(insRes) ? insRes : []);
        setInstructors(rawInstructors);

        const rawVehicles = vehRes?.vehicles || (Array.isArray(vehRes) ? vehRes : []);
        setVehicles(rawVehicles);

        const rawBatches = batchRes?.batches || (Array.isArray(batchRes) ? batchRes : []);
        setBatches(rawBatches);
      } catch (err) {
        console.error('Error fetching auxiliary masters:', err);
      }
    };
    fetchMasters();
  }, []);

  // =========================================================================
  // FETCH TRAINING LEDGER DATA & STATS
  // =========================================================================
  const fetchLedgerData = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: pageToLoad,
          limit: pagination.limit,
          sortBy: 'classDate',
          sortOrder: 'desc'
        };

        if (search.trim()) params.search = search.trim();
        if (selectedStudent) params.student = selectedStudent;
        if (selectedBatch) params.batch = selectedBatch;
        if (selectedInstructor) params.instructor = selectedInstructor;
        if (selectedVehicle) params.vehicle = selectedVehicle;
        if (selectedType) params.trainingType = selectedType;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;

        // Dynamic stats query
        const statsParams = {};
        if (selectedInstructor) statsParams.instructor = selectedInstructor;
        if (selectedBatch) statsParams.batch = selectedBatch;
        if (filterStartDate) statsParams.startDate = filterStartDate;
        if (filterEndDate) statsParams.endDate = filterEndDate;
        if (selectedStudent) statsParams.student = selectedStudent;

        const [classRes, statsRes] = await Promise.all([
          getClasses(params),
          getClassStats(statsParams)
        ]);

        if (classRes && classRes.classes) {
          setClasses(classRes.classes);
          setPagination(classRes.pagination);
        } else if (Array.isArray(classRes)) {
          setClasses(classRes);
          setPagination({
            page: 1,
            limit: classRes.length,
            total: classRes.length,
            totalPages: 1
          });
        }

        if (statsRes) {
          setStats(statsRes);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch class records.');
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      selectedStudent,
      selectedBatch,
      selectedInstructor,
      selectedVehicle,
      selectedType,
      filterStartDate,
      filterEndDate,
      pagination.limit
    ]
  );

  useEffect(() => {
    fetchLedgerData(1);
  }, [
    selectedStudent,
    selectedBatch,
    selectedInstructor,
    selectedVehicle,
    selectedType,
    filterStartDate,
    filterEndDate
  ]);

  // =========================================================================
  // FETCH PROGRESS TRACKER DATA
  // =========================================================================
  const fetchTrackerData = useCallback(
    async (pageToLoad = 1) => {
      try {
        setTrackerLoading(true);
        setTrackerError(null);

        const params = {
          page: pageToLoad,
          limit: trackerPagination.limit
        };

        if (trackerSearch.trim()) params.search = trackerSearch.trim();
        if (trackerBatch) params.batch = trackerBatch;
        if (trackerStatus) params.status = trackerStatus;

        const res = await getProgressTracker(params);
        if (res && res.students) {
          setTrackerStudents(res.students);
          setTrackerPagination(res.pagination);
        } else if (Array.isArray(res)) {
          setTrackerStudents(res);
        }
      } catch (err) {
        setTrackerError(err.message || 'Failed to fetch training progress tracker.');
      } finally {
        setTrackerLoading(false);
      }
    },
    [trackerSearch, trackerBatch, trackerStatus, trackerPagination.limit]
  );

  useEffect(() => {
    if (activeTab === 'tracker') {
      fetchTrackerData(1);
    }
  }, [activeTab, trackerBatch, trackerStatus]);

  // =========================================================================
  // FETCH SCHEDULES DATA
  // =========================================================================
  const fetchSchedulesData = useCallback(async () => {
    try {
      setSchedulesLoading(true);
      setSchedulesError(null);

      const params = {};
      if (scheduleFilterDate) params.date = scheduleFilterDate;
      if (scheduleFilterBatch) params.batch = scheduleFilterBatch;
      if (scheduleFilterStatus) params.status = scheduleFilterStatus;

      const res = await getSchedules(params);
      setSchedules(Array.isArray(res) ? res : []);
    } catch (err) {
      setSchedulesError(err.message || 'Failed to fetch class schedules.');
    } finally {
      setSchedulesLoading(false);
    }
  }, [scheduleFilterDate, scheduleFilterBatch, scheduleFilterStatus]);

  useEffect(() => {
    if (activeTab === 'schedules') {
      fetchSchedulesData();
    }
  }, [activeTab, scheduleFilterDate, scheduleFilterBatch, scheduleFilterStatus]);

  // =========================================================================
  // HANDLERS: SEARCH & FILTERS
  // =========================================================================
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLedgerData(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStudent('');
    setSelectedBatch('');
    setSelectedInstructor('');
    setSelectedVehicle('');
    setSelectedType('');
    setFilterStartDate('');
    setFilterEndDate('');
    fetchLedgerData(1);
  };

  const handleTrackerSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrackerData(1);
  };

  // Export CSV of currently filtered dataset
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStudent) params.student = selectedStudent;
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedInstructor) params.instructor = selectedInstructor;
      if (selectedVehicle) params.vehicle = selectedVehicle;
      if (selectedType) params.trainingType = selectedType;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      await exportClassesCSV(params);
    } catch (err) {
      alert(err.message || 'Failed to export CSV file.');
    } finally {
      setExporting(false);
    }
  };

  // Full Database Backup of Classes
  const handleBackup = async () => {
    try {
      setBackingUp(true);
      await backupClassesJSON();
    } catch (err) {
      alert(err.message || 'Failed to generate backup.');
    } finally {
      setBackingUp(false);
    }
  };

  // =========================================================================
  // MODAL HANDLERS: ADD / EDIT CLASS
  // =========================================================================
  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormError(null);
    setModalStudentSearch('');

    const defaultStudent = students[0]?._id || '';
    const defaultBatch = batches[0]?._id || '';
    const defaultInstructor = instructors[0];
    const defaultVehicle = vehicles[0];

    setFormData({
      student: defaultStudent,
      batch: defaultBatch,
      classDate: new Date().toISOString().split('T')[0],
      timeSlot: '07:00 AM - 08:30 AM',
      instructorRef: defaultInstructor?._id || '',
      instructor: defaultInstructor?.name || 'Instructor',
      vehicleRef: defaultVehicle?._id || '',
      vehicleNo: defaultVehicle?.vehicleNumber || 'KL-10-AB-5265',
      trainingType: 'Practical Driving',
      km: 10,
      hours: 1,
      bikeClassCount: 0,
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (row) => {
    setEditingClass(row);
    setFormError(null);
    setModalStudentSearch('');

    const stuId = row.student?._id || row.student || '';
    const dateFormatted = row.classDate
      ? new Date(row.classDate).toISOString().split('T')[0]
      : '';

    setFormData({
      student: stuId,
      batch: row.batch?._id || row.batch || '',
      classDate: dateFormatted,
      timeSlot: row.timeSlot || '07:00 AM - 08:30 AM',
      instructorRef: row.instructorRef?._id || row.instructorRef || '',
      instructor: row.instructor || '',
      vehicleRef: row.vehicleRef?._id || row.vehicleRef || '',
      vehicleNo: row.vehicleNo || '',
      trainingType: row.trainingType || 'Practical Driving',
      km: row.km !== undefined ? row.km : 0,
      hours: row.hours !== undefined ? row.hours : 1,
      bikeClassCount: row.bikeClassCount || 0,
      notes: row.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.student) {
      setFormError('Please select a student for this class session.');
      return;
    }

    if (Number(formData.km) < 0) {
      setFormError('Kilometers cannot be negative.');
      return;
    }

    if (Number(formData.hours) < 0) {
      setFormError('Training hours cannot be negative.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        km: Number(formData.km) || 0,
        hours: Number(formData.hours) || 0,
        bikeClassCount: Number(formData.bikeClassCount) || 0
      };

      if (editingClass) {
        await updateClass(editingClass._id, payload);
      } else {
        await createClass(payload);
      }

      setModalOpen(false);
      fetchLedgerData(pagination.page);
      if (activeTab === 'tracker') fetchTrackerData(trackerPagination.page);
    } catch (err) {
      setFormError(err.message || 'Failed to save class record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteClass(deleteTarget._id);
      setDeleteTarget(null);
      fetchLedgerData(pagination.page);
      if (activeTab === 'tracker') fetchTrackerData(trackerPagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete class record.');
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================================
  // SCHEDULE HANDLERS: ADD & COMPLETE
  // =========================================================================
  const handleOpenAddScheduleModal = () => {
    setScheduleFormError(null);
    const defaultBatch = batches[0];
    const defaultInstructor = instructors[0];
    const defaultVehicle = vehicles[0];

    // Find students enrolled in default batch
    const enrolledStudents = students.filter(
      (s) => s.batch === defaultBatch?._id || s.batch?._id === defaultBatch?._id
    );

    setScheduleFormData({
      batch: defaultBatch?._id || '',
      date: new Date().toISOString().split('T')[0],
      timeSlot: defaultBatch ? `${defaultBatch.startTime || '07:00 AM'} - ${defaultBatch.endTime || '08:30 AM'}` : '07:00 AM - 08:30 AM',
      classType: 'Road & H',
      instructor: defaultInstructor?.name || defaultBatch?.instructor || 'Instructor',
      instructorRef: defaultInstructor?._id || '',
      vehicleNo: defaultVehicle?.vehicleNumber || 'KL-10-AB-5265',
      vehicleRef: defaultVehicle?._id || '',
      students: enrolledStudents.map((s) => s._id),
      status: 'Planned',
      remarks: ''
    });
    setAddScheduleModalOpen(true);
  };

  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleFormData.batch) {
      setScheduleFormError('Please select a batch.');
      return;
    }
    if (!scheduleFormData.date) {
      setScheduleFormError('Please select a schedule date.');
      return;
    }

    try {
      setScheduleSubmitting(true);
      setScheduleFormError(null);
      await createSchedule(scheduleFormData);
      setAddScheduleModalOpen(false);
      fetchSchedulesData();
    } catch (err) {
      setScheduleFormError(err.message || 'Failed to create schedule session.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleOpenCompleteSchedule = (schedule) => {
    setCompleteScheduleTarget(schedule);
    const attendeeIds = (schedule.students || []).map((s) => s._id || s);
    setCompleteFormData({
      km: 10,
      hours: 1,
      attendedStudentIds: attendeeIds,
      notes: `Completed scheduled session (${schedule.timeSlot})`
    });
  };

  const handleConfirmCompleteSchedule = async (e) => {
    e.preventDefault();
    if (!completeScheduleTarget) return;

    try {
      setCompleteSubmitting(true);
      await completeSchedule(completeScheduleTarget._id, completeFormData);
      setCompleteScheduleTarget(null);
      fetchSchedulesData();
      fetchLedgerData(1);
    } catch (err) {
      alert(err.message || 'Failed to complete session.');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to cancel and remove this scheduled session?')) return;
    try {
      await deleteSchedule(id);
      fetchSchedulesData();
    } catch (err) {
      alert(err.message || 'Failed to delete schedule.');
    }
  };

  // Filtered Students for Modal search
  const filteredModalStudents = students.filter((s) => {
    if (!modalStudentSearch.trim()) return true;
    const term = modalStudentSearch.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(term) ||
      s.studentId?.toLowerCase().includes(term) ||
      s.primaryMobile?.toLowerCase().includes(term) ||
      s.applicationNo?.toLowerCase().includes(term)
    );
  });

  // Students eligible for selected batch in Schedule modal
  const batchStudentsForSchedule = students.filter((s) => {
    if (!scheduleFormData.batch) return true;
    return s.batch === scheduleFormData.batch || s.batch?._id === scheduleFormData.batch;
  });

  // =========================================================================
  // TABLE COLUMNS: TRAINING LEDGER
  // =========================================================================
  const columns = [
    {
      header: 'ID',
      className: 'w-16 text-center',
      cell: (row, idx) => (
        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
          #{(pagination.page - 1) * pagination.limit + (idx !== undefined ? idx + 1 : 1)}
        </span>
      )
    },
    {
      header: 'Student',
      cell: (row) => (
        <div>
          {row.student ? (
            <Link
              to={`/students/${row.student._id || row.student}`}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              {row.student.fullName || 'Student'}
            </Link>
          ) : (
            <span className="font-bold text-slate-800 dark:text-slate-200">Unknown Student</span>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span className="font-mono">{row.student?.studentId || '—'}</span>
            <span>&bull;</span>
            <span>{row.student?.primaryMobile || '—'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Batch',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.batch?.name || 'Standard'}
        </span>
      )
    },
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
          {row.classDate ? new Date(row.classDate).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      header: 'Instructor',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <GraduationCap size={14} className="text-slate-400 shrink-0" />
          {row.instructorRef ? (
            <Link
              to={`/instructors/${row.instructorRef._id || row.instructorRef}`}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition"
            >
              {row.instructorRef.name || row.instructor}
            </Link>
          ) : (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {row.instructor || 'Unassigned'}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Vehicle',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Car size={14} className="text-slate-400 shrink-0" />
          <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
            {row.vehicleRef?.vehicleNumber || row.vehicleNo || 'KL-10-AB-5265'}
          </span>
        </div>
      )
    },
    {
      header: 'Type',
      cell: (row) => <Badge type="class" value={row.trainingType || 'Practical Driving'} />
    },
    {
      header: 'KM',
      cell: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
          {row.km || 0} KM
        </span>
      )
    },
    {
      header: 'H',
      cell: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
          {row.hours || 0} hr(s)
        </span>
      )
    },
    {
      header: 'Eq. Classes',
      cell: (row) => {
        const km = Number(row.km || 0);
        const h = Number(row.hours || 0);
        const bike = Number(row.bikeClassCount || 0);
        const eq = Math.round(((km / 5) + (h / 3) + bike) * 10) / 10;
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
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={row.notes || ''}>
          {row.notes || '—'}
        </p>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Class Record"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition"
          >
            <Edit size={16} />
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteTarget(row)}
              title="Delete Class Record"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Driving Training & Class Records" />

      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* ========================================================================= */}
        {/* MAIN HEADER BAR: Search, Backup, + Student */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Global Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student / mobile / applic..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-md transition"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchLedgerData(1);
                }}
                title="Clear Search"
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </form>

          {/* Action Buttons: Backup & + Student */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleBackup}
              disabled={backingUp}
              title="Download full JSON data backup"
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
            >
              <Database size={15} className="text-slate-500 dark:text-slate-300" />
              <span>{backingUp ? 'Exporting...' : 'Backup'}</span>
            </button>

            <Link
              to="/students/add"
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus size={15} />
              <span>+ Student</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP STATISTICS CARDS (6 Required Dynamic Database Cards) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Training Records */}
          <StatCard
            title="Training Records"
            value={stats.totalRecords}
            icon={CalendarCheck}
            color="red"
            subtitle="Total Driving Sessions"
          />

          {/* Card 2: Recorded KM */}
          <StatCard
            title="Recorded KM"
            value={`${stats.recordedKm} KM`}
            icon={Gauge}
            color="emerald"
            subtitle="Total Distance Run"
          />

          {/* Card 3: Recorded H */}
          <StatCard
            title="Recorded H"
            value={`${stats.recordedHours} hrs`}
            icon={Clock}
            color="amber"
            subtitle="Total Practical Duration"
          />

          {/* Card 4: Instructor-specific KM (e.g. Farhan KM) */}
          <StatCard
            title={`${stats.instructor?.name || 'Instructor'} KM`}
            value={`${stats.instructor?.km || 0} KM`}
            icon={Car}
            color="purple"
            subtitle="Cumulative Faculty KM"
          />

          {/* Card 5: Instructor-specific H (e.g. Farhan H) */}
          <StatCard
            title={`${stats.instructor?.name || 'Instructor'} H`}
            value={`${stats.instructor?.hours || 0} hrs`}
            icon={Award}
            color="rose"
            subtitle="Cumulative Faculty Hours"
          />

          {/* Card 6: Equivalent Classes (Formula: KM/5 + H/3 + Bike) */}
          <StatCard
            title="Equivalent Classes"
            value={stats.equivalentClasses}
            icon={Calendar}
            color="dark"
            subtitle="Formula: KM/5 + H/3"
          />
        </div>

        {/* ========================================================================= */}
        {/* WORKSPACE NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="border-b border-slate-200 dark:border-slate-700 flex overflow-x-auto gap-1 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xs">
          {[
            { id: 'ledger', label: 'Training Ledger', icon: CalendarCheck, count: pagination.total },
            { id: 'tracker', label: 'Training Progress Tracker', icon: Award, count: trackerPagination?.total },
            { id: 'schedules', label: 'Daily Class Schedules', icon: Clock, count: schedules.length },
            { id: 'workload', label: 'Operations & Workload', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === tab.id
                      ? 'bg-red-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TRAINING LEDGER VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Section Header: Title & Actions ([ Export CSV ] & [ + Add Class ]) */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Training Ledger</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {pagination.total} records
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete log of individual driving classes, student progress, vehicle allocation & faculty hours.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleExportCSV}
                  disabled={exporting}
                  title="Export currently filtered records to CSV"
                  className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={15} className="text-slate-500 dark:text-slate-300" />
                  <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>

                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={16} />
                  <span>+ Add Class</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Filter size={13} /> Filters:
              </span>

              {/* Student Filter */}
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[170px] focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Students</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.fullName} ({s.studentId})
                  </option>
                ))}
              </select>

              {/* Batch Filter */}
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[160px] focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.session || 'Session'})
                  </option>
                ))}
              </select>

              {/* Instructor Filter */}
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[160px] focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Instructors</option>
                {instructors.map((ins) => (
                  <option key={ins._id} value={ins._id}>
                    {ins.name}
                  </option>
                ))}
              </select>

              {/* Vehicle Filter */}
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[160px] focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber} ({v.model || v.brand})
                  </option>
                ))}
              </select>

              {/* Training Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[160px] focus:ring-1 focus:ring-red-500"
              >
                <option value="">All Training Types</option>
                {TRAINING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Date Range: Start Date */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400">From:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>

              {/* Date Range: End Date */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400">To:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>

              {/* Clear Filters Button */}
              {(selectedStudent ||
                selectedBatch ||
                selectedInstructor ||
                selectedVehicle ||
                selectedType ||
                filterStartDate ||
                filterEndDate ||
                search) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 font-semibold transition"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Table / Loading / Empty Content */}
            {loading ? (
              <div className="p-8">
                <LoadingSpinner message="Loading training ledger from database..." />
              </div>
            ) : error ? (
              <div className="p-6">
                <ErrorMessage message={error} onRetry={() => fetchLedgerData(pagination.page)} />
              </div>
            ) : classes.length === 0 ? (
              <EmptyState
                title="No training records found"
                description={
                  search || selectedStudent || selectedBatch || selectedInstructor || selectedVehicle || filterStartDate
                    ? 'No classes match your current search or filter criteria.'
                    : 'Start recording student driving sessions to build your training ledger.'
                }
                actionButton={
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={16} />
                    <span>+ Add Class</span>
                  </button>
                }
              />
            ) : (
              <div>
                <DataTable
                  columns={columns}
                  data={classes}
                  emptyMessage="No training records found."
                />
                <Pagination
                  pagination={pagination}
                  onPageChange={(newPage) => fetchLedgerData(newPage)}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TRAINING PROGRESS TRACKER (DDS_Operations_Training_Management_2026) */}
        {/* ========================================================================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
            {/* Top Operational Metrics for Tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Tracked Candidates</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {trackerPagination.total} <span className="text-xs font-normal text-slate-400">Students</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Enrolled with Course Quotas</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Active in Training</span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {stats.activeTrainingStudents || 0}
                </p>
                <p className="text-[11px] text-blue-500 mt-0.5">Ongoing practical syllabus</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Completed Syllabus</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.completedTrainingStudents || 0}
                </p>
                <p className="text-[11px] text-emerald-500 mt-0.5">100% equivalent classes fulfilled</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Standard Quota</span>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  20 <span className="text-xs font-normal text-slate-400">Classes</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Formula: Road/5 + H/3 + Bike</p>
              </div>
            </div>

            {/* Tracker Main Container */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Student Training Progress Tracker</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {trackerPagination.total} enrolled
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Individual candidate tracking matching the DDS Training Management Master. Road KM, H Track hours, equivalent class calculation, pending classes & fee status.
                  </p>
                </div>

                <form onSubmit={handleTrackerSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={trackerSearch}
                      onChange={(e) => setTrackerSearch(e.target.value)}
                      placeholder="Search candidate..."
                      className="pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
                    />
                  </div>

                  <select
                    value={trackerBatch}
                    onChange={(e) => setTrackerBatch(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                  >
                    <option value="">All Batches</option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={trackerStatus}
                    onChange={(e) => setTrackerStatus(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                  >
                    <option value="">All Status</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-xs font-bold"
                  >
                    Filter
                  </button>
                </form>
              </div>

              {trackerLoading ? (
                <div className="p-8">
                  <LoadingSpinner message="Calculating individual student training progress..." />
                </div>
              ) : trackerError ? (
                <div className="p-6">
                  <ErrorMessage message={trackerError} onRetry={() => fetchTrackerData(trackerPagination.page)} />
                </div>
              ) : trackerStudents.length === 0 ? (
                <EmptyState
                  title="No student progress records found"
                  description="No students match the selected batch or search filter."
                />
              ) : (
                <div>
                  <DataTable
                    columns={[
                      {
                        header: 'Candidate',
                        cell: (row) => (
                          <div>
                            <Link
                              to={`/students/${row._id}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 transition"
                            >
                              {row.fullName}
                            </Link>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="font-mono">{row.studentId}</span>
                              <span>&bull;</span>
                              <span>{row.primaryMobile}</span>
                            </div>
                          </div>
                        )
                      },
                      {
                        header: 'Batch',
                        cell: (row) => (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {row.batch?.name || 'Unassigned'}
                          </span>
                        )
                      },
                      {
                        header: 'Road (KM / Eq)',
                        cell: (row) => (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                              {row.roadKm} KM
                            </span>
                            <span className="block text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                              {row.roadEquivalent} Eq ({row.roadClassesCount || 0} sess)
                            </span>
                          </div>
                        )
                      },
                      {
                        header: 'Track / H (Hrs / Eq)',
                        cell: (row) => (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                              {row.hHours} hrs
                            </span>
                            <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                              {row.hEquivalent} Eq ({row.hTrackClassesCount || 0} sess)
                            </span>
                          </div>
                        )
                      },
                      {
                        header: 'Bike',
                        cell: (row) => (
                          <span className="font-bold text-purple-600 dark:text-purple-400 font-mono text-xs">
                            {row.bikeClasses} cls
                          </span>
                        )
                      },
                      {
                        header: 'Total Eq. Classes',
                        cell: (row) => (
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                            {row.equivalentClasses}
                          </span>
                        )
                      },
                      {
                        header: 'Pending / Required',
                        cell: (row) => (
                          <div>
                            <span className={`font-bold font-mono text-xs ${row.pendingClasses > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                              {row.pendingClasses} Pending
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              / {row.requiredClasses} required
                            </span>
                          </div>
                        )
                      },
                      {
                        header: 'Syllabus Progress',
                        cell: (row) => (
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              <span>{row.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  row.completionPercentage >= 100 ? 'bg-emerald-500' : 'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(100, row.completionPercentage)}%` }}
                              />
                            </div>
                          </div>
                        )
                      },
                      {
                        header: 'Fee Status',
                        cell: (row) => (
                          <div>
                            <span className={`text-xs font-bold ${row.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                              ₹ {row.balance} Due
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              (Paid: ₹{row.paidAmount} / ₹{row.totalFee})
                            </span>
                          </div>
                        )
                      },
                      {
                        header: 'Status',
                        cell: (row) => <Badge type="status" value={row.trainingStatus || 'Not Started'} />
                      },
                      {
                        header: 'Action',
                        className: 'text-right',
                        cell: (row) => (
                          <Link
                            to={`/students/${row._id}`}
                            className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition inline-block"
                            title="View Full Profile & Training Records"
                          >
                            <ExternalLink size={15} />
                          </Link>
                        )
                      }
                    ]}
                    data={trackerStudents}
                    emptyMessage="No students found."
                  />
                  <Pagination
                    pagination={trackerPagination}
                    onPageChange={(newPage) => fetchTrackerData(newPage)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DAILY CLASS SCHEDULES (Sorted_Driving_Schedule_With_Batches) */}
        {/* ========================================================================= */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            {/* Main Schedule Container */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Daily Driving Class Schedules</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {schedules.length} Sessions
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Batch-organized daily driving schedules from the master roster. Complete sessions to record actual KM/hours and auto-log attendance.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleOpenAddScheduleModal}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={16} />
                    <span>+ Schedule Session</span>
                  </button>
                </div>
              </div>

              {/* Schedule Filters Toolbar */}
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Filter size={13} /> Filters:
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={scheduleFilterDate}
                    onChange={(e) => setScheduleFilterDate(e.target.value)}
                    className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>

                <select
                  value={scheduleFilterBatch}
                  onChange={(e) => setScheduleFilterBatch(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[170px]"
                >
                  <option value="">All Batches</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={scheduleFilterStatus}
                  onChange={(e) => setScheduleFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 max-w-[150px]"
                >
                  <option value="">All Status</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {(scheduleFilterDate || scheduleFilterBatch || scheduleFilterStatus) && (
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleFilterDate('');
                      setScheduleFilterBatch('');
                      setScheduleFilterStatus('');
                    }}
                    className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 font-semibold transition"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Schedule Roster Content */}
              {schedulesLoading ? (
                <div className="p-8">
                  <LoadingSpinner message="Loading daily class schedules..." />
                </div>
              ) : schedulesError ? (
                <div className="p-6">
                  <ErrorMessage message={schedulesError} onRetry={fetchSchedulesData} />
                </div>
              ) : schedules.length === 0 ? (
                <EmptyState
                  title="No scheduled classes found"
                  description="No classes are currently scheduled for the selected filter criteria."
                  actionButton={
                    <button
                      onClick={handleOpenAddScheduleModal}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={16} />
                      <span>+ Schedule Session</span>
                    </button>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {schedules.map((sch) => (
                    <div
                      key={sch._id}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {sch.timeSlot || '07:00 AM - 08:30 AM'}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {sch.batch?.name || 'Batch'}
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <Badge type="class" value={sch.classType || 'Road & H'} />
                          <Badge type="status" value={sch.status || 'Planned'} />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <Calendar size={13} className="text-slate-400" />
                            {sch.date ? new Date(sch.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap size={13} className="text-slate-400" />
                            Instructor: <strong className="text-slate-700 dark:text-slate-300">{sch.instructor || 'Unassigned'}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Car size={13} className="text-slate-400" />
                            Vehicle: <strong className="font-mono text-slate-700 dark:text-slate-300">{sch.vehicleNo || 'KL-10-AB-5265'}</strong>
                          </span>
                        </div>

                        {sch.students && sch.students.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Assigned ({sch.students.length}):
                            </span>
                            {sch.students.map((st) => (
                              <span
                                key={st._id}
                                className="text-[11px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium"
                              >
                                {st.fullName} ({st.studentId})
                              </span>
                            ))}
                          </div>
                        )}

                        {sch.remarks && (
                          <p className="text-xs text-slate-500 italic mt-0.5">
                            Note: {sch.remarks}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {sch.status !== 'Completed' && (
                          <button
                            onClick={() => handleOpenCompleteSchedule(sch)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 size={14} />
                            <span>Mark Completed</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSchedule(sch._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition rounded"
                            title="Cancel / Delete Schedule"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: OPERATIONS & WORKLOAD ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'workload' && (
          <div className="space-y-5">
            {/* Top Fleet & Operations Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Today's Sessions</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {stats.todaysClassesCount || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Logged on current date</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Cumulative Fleet KM</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.recordedKm || 0} KM
                </p>
                <p className="text-[11px] text-emerald-500 mt-0.5">Total road distance conducted</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Practical Engine Hours</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {stats.recordedHours || 0} hrs
                </p>
                <p className="text-[11px] text-amber-500 mt-0.5">Track / Yard & H duration</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 text-xs font-semibold block">Faculty Workload</span>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {stats.instructorBreakdown?.length || instructors.length} <span className="text-xs font-normal text-slate-400">Instructors</span>
                </p>
                <p className="text-[11px] text-purple-500 mt-0.5">Active driving trainers</p>
              </div>
            </div>

            {/* Instructor Workload Breakdown Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap size={16} className="text-red-600" />
                  <span>Faculty Workload & Performance Ledger</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Breakdown of training sessions, kilometers logged, and teaching duration per instructor.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px]">
                      <th className="p-3">Instructor</th>
                      <th className="p-3">Total Classes</th>
                      <th className="p-3">Logged Distance</th>
                      <th className="p-3">Track / H Duration</th>
                      <th className="p-3">Equivalent Classes Delivered</th>
                      <th className="p-3">Students Trained</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {(!stats.instructorBreakdown || stats.instructorBreakdown.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">
                          No instructor sessions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      stats.instructorBreakdown.map((ins, i) => {
                        const eqDelivered = Math.round(((ins.km / 5) + (ins.hours / 3)) * 10) / 10;
                        return (
                          <tr key={ins._id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                              {ins.name || 'Instructor'}
                            </td>
                            <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {ins.totalClasses} sessions
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {ins.km} KM
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {ins.hours} hrs
                            </td>
                            <td className="p-3 font-mono font-black text-purple-600 dark:text-purple-400">
                              {eqDelivered} Eq
                            </td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                              {ins.studentsCount} candidates
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicle Fleet Utilization & Batch Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Vehicle Utilization Table */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Car size={16} className="text-red-600" />
                    <span>Fleet Vehicle Utilization</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mileage and operational engine hours logged across driving vehicles.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px]">
                        <th className="p-3">Vehicle Number</th>
                        <th className="p-3">Classes</th>
                        <th className="p-3">Mileage Run</th>
                        <th className="p-3">Engine Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {(!stats.vehicleBreakdown || stats.vehicleBreakdown.length === 0) ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            No vehicle sessions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        stats.vehicleBreakdown.map((veh, i) => (
                          <tr key={veh._id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {veh.vehicleNo || 'Vehicle'}
                            </td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                              {veh.totalClasses}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {veh.km} KM
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {veh.hours} hrs
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Batch Breakdown Table */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers size={16} className="text-red-600" />
                    <span>Batch Training Mileage</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aggregated practical training output per assigned student batch.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold text-[11px]">
                        <th className="p-3">Batch Name</th>
                        <th className="p-3">Classes</th>
                        <th className="p-3">Total KM</th>
                        <th className="p-3">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {(!stats.batchBreakdown || stats.batchBreakdown.length === 0) ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            No batch training sessions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        stats.batchBreakdown.map((b, i) => (
                          <tr key={b._id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                              {b.batchName || 'Batch'} <span className="text-slate-400 font-normal">({b.session || 'Session'})</span>
                            </td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                              {b.totalClasses}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {b.km} KM
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {b.hours} hrs
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT CLASS MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? 'Edit Training Class Record' : 'Record New Driving Class'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-md text-red-600 dark:text-red-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Student Picker with fast search filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Student <span className="text-red-500">*</span>
              </label>
              {students.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter student list..."
                  value={modalStudentSearch}
                  onChange={(e) => setModalStudentSearch(e.target.value)}
                  className="text-[11px] px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              )}
            </div>
            <select
              required
              value={formData.student}
              onChange={(e) => {
                const stu = students.find((s) => s._id === e.target.value);
                setFormData({
                  ...formData,
                  student: e.target.value,
                  batch: stu?.batch?._id || stu?.batch || formData.batch
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Choose Student from Database --</option>
              {filteredModalStudents.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.studentId}) &bull; {s.primaryMobile}
                </option>
              ))}
            </select>
          </div>

          {/* Batch & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batch Assignment
              </label>
              <select
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Standard / No Batch --</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.session || 'Session'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Class Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.classDate}
                onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Time Slot & Training Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Time Slot
              </label>
              <input
                type="text"
                value={formData.timeSlot}
                onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                placeholder="e.g. 07:00 AM - 08:30 AM"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Training Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.trainingType}
                onChange={(e) => setFormData({ ...formData, trainingType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                {TRAINING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Instructor & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instructor <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.instructorRef}
                onChange={(e) => {
                  const ins = instructors.find((i) => i._id === e.target.value);
                  setFormData({
                    ...formData,
                    instructorRef: e.target.value,
                    instructor: ins ? ins.name : 'Instructor'
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Choose Instructor --</option>
                {instructors.map((ins) => (
                  <option key={ins._id} value={ins._id}>
                    {ins.name} ({ins.designation || 'Instructor'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.vehicleRef}
                onChange={(e) => {
                  const veh = vehicles.find((v) => v._id === e.target.value);
                  setFormData({
                    ...formData,
                    vehicleRef: e.target.value,
                    vehicleNo: veh ? veh.vehicleNumber : 'KL-10-AB-5265'
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              >
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber} ({v.model || v.brand})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KM Driven, Duration Hours, Bike Classes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kilometers (KM) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={formData.km}
                onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                required
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bike Classes
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.bikeClassCount}
                onChange={(e) => setFormData({ ...formData, bikeClassCount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Lesson Remarks / Instructor Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Practiced 8-track maneuvers and clutch balance on incline"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingClass ? 'Update Class' : 'Save Class Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ADD SCHEDULE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={addScheduleModalOpen}
        onClose={() => setAddScheduleModalOpen(false)}
        title="Schedule New Driving Class Session"
      >
        <form onSubmit={handleSubmitSchedule} className="space-y-4">
          {scheduleFormError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-md text-red-600 dark:text-red-400 text-xs font-semibold">
              {scheduleFormError}
            </div>
          )}

          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Batch <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={scheduleFormData.batch}
              onChange={(e) => {
                const b = batches.find((x) => x._id === e.target.value);
                const batchStus = students.filter((s) => s.batch === b?._id || s.batch?._id === b?._id);
                setScheduleFormData({
                  ...scheduleFormData,
                  batch: e.target.value,
                  timeSlot: b ? `${b.startTime || '07:00 AM'} - ${b.endTime || '08:30 AM'}` : scheduleFormData.timeSlot,
                  instructor: b?.instructor || scheduleFormData.instructor,
                  students: batchStus.map((s) => s._id)
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- Choose Batch --</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.session || 'Session'})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={scheduleFormData.date}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Time Slot <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={scheduleFormData.timeSlot}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, timeSlot: e.target.value })}
                placeholder="07:00 AM - 08:30 AM"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Class Type & Instructor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Class Type / Section <span className="text-red-500">*</span>
              </label>
              <select
                value={scheduleFormData.classType}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, classType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                <option value="Road & H">Road & H</option>
                <option value="Road Training">Road Training</option>
                <option value="Track / H Training">Track / H Training</option>
                <option value="Reverse Parking">Reverse Parking</option>
                <option value="Simulator">Simulator</option>
                <option value="Bike Training">Bike Training</option>
                <option value="Theory / Rules">Theory / Rules</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instructor
              </label>
              <select
                value={scheduleFormData.instructorRef}
                onChange={(e) => {
                  const ins = instructors.find((i) => i._id === e.target.value);
                  setScheduleFormData({
                    ...scheduleFormData,
                    instructorRef: e.target.value,
                    instructor: ins ? ins.name : 'Instructor'
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                <option value="">-- Choose Instructor --</option>
                {instructors.map((ins) => (
                  <option key={ins._id} value={ins._id}>
                    {ins.name} ({ins.designation || 'Instructor'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vehicle No */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Vehicle
            </label>
            <select
              value={scheduleFormData.vehicleRef}
              onChange={(e) => {
                const veh = vehicles.find((v) => v._id === e.target.value);
                setScheduleFormData({
                  ...scheduleFormData,
                  vehicleRef: e.target.value,
                  vehicleNo: veh ? veh.vehicleNumber : 'KL-10-AB-5265'
                });
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
            >
              <option value="">-- Choose Vehicle --</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleNumber} ({v.model || v.brand})
                </option>
              ))}
            </select>
          </div>

          {/* Candidate Multi-select Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Assigned Students ({scheduleFormData.students.length} Selected)
              </label>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setScheduleFormData({
                      ...scheduleFormData,
                      students: batchStudentsForSchedule.map((s) => s._id)
                    })
                  }
                  className="text-red-600 dark:text-red-400 font-bold hover:underline"
                >
                  Select All
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => setScheduleFormData({ ...scheduleFormData, students: [] })}
                  className="text-slate-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/50 dark:bg-slate-900/50">
              {batchStudentsForSchedule.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 col-span-2 text-center">
                  No students assigned to this batch yet.
                </p>
              ) : (
                batchStudentsForSchedule.map((s) => {
                  const isChecked = scheduleFormData.students.includes(s._id);
                  return (
                    <label
                      key={s._id}
                      className={`flex items-center gap-2 p-1 rounded text-xs cursor-pointer ${
                        isChecked ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-semibold' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? scheduleFormData.students.filter((id) => id !== s._id)
                            : [...scheduleFormData.students, s._id];
                          setScheduleFormData({ ...scheduleFormData, students: updated });
                        }}
                        className="w-3.5 h-3.5 text-red-600 rounded"
                      />
                      <span className="truncate">{s.fullName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Lesson Focus
            </label>
            <input
              type="text"
              value={scheduleFormData.remarks}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, remarks: e.target.value })}
              placeholder="e.g. Reverse H parking, slope driving"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAddScheduleModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={scheduleSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition shadow-xs disabled:opacity-50"
            >
              {scheduleSubmitting ? 'Scheduling...' : 'Save to Schedule Roster'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* COMPLETE SCHEDULE SESSION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(completeScheduleTarget)}
        onClose={() => setCompleteScheduleTarget(null)}
        title="Complete Driving Class Session & Log Records"
      >
        <form onSubmit={handleConfirmCompleteSchedule} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Marking session for <strong>{completeScheduleTarget?.batch?.name || 'Batch'}</strong> on{' '}
            <strong>{completeScheduleTarget?.timeSlot}</strong> as completed. This will generate training class records and mark candidate attendance automatically.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kilometers Run (KM) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={completeFormData.km}
                onChange={(e) => setCompleteFormData({ ...completeFormData, km: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                required
                value={completeFormData.hours}
                onChange={(e) => setCompleteFormData({ ...completeFormData, hours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Attended Students ({completeFormData.attendedStudentIds.length} / {completeScheduleTarget?.students?.length || 0})
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2 space-y-1 bg-slate-50 dark:bg-slate-900">
              {(completeScheduleTarget?.students || []).map((s) => {
                const sId = s._id || s;
                const isPresent = completeFormData.attendedStudentIds.includes(sId);
                return (
                  <label key={sId} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPresent}
                      onChange={() => {
                        const updated = isPresent
                          ? completeFormData.attendedStudentIds.filter((id) => id !== sId)
                          : [...completeFormData.attendedStudentIds, sId];
                        setCompleteFormData({ ...completeFormData, attendedStudentIds: updated });
                      }}
                      className="w-3.5 h-3.5 text-emerald-600 rounded"
                    />
                    <span className="text-slate-700 dark:text-slate-200">{s.fullName || 'Student'}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Session Completion Notes
            </label>
            <input
              type="text"
              value={completeFormData.notes}
              onChange={(e) => setCompleteFormData({ ...completeFormData, notes: e.target.value })}
              placeholder="e.g. Full class completed smoothly, clutch drills passed"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCompleteScheduleTarget(null)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={completeSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition shadow-xs disabled:opacity-50"
            >
              {completeSubmitting ? 'Logging...' : 'Confirm & Generate Class Records'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRM DELETE MODAL */}
      {/* ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message={
          deleteTarget
            ? `Are you sure you want to delete this training record for ${deleteTarget.student?.fullName || 'the student'} (${deleteTarget.km || 0} KM on ${deleteTarget.classDate ? new Date(deleteTarget.classDate).toLocaleDateString() : 'N/A'})? This will update student progress and ledger statistics.`
            : 'Are you sure you want to delete this training record?'
        }
      />
    </MainLayout>
  );
};

export default ClassListPage;
