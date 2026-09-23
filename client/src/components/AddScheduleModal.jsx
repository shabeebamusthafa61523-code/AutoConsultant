import React, { useState } from 'react';
import Modal from './Modal';
import { CalendarPlus, AlertCircle } from 'lucide-react';

const AddScheduleModal = ({
  isOpen,
  onClose,
  batch,
  students = [],
  onAddSchedule
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    timeSlot: batch ? `${batch.startTime || '07:00 AM'} - ${batch.endTime || '08:30 AM'}` : '07:00 AM - 08:30 AM',
    classType: 'Road & H',
    instructor: batch?.instructor || 'Jasim',
    vehicleNo: batch?.vehicleNo || 'KL-01-AB-1234',
    studentIds: students.map(s => s._id),
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!batch) return null;

  const toggleStudent = (stuId) => {
    setFormData(prev => {
      const exists = prev.studentIds.includes(stuId);
      return {
        ...prev,
        studentIds: exists
          ? prev.studentIds.filter(id => id !== stuId)
          : [...prev.studentIds, stuId]
      };
    });
  };

  const selectAll = () => {
    setFormData(prev => ({
      ...prev,
      studentIds: students.map(s => s._id)
    }));
  };

  const deselectAll = () => {
    setFormData(prev => ({
      ...prev,
      studentIds: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date) {
      setError('Schedule Date is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const dayName = new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long' });
      await onAddSchedule({
        ...formData,
        day: dayName
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule class.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Driving Class: ${batch.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-slate-800 dark:text-slate-100">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 p-2.5 rounded-md text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Time Slot *</label>
            <input
              type="text"
              required
              value={formData.timeSlot}
              onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
              placeholder="e.g. 07:00 AM - 08:30 AM"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class Type *</label>
            <select
              value={formData.classType}
              onChange={(e) => setFormData({ ...formData, classType: e.target.value })}
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
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              placeholder="Instructor Name"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle No.</label>
            <input
              type="text"
              value={formData.vehicleNo}
              onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
              placeholder="e.g. KL-01-AB-1234"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium font-mono"
            />
          </div>
        </div>

        {/* Assigned Candidates */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Students for this Session ({formData.studentIds.length} / {students.length})
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-red-600 dark:text-red-400 hover:underline font-bold"
              >
                Select All
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-slate-500 dark:text-slate-400 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            {students.map((stu) => {
              const isChecked = formData.studentIds.includes(stu._id);
              return (
                <label
                  key={stu._id}
                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition text-xs ${
                    isChecked ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleStudent(stu._id)}
                    className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="truncate">{stu.fullName}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Special Remarks / Lesson Focus</label>
          <input
            type="text"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="e.g. Reverse 'H' parking drill, slope test preparation"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-xs font-medium"
          />
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
            <CalendarPlus size={14} />
            {submitting ? 'Scheduling...' : 'Save to Schedule Roster'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddScheduleModal;
