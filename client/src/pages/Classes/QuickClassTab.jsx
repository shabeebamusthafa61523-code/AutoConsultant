import React, { useState, useMemo, useEffect } from 'react';
import { createClass, deleteClass } from '../../services/classService';
import {
  Zap,
  Users,
  Search,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  ListOrdered,
  X
} from 'lucide-react';

const COMPACT_TRAINING_PRESETS = [
  { id: 'Practical Driving', label: 'Practical', icon: '🚗' },
  { id: 'Road Training', label: 'Road', icon: '🛣️' },
  { id: 'Track / H Training', label: 'H Track', icon: '🅿️' },
  { id: 'Reverse Parking', label: 'Reverse', icon: '🔄' },
  { id: 'Theory / Rules', label: 'Theory', icon: '📖' },
  { id: 'Bike Training', label: 'Bike', icon: '🏍️' }
];

const TIME_SLOT_OPTIONS = [
  '07:00 AM - 08:30 AM',
  '08:30 AM - 10:00 AM',
  '10:00 AM - 11:30 AM',
  '11:30 AM - 01:00 PM',
  '02:00 PM - 03:30 PM',
  '04:00 PM - 05:30 PM'
];

const QuickClassTab = ({
  students = [],
  instructors = [],
  vehicles = [],
  batches = [],
  recentClasses = [],
  onClassCreated,
  onDeleteClass
}) => {
  // Multi-student selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Session Config State
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('07:00 AM - 08:30 AM');
  const [instructorRef, setInstructorRef] = useState(instructors[0]?._id || '');
  const [vehicleRef, setVehicleRef] = useState(vehicles[0]?._id || '');
  const [trainingType, setTrainingType] = useState('Practical Driving');
  const [km, setKm] = useState(10);
  const [hours, setHours] = useState(1);

  // Auto-bind initial instructor and vehicle when master lists load
  useEffect(() => {
    if (!instructorRef && instructors.length > 0) {
      setInstructorRef(instructors[0]._id);
    }
    if (!vehicleRef && vehicles.length > 0) {
      setVehicleRef(vehicles[0]._id);
    }
  }, [instructors, vehicles, instructorRef, vehicleRef]);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filtered Students for auto-suggest / checkbox list
  const matchingStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 15);
    const s = studentSearch.toLowerCase();
    return students
      .filter(
        (st) =>
          st.fullName?.toLowerCase().includes(s) ||
          st.studentId?.toLowerCase().includes(s) ||
          st.primaryMobile?.toLowerCase().includes(s)
      )
      .slice(0, 25);
  }, [students, studentSearch]);

  // Selected Student Objects for Detail View
  const selectedStudentObjects = useMemo(() => {
    return selectedStudentIds
      .map((id) => students.find((s) => String(s._id) === String(id)))
      .filter(Boolean);
  }, [students, selectedStudentIds]);

  // Live Equivalent calculation: (KM / 5) + (Hours / 3)
  const equivalentCalculated = useMemo(() => {
    const total = Number(km || 0) / 5 + Number(hours || 0) / 3;
    return Math.round(total * 100) / 100;
  }, [km, hours]);

  // Toggle single student selection
  const handleToggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((stId) => stId !== id) : [...prev, id]
    );
    setError(null);
  };

  // Toggle Select All filtered students
  const handleToggleSelectAll = () => {
    const matchingIds = matchingStudents.map((st) => st._id);
    const allSelected = matchingIds.every((id) => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !matchingIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...matchingIds])));
    }
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Submit Batch Quick Class Creation under Trainer's Name
  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student candidate.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      // Resolve Trainer / Instructor Name & Object ID
      let targetInstructor = instructors.find((i) => String(i._id) === String(instructorRef));
      if (!targetInstructor && instructors.length > 0) {
        targetInstructor = instructors[0];
      }
      const trainerName = targetInstructor ? targetInstructor.name : 'Instructor';
      const trainerId = targetInstructor ? targetInstructor._id : null;

      // Resolve Vehicle Object ID & Plate
      let targetVehicle = vehicles.find((v) => String(v._id) === String(vehicleRef));
      if (!targetVehicle && vehicles.length > 0) {
        targetVehicle = vehicles[0];
      }

      let createdCount = 0;
      for (const stuId of selectedStudentIds) {
        const stuObj = students.find((s) => String(s._id) === String(stuId));
        const payload = {
          student: stuId,
          batch: stuObj?.batch?._id || stuObj?.batch || batches[0]?._id || null,
          classDate,
          timeSlot,
          instructorRef: trainerId,
          instructor: trainerName,
          vehicleRef: targetVehicle?._id || vehicleRef || null,
          vehicleNo: targetVehicle?.vehicleNumber || '',
          trainingType,
          km: Number(km) || 0,
          hours: Number(hours) || 0,
          status: 'Completed'
        };

        await createClass(payload);
        createdCount++;
      }

      setSuccessMessage(
        `Successfully saved quick class for ${createdCount} student candidate(s) under Trainer "${trainerName}"! (+${equivalentCalculated} Eq. Classes)`
      );

      setSelectedStudentIds([]);

      if (onClassCreated) {
        onClassCreated();
      }
    } catch (err) {
      setError(err.message || 'Failed to log quick class session.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a quick class from the side list
  const handleDeleteQuickClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this logged class session?')) return;
    try {
      setDeletingId(classId);
      await deleteClass(classId);
      if (onDeleteClass) onDeleteClass(classId);
      if (onClassCreated) onClassCreated();
    } catch (err) {
      alert(err.message || 'Failed to delete class session.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 text-xs font-sans">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-800 rounded-lg p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-white/20">
              <Zap size={18} className="text-amber-300 animate-pulse" />
            </span>
            <h2 className="text-base font-black tracking-tight">Quick Class Scheduler</h2>
          </div>
          <p className="text-[11px] text-red-100 font-medium">
            Schedule and save sessions for single or multiple students under their assigned trainer's name.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs">
          <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-md font-bold">
            {selectedStudentIds.length} Student(s) Selected
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center gap-2 font-bold shadow-xs">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Form (7 cols) + Recent Classes Side List (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================================================= */}
        {/* LEFT / MAIN COLUMN: MULTI-STUDENT FORM (7 Cols) */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmitBatch} className="lg:col-span-7 space-y-4">
          {/* 1. MULTI-STUDENT CANDIDATE SELECTION CARD */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-red-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100">
                  1. Select Students ({selectedStudentIds.length} Selected)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  Select All Filtered
                </button>
                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Candidate Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search candidate by name, ID (STU-0001), or mobile..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Candidate Checklist (Scrollable) */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-700 rounded-md p-1 bg-slate-50/50 dark:bg-slate-900/50">
              {matchingStudents.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-medium">
                  No candidates found for "{studentSearch}".
                </div>
              ) : (
                matchingStudents.map((st) => {
                  const isChecked = selectedStudentIds.includes(st._id);
                  const tp = st.trainingProgress || {};
                  const totalEq = Math.round((tp.equivalentClasses || 0) * 10) / 10;
                  const req = tp.requiredClasses || 20;

                  return (
                    <div
                      key={st._id}
                      onClick={() => handleToggleStudent(st._id)}
                      className={`p-2 rounded transition cursor-pointer flex items-center justify-between gap-2.5 ${
                        isChecked
                          ? 'bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 font-semibold'
                          : 'bg-white dark:bg-slate-800 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isChecked ? (
                          <CheckSquare size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {st.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {st.studentId || '—'} &bull; {st.primaryMobile}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {totalEq} / {req} Eq
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Candidates Detailed View Panel */}
            {selectedStudentObjects.length > 0 && (
              <div className="bg-red-50/70 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-red-900 dark:text-red-200 border-b border-red-200/60 dark:border-red-800 pb-1.5">
                  <span>Selected Candidates Detail View ({selectedStudentObjects.length})</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[10px] text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {selectedStudentObjects.map((st) => {
                    const tp = st.trainingProgress || {};
                    const totalEq = Math.round((tp.equivalentClasses || 0) * 10) / 10;
                    const req = tp.requiredClasses || 20;

                    return (
                      <div
                        key={st._id}
                        className="p-2 bg-white dark:bg-slate-800 rounded border border-red-200 dark:border-red-900 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="truncate space-y-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                              {st.fullName}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1 rounded">
                              {st.studentId || 'STU'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            Mobile: {st.primaryMobile} &bull; {st.coursePackage || st.vehicleType || 'LMV'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {totalEq}/{req} Eq
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleStudent(st._id)}
                            title="Remove from batch selection"
                            className="text-slate-400 hover:text-red-600 p-0.5 rounded transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. DATE, TIME, TRAINER NAME & VEHICLE ALLOCATION */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2">
              2. Trainer Assignment & Allocation
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Time Slot</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-semibold"
                >
                  {TIME_SLOT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Trainer Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={instructorRef}
                  onChange={(e) => setInstructorRef(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-bold focus:ring-2 focus:ring-red-500"
                >
                  {instructors.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.name} ({i.mobile || 'Trainer'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Vehicle</label>
                <select
                  value={vehicleRef}
                  onChange={(e) => setVehicleRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-semibold"
                >
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>{v.vehicleNumber}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Module Preset Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Module Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMPACT_TRAINING_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTrainingType(p.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                      trainingType === p.id
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* KM & Duration Input */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">KM Driven</label>
                  <span className="text-[10px] text-slate-400 font-mono">1 Eq = 5 KM</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    className="w-20 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-mono font-bold"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[5, 10, 15].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setKm(val)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                          Number(km) === val
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {val}km
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Duration (Hours)</label>
                  <span className="text-[10px] text-slate-400 font-mono">1 Eq = 3 Hours</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-20 px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-mono font-bold"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[0.5, 1, 1.5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setHours(val)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                          Number(hours) === val
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {val}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUBMIT ACTION BAR */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
              <span>Eq. Class / Student:</span>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-xs">
                +{equivalentCalculated}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || selectedStudentIds.length === 0}
              className={`px-5 py-2.5 rounded-md font-bold text-xs text-white transition flex items-center gap-2 shadow-md ${
                submitting || selectedStudentIds.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 shadow-md'
              }`}
            >
              <Zap size={16} />
              <span>
                {submitting
                  ? 'Saving Sessions...'
                  : `Save Class for ${selectedStudentIds.length} Student(s)`}
              </span>
            </button>
          </div>
        </form>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: RECENT QUICK CLASSES SIDE LIST (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div className="flex items-center gap-2">
                <ListOrdered size={16} className="text-red-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100">
                  Recent Quick Classes
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                {recentClasses.length} Logged
              </span>
            </div>

            {/* Side List Feed */}
            <div className="max-h-[580px] overflow-y-auto space-y-2 pr-1">
              {recentClasses.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-600 dark:text-slate-300">No classes logged yet today.</p>
                  <p>Log a class session on the left to see live records listed here instantly.</p>
                </div>
              ) : (
                recentClasses.map((cls) => {
                  const stu = cls.student || {};
                  const isDeleting = deletingId === cls._id;

                  return (
                    <div
                      key={cls._id}
                      className="p-3 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition space-y-1.5 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {stu.fullName || 'Student'}
                        </div>
                        <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                          {stu.studentId || 'STU'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span className="font-mono font-medium">
                            {cls.classDate ? new Date(cls.classDate).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{cls.trainingType || 'Practical'}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                          <span>Trainer: <strong className="text-slate-700 dark:text-slate-300 font-bold">{cls.instructor || 'Faculty'}</strong></span>
                          <span>&bull;</span>
                          <span>{cls.vehicleNo || 'Vehicle'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            {cls.km || 0} KM • {cls.hours || 0} hr
                          </span>
                          <button
                            onClick={() => handleDeleteQuickClass(cls._id)}
                            disabled={isDeleting}
                            title="Delete this class session"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickClassTab;
