import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  resolveComplaint,
  escalateComplaint,
  closeComplaint,
  reopenComplaint,
  addComplaintComment
} from '../../services/complaintService';
import API from '../../services/api';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Car,
  GraduationCap,
  Layers,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  UserCheck,
  Send,
  MessageSquare,
  History,
  ShieldAlert,
  Award,
  Check,
  RefreshCw,
  XCircle,
  ExternalLink
} from 'lucide-react';

const ComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === 'Admin' || user?.role === 'Superadmin';

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Users for assign modal
  const [usersList, setUsersList] = useState([]);

  // Modals state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState('In Progress');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState('Satisfied');
  const [escalatedTo, setEscalatedTo] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchComplaint = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getComplaintById(id);
      const data = res.data || res;
      setComplaint(data);
      setNewStatus(data.status);
      setAssigneeId(data.assignedTo?._id || data.assignedTo || '');
    } catch (err) {
      setError(err.message || 'Failed to fetch complaint details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get('/users');
        const data = res.data || res;
        setUsersList(Array.isArray(data) ? data : (data.users || []));
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Update Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await updateComplaintStatus(id, { status: newStatus, remarks: statusRemarks });
      setStatusModalOpen(false);
      setStatusRemarks('');
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Reassign
  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await assignComplaint(id, { assignedTo: assigneeId });
      setAssignModalOpen(false);
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to reassign');
    }
  };

  // Resolve
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      alert('Resolution notes are required.');
      return;
    }
    try {
      await resolveComplaint(id, {
        resolutionNotes,
        correctiveActionTaken: correctiveAction,
        satisfactionRating
      });
      setResolveModalOpen(false);
      setResolutionNotes('');
      setCorrectiveAction('');
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to resolve complaint');
    }
  };

  // Escalate
  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim()) {
      alert('Escalation reason is required.');
      return;
    }
    try {
      await escalateComplaint(id, {
        escalatedTo: escalatedTo || null,
        escalationReason
      });
      setEscalateModalOpen(false);
      setEscalationReason('');
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to escalate complaint');
    }
  };

  // Close
  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close and archive this complaint?')) return;
    try {
      await closeComplaint(id, { remarks: 'Closed by user action' });
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to close complaint');
    }
  };

  // Reopen
  const handleReopen = async () => {
    const reason = window.prompt('Enter reason for reopening this complaint:');
    if (!reason || !reason.trim()) return;
    try {
      await reopenComplaint(id, { reason });
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to reopen complaint');
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setSubmittingComment(true);
      await addComplaintComment(id, { comment: newComment });
      setNewComment('');
      fetchComplaint();
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Complaint Details" />
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (error || !complaint) {
    return (
      <MainLayout>
        <Navbar title="Complaint Details" />
        <div className="p-6">
          <ErrorMessage message={error || 'Complaint not found'} onRetry={fetchComplaint} />
          <button
            onClick={() => navigate('/complaints')}
            className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded text-xs font-bold"
          >
            ← Back to Complaint List
          </button>
        </div>
      </MainLayout>
    );
  }

  const isOverdue = complaint.isOverdue || (complaint.status !== 'Resolved' && complaint.status !== 'Closed' && complaint.expectedResolutionDate && new Date(complaint.expectedResolutionDate) < new Date());

  return (
    <MainLayout>
      <Navbar
        title={`Complaint ${complaint.complaintId}`}
        subtitle="Full lifecycle investigation, root cause resolution, and audit trail"
      />

      <div className="p-6 space-y-6">
        {/* Navigation Breadcrumb & Quick Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/complaints')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Complaint Control Centre</span>
            </button>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100">
                {complaint.complaintId}
              </span>
              <span className="text-slate-400 font-light">&bull;</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {complaint.category}
              </span>
              <Badge value={complaint.status} />
              <Badge type="priority" value={complaint.priority} />
              {isOverdue && (
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 animate-pulse">
                  OVERDUE
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-bold transition"
            >
              <PlayCircle size={14} />
              <span>Change Status</span>
            </button>

            {isAdminOrSuper && (
              <button
                onClick={() => setAssignModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-bold transition"
              >
                <UserCheck size={14} />
                <span>Assign Staff</span>
              </button>
            )}

            {complaint.status !== 'Resolved' && complaint.status !== 'Closed' && (
              <>
                <button
                  onClick={() => setResolveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow transition"
                >
                  <CheckCircle size={14} />
                  <span>Resolve Issue</span>
                </button>
                <button
                  onClick={() => setEscalateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold shadow transition"
                >
                  <AlertTriangle size={14} />
                  <span>Escalate</span>
                </button>
              </>
            )}

            {complaint.status !== 'Closed' ? (
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                <XCircle size={14} />
                <span>Close</span>
              </button>
            ) : (
              <button
                onClick={handleReopen}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition"
              >
                <RefreshCw size={14} />
                <span>Reopen</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========================================================================= */}
          {/* LEFT 2 COLUMNS: PRIMARY DETAILS, RELATED ENTITIES & RESOLUTION */}
          {/* ========================================================================= */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Complainant Identity Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <User size={15} className="text-red-600" />
                <span>Complainant Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {complaint.complainantName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Contact Phone</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {complaint.complainantMobile || 'None provided'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Complainant Type</span>
                  <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold">
                    {complaint.complainantType}
                  </span>
                </div>
              </div>

              {/* Direct Link if Student */}
              {complaint.student && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Linked Student Profile: <strong>{complaint.student.fullName}</strong> ({complaint.student.studentId})
                  </span>
                  <Link
                    to={`/students/${complaint.student._id}`}
                    className="text-red-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View Student File</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}

              {/* Direct Link if Instructor */}
              {complaint.instructor && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Linked Instructor Profile: <strong>{complaint.instructor.name}</strong> ({complaint.instructor.instructorId})
                  </span>
                  <Link
                    to={`/instructors/${complaint.instructor._id}`}
                    className="text-red-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View Instructor File</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Detailed Complaint Description Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-600" />
                <span>Incident & Complaint Description</span>
              </h3>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                {complaint.description}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 text-slate-500 dark:text-slate-400">
                <div>
                  <span className="block text-[11px] text-slate-400">Date Received</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {new Date(complaint.complaintDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Source Channel</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {complaint.source}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Category</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {complaint.category}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Logged By</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {complaint.createdByName || 'Staff'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Related Operational Entities Card */}
            {(complaint.relatedStudent || complaint.relatedVehicle || complaint.relatedInstructor || complaint.relatedBatch) && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Layers size={15} className="text-blue-600" />
                  <span>Linked Operational Records</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {complaint.relatedStudent && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Related Student</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{complaint.relatedStudent.fullName}</span>
                        <p className="text-[11px] text-slate-400 font-mono">{complaint.relatedStudent.phone}</p>
                      </div>
                      <Link to={`/students/${complaint.relatedStudent._id}`} className="text-red-600 hover:text-red-700">
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  )}

                  {complaint.relatedVehicle && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Related Vehicle</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{complaint.relatedVehicle.vehicleNumber}</span>
                        <p className="text-[11px] text-slate-400">{complaint.relatedVehicle.brand} {complaint.relatedVehicle.model}</p>
                      </div>
                      <Link to={`/vehicles/${complaint.relatedVehicle._id}`} className="text-red-600 hover:text-red-700">
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  )}

                  {complaint.relatedInstructor && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Related Instructor</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{complaint.relatedInstructor.name}</span>
                        <p className="text-[11px] text-slate-400">{complaint.relatedInstructor.designation || 'Instructor'}</p>
                      </div>
                      <Link to={`/instructors/${complaint.relatedInstructor._id}`} className="text-red-600 hover:text-red-700">
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  )}

                  {complaint.relatedBatch && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Related Batch</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{complaint.relatedBatch.batchName || complaint.relatedBatch.name}</span>
                        <p className="text-[11px] text-slate-400">{complaint.relatedBatch.session} Session</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Resolution & Corrective Action Card (if resolved) */}
            {complaint.status === 'Resolved' && complaint.resolution && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>Resolution Record & Corrective Action (CAPA)</span>
                  </h3>
                  <Badge value="Resolved" />
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded border border-emerald-100 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200 text-xs space-y-2">
                  <p><strong>Resolution Summary:</strong> {complaint.resolution.resolutionNotes}</p>
                  {complaint.resolution.correctiveActionTaken && (
                    <p><strong>Corrective Action (CAPA):</strong> {complaint.resolution.correctiveActionTaken}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[11px] text-slate-400">Resolved By</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {complaint.resolution.resolvedByName || 'Staff'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Resolution Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {complaint.resolution.resolvedDate ? new Date(complaint.resolution.resolvedDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Customer Satisfaction</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {complaint.resolution.satisfactionRating || 'Satisfied'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Escalation Card (if escalated) */}
            {complaint.status === 'Escalated' && complaint.escalation && (
              <div className="bg-purple-50 dark:bg-purple-950/30 p-5 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>Management Escalation Notice</span>
                  </h3>
                  <Badge value="Escalated" />
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded border border-purple-100 dark:border-purple-900/60 text-slate-800 dark:text-slate-200 text-xs">
                  <p><strong>Reason:</strong> {complaint.escalation.escalationReason}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[11px] text-slate-400">Escalated To</span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {complaint.escalation.escalatedToName || 'Managing Director'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Escalated On</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {complaint.escalation.escalatedDate ? new Date(complaint.escalation.escalatedDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Internal Comments Section */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <MessageSquare size={15} className="text-red-600" />
                <span>Internal Staff Remarks & Notes ({complaint.comments?.length || 0})</span>
              </h3>

              {/* Comments List */}
              <div className="space-y-3">
                {complaint.comments && complaint.comments.length > 0 ? (
                  complaint.comments.map((c, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.createdByName}</span>
                        <span className="text-[11px] font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No internal remarks posted yet.</p>
                )}
              </div>

              {/* Post Comment Input */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add an internal note or investigation update..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-600"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-bold shadow transition"
                  >
                    <Send size={12} />
                    <span>Post Note</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: ASSIGNMENT & ACTIVITY AUDIT TIMELINE */}
          {/* ========================================================================= */}
          <div className="space-y-6">
            {/* Assignment & SLA Box */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Workflow & Ownership
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Assigned Officer</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {complaint.assignedToName || 'Unassigned'}
                    </span>
                    {isAdminOrSuper && (
                      <button
                        onClick={() => setAssignModalOpen(true)}
                        className="text-xs text-red-600 font-bold hover:underline"
                      >
                        Reassign
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block mb-0.5">Expected SLA Resolution Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {complaint.expectedResolutionDate
                      ? new Date(complaint.expectedResolutionDate).toLocaleDateString()
                      : 'None set'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block mb-0.5">SLA Target Status</span>
                  {complaint.status === 'Resolved' || complaint.status === 'Closed' ? (
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[11px]">
                      Resolved within SLA
                    </span>
                  ) : isOverdue ? (
                    <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded font-bold text-[11px] animate-pulse">
                      Past Due Date
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-bold text-[11px]">
                      Within Target Window
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Activity & History Audit Timeline */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <History size={15} className="text-red-600" />
                <span>Audit Activity History</span>
              </h3>

              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-2 space-y-4 text-xs">
                {complaint.activities && complaint.activities.length > 0 ? (
                  complaint.activities.slice().reverse().map((act, idx) => (
                    <div key={idx} className="relative pl-4">
                      {/* Timeline dot */}
                      <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-4 ring-white dark:ring-slate-800" />

                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{act.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{act.details}</p>
                        <span className="text-[10px] text-slate-400">
                          By: {act.performedByName} ({act.performedByRole}) &bull; {new Date(act.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic pl-4">No activity history recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CHANGE STATUS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Complaint Lifecycle Status"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded font-bold"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Note / Remarks</label>
            <textarea
              rows={2}
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              placeholder="Provide reason or context for this transition..."
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
            >
              Save Status
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: REASSIGN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Reassign Responsible Staff"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssign} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded font-medium"
            >
              <option value="">-- Unassigned --</option>
              {usersList.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
            >
              Confirm Reassignment
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: RESOLVE COMPLAINT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Complete Complaint Resolution"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleResolve} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolution Summary *</label>
            <textarea
              required
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe the solution provided and agreement with the customer..."
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Corrective Action Taken (CAPA)</label>
            <input
              type="text"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="e.g. Schedule adjustment, instructor counseling, vehicle repair"
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Satisfaction</label>
            <select
              value={satisfactionRating}
              onChange={(e) => setSatisfactionRating(e.target.value)}
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
            >
              <option value="Satisfied">Satisfied</option>
              <option value="Neutral">Neutral</option>
              <option value="Unsatisfied">Unsatisfied</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResolveModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded"
            >
              Save Resolution
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ESCALATE COMPLAINT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={escalateModalOpen}
        onClose={() => setEscalateModalOpen(false)}
        title="Escalate to Executive Management"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEscalate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Escalate To</label>
            <select
              value={escalatedTo}
              onChange={(e) => setEscalatedTo(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
            >
              <option value="">Managing Director / Board</option>
              {usersList.filter(u => u.role === 'Superadmin' || u.role === 'Admin').map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Escalation Reason *</label>
            <textarea
              required
              rows={3}
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="State why normal resolution is inadequate and management intervention is required..."
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEscalateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded"
            >
              Confirm Escalation
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default ComplaintDetailPage;
