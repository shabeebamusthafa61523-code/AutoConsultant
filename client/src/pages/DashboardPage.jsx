import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getDashboardStats } from '../services/dashboardService';
import { Users, HelpCircle, Layers, Calendar, AlertCircle, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardStats();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = data?.stats || {};
  const lists = data?.lists || {};

  // Columns for Today's Classes table
  const todayClassesColumns = [
    {
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.student?.fullName || 'N/A'}</p>
          <p className="text-xs text-slate-500"><span className="font-mono font-bold text-red-600">{row.student?.studentId}</span> &bull; {row.student?.primaryMobile}</p>
        </div>
      )
    },
    {
      header: 'Time / Date',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {new Date(row.classDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      header: 'Instructor',
      accessor: 'instructor'
    },
    {
      header: 'Vehicle No.',
      cell: (row) => <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-800">{row.vehicleNo}</span>
    },
    {
      header: 'Training Type',
      cell: (row) => (
        <span className="text-xs px-2.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-100">
          {row.trainingType}
        </span>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="BENZ Dashboard Overview" />

      {loading ? (
        <LoadingSpinner message="Fetching live BENZ metrics from MongoDB Atlas..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchStats} />
      ) : (
        <div className="space-y-6">
          {/* Dynamic BENZ Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
              color="red"
            />
            <StatCard
              title="New Enquiries"
              value={stats.newEnquiries}
              icon={HelpCircle}
              color="amber"
            />
            <StatCard
              title="Active Batches"
              value={stats.activeBatches}
              icon={Layers}
              color="dark"
            />
            <StatCard
              title="Today's Classes"
              value={stats.todaysClasses}
              icon={Calendar}
              color="emerald"
            />
            <StatCard
              title="Pending Payments"
              value={stats.pendingPayments}
              icon={AlertCircle}
              color="rose"
            />
            <StatCard
              title="Upcoming Tests"
              value={stats.upcomingTests}
              icon={Award}
              color="purple"
            />
          </div>

          {/* Today's Classes Section */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Calendar size={18} className="text-red-600" />
                Today's Scheduled Classes
              </h3>
              <Link to="/classes" className="text-xs font-bold text-red-600 hover:text-red-800">
                View All Classes &rarr;
              </Link>
            </div>
            <DataTable
              columns={todayClassesColumns}
              data={lists.todayClasses || []}
              emptyMessage="No classes scheduled for today."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follow-ups Section */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Follow-ups Required</h3>
                <Link to="/enquiries" className="text-xs font-bold text-red-600 hover:text-red-800">
                  Enquiries List &rarr;
                </Link>
              </div>

              {(!lists.followUps?.enquiries?.length && !lists.followUps?.students?.length) ? (
                <EmptyState title="No follow-ups due" description="No pending follow-ups found for today." />
              ) : (
                <div className="space-y-3">
                  {lists.followUps?.enquiries?.map((enq) => (
                    <div key={enq._id} className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{enq.name}</p>
                        <p className="text-xs text-slate-500">Enquiry &bull; Mobile: {enq.primaryMobile} &bull; Interested: {enq.interestedLicence}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          {enq.followUpDate ? new Date(enq.followUpDate).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {lists.followUps?.students?.map((stu) => (
                    <div key={stu._id} className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{stu.fullName} ({stu.studentId})</p>
                        <p className="text-xs text-slate-500">Student &bull; Next Action: {stu.nextAction || 'Follow up'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2.5 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                          {stu.followUpDate ? new Date(stu.followUpDate).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tests Section */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Upcoming Driving Tests</h3>
                <Link to="/students" className="text-xs font-bold text-red-600 hover:text-red-800">
                  Student List &rarr;
                </Link>
              </div>

              {(!lists.upcomingTests || lists.upcomingTests.length === 0) ? (
                <EmptyState title="No upcoming tests" description="No students currently scheduled for test." />
              ) : (
                <div className="space-y-3">
                  {lists.upcomingTests.map((stu) => (
                    <div key={stu._id} className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{stu.fullName} ({stu.studentId})</p>
                        <p className="text-xs text-slate-500">
                          Batch: {stu.batch?.name || 'Unassigned'} &bull; Mobile: {stu.primaryMobile}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold block mb-1">
                          {new Date(stu.testDate).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{stu.testStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default DashboardPage;
