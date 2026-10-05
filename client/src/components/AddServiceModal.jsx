import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getCourseFees } from '../services/courseFeeService';
import { Layers, Plus, CreditCard, AlertCircle } from 'lucide-react';

const AddServiceModal = ({
  isOpen,
  onClose,
  student,
  onServiceAdded
}) => {
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [serviceFee, setServiceFee] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchServices = async () => {
        try {
          const res = await getCourseFees({ limit: 500 });
          const list = Array.isArray(res) ? res : (res?.data || []);
          setAvailableServices(list);
        } catch (err) {
          console.error('Failed to load course fees:', err);
        }
      };
      fetchServices();
      setSelectedService('');
      setServiceFee(0);
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const currentTotalFee = Number(student.totalFee) || 9000;
  const currentPaid = Number(student.paidAmount) || 0;
  const currentAdv = Number(student.advanceAmount) || 0;
  const addedFeeNum = Number(serviceFee) || 0;

  const newTotalFee = currentTotalFee + addedFeeNum;
  const newBalance = newTotalFee - currentPaid - currentAdv;

  const handleServiceChange = (e) => {
    const val = e.target.value;
    setSelectedService(val);
    const matched = availableServices.find(s => s.service === val);
    if (matched && matched.totalFee) {
      setServiceFee(matched.totalFee);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedService.trim()) {
      setError('Please select or enter a service name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onServiceAdded({
        studentId: student._id,
        service: selectedService.trim(),
        fee: addedFeeNum,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add extra service.');
    } fontFinally: {
      setLoading(false);
    }
  };

  const existingServicesList = Array.isArray(student.services) && student.services.length > 0
    ? student.services
    : (student.licenceServiceType ? student.licenceServiceType.split(',').map(s => s.trim()).filter(Boolean) : []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Service to Student Record"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Student Context Header */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{student.fullName}</span>
            <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200">
              {student.studentId}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 pt-1">
            <span className="font-semibold">Current Services:</span>
            {existingServicesList.length > 0 ? (
              existingServicesList.map((s, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                  {s}
                </span>
              ))
            ) : (
              <span className="italic">None assigned</span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Service Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Select Service Package to Add
          </label>
          <select
            value={selectedService}
            onChange={handleServiceChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-semibold focus:ring-2 focus:ring-red-500"
          >
            <option value="">-- Select Official 2026 BENZ Service --</option>
            {availableServices.map((s) => (
              <option key={s._id || s.feeId} value={s.service}>
                {s.service} (₹{s.totalFee ? s.totalFee.toLocaleString('en-IN') : '0'})
              </option>
            ))}
          </select>
        </div>

        {/* Custom Service Input if needed */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Or Enter Custom Service Name
          </label>
          <input
            type="text"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            placeholder="e.g. Re-test (Road), International Licence, Medical Certificate"
            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
          />
        </div>

        {/* Added Service Fee Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Service Fee Amount to Add (₹)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={serviceFee}
            onChange={(e) => setServiceFee(e.target.value)}
            placeholder="e.g. 1500"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-sm font-black focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Fee Addition Breakdown Box (current + added fee) */}
        <div className="p-3.5 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-lg space-y-2 font-mono">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Current Total Fee:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">₹{currentTotalFee.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
            <span>+ Added Service Fee:</span>
            <span>+ ₹{addedFeeNum.toLocaleString('en-IN')}</span>
          </div>
          <div className="pt-1.5 border-t border-red-200 dark:border-red-800 flex items-center justify-between text-sm">
            <span className="font-black text-slate-900 dark:text-slate-100">New Combined Total Fee:</span>
            <span className="font-black text-red-600 dark:text-red-400 text-base">
              ₹{newTotalFee.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>New Balance Due:</span>
            <span className={`font-bold ${newBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
              ₹{newBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Remarks / Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Added for road test retry"
            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedService}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-md transition shadow-md flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>{loading ? 'Adding...' : `Add Service (+₹${addedFeeNum.toLocaleString('en-IN')})`}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddServiceModal;
