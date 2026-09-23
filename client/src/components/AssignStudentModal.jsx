import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getStudents } from '../services/studentService';
import { UserPlus, Search, AlertCircle } from 'lucide-react';

const AssignStudentModal = ({
  isOpen,
  onClose,
  batchId,
  batchName,
  currentStudentIds = [],
  onAssignSuccess
}) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleStudents();
    }
  }, [isOpen]);

  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch active students
      const res = await getStudents({ limit: 'all', status: 'Active' });
      const list = Array.isArray(res) ? res : (res?.students || []);
      // Filter out students already in this batch
      const eligible = list.filter(s => !currentStudentIds.includes(String(s._id)));
      setStudents(eligible);
    } catch (err) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.fullName && s.fullName.toLowerCase().includes(term)) ||
      (s.studentId && s.studentId.toLowerCase().includes(term)) ||
      (s.primaryMobile && s.primaryMobile.includes(term))
    );
  });

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError('Please select a student to assign.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAssignSuccess(selectedStudentId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign student to batch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Student to ${batchName}`}>
      <form onSubmit={handleAssign} className="space-y-4 text-slate-800 dark:text-slate-100">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 p-2.5 rounded-md text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Search in Eligible Students */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search eligible candidates by name, mobile, or ID..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Students Selection List */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Choose Student ({filteredStudents.length} available) *
          </label>
          <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {loading ? (
              <p className="p-4 text-center text-xs text-slate-400">Loading candidates...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No available students found matching search.</p>
            ) : (
              filteredStudents.map((s) => (
                <label
                  key={s._id}
                  className={`flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition ${
                    selectedStudentId === s._id ? 'bg-red-50/70 dark:bg-red-950/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="selectedStudent"
                      value={s._id}
                      checked={selectedStudentId === s._id}
                      onChange={() => setSelectedStudentId(s._id)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.fullName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {s.studentId} &bull; {s.primaryMobile}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {s.vehicleType}
                    </span>
                    {s.batch && (
                      <p className="text-[10px] text-amber-600 mt-0.5">Currently in {s.batch.name || 'another batch'}</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
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
            disabled={submitting || !selectedStudentId}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={14} />
            {submitting ? 'Assigning...' : 'Assign to Batch'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignStudentModal;
