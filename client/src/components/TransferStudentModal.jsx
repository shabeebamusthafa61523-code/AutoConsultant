import React, { useState } from 'react';
import Modal from './Modal';
import { ArrowRight, Layers, AlertCircle } from 'lucide-react';

const TransferStudentModal = ({
  isOpen,
  onClose,
  student,
  batches = [],
  currentBatchId,
  onTransferSuccess
}) => {
  const [targetBatchId, setTargetBatchId] = useState('');
  const [reason, setReason] = useState('Schedule adjustment requested by student');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!student) return null;

  const availableBatches = batches.filter(b => String(b._id) !== String(currentBatchId || student.batch?._id || student.batch || ''));

  const selectedBatchObj = availableBatches.find(b => b._id === targetBatchId);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!targetBatchId) {
      setError('Please select a target batch.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onTransferSuccess({
        studentId: student._id,
        targetBatchId,
        reason
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to transfer student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Transfer Batch: ${student.fullName}`}>
      <form onSubmit={handleTransfer} className="space-y-4 text-slate-800 dark:text-slate-100">
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Student ID:</span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">{student.studentId}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Current Batch:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {student.batch?.name || 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Vehicle / Course:</span>
            <span className="font-semibold">{student.vehicleType} &bull; {student.licenceCategory || 'LMV'}</span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 p-2.5 rounded-md text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Select Destination Batch *
          </label>
          <select
            required
            value={targetBatchId}
            onChange={(e) => setTargetBatchId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm font-medium focus:ring-2 focus:ring-red-500"
          >
            <option value="">-- Choose New Batch --</option>
            {availableBatches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.session || 'Session'} | {b.startTime}-{b.endTime} | {b.instructor})
              </option>
            ))}
          </select>
        </div>

        {selectedBatchObj && (
          <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-md text-xs space-y-1">
            <p className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <Layers size={14} /> New Batch Details:
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Timings:</strong> {selectedBatchObj.startTime} - {selectedBatchObj.endTime} ({selectedBatchObj.session})
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              <strong>Instructor:</strong> {selectedBatchObj.instructor || 'Unassigned'}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Transfer Reason / Audit Remark *
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Preferred morning section, timing conflict, retest preparation"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md text-sm focus:ring-2 focus:ring-red-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            All historical attendance, class logs, and fee records remain permanently preserved.
          </p>
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
            <ArrowRight size={14} />
            {submitting ? 'Transferring...' : 'Confirm Batch Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferStudentModal;
