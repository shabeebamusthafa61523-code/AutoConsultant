import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Modal from '../../components/Modal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import {
  getCourseFees,
  createCourseFee,
  updateCourseFee,
  deleteCourseFee
} from '../../services/courseFeeService';
import { getStudents, updateStudent } from '../../services/studentService';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Receipt,
  UserPlus,
  Eye,
  Users,
  CheckCircle2,
  X,
  RefreshCw,
  Phone,
  CreditCard,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const ServicesPage = () => {
  const navigate = useNavigate();
  const [courseFees, setCourseFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Service Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    feeId: '',
    service: '',
    courseFee: '',
    govtFee: '',
    notes: ''
  });

  // Assign Student Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningService, setAssigningService] = useState(null);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignModalError, setAssignModalError] = useState(null);

  // Success Confirmation Modal State
  const [assignSuccessData, setAssignSuccessData] = useState(null);

  // View Service Details Modal State
  const [viewingService, setViewingService] = useState(null);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [feeRes, stuRes] = await Promise.all([
        getCourseFees({ limit: 500 }),
        getStudents({ limit: 500 })
      ]);

      const feeList = Array.isArray(feeRes) ? feeRes : (feeRes?.data || []);
      const stuList = stuRes && stuRes.students ? stuRes.students : (Array.isArray(stuRes) ? stuRes : []);

      setCourseFees(feeList);
      setStudents(stuList);
    } catch (err) {
      console.error('Error fetching services & students:', err);
      setError(err.message || 'Failed to load course services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map enrolled students count and candidates by service name
  const studentsByService = useMemo(() => {
    const map = {};
    courseFees.forEach((fee) => {
      const serviceName = fee.service?.trim().toLowerCase();
      map[fee._id] = students.filter((st) => {
        const pkg = st.coursePackage?.trim().toLowerCase() || '';
        return pkg === serviceName || (serviceName && pkg.includes(serviceName)) || (pkg && serviceName.includes(pkg));
      });
    });
    return map;
  }, [courseFees, students]);

  // Filtered Course Fees
  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return courseFees;
    const term = searchTerm.toLowerCase();
    return courseFees.filter(
      (f) =>
        f.service?.toLowerCase().includes(term) ||
        f.feeId?.toLowerCase().includes(term) ||
        f.notes?.toLowerCase().includes(term)
    );
  }, [courseFees, searchTerm]);

  // Open Add Service Modal
  const handleOpenAddModal = () => {
    setEditingFee(null);
    setFormData({
      feeId: `CF-${String(courseFees.length + 1).padStart(3, '0')}`,
      service: '',
      courseFee: '',
      govtFee: '',
      notes: ''
    });
    setModalOpen(true);
  };

  // Open Edit Service Modal
  const handleOpenEditModal = (feeItem) => {
    setEditingFee(feeItem);
    setFormData({
      feeId: feeItem.feeId || '',
      service: feeItem.service || '',
      courseFee: feeItem.courseFee !== undefined ? feeItem.courseFee : '',
      govtFee: feeItem.govtFee !== undefined ? feeItem.govtFee : '',
      notes: feeItem.notes || ''
    });
    setModalOpen(true);
  };

  // Open Assign Student Modal for a specific service
  const handleOpenAssignModal = (serviceItem = null) => {
    setAssigningService(serviceItem);
    setAssignStudentId('');
    setAssignModalError(null);
    setAssignModalOpen(true);
  };

  // Open View Service Details Modal
  const handleOpenViewModal = (serviceItem) => {
    setViewingService(serviceItem);
  };

  // Save Service Record
  const handleSubmitService = async (e) => {
    e.preventDefault();
    if (!formData.service || formData.service.trim() === '') {
      alert('Please enter a valid service package name.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        courseFee: Number(formData.courseFee) || 0,
        govtFee: Number(formData.govtFee) || 0
      };

      if (editingFee) {
        await updateCourseFee(editingFee._id, payload);
      } else {
        await createCourseFee(payload);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save course service.');
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Student to Selected Service (Replaced browser alert with confirmation modal)
  const handleAssignStudent = async (e) => {
    e.preventDefault();
    setAssignModalError(null);

    if (!assignStudentId) {
      setAssignModalError('Please select a candidate to assign.');
      return;
    }

    const selService = assigningService || courseFees[0];
    if (!selService) {
      setAssignModalError('Please choose a valid course service package.');
      return;
    }

    const selCandidate = students.find((s) => s._id === assignStudentId);
    if (!selCandidate) {
      setAssignModalError('Selected candidate not found.');
      return;
    }

    try {
      setAssigning(true);
      const targetTotalFee = (Number(selService.courseFee) || 0) + (Number(selService.govtFee) || 0) || selService.totalFee;

      await updateStudent(assignStudentId, {
        coursePackage: selService.service,
        totalFee: targetTotalFee
      });

      await fetchData();
      setAssignModalOpen(false);

      // Open Success Confirmation Modal instead of browser alert
      setAssignSuccessData({
        studentId: selCandidate._id,
        studentName: selCandidate.fullName,
        studentCode: selCandidate.studentId,
        serviceName: selService.service,
        totalFee: targetTotalFee
      });
    } catch (err) {
      console.error('Error assigning student to service:', err);
      setAssignModalError(err.message || 'Failed to assign student to service.');
    } finally {
      setAssigning(false);
    }
  };

  // Delete Service Confirm
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCourseFee(deleteTarget._id);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete service.');
    } finally {
      setDeleting(false);
    }
  };

  const computedTotal = (Number(formData.courseFee) || 0) + (Number(formData.govtFee) || 0);

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <Navbar title="Services & Course Packages" />

        {/* Top Control Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-6 w-6 text-red-600" />
              Course Services & Packages
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage driving school service packages, fee structures, and view candidate enrolment breakdown.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search service name / fee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:text-red-600 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              title="Refresh Services"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => handleOpenAssignModal(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Assign Candidate</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Services Cards / Grid View */}
        {loading ? (
          <div className="p-12 flex justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <LoadingSpinner message="Loading services & course packages..." />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            No course services found. Click <strong>+ Add Service</strong> to create your first package.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map((serviceItem) => {
              const enrolled = studentsByService[serviceItem._id] || [];
              const courseFeeNum = Number(serviceItem.courseFee) || 0;
              const govtFeeNum = Number(serviceItem.govtFee) || 0;
              const totalFeeNum = Number(serviceItem.totalFee) || (courseFeeNum + govtFeeNum);

              return (
                <div
                  key={serviceItem._id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                        {serviceItem.feeId || 'CF-001'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
                        {enrolled.length} Candidates Enrolled
                      </span>
                    </div>

                    <div>
                      <h3
                        onClick={() => handleOpenViewModal(serviceItem)}
                        className="text-base font-extrabold text-slate-900 dark:text-white cursor-pointer hover:text-red-600 transition"
                      >
                        {serviceItem.service}
                      </h3>
                      {serviceItem.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {serviceItem.notes}
                        </p>
                      )}
                    </div>

                    {/* Fee Breakdown */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Course Fee:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{courseFeeNum.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Govt Fee:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{govtFeeNum.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>Total Package Fee:</span>
                        <span className="text-sm font-black text-red-600 dark:text-red-400">₹{totalFeeNum.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenViewModal(serviceItem)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-red-600 transition"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details ({enrolled.length})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenAssignModal(serviceItem)}
                        title="Assign Candidate to Service"
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(serviceItem)}
                        title="Edit Service"
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setDeleteTarget(serviceItem)}
                        title="Delete Service"
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SERVICE DETAILS & ENROLLED STUDENTS MODAL */}
        {viewingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {viewingService.feeId}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {viewingService.service}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Service Package Details & Enrolled Candidates Roster
                  </p>
                </div>
                <button
                  onClick={() => setViewingService(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Service Details Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Course Fee</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">₹{Number(viewingService.courseFee).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Govt Fee</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">₹{Number(viewingService.govtFee).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Package Fee</span>
                  <span className="font-black text-red-600 dark:text-red-400 text-sm">₹{Number(viewingService.totalFee || ((Number(viewingService.courseFee)||0)+(Number(viewingService.govtFee)||0))).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Enrolled Candidates Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    Enrolled Candidates ({(studentsByService[viewingService._id] || []).length})
                  </h4>
                  <button
                    onClick={() => {
                      const s = viewingService;
                      setViewingService(null);
                      handleOpenAssignModal(s);
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Assign Candidate</span>
                  </button>
                </div>

                {/* Candidate Roster Table */}
                {(studentsByService[viewingService._id] || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl">
                    No candidates currently enrolled in this package. Click <strong>Assign Candidate</strong> to enrol a student.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          <th className="py-2.5 px-3">Candidate</th>
                          <th className="py-2.5 px-3">Primary Mobile</th>
                          <th className="py-2.5 px-3">Paid (₹)</th>
                          <th className="py-2.5 px-3">Balance (₹)</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {(studentsByService[viewingService._id] || []).map((st) => {
                          const balance = (st.totalFee || 0) - (st.paidAmount || 0) - (st.advanceAmount || 0);
                          return (
                            <tr key={st._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{st.fullName}</div>
                                <div className="text-[10px] text-slate-400">{st.studentId}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">{st.primaryMobile}</td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">₹{(st.paidAmount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-bold">
                                {balance > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400">₹{balance.toLocaleString('en-IN')}</span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">Paid</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => { setViewingService(null); navigate(`/students/${st._id}`); }}
                                  className="p-1 text-slate-600 hover:text-red-600 rounded transition"
                                  title="View Candidate Profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setViewingService(null)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 transition text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN CANDIDATE TO SERVICE MODAL */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign Candidate to Service
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enrol a student directly into a course package.
                  </p>
                </div>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {assignModalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
                  {assignModalError}
                </div>
              )}

              <form onSubmit={handleAssignStudent} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Target Service Package <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={assigningService ? assigningService._id : ''}
                    onChange={(e) => {
                      const sel = courseFees.find((f) => f._id === e.target.value);
                      setAssigningService(sel);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose Service Package --</option>
                    {courseFees.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.service} (₹{Number(f.totalFee || ((Number(f.courseFee)||0)+(Number(f.govtFee)||0))).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Candidate to Enrol <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Choose Candidate --</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.fullName} ({s.studentId}) • {s.primaryMobile}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-5 py-2 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
                  >
                    {assigning ? 'Assigning...' : 'Assign Candidate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL (Replaces browser alert) */}
        {assignSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="mx-auto w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Candidate Enrolled Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Candidate <strong>{assignSuccessData.studentName}</strong> ({assignSuccessData.studentCode}) has been successfully assigned to the service package.
                </p>
              </div>

              {/* Service Details Highlight Card */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs space-y-1">
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                  Assigned Service Package
                </div>
                <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {assignSuccessData.serviceName}
                </div>
                <div className="font-black text-emerald-700 dark:text-emerald-300 text-xs">
                  Package Fee: ₹{assignSuccessData.totalFee.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const sid = assignSuccessData.studentId;
                    setAssignSuccessData(null);
                    navigate(`/students/${sid}`);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Candidate Profile</span>
                </button>
                <button
                  onClick={() => setAssignSuccessData(null)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD / EDIT SERVICE MODAL */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingFee ? 'Edit Course Service Package' : 'Add New Course Service Package'}
        >
          <form onSubmit={handleSubmitService} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Service Fee ID
              </label>
              <input
                type="text"
                value={formData.feeId}
                onChange={(e) => setFormData({ ...formData, feeId: e.target.value })}
                placeholder="e.g. CF-001"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Service Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="e.g. LMV + MCWG (Fresh Licence)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Course Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.courseFee}
                  onChange={(e) => setFormData({ ...formData, courseFee: e.target.value })}
                  placeholder="e.g. 7000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Govt Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.govtFee}
                  onChange={(e) => setFormData({ ...formData, govtFee: e.target.value })}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md flex justify-between items-center font-bold">
              <span>Total Package Fee:</span>
              <span className="text-sm text-red-600 font-black">₹{computedTotal.toLocaleString('en-IN')}</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notes & Description
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold shadow-xs"
              >
                {submitting ? 'Saving...' : editingFee ? 'Update Service' : 'Save Service'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
          loading={deleting}
          title="Delete Course Service"
          message={`Are you sure you want to delete the course service "${deleteTarget?.service}"?`}
        />
      </div>
    </MainLayout>
  );
};

export default ServicesPage;
