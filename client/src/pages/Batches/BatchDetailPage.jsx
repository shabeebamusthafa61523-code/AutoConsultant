import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import DataTable from '../../components/DataTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { getBatchById } from '../../services/batchService';
import { ArrowLeft, Users, Calendar, Clock, UserCheck } from 'lucide-react';

const BatchDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBatchById(id);
      setBatch(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch batch details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchDetails();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Batch Details" />
        <LoadingSpinner message="Loading batch profile..." />
      </MainLayout>
    );
  }

  if (error || !batch) {
    return (
      <MainLayout>
        <Navbar title="Batch Details" />
        <ErrorMessage message={error || 'Batch not found'} onRetry={fetchBatchDetails} />
      </MainLayout>
    );
  }

  const studentColumns = [
    {
      header: 'Student ID',
      cell: (row) => <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{row.studentId}</span>
    },
    { header: 'Full Name', accessor: 'fullName' },
    { header: 'Mobile', accessor: 'primaryMobile' },
    { header: 'Vehicle', accessor: 'vehicleType' },
    {
      header: 'Status',
      cell: (row) => (
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-800">
          {row.currentStatus}
        </span>
      )
    },
    {
      header: 'Action',
      cell: (row) => (
        <button
          onClick={() => navigate(`/students/${row._id}`)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          View Profile &rarr;
        </button>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title={`Batch: ${batch.name}`} />

      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <Link
          to="/batches"
          className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1 w-fit"
        >
          <ArrowLeft size={16} /> Back to Batches List
        </Link>

        {/* Batch Overview Header Card */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{batch.name}</h2>
              <p className="text-xs text-slate-500 mt-1">{batch.courseLicenceType} &bull; {batch.vehicleType}</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
              {batch.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Instructor</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <UserCheck size={14} className="text-indigo-600" />
                {batch.instructor || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Class Timings</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock size={14} className="text-amber-600" />
                {batch.startTime} - {batch.endTime}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Start / End Date</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-purple-600" />
                {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Enrolled Capacity</span>
              <span className="font-bold text-indigo-700 flex items-center gap-1.5 mt-0.5 text-sm">
                <Users size={16} />
                {batch.enrolledCount} / {batch.maxStudents} Students
              </span>
            </div>
          </div>
        </div>

        {/* Enrolled Students Table */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Enrolled Students ({batch.students?.length || 0})
          </h3>
          <DataTable
            columns={studentColumns}
            data={batch.students || []}
            emptyMessage="No students currently assigned to this batch."
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default BatchDetailPage;
