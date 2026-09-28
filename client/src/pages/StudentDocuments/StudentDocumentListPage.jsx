import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import {
  getStudentDocuments,
  createStudentDocument,
  verifyStudentDocument,
  rejectStudentDocument,
  deleteStudentDocument
} from '../../services/studentDocumentService';
import { getStudents } from '../../services/studentService';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  FileText,
  UserCheck,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

const StudentDocumentListPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [students, setStudents] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ total: 0, pending: 0, submitted: 0, verified: 0, rejected: 0, expired: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');

  // Submit / Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    student: '',
    documentType: 'Aadhaar / ID',
    documentNumber: '',
    remarks: '',
    expiryDate: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Verify Modal
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Reject Modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pageToLoad,
        limit: 15
      };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;
      if (selectedDocType) params.documentType = selectedDocType;

      const [res, stuRes] = await Promise.all([
        getStudentDocuments(params),
        students.length === 0 ? getStudents({ limit: 100 }) : Promise.resolve({ students })
      ]);

      if (res && res.documents) {
        setDocuments(res.documents);
        setPagination(res.pagination || { page: pageToLoad, limit: 15, total: res.documents.length, totalPages: 1 });
        if (res.statusCounts) setStatusCounts(res.statusCounts);
      } else {
        setDocuments([]);
      }

      if (students.length === 0 && stuRes?.students) {
        setStudents(stuRes.students);
      }
    } catch (err) {
      setError(err.message || 'Failed to load student documents');
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedDocType, students]);

  useEffect(() => {
    fetchDocuments(1);
  }, [fetchDocuments]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocuments(1);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.student) {
      alert('Please select a student');
      return;
    }

    try {
      setUploadSubmitting(true);
      const data = new FormData();
      data.append('student', uploadForm.student);
      data.append('documentType', uploadForm.documentType);
      if (uploadForm.documentNumber) data.append('documentNumber', uploadForm.documentNumber);
      if (uploadForm.remarks) data.append('remarks', uploadForm.remarks);
      if (uploadForm.expiryDate) data.append('expiryDate', uploadForm.expiryDate);
      if (selectedFile) data.append('file', selectedFile);

      await createStudentDocument(data);
      setUploadModalOpen(false);
      setUploadForm({ student: '', documentType: 'Aadhaar / ID', documentNumber: '', remarks: '', expiryDate: '' });
      setSelectedFile(null);
      fetchDocuments(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to submit document');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleConfirmVerify = async () => {
    if (!verifyTarget) return;
    try {
      setVerifying(true);
      await verifyStudentDocument(verifyTarget._id, { remarks: verifyRemarks });
      setVerifyTarget(null);
      setVerifyRemarks('');
      fetchDocuments(pagination.page);
    } catch (err) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      setRejecting(true);
      await rejectStudentDocument(rejectTarget._id, {
        rejectionReason: rejectionReason.trim(),
        remarks: rejectRemarks
      });
      setRejectTarget(null);
      setRejectionReason('');
      setRejectRemarks('');
      fetchDocuments(pagination.page);
    } catch (err) {
      alert(err.message || 'Rejection failed');
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteStudentDocument(deleteTarget._id);
      setDeleteTarget(null);
      fetchDocuments(pagination.page);
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Document & ID',
      accessor: 'documentType',
      cell: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileText size={15} className="text-red-600" />
            <span>{row.documentType}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
            <span>{row.documentId}</span>
            {row.documentNumber && (
              <>
                <span>•</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{row.documentNumber}</span>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Candidate / Student',
      accessor: 'student',
      cell: (row) => (
        <div>
          <button
            onClick={() => navigate(`/students/${row.student?._id}`)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 text-left transition"
          >
            {row.student?.fullName || 'Unknown Student'}
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {row.student?.studentId} • {row.student?.primaryMobile}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <Badge value={row.status} />
    },
    {
      header: 'Audit & Verification',
      accessor: 'verifiedDate',
      cell: (row) => (
        <div className="text-xs">
          {row.status === 'Verified' ? (
            <div className="text-emerald-700 dark:text-emerald-400 font-medium">
              Verified by {row.verifiedByName || row.verifiedBy?.name || 'Staff'}
              <div className="text-[10px] text-slate-400">
                {row.verifiedDate ? new Date(row.verifiedDate).toLocaleDateString() : ''}
              </div>
            </div>
          ) : row.status === 'Rejected' ? (
            <div className="text-rose-600 dark:text-rose-400 font-medium">
              Reason: {row.rejectionReason || 'Defective Document'}
            </div>
          ) : (
            <span className="text-slate-400 italic">Pending verification</span>
          )}
        </div>
      )
    },
    {
      header: 'Remarks',
      accessor: 'remarks',
      cell: (row) => <span className="text-xs text-slate-600 dark:text-slate-300">{row.remarks || '—'}</span>
    },
    {
      header: 'Actions',
      accessor: '_id',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status !== 'Verified' && (
            <button
              onClick={() => {
                setVerifyTarget(row);
                setVerifyRemarks(row.remarks || '');
              }}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
              title="Verify Document"
            >
              <CheckCircle size={16} />
            </button>
          )}

          {row.status !== 'Rejected' && (
            <button
              onClick={() => {
                setRejectTarget(row);
                setRejectionReason(row.rejectionReason || '');
                setRejectRemarks(row.remarks || '');
              }}
              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
              title="Reject Document"
            >
              <XCircle size={16} />
            </button>
          )}

          {row.fileUrl && (
            <a
              href={row.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
              title="View / Download Document"
            >
              <Download size={16} />
            </a>
          )}

          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
            title="Delete Record"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Student Document Management" subtitle="Verification pipeline, DDS-CHK-002 checklist readiness, and statutory document custody" />

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Uploaded"
            value={statusCounts.total || documents.length}
            icon={FileText}
            color="blue"
            description="Student submissions logged"
          />
          <StatCard
            title="Verified & Approved"
            value={statusCounts.verified}
            icon={CheckCircle}
            color="emerald"
            description="Ready for RTO submissions"
          />
          <StatCard
            title="Pending Verification"
            value={(statusCounts.pending || 0) + (statusCounts.submitted || 0)}
            icon={Clock}
            color="amber"
            description="Requires staff audit"
          />
          <StatCard
            title="Rejected Documents"
            value={statusCounts.rejected}
            icon={XCircle}
            color="red"
            description="Requires re-submission"
          />
        </div>

        {/* Action Header & Search */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate name, mobile, or document ID..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-slate-100"
            >
              <option value="">All Document Types</option>
              <option value="Aadhaar / ID">Aadhaar / ID</option>
              <option value="Photo">Passport Photo</option>
              <option value="Address Proof">Address Proof</option>
              <option value="Blood Group">Blood Group Certificate</option>
              <option value="Form 15">Form 15</option>
              <option value="Medical Certificate (Form 1A)">Medical Certificate (Form 1A)</option>
              <option value="SSLC / Age Proof">SSLC / Age Proof</option>
              <option value="Existing Licence">Existing Licence</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-md text-sm font-medium transition"
            >
              Filter
            </button>
          </form>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow-sm transition"
          >
            <Plus size={16} />
            <span>Submit Document</span>
          </button>
        </div>

        {/* Content Section */}
        {error && <ErrorMessage message={error} onRetry={() => fetchDocuments(1)} />}

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            title="No student documents found"
            description="Submit student records or adjust filters to view."
            actionLabel="Submit First Document"
            onAction={() => setUploadModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            <DataTable columns={columns} data={documents} />
            {pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPageChange={(p) => fetchDocuments(p)}
              />
            )}
          </div>
        )}
      </div>

      {/* Submit / Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Submit Student Document"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Student *
            </label>
            <select
              required
              value={uploadForm.student}
              onChange={(e) => setUploadForm({ ...uploadForm, student: e.target.value })}
              className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">-- Choose Candidate --</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.studentId} • {s.primaryMobile})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Document Type *
              </label>
              <select
                value={uploadForm.documentType}
                onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="Aadhaar / ID">Aadhaar / ID</option>
                <option value="Photo">Passport Photo</option>
                <option value="Address Proof">Address Proof</option>
                <option value="Blood Group">Blood Group Certificate</option>
                <option value="Form 15">Form 15</option>
                <option value="Medical Certificate (Form 1A)">Medical Certificate (Form 1A)</option>
                <option value="SSLC / Age Proof">SSLC / Age Proof</option>
                <option value="Existing Licence">Existing Licence</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Document Number / Ref
              </label>
              <input
                type="text"
                value={uploadForm.documentNumber}
                onChange={(e) => setUploadForm({ ...uploadForm, documentNumber: e.target.value })}
                placeholder="e.g. 12-digit Aadhaar / Serial"
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Upload File (PDF, JPG, PNG)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              className="w-full p-2 border rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Verification Remarks / Notes
            </label>
            <input
              type="text"
              value={uploadForm.remarks}
              onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
              placeholder="e.g. Verified against original Aadhaar card"
              className="w-full p-2 border rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow flex items-center gap-2"
            >
              {uploadSubmitting && <LoadingSpinner size="sm" />}
              <span>Submit Document</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Verify Confirmation Modal */}
      <Modal
        isOpen={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        title="Verify Student Document"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 dark:text-slate-300">
            Confirm verification for <strong>{verifyTarget?.documentType}</strong> belonging to{' '}
            <strong>{verifyTarget?.student?.fullName}</strong>.
          </p>
          <div>
            <label className="block font-bold mb-1">Verification Remarks</label>
            <input
              type="text"
              value={verifyRemarks}
              onChange={(e) => setVerifyRemarks(e.target.value)}
              placeholder="e.g. Scanned copy verified against physical original"
              className="w-full p-2 border rounded bg-white dark:bg-slate-900"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setVerifyTarget(null)}
              className="px-4 py-2 border rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmVerify}
              disabled={verifying}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow"
            >
              {verifying ? 'Verifying...' : 'Confirm Verification'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Document"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 dark:text-slate-300">
            Reject document <strong>{rejectTarget?.documentType}</strong> for candidate{' '}
            <strong>{rejectTarget?.student?.fullName}</strong>.
          </p>
          <div>
            <label className="block font-bold mb-1 text-red-600">Rejection Reason *</label>
            <input
              type="text"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Blurry photo, address does not match RTO jurisdiction"
              className="w-full p-2 border border-red-300 rounded bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Additional Staff Remarks</label>
            <input
              type="text"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="Instructions for student to re-submit"
              className="w-full p-2 border rounded bg-white dark:bg-slate-900"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="px-4 py-2 border rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={rejecting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold shadow"
            >
              {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Document Record"
        message={`Are you sure you want to delete this ${deleteTarget?.documentType} document? Student readiness indicators will be updated automatically.`}
      />
    </MainLayout>
  );
};

export default StudentDocumentListPage;
