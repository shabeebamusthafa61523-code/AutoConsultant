import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import {
  getInstructorProfile,
  addInstructorCertification,
  addInstructorDocument
} from '../../services/instructorService';
import {
  ArrowLeft,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Car,
  Layers,
  Users,
  Award,
  FileCheck,
  Plus,
  ShieldCheck,
  Phone,
  FileText
} from 'lucide-react';

const InstructorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Certification Modal
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certForm, setCertForm] = useState({
    trainingName: '',
    certificateNo: '',
    issueDate: '',
    validity: '',
    remarks: ''
  });
  const [submittingCert, setSubmittingCert] = useState(false);

  // Document Modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    docType: 'Aadhaar',
    docNumber: '',
    status: 'Verified',
    issueDate: '',
    expiryDate: '',
    remarks: ''
  });
  const [submittingDoc, setSubmittingDoc] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInstructorProfile(id);
      setProfileData(data);
    } catch (err) {
      setError(err.message || 'Failed to load instructor profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleAddCert = async (e) => {
    e.preventDefault();
    try {
      setSubmittingCert(true);
      await addInstructorCertification(id, certForm);
      setCertModalOpen(false);
      setCertForm({ trainingName: '', certificateNo: '', issueDate: '', validity: '', remarks: '' });
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Failed to add certification');
    } finally {
      setSubmittingCert(false);
    }
  };

  const handleAddDoc = async (e) => {
    e.preventDefault();
    try {
      setSubmittingDoc(true);
      await addInstructorDocument(id, docForm);
      setDocModalOpen(false);
      setDocForm({ docType: 'Aadhaar', docNumber: '', status: 'Verified', issueDate: '', expiryDate: '', remarks: '' });
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Failed to add document');
    } finally {
      setSubmittingDoc(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Instructor Profile" />
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (error || !profileData) {
    return (
      <MainLayout>
        <Navbar title="Instructor Profile" />
        <div className="p-6">
          <ErrorMessage message={error || 'Instructor profile not found'} onRetry={fetchProfile} />
        </div>
      </MainLayout>
    );
  }

  const { instructor, batches, classes, vehicles, metrics } = profileData;

  const classColumns = [
    {
      header: 'Date',
      accessor: 'classDate',
      cell: (row) => new Date(row.classDate).toLocaleDateString()
    },
    {
      header: 'Student',
      accessor: 'student',
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {row.student?.fullName || 'Unknown Student'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {row.student?.studentId}
          </div>
        </div>
      )
    },
    {
      header: 'Training Type',
      accessor: 'trainingType',
      cell: (row) => <Badge type="class" value={row.trainingType} />
    },
    {
      header: 'Vehicle',
      accessor: 'vehicleNo',
      cell: (row) => <span className="font-mono text-xs">{row.vehicleNo || '—'}</span>
    },
    {
      header: 'KM',
      accessor: 'km',
      cell: (row) => <span className="font-bold">{row.km || 0} km</span>
    },
    {
      header: 'Hours',
      accessor: 'hours',
      cell: (row) => <span>{row.hours || 1} hr(s)</span>
    },
    {
      header: 'Notes',
      accessor: 'notes',
      cell: (row) => <span className="text-xs text-slate-500">{row.notes || '—'}</span>
    }
  ];

  const batchColumns = [
    {
      header: 'Batch Name',
      accessor: 'name',
      cell: (row) => (
        <button
          onClick={() => navigate(`/batches/${row._id}`)}
          className="font-bold text-slate-900 dark:text-slate-100 hover:text-red-600 text-left transition"
        >
          {row.name}
        </button>
      )
    },
    {
      header: 'Course Type',
      accessor: 'courseLicenceType'
    },
    {
      header: 'Session',
      accessor: 'session',
      cell: (row) => `${row.session} (${row.startTime} - ${row.endTime})`
    },
    {
      header: 'Vehicle',
      accessor: 'vehicleNo',
      cell: (row) => <span className="font-mono text-xs">{row.vehicleNo || 'Unassigned'}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <Badge value={row.status} />
    }
  ];

  return (
    <MainLayout>
      <Navbar title={instructor.name} subtitle={`Instructor Profile & Performance • ${instructor.instructorId}`} />

      <div className="p-6 space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/instructors')}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-600 transition shadow-sm"
              title="Back to Instructors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {instructor.name}
                </h1>
                <Badge value={instructor.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {instructor.designation} • {instructor.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCertModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-md text-xs font-bold transition shadow-sm"
            >
              <Plus size={14} />
              <span>Add Certification</span>
            </button>
            <button
              onClick={() => setDocModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition shadow-sm"
            >
              <Plus size={14} />
              <span>Add Staff Document</span>
            </button>
          </div>
        </div>

        {/* Operational Performance Stat Cards (From RAZAIN Operations Report & KPI Tracker) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Classes Conducted"
            value={metrics.totalClasses || 0}
            icon={CalendarCheck}
            color="red"
            description="Practical training logs"
          />
          <StatCard
            title="Students Trained"
            value={metrics.studentsTrained || 0}
            icon={Users}
            color="blue"
            description="Distinct candidates"
          />
          <StatCard
            title="Total Training KM"
            value={`${metrics.totalKm || 0} KM`}
            icon={Car}
            color="emerald"
            description="Road & track distance"
          />
          <StatCard
            title="Training Hours"
            value={`${metrics.totalHours || 0} Hrs`}
            icon={Clock}
            color="purple"
            description="Logged instruction time"
          />
        </div>

        {/* Profile Tabs Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex space-x-6 overflow-x-auto text-sm font-semibold">
            {[
              { id: 'overview', label: 'Credentials & Profile', icon: GraduationCap },
              { id: 'batches', label: `Batches (${batches.length})`, icon: Layers },
              { id: 'classes', label: `Classes Log (${classes.length})`, icon: CalendarCheck },
              { id: 'vehicles', label: `Assigned Fleet (${vehicles.length})`, icon: Car }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-bold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600 dark:text-red-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Overview & Credentials */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                Basic Information
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Instructor ID:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">{instructor.instructorId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Primary Mobile:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{instructor.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Emergency / Alternate Contact:</span>
                  <span className="text-slate-700 dark:text-slate-300">{instructor.emergencyContact || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Blood Group:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{instructor.bloodGroup || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Residential Place:</span>
                  <span className="text-slate-700 dark:text-slate-300">{instructor.address || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Joining Date:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {instructor.joiningDate ? new Date(instructor.joiningDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Operational Notes:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 italic">{instructor.notes || 'No notes added.'}</p>
                </div>
              </div>
            </div>

            {/* Licences & Qualifications */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                Licences & Qualifications
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Driving Licence (DL) No:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {instructor.licenceNo || 'Pending Verification'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">RTO Instructor Badge No:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {instructor.badgeNo || 'Pending Verification'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Experience Level:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{instructor.experience || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Active Teaching Batches:</span>
                  <span className="font-bold text-red-600">{metrics.activeBatchesCount || 0} Batches Assigned</span>
                </div>
              </div>

              {/* Certifications Register */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Training Certifications
                  </span>
                  <button
                    onClick={() => setCertModalOpen(true)}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    + Add
                  </button>
                </div>
                {instructor.certifications && instructor.certifications.length > 0 ? (
                  <div className="space-y-2">
                    {instructor.certifications.map((c, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.trainingName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">No: {c.certificateNo || 'N/A'}</div>
                        {c.validity && (
                          <div className="text-[11px] text-emerald-600 font-medium">
                            Valid until: {new Date(c.validity).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No special certifications recorded.</p>
                )}
              </div>
            </div>

            {/* Staff Document Register (From DDS HR Administration) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Staff Documents Register
                </h3>
                <button
                  onClick={() => setDocModalOpen(true)}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  + Add Document
                </button>
              </div>

              {instructor.staffDocuments && instructor.staffDocuments.length > 0 ? (
                <div className="space-y-2.5">
                  {instructor.staffDocuments.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-400" />
                          <span>{doc.docType}</span>
                        </div>
                        {doc.docNumber && (
                          <div className="text-[11px] font-mono text-slate-500">
                            {doc.docNumber}
                          </div>
                        )}
                        {doc.expiryDate && (
                          <div className="text-[10px] text-slate-400">
                            Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Badge value={doc.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No HR documents submitted yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Batches */}
        {activeTab === 'batches' && (
          <div className="space-y-4">
            <DataTable columns={batchColumns} data={batches} emptyMessage="No batches currently assigned to this instructor." />
          </div>
        )}

        {/* Tab 3: Classes Log */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <DataTable columns={classColumns} data={classes} emptyMessage="No driving classes logged for this instructor." />
          </div>
        )}

        {/* Tab 4: Assigned Vehicles */}
        {activeTab === 'vehicles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(v => (
              <div key={v._id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {v.vehicleNumber}
                  </div>
                  <Badge value={v.status} />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {v.brand} {v.model} • {v.vehicleType}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Branch: {v.branch}</span>
                  <button
                    onClick={() => navigate(`/vehicles/${v._id}`)}
                    className="text-red-600 font-bold hover:underline"
                  >
                    View Vehicle →
                  </button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                No vehicles explicitly assigned to this instructor.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Certification Modal */}
      <Modal
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        title="Add Training Certification"
      >
        <form onSubmit={handleAddCert} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Training / Certification Name *
            </label>
            <input
              type="text"
              required
              value={certForm.trainingName}
              onChange={(e) => setCertForm({ ...certForm, trainingName: e.target.value })}
              placeholder="e.g. Defensive Driving Instructor Certification"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Certificate Number
            </label>
            <input
              type="text"
              value={certForm.certificateNo}
              onChange={(e) => setCertForm({ ...certForm, certificateNo: e.target.value })}
              placeholder="e.g. CERT-2026-99"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={certForm.issueDate}
                onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Validity / Expiry
              </label>
              <input
                type="date"
                value={certForm.validity}
                onChange={(e) => setCertForm({ ...certForm, validity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={certForm.remarks}
              onChange={(e) => setCertForm({ ...certForm, remarks: e.target.value })}
              placeholder="Issuing authority, remarks..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCertModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCert}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow"
            >
              {submittingCert ? 'Saving...' : 'Add Certification'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Staff Document Modal */}
      <Modal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Add Staff Document Record"
      >
        <form onSubmit={handleAddDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Type *
            </label>
            <select
              value={docForm.docType}
              onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="Aadhaar">Aadhaar Card</option>
              <option value="Licence">Driving Licence Copy</option>
              <option value="Photo">Staff Photograph</option>
              <option value="Agreement">Employment / Partner Agreement</option>
              <option value="Bank Details">Bank Passbook / Cancelled Cheque</option>
              <option value="Badge">RTO Badge Certificate</option>
              <option value="Medical Certificate">Medical Fitness Certificate</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Number / Reference
            </label>
            <input
              type="text"
              value={docForm.docNumber}
              onChange={(e) => setDocForm({ ...docForm, docNumber: e.target.value })}
              placeholder="e.g. 5432 1098 7654"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={docForm.status}
                onChange={(e) => setDocForm({ ...docForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="Verified">Verified</option>
                <option value="Submitted">Submitted</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={docForm.expiryDate}
                onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDoc}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow"
            >
              {submittingDoc ? 'Saving...' : 'Add Document'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default InstructorDetailPage;
