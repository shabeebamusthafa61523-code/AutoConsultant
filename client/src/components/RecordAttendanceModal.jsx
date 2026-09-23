import React, { useState } from 'react';
import Modal from './Modal';
import { CheckSquare, AlertCircle, Check, X, Clock } from 'lucide-react';

const RecordAttendanceModal = ({
  isOpen,
  onClose,
  batch,
  students = [],
  scheduleId = null,
  onSaveAttendance
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classType, setClassType] = useState('Road & H');
  const [instructor, setInstructor] = useState(batch?.instructor || 'Jasim');
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    return students.reduce((acc, stu) => {
      acc[stu._id] = { status: 'Present', remarks: '' };
      return acc;
    }, {});
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!batch) return null;

  const handleStatusChange = (stuId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [stuId]: {
        ...(prev[stuId] || {}),
        status
      }
    }));
  };

  const handleRemarksChange = (stuId, remarks) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [stuId]: {
        ...(prev[stuId] || {}),
        remarks
      }
    }));
  };

  const markAll = (status) => {
    setAttendanceRecords(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        updated[s._id] = { ...(updated[s._id] || {}), status };
      });
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const recordsArray = students.map(s => ({
        studentId: s._id,
        status: attendanceRecords[s._id]?.status || 'Present',
        remarks: attendanceRecords[s._id]?.remarks || ''
      }));

      await onSaveAttendance({
        date,
        classType,
        instructor,
        scheduleId,
        records: recordsArray
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Attendance: ${batch.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-slate-800 dark:text-slate-100">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 p-2.5 rounded-md text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class Type *</label>
            <select
              value={classType}
              onChange={(e) => setClassType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
            >
              <option value="Road & H">Road & H</option>
              <option value="Road">Road Class</option>
              <option value="H-Track">H-Track (Ground)</option>
              <option value="Highway Drive">Highway Drive</option>
              <option value="Theory / Rules">Theory / Rules</option>
              <option value="Simulator">Simulator</option>
              <option value="Bike Training">Bike Training</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Instructor</label>
            <input
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="e.g. Jasim / Noushad"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
            />
          </div>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Student Register ({students.length} Candidates)
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => markAll('Present')}
              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => markAll('Absent')}
              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded text-[11px] font-bold border border-rose-200 dark:border-rose-800 transition"
            >
              All Absent
            </button>
          </div>
        </div>

        {/* Student Checklist Table */}
        <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {students.map((stu) => {
            const currentStatus = attendanceRecords[stu._id]?.status || 'Present';
            return (
              <div key={stu._id} className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{stu.fullName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{stu.studentId} &bull; {stu.primaryMobile}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(stu._id, 'Present')}
                      className={`px-2.5 py-1 font-bold flex items-center gap-1 transition ${
                        currentStatus === 'Present'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Check size={12} /> Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(stu._id, 'Absent')}
                      className={`px-2.5 py-1 font-bold flex items-center gap-1 transition ${
                        currentStatus === 'Absent'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-l border-r border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <X size={12} /> Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(stu._id, 'Excused')}
                      className={`px-2.5 py-1 font-bold flex items-center gap-1 transition ${
                        currentStatus === 'Excused'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Clock size={12} /> Excused
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Remarks"
                    value={attendanceRecords[stu._id]?.remarks || ''}
                    onChange={(e) => handleRemarksChange(stu._id, e.target.value)}
                    className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-xs w-28"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-sm"
          >
            <CheckSquare size={14} />
            {submitting ? 'Saving Register...' : 'Save Attendance Register'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordAttendanceModal;
