import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import {
  getWorkflowStats,
  getWorkflowStudents,
  getStudentWorkflow,
  updateStudentStage,
  getWorkflowHistory,
  addWorkflowNote
} from '../../services/workflowService';
import { createFollowUp } from '../../services/followUpService';
import { getBatches } from '../../services/batchService';
import { getUsers } from '../../services/userService';
import {
  Workflow,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Layers,
  GraduationCap,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  ExternalLink,
  ChevronRight,
  History,
  Tag,
  MessageSquare
} from 'lucide-react';

const STAGE_CONFIG = [
  { name: 'Application', color: 'indigo', icon: FileText },
  { name: 'Documents', color: 'amber', icon: FileText },
  { name: 'LL Slot / Test', color: 'cyan', icon: Calendar },
  { name: 'LL Passed', color: 'teal', icon: CheckCircle2 },
  { name: 'Training', color: 'blue', icon: GraduationCap },
  { name: 'DL Test', color: 'purple', icon: Clock },
  { name: 'Passed / Licence Processing', color: 'emerald', icon: AwardIcon },
  { name: 'Completed', color: 'slate', icon: CheckCircle2 },
  { name: 'Renewal / Service', color: 'violet', icon: RefreshCw },
  { name: 'Follow Up', color: 'yellow', icon: AlertCircle },
  { name: 'Other', color: 'zinc', icon: Tag }
];

function AwardIcon(props) {
  return <CheckCircle2 {...props} />;
}

const WorkflowPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected stage filter (defaults to 'all' or param)
  const initialStage = searchParams.get('stage') || 'all';
  const [selectedStage, setSelectedStage] = useState(initialStage);

  // Stats & Students state
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [batches, setBatches] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [studentHistory, setStudentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Change Stage Modal
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [stageNextAction, setStageNextAction] = useState('');
  const [stageNextActionDate, setStageNextActionDate] = useState('');
  const [createFollowUpCheck, setCreateFollowUpCheck] = useState(false);
  const [followUpDueDate, setFollowUpDueDate] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState('High');
  const [followUpTask, setFollowUpTask] = useState('');
  const [stageSubmitting, setStageSubmitting] = useState(false);

  // Add Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteNextAction, setNoteNextAction] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Quick Follow-Up Modal
  const [quickFollowUpModalOpen, setQuickFollowUpModalOpen] = useState(false);
  const [quickFollowUpTask, setQuickFollowUpTask] = useState('');
  const [quickFollowUpDate, setQuickFollowUpDate] = useState('');
  const [quickFollowUpPriority, setQuickFollowUpPriority] = useState('Medium');
  const [quickFollowUpNotes, setQuickFollowUpNotes] = useState('');
  const [quickFollowUpSubmitting, setQuickFollowUpSubmitting] = useState(false);

  // Fetch initial metadata: Batches and Users
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [batchRes, userRes] = await Promise.all([
          getBatches({ limit: 'all' }),
          getUsers()
        ]);
        setBatches(Array.isArray(batchRes) ? batchRes : (batchRes?.batches || []));
        setStaffUsers(Array.isArray(userRes) ? userRes : (userRes?.users || []));
      } catch (e) {
        console.error('Error fetching metadata:', e);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getWorkflowStats();
      setStats(res);
    } catch (e) {
      console.error('Failed to load workflow stats:', e);
    }
  }, []);

  // Fetch Students
  const fetchStudents = useCallback(async (page = 1) => {
    try {
      setTableLoading(true);
      setError(null);

      const params = {
        page,
        limit: 15,
        stage: selectedStage,
        search: search.trim() || undefined,
        batch: selectedBatch !== 'all' ? selectedBatch : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await getWorkflowStudents(params);
      setStudents(res.students || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e) {
      setError(e.message || 'Failed to load students');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [selectedStage, search, selectedBatch, startDate, endDate]);

  useEffect(() => {
    fetchStats();
    fetchStudents(1);
  }, [fetchStats, fetchStudents]);

  // Stage card click handler
  const handleStageSelect = (stageName) => {
    const newStage = selectedStage === stageName ? 'all' : stageName;
    setSelectedStage(newStage);
    setSearchParams(newStage === 'all' ? {} : { stage: newStage });
  };

  // Open detail modal for student
  const openStudentDetails = async (student) => {
    setSelectedStudent(student);
    setDetailModalOpen(true);
    try {
      setHistoryLoading(true);
      const res = await getStudentWorkflow(student._id);
      setSelectedStudent(res.student);
      setStudentHistory(res.history || []);
    } catch (e) {
      console.error('Failed to fetch full student workflow details:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Stage Change Modal
  const openStageModal = (student, defaultTarget = '') => {
    setSelectedStudent(student);
    setTargetStage(defaultTarget || student.workflowStage || 'Documents');
    setStageNotes('');
    setStageNextAction(student.nextAction || '');
    setStageNextActionDate(student.followUpDate ? student.followUpDate.split('T')[0] : '');
    setCreateFollowUpCheck(false);

    // Default follow-up task
    const nextTask = defaultTarget
      ? `Action for ${defaultTarget} stage`
      : `Follow-up on ${student.workflowStage}`;
    setFollowUpTask(nextTask);

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setFollowUpDueDate(defaultDate.toISOString().split('T')[0]);
    setFollowUpPriority('High');

    setStageModalOpen(true);
  };

  // Handle stage change submit
  const handleStageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !targetStage) return;

    try {
      setStageSubmitting(true);

      const payload = {
        stage: targetStage,
        notes: stageNotes.trim(),
        nextAction: stageNextAction.trim(),
        nextActionDate: stageNextActionDate || null,
        createFollowUp: createFollowUpCheck,
        followUpData: createFollowUpCheck ? {
          task: followUpTask.trim(),
          dueDate: followUpDueDate,
          priority: followUpPriority,
          notes: stageNotes.trim()
        } : null
      };

      const res = await updateStudentStage(selectedStudent._id, payload);

      setStageModalOpen(false);
      setDetailModalOpen(false);

      // Refresh stats & current table
      await Promise.all([fetchStats(), fetchStudents(pagination.page)]);
      alert(res.message || 'Workflow stage updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update stage');
    } finally {
      setStageSubmitting(false);
    }
  };

  // Open Quick Note Modal
  const openNoteModal = (student) => {
    setSelectedStudent(student);
    setNoteText(student.workflowNotes || '');
    setNoteNextAction(student.nextAction || '');
    setNoteDate(student.followUpDate ? student.followUpDate.split('T')[0] : '');
    setNoteModalOpen(true);
  };

  // Handle note submit
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setNoteSubmitting(true);
      await addWorkflowNote(selectedStudent._id, {
        notes: noteText.trim(),
        nextAction: noteNextAction.trim(),
        nextActionDate: noteDate || null
      });

      setNoteModalOpen(false);
      if (detailModalOpen) {
        // Refresh details modal
        openStudentDetails(selectedStudent);
      }
      fetchStudents(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Open Quick Follow-Up Modal
  const openQuickFollowUp = (student) => {
    setSelectedStudent(student);
    setQuickFollowUpTask(`Follow-up with ${student.fullName}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    setQuickFollowUpDate(tomorrow.toISOString().split('T')[0]);
    setQuickFollowUpPriority('Medium');
    setQuickFollowUpNotes('');
    setQuickFollowUpModalOpen(true);
  };

  // Handle quick follow-up submit
  const handleQuickFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !quickFollowUpTask || !quickFollowUpDate) return;

    try {
      setQuickFollowUpSubmitting(true);
      await createFollowUp({
        student: selectedStudent._id,
        task: quickFollowUpTask.trim(),
        dueDate: quickFollowUpDate,
        priority: quickFollowUpPriority,
        relatedStage: selectedStudent.workflowStage || '',
        notes: quickFollowUpNotes.trim()
      });

      setQuickFollowUpModalOpen(false);
      alert('Follow-up created successfully!');
      fetchStudents(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to create follow-up');
    } finally {
      setQuickFollowUpSubmitting(false);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedStage('all');
    setSelectedBatch('all');
    setStartDate('');
    setEndDate('');
    setSearchParams({});
  };

  const stageCountsMap = {};
  if (stats && stats.stages) {
    stats.stages.forEach((s) => {
      stageCountsMap[s.stage] = s.count;
    });
  }

  return (
    <MainLayout>
      <Navbar title="Workflow Control" />

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Workflow size={18} />
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Workflow Control
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {stats?.totalStudents || 0} Total Enrolled
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track each student's current stage from application to licence completion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                fetchStudents(pagination.page);
              }}
              title="Refresh Data"
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => navigate('/students/add')}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={15} /> Add Student
            </button>
          </div>
        </div>

        {/* WORKFLOW STAGES CARDS / COLUMNS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Workflow Stages Overview
            </h2>
            {selectedStage !== 'all' && (
              <button
                onClick={() => handleStageSelect('all')}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold"
              >
                Clear Stage Filter (Show All)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {STAGE_CONFIG.map((cfg) => {
              const count = stageCountsMap[cfg.name] || 0;
              const isSelected = selectedStage === cfg.name;
              const Icon = cfg.icon;

              return (
                <button
                  key={cfg.name}
                  onClick={() => handleStageSelect(cfg.name)}
                  className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 shadow-sm ring-2 ring-red-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider truncate ${
                        isSelected ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'
                      }`}
                      title={cfg.name}
                    >
                      {cfg.name}
                    </span>
                    <Icon
                      size={14}
                      className={isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-400 group-hover:text-slate-600'}
                    />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-xl font-black font-mono ${
                        count > 0
                          ? isSelected
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">students</span>
                  </div>

                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, ID, mobile, application..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Stage Selector */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => handleStageSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="all">All Stages</option>
                {STAGE_CONFIG.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({stageCountsMap[s.name] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selector */}
            <div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="all">All Batches</option>
                <option value="unassigned">Unassigned Batch</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset / Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* STUDENTS WORKFLOW TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Students in Workflow
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                ({pagination.total} results)
              </span>
            </div>
            {selectedStage !== 'all' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Current Filter:</span>
                <Badge value={selectedStage} />
              </div>
            )}
          </div>

          {tableLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Filtering students by workflow stage..." />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorMessage message={error} onRetry={() => fetchStudents(pagination.page)} />
            </div>
          ) : students.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Students in this Stage"
                description={`There are currently no students matching '${selectedStage === 'all' ? 'current filters' : selectedStage}'.`}
                actionLabel="View All Students"
                onAction={() => handleStageSelect('all')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Package / Licence</th>
                    <th className="px-4 py-3">Batch & Instructor</th>
                    <th className="px-4 py-3">Current Stage</th>
                    <th className="px-4 py-3">Next Action</th>
                    <th className="px-4 py-3">Last Changed</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                  {students.map((student) => {
                    const currentStage = student.workflowStage || 'Application';

                    return (
                      <tr
                        key={student._id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition group cursor-pointer"
                        onClick={() => openStudentDetails(student)}
                      >
                        {/* Student Name & ID */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 transition">
                            {student.fullName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono text-red-600 dark:text-red-400 font-bold">
                              {student.studentId}
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {student.primaryMobile}
                            </span>
                          </div>
                        </td>

                        {/* Package / Service */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {student.licenceCategory || 'LMV'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {student.coursePackage || 'Fresh Licence'}
                          </div>
                        </td>

                        {/* Batch */}
                        <td className="px-4 py-3">
                          {student.batch ? (
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <Layers size={12} className="text-slate-400" />
                                {student.batch.name}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <GraduationCap size={11} />
                                {student.batch.instructor || 'Unassigned'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Current Stage */}
                        <td className="px-4 py-3">
                          <Badge value={currentStage} />
                        </td>

                        {/* Next Action */}
                        <td className="px-4 py-3 max-w-[200px]">
                          {student.nextAction ? (
                            <div>
                              <div className="font-medium truncate text-slate-800 dark:text-slate-200">
                                {student.nextAction}
                              </div>
                              {student.followUpDate && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={11} className="text-amber-500" />
                                  {new Date(student.followUpDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None scheduled</span>
                          )}
                        </td>

                        {/* Stage Changed Date */}
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          <div>
                            {student.workflowStageChangedAt
                              ? new Date(student.workflowStageChangedAt).toLocaleDateString()
                              : new Date(student.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {student.workflowStageChangedBy?.name
                              ? `By ${student.workflowStageChangedBy.name}`
                              : 'System'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3 text-right space-x-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openStageModal(student)}
                            title="Move Stage"
                            className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 font-bold rounded text-xs transition border border-red-200 dark:border-red-900 inline-flex items-center gap-1"
                          >
                            <ArrowRight size={13} /> Move
                          </button>
                          <button
                            onClick={() => openQuickFollowUp(student)}
                            title="Add Follow-Up"
                            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          >
                            <Calendar size={15} />
                          </button>
                          <button
                            onClick={() => openStudentDetails(student)}
                            title="Quick View"
                            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!tableLoading && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => fetchStudents(page)}
              />
            </div>
          )}
        </div>
      </div>

      {/* COMPACT STUDENT WORKFLOW DETAIL MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedStudent ? `${selectedStudent.fullName} (${selectedStudent.studentId})` : 'Student Details'}
        maxWidth="max-w-2xl"
      >
        {selectedStudent && (
          <div className="space-y-5">
            {/* Top Info Banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {selectedStudent.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-red-600 font-bold">{selectedStudent.studentId}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {selectedStudent.primaryMobile}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Stage:</span>
                  <Badge value={selectedStudent.workflowStage || 'Application'} />
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Service / Licence</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.licenceCategory || 'LMV'} ({selectedStudent.coursePackage || 'Fresh'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Batch</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.batch?.name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Instructor</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.batch?.instructor || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Next Action</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.nextAction || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Action Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.followUpDate
                      ? new Date(selectedStudent.followUpDate).toLocaleDateString()
                      : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Fee Balance</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ₹ {(selectedStudent.totalFee || 9000) - (selectedStudent.paidAmount || 0) - (selectedStudent.advanceAmount || 0)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedStudent.workflowNotes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-400 block text-[11px] font-bold">Notes:</span>
                  <p className="text-slate-700 dark:text-slate-300 italic mt-0.5">
                    "{selectedStudent.workflowNotes}"
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openStageModal(selectedStudent)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRight size={14} /> Change Stage
              </button>
              <button
                onClick={() => openQuickFollowUp(selectedStudent)}
                className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold rounded text-xs transition border border-amber-200 dark:border-amber-800 flex items-center gap-1.5"
              >
                <Calendar size={14} /> Add Follow-up
              </button>
              <button
                onClick={() => openNoteModal(selectedStudent)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded text-xs transition flex items-center gap-1.5"
              >
                <MessageSquare size={14} /> Add / Edit Note
              </button>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  navigate(`/students/${selectedStudent._id}`);
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold rounded text-xs transition border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 ml-auto"
              >
                <ExternalLink size={14} /> View Full Profile
              </button>
            </div>

            {/* Lightweight Workflow History Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <History size={14} /> Workflow History
              </h5>

              {historyLoading ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Loading transition history...
                </div>
              ) : studentHistory.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded text-center text-xs text-slate-400 italic">
                  No stage transitions recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {studentHistory.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700 text-xs flex items-start justify-between gap-3"
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
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-slate-400 shrink-0">
                        <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px]">
                          By {item.changedByName || 'System'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* STAGE TRANSITION MODAL */}
      <Modal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title={selectedStudent ? `Move Stage: ${selectedStudent.fullName}` : 'Move Stage'}
        maxWidth="max-w-lg"
      >
        {selectedStudent && (
          <form onSubmit={handleStageSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Current Stage</span>
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  {selectedStudent.workflowStage || 'Application'}
                </span>
              </div>
              <ArrowRight size={18} className="text-slate-400" />
              <div>
                <span className="text-[11px] text-slate-400 block">New Target Stage</span>
                <span className="font-extrabold text-sm text-red-600 dark:text-red-400">
                  {targetStage || 'Select below'}
                </span>
              </div>
            </div>

            {/* Select Target Stage */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Target Stage *
              </label>
              <select
                value={targetStage}
                onChange={(e) => {
                  setTargetStage(e.target.value);
                  setFollowUpTask(`Prepare student for ${e.target.value}`);
                }}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100 font-bold"
              >
                {STAGE_CONFIG.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Transition Notes */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transition Notes
              </label>
              <textarea
                value={stageNotes}
                onChange={(e) => setStageNotes(e.target.value)}
                rows={2}
                placeholder="E.g., LL test slot booked for 12 Oct at RTO Malappuram..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Next Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Action
                </label>
                <input
                  type="text"
                  value={stageNextAction}
                  onChange={(e) => setStageNextAction(e.target.value)}
                  placeholder="E.g., Confirm batch timing"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Action Date
                </label>
                <input
                  type="date"
                  value={stageNextActionDate}
                  onChange={(e) => setStageNextActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Automatic Follow-up Creation Toggle */}
            <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-md space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={createFollowUpCheck}
                  onChange={(e) => setCreateFollowUpCheck(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <span>Create follow-up reminder for this stage?</span>
              </label>

              {createFollowUpCheck && (
                <div className="space-y-3 pt-2 border-t border-red-200/60 dark:border-red-900/60">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Follow-up Task *
                    </label>
                    <input
                      type="text"
                      value={followUpTask}
                      onChange={(e) => setFollowUpTask(e.target.value)}
                      required={createFollowUpCheck}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        value={followUpDueDate}
                        onChange={(e) => setFollowUpDueDate(e.target.value)}
                        required={createFollowUpCheck}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={followUpPriority}
                        onChange={(e) => setFollowUpPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStageModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={stageSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {stageSubmitting ? 'Updating...' : 'Save Stage Change'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* QUICK NOTE MODAL */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title={selectedStudent ? `Add Note: ${selectedStudent.fullName}` : 'Add Note'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleNoteSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Workflow Notes
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Enter notes about student progress, documents, or special instructions..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:border-red-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Next Action
            </label>
            <input
              type="text"
              value={noteNextAction}
              onChange={(e) => setNoteNextAction(e.target.value)}
              placeholder="E.g., Call student regarding slot"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Next Action Date
            </label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={noteSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition disabled:opacity-50"
            >
              {noteSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK FOLLOW-UP MODAL */}
      <Modal
        isOpen={quickFollowUpModalOpen}
        onClose={() => setQuickFollowUpModalOpen(false)}
        title={selectedStudent ? `Add Follow-Up: ${selectedStudent.fullName}` : 'Add Follow-Up'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickFollowUpSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task / Follow-up *
            </label>
            <input
              type="text"
              value={quickFollowUpTask}
              onChange={(e) => setQuickFollowUpTask(e.target.value)}
              required
              placeholder="E.g., Call student regarding LL test slot..."
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
                value={quickFollowUpDate}
                onChange={(e) => setQuickFollowUpDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={quickFollowUpPriority}
                onChange={(e) => setQuickFollowUpPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
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
              value={quickFollowUpNotes}
              onChange={(e) => setQuickFollowUpNotes(e.target.value)}
              rows={2}
              placeholder="Additional instructions or notes..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickFollowUpModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={quickFollowUpSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition disabled:opacity-50"
            >
              {quickFollowUpSubmitting ? 'Creating...' : 'Create Follow-Up'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default WorkflowPage;
