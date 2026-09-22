import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { getClasses, createClass, updateClass, deleteClass } from '../../services/classService';
import { getStudents } from '../../services/studentService';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';

const ClassListPage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedStudent, setSelectedStudent] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student: '',
    classDate: new Date().toISOString().split('T')[0],
    instructor: 'Instructor',
    vehicleNo: 'KL-01-AB-1234',
    trainingType: 'Practical Driving',
    km: 10,
    hours: 1,
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedStudent) params.student = selectedStudent;
      if (filterDate) params.date = filterDate;

      const [classRes, stuRes] = await Promise.all([
        getClasses(params),
        getStudents()
      ]);

      setClasses(classRes || []);
      setStudents(stuRes || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch class records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStudent, filterDate]);

  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormData({
      student: students[0]?._id || '',
      classDate: new Date().toISOString().split('T')[0],
      instructor: 'Instructor',
      vehicleNo: 'KL-01-AB-1234',
      trainingType: 'Practical Driving',
      km: 10,
      hours: 1,
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      student: classItem.student?._id || classItem.student || '',
      classDate: classItem.classDate ? new Date(classItem.classDate).toISOString().split('T')[0] : '',
      instructor: classItem.instructor || '',
      vehicleNo: classItem.vehicleNo || '',
      trainingType: classItem.trainingType || 'Practical Driving',
      km: classItem.km || 0,
      hours: classItem.hours || 1,
      notes: classItem.notes || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student) {
      alert('Please select a student.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        km: Number(formData.km) || 0,
        hours: Number(formData.hours) || 1
      };

      if (editingClass) {
        await updateClass(editingClass._id, payload);
      } else {
        await createClass(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save class record');
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
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete class record');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.student?.fullName || 'N/A'}</p>
          <p className="text-xs text-slate-400">{row.student?.studentId} &bull; {row.student?.primaryMobile}</p>
        </div>
      )
    },
    {
      header: 'Class Date',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {new Date(row.classDate).toLocaleDateString()}
        </span>
      )
    },
    { header: 'Instructor', accessor: 'instructor' },
    {
      header: 'Vehicle No.',
      cell: (row) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.vehicleNo}</span>
    },
    {
      header: 'Training Type',
      cell: (row) => <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">{row.trainingType}</span>
    },
    { header: 'KM', cell: (row) => `${row.km} KM` },
    { header: 'Hours', cell: (row) => `${row.hours} hr(s)` },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Daily Classes & Sessions" />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {/* Student Filter */}
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 flex-1 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Students</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.studentId} - {s.fullName}</option>
              ))}
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-md transition flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus size={18} />
            Add Class Record
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Fetching class records from MongoDB..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
        ) : classes.length === 0 ? (
          <EmptyState
            title="No class records found"
            description={selectedStudent || filterDate ? "No classes match your search filter." : "No driving classes scheduled yet."}
            actionButton={
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-md transition inline-flex items-center gap-1.5"
              >
                <Plus size={18} />
                + Add Class Record
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={classes}
            emptyMessage="No classes found."
          />
        )}
      </div>

      {/* ADD / EDIT CLASS MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingClass ? 'Edit Class Record' : 'Schedule New Class'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Student *</label>
            <select
              required
              value={formData.student}
              onChange={(e) => setFormData({ ...formData, student: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Student from MongoDB --</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.studentId} - {s.fullName} ({s.primaryMobile})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Class Date *</label>
              <input
                type="date"
                required
                value={formData.classDate}
                onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Instructor</label>
              <input
                type="text"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="Instructor Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle No.</label>
              <input
                type="text"
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                placeholder="KL-01-AB-1234"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Training Type</label>
              <select
                value={formData.trainingType}
                onChange={(e) => setFormData({ ...formData, trainingType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="Practical Driving">Practical Driving</option>
                <option value="Simulator">Simulator</option>
                <option value="Theory / Rules">Theory / Rules</option>
                <option value="Reverse Parking">Reverse Parking</option>
                <option value="Track Driving">Track Driving</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">KM Driven</label>
              <input
                type="number"
                min="0"
                value={formData.km}
                onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (Hours)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Reverse parking practice"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md"
            >
              {submitting ? 'Saving...' : editingClass ? 'Update Class' : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        message="Are you sure you want to delete this class record?"
      />
    </MainLayout>
  );
};

export default ClassListPage;
