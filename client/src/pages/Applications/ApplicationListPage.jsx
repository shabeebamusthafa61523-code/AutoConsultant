import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Badge from '../../components/Badge';
import { getApplications, updateApplicationStage } from '../../services/applicationService';
import {
  Layers,
  Search,
  Filter,
  User,
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Plus,
  Clock,
  Award,
  CheckCircle2
} from 'lucide-react';

const LIFECYCLE_STATUSES = [
  'ALL',
  'Lead',
  'Registered',
  'Documents Pending',
  'LL Processing',
  'LL Approved',
  'Training',
  'Test Scheduled',
  'Retest',
  'Test Passed',
  'Licence Processing',
  'Completed',
  'On Hold',
  'Cancelled'
];

const ApplicationListPage = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getApplications({ limit: 500 });
      const apps = res?.data || (Array.isArray(res) ? res : []);
      setApplications(apps);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Failed to load applications pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await updateApplicationStage(appId, { lifecycleStatus: newStatus });
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to update application status');
    }
  };

  // Filtered Applications
  const filteredApplications = applications.filter((app) => {
    const student = app.student || {};
    const matchesSearch =
      !searchTerm ||
      (app.applicationId && app.applicationId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.studentId && app.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.fullName && student.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.primaryMobile && student.primaryMobile.includes(searchTerm)) ||
      (app.serviceType && app.serviceType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.learnerLicence?.llNumber && app.learnerLicence.llNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.licence?.dlNumber && app.licence.dlNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'ALL' || app.lifecycleStatus === selectedStatus;

    const matchesService =
      serviceFilter === 'ALL' || app.serviceType === serviceFilter;

    return matchesSearch && matchesStatus && matchesService;
  });

  // Analytics counts
  const totalCount = applications.length;
  const activeCount = applications.filter(a => !['Completed', 'Cancelled'].includes(a.lifecycleStatus)).length;
  const trainingCount = applications.filter(a => a.lifecycleStatus === 'Training').length;
  const testCount = applications.filter(a => ['Test Scheduled', 'Retest'].includes(a.lifecycleStatus)).length;
  const completedCount = applications.filter(a => a.lifecycleStatus === 'Completed').length;

  return (
    <MainLayout>
      <Navbar title="Service & Licence Applications Pipeline" />

      <div className="space-y-5 max-w-7xl mx-auto pb-12">
        {/* Top Header Banner */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers size={20} className="text-red-600" />
              Licence Applications Master Pipeline
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Independent application tracking: 1 Person / Student can possess multiple applications (Fresh, Additional Class, Retest).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchApplications}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              to="/students/add"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} /> + New Admission
            </Link>
          </div>
        </div>

        {/* 5 Top Summary Pipeline Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Applications</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalCount}</p>
            <span className="text-[11px] text-slate-500 font-medium">All Lifetime Services</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Active In-Progress</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{activeCount}</p>
            <span className="text-[11px] text-blue-600/80 font-medium">Currently in Pipeline</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">In Practical Training</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{trainingCount}</p>
            <span className="text-[11px] text-amber-600/80 font-medium">Road & Track Classes</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Scheduled / Retests</span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{testCount}</p>
            <span className="text-[11px] text-purple-600/80 font-medium">Upcoming Driving Tests</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Completed Services</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</p>
            <span className="text-[11px] text-emerald-600/80 font-medium">Licence Issued / Closed</span>
          </div>
        </div>

        {/* Search & Lifecycle Status Filter Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by App ID, Student Name, Student ID, Mobile, LL, DL..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Service:</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              >
                <option value="ALL">All Services</option>
                <option value="Fresh Licence">Fresh Licence</option>
                <option value="Additional Class">Additional Class</option>
                <option value="Retest">Retest</option>
                <option value="Licence Renewal">Licence Renewal</option>
                <option value="3W Addition">3W Addition</option>
                <option value="Post Licence Training">Post Licence Training</option>
              </select>
            </div>
          </div>

          {/* Status Quick Filter Ribbon */}
          <div className="flex overflow-x-auto gap-1 pt-1 no-scrollbar border-t border-slate-100 dark:border-slate-700">
            {LIFECYCLE_STATUSES.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 text-xs font-bold rounded-md whitespace-nowrap transition ${
                  selectedStatus === st
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Applications Data Table */}
        {loading ? (
          <LoadingSpinner message="Loading applications pipeline..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchApplications} />
        ) : (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="font-bold">
                Showing {filteredApplications.length} of {applications.length} applications
              </span>
            </div>

            <DataTable
              columns={[
                {
                  header: 'App ID',
                  cell: (row) => (
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                      {row.applicationId}
                    </span>
                  )
                },
                {
                  header: 'Candidate / Student',
                  cell: (row) => {
                    const stu = row.student || {};
                    return (
                      <div>
                        <Link
                          to={stu._id ? `/students/${stu._id}` : '#'}
                          className="font-extrabold text-xs text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                          {stu.fullName || 'Candidate'}
                        </Link>
                        <p className="text-[11px] text-slate-500 font-mono">
                          <span className="font-bold text-red-600">{row.studentId || stu.studentId}</span> &bull; {stu.primaryMobile || 'Active'}
                        </p>
                      </div>
                    );
                  }
                },
                {
                  header: 'Service / Course',
                  cell: (row) => (
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {row.serviceType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {row.coursePackage || `${row.vehicleClass} - ${row.licenceType}`}
                      </span>
                    </div>
                  )
                },
                {
                  header: 'Lifecycle Status',
                  cell: (row) => (
                    <select
                      value={row.lifecycleStatus}
                      onChange={(e) => handleUpdateStatus(row._id, e.target.value)}
                      className="px-2 py-1 text-xs font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    >
                      {LIFECYCLE_STATUSES.filter(s => s !== 'ALL').map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  )
                },
                {
                  header: 'Financial Status',
                  cell: (row) => {
                    const fs = row.feeStructure || {};
                    const net = fs.netPayable ?? row.packageFee ?? 9000;
                    const bal = fs.balanceDue ?? Math.max(0, net - (fs.totalReceived ?? 0));
                    return (
                      <div className="text-xs font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ₹{fs.totalReceived ?? 0} / ₹{net}
                        </span>
                        <p className={`text-[10px] font-bold ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {bal > 0 ? `Due: ₹${bal}` : 'Fully Paid'}
                        </p>
                      </div>
                    );
                  }
                },
                {
                  header: 'Mandatory Next Action',
                  cell: (row) => (
                    <div className="max-w-[200px]">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block" title={row.nextAction || 'None'}>
                        {row.nextAction || 'Verify Documents'}
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                        Due: {row.nextActionDueDate ? new Date(row.nextActionDueDate).toLocaleDateString() : 'N/A'} ({row.nextActionPriority || 'Med'})
                      </span>
                    </div>
                  )
                },
                {
                  header: 'Actions',
                  className: 'text-right',
                  cell: (row) => {
                    const stuId = row.student?._id || row.student;
                    return (
                      <Link
                        to={stuId ? `/students/${stuId}` : '#'}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-bold inline-flex items-center gap-1 transition border border-red-200 dark:border-red-900/40"
                      >
                        <span>Student 360°</span>
                        <ChevronRight size={13} />
                      </Link>
                    );
                  }
                }
              ]}
              data={filteredApplications}
              emptyMessage="No applications matching the selected criteria."
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationListPage;
