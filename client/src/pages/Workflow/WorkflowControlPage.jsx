import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { getStudents, updateStudent } from '../../services/studentService';
import {
  Search,
  Plus,
  Eye,
  Edit,
  RefreshCw,
  X,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Car,
  Filter,
  ArrowRight
} from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'ALL', label: 'All Candidates', desc: 'Total candidate records' },
  { id: 'Application', label: '1. Application', desc: 'Application initiated' },
  { id: 'Documents', label: '2. Documents', desc: 'Doc verification pending' },
  { id: 'LL Slot / Test', label: '3. LL Slot / Test', desc: 'LL test scheduled' },
  { id: 'LL Passed', label: '4. LL Passed', desc: 'LL issued' },
  { id: 'Training', label: '5. Training', desc: 'In practical driving classes' },
  { id: 'DL Test', label: '6. DL Test', desc: 'RTO driving test scheduled' },
  { id: 'Passed / Licence Processing', label: '7. DL Processing', desc: 'Test passed, DL printing' },
  { id: 'Completed', label: '8. Completed', desc: 'Licence delivered' }
];

const WorkflowControlPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  // Stage Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [modalStage, setModalStage] = useState('');
  const [modalNextAction, setModalNextAction] = useState('');
  const [savingModal, setSavingModal] = useState(false);

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStudents({ limit: 500 });
      const data = res && res.students ? res.students : (Array.isArray(res) ? res : []);
      setStudents(data);
    } catch (err) {
      console.error('Error loading workflow candidates:', err);
      setError('Failed to load candidate workflow data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowData();
  }, []);

  // Compute actual stage for student
  const getStudentStage = (student) => {
    if (student.workflowStage && PIPELINE_STAGES.some(s => s.id === student.workflowStage)) {
      return student.workflowStage;
    }
    if (student.currentStatus === 'Completed' || student.drivingLicence?.status === 'Delivered') {
      return 'Completed';
    }
    if (student.testStatus === 'Passed' || student.drivingLicence?.status === 'Under Processing') {
      return 'Passed / Licence Processing';
    }
    if (student.testStatus === 'Scheduled' || student.currentStatus === 'Test Scheduled') {
      return 'DL Test';
    }
    if (student.currentStatus === 'Training' || student.trainingProgress?.status === 'In Progress') {
      return 'Training';
    }
    if (student.learnerLicence?.status === 'Passed' || student.learnerLicence?.status === 'Issued') {
      return 'LL Passed';
    }
    if (student.learnerLicence?.status === 'Slot Booked' || student.learnerLicence?.status === 'Pending') {
      return 'LL Slot / Test';
    }
    if (student.documents?.some(d => d.verificationStatus === 'Pending') || !student.documentReadiness?.aadhaarVerified) {
      return 'Documents';
    }
    return 'Application';
  };

  // Stage Metrics
  const metrics = useMemo(() => {
    const counts = { ALL: students.length };
    PIPELINE_STAGES.forEach(s => { if (s.id !== 'ALL') counts[s.id] = 0; });
    
    students.forEach(st => {
      const stage = getStudentStage(st);
      if (counts[stage] !== undefined) {
        counts[stage]++;
      } else {
        counts['Application']++;
      }
    });

    return {
      counts,
      activeLL: (counts['LL Slot / Test'] || 0) + (counts['LL Passed'] || 0),
      inTraining: counts['Training'] || 0,
      dlScheduled: counts['DL Test'] || 0,
      completed: counts['Completed'] || 0
    };
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const stage = getStudentStage(st);
      if (activeStage !== 'ALL' && stage !== activeStage) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        st.fullName?.toLowerCase().includes(term) ||
        st.studentId?.toLowerCase().includes(term) ||
        st.primaryMobile?.includes(term) ||
        st.applicationNo?.toLowerCase().includes(term)
      );
    });
  }, [students, activeStage, searchTerm]);

  // Handle Quick Inline Stage Update
  const handleStageChange = async (student, newStage) => {
    try {
      setUpdatingId(student._id);
      await updateStudent(student._id, { workflowStage: newStage });
      setStudents(prev =>
        prev.map(s => (s._id === student._id ? { ...s, workflowStage: newStage } : s))
      );
    } catch (err) {
      console.error('Error updating workflow stage:', err);
      alert('Failed to update stage.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setModalStage(getStudentStage(student));
    setModalNextAction(student.nextAction || '');
  };

  // Save Modal Updates
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setSavingModal(true);
      await updateStudent(editingStudent._id, {
        workflowStage: modalStage,
        nextAction: modalNextAction
      });
      setStudents(prev =>
        prev.map(s =>
          s._id === editingStudent._id
            ? { ...s, workflowStage: modalStage, nextAction: modalNextAction }
            : s
        )
      );
      setEditingStudent(null);
    } catch (err) {
      console.error('Error updating student stage:', err);
      alert('Failed to save stage updates.');
    } finally {
      setSavingModal(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Top Navbar Header Component */}
        <Navbar title="RTO & Licence Workflow Control" />

        {/* Header Summary Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-red-600" />
              RTO Workflow Control Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track and advance candidates step-by-step through RTO Applications, LL Tests, Driving Training, and DL Issuance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Search */}
            <div className="relative w-64 sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate / mobile / application"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={fetchWorkflowData}
              className="p-2 text-slate-600 hover:text-red-600 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => navigate('/students/add')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Candidate</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Quick Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">LL Stage</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.activeLL}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">In Training</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.inTraining}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">DL Test Scheduled</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.dlScheduled}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Licence Completed</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.completed}</h3>
            </div>
          </div>
        </div>

        {/* Interactive Pipeline Stage Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {PIPELINE_STAGES.map((stg) => {
            const count = metrics.counts[stg.id] || 0;
            const isActive = activeStage === stg.id;
            return (
              <button
                key={stg.id}
                onClick={() => setActiveStage(stg.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>{stg.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Workflow Candidates Register */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Candidate Workflow Register
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {filteredStudents.length} candidate(s)
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner message="Loading candidate workflow data..." />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
              No candidates found matching the selected stage and search query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Candidate Details</th>
                    <th className="py-3 px-4">Course / Vehicle</th>
                    <th className="py-3 px-4">Current Workflow Stage</th>
                    <th className="py-3 px-4">Next Required Action</th>
                    <th className="py-3 px-4">Test Details</th>
                    <th className="py-3 px-4">Balance Fee</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-xs">
                  {filteredStudents.map((st) => {
                    const currentStage = getStudentStage(st);
                    const balance = (st.totalFee || 0) - (st.paidAmount || 0) - (st.advanceAmount || 0);

                    return (
                      <tr
                        key={st._id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition"
                      >
                        {/* Candidate */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {st.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {st.studentId} • {st.primaryMobile}
                          </div>
                          {st.applicationNo && (
                            <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                              App #: {st.applicationNo}
                            </div>
                          )}
                        </td>

                        {/* Course / Vehicle */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {st.licenceCategory || 'LMV'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {st.coursePackage || 'Fresh Licence'}
                          </div>
                        </td>

                        {/* Current Workflow Stage */}
                        <td className="py-3.5 px-4">
                          <select
                            disabled={updatingId === st._id}
                            value={currentStage}
                            onChange={(e) => handleStageChange(st, e.target.value)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 cursor-pointer shadow-2xs"
                          >
                            {PIPELINE_STAGES.filter(s => s.id !== 'ALL').map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Next Required Action */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <ArrowRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="truncate max-w-xs">
                              {st.nextAction || (
                                currentStage === 'Application'
                                  ? 'Submit RTO Application'
                                  : currentStage === 'Documents'
                                  ? 'Verify Uploaded Documents'
                                  : currentStage === 'LL Slot / Test'
                                  ? 'Book Learner Slot'
                                  : currentStage === 'LL Passed'
                                  ? 'Assign to Training Batch'
                                  : currentStage === 'Training'
                                  ? 'Complete Practical Classes'
                                  : currentStage === 'DL Test'
                                  ? 'Conduct Final Road Test'
                                  : 'Follow up candidate'
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Test Details */}
                        <td className="py-3.5 px-4">
                          {st.testDate ? (
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {new Date(st.testDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                st.testStatus === 'Passed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : st.testStatus === 'Failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}>
                                {st.testStatus || 'Scheduled'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not scheduled</span>
                          )}
                        </td>

                        {/* Balance Fee */}
                        <td className="py-3.5 px-4">
                          {balance > 0 ? (
                            <span className="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[11px]">
                              ₹{balance.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]">
                              Paid
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/students/${st._id}`)}
                              title="View Candidate Detail Page"
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(st)}
                              title="Edit Workflow Details"
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Workflow Stage Modal */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Update Workflow Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingStudent.fullName} ({editingStudent.studentId})
                  </p>
                </div>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Workflow Stage
                  </label>
                  <select
                    value={modalStage}
                    onChange={(e) => setModalStage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  >
                    {PIPELINE_STAGES.filter(s => s.id !== 'ALL').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Next Required Action Prompt
                  </label>
                  <input
                    type="text"
                    value={modalNextAction}
                    onChange={(e) => setModalNextAction(e.target.value)}
                    placeholder="e.g. Book LL slot, Verify documents, Schedule DL test..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingModal}
                    className="px-5 py-2 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
                  >
                    {savingModal ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default WorkflowControlPage;
