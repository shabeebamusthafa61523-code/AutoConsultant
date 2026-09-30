import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getDashboardStats } from '../services/dashboardService';
import {
  Users,
  HelpCircle,
  Layers,
  Calendar,
  AlertCircle,
  Award,
  DollarSign,
  TrendingDown,
  BookOpen,
  Receipt,
  CreditCard,
  UserPlus,
  ArrowRight,
  Workflow,
  CalendarClock,
  GraduationCap,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Financial Donut/Pie Chart Component
const FinancialDonutChart = ({ stats }) => {
  const todaysCash = stats.todaysCash || 0;
  const todaysDigital = stats.todaysDigital || 0;
  const todaysExpenses = stats.todaysExpenses || 0;
  const totalPending = stats.totalPendingAmount || 0;

  const data = [
    { label: "Today's Cash Collection", value: todaysCash, color: '#10B981', link: '/daily-collection' },
    { label: "Today's Digital Collection", value: todaysDigital, color: '#3B82F6', link: '/payments' },
    { label: "Today's Expenditure", value: todaysExpenses, color: '#F43F5E', link: '/expenses' },
    { label: "Pending Student Fees", value: totalPending, color: '#F59E0B', link: '/student-ledger' },
  ];

  const totalValue = data.reduce((acc, item) => acc + item.value, 0);

  const size = 190;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
          Financial Breakdown (Donut Chart)
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
          Live Financial Control
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center w-48 h-48 shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-slate-700/60"
            />
            {totalValue > 0 &&
              data.map((item, index) => {
                if (item.value <= 0) return null;
                const percent = item.value / totalValue;
                const dashArray = `${percent * circumference} ${circumference}`;
                const dashOffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                return (
                  <circle
                    key={index}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-500 hover:opacity-85 cursor-pointer"
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Volume</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
              ₹ {totalValue.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-slate-400">Collections & Dues</span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-2">
          {data.map((item, i) => {
            const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
            return (
              <Link
                key={i}
                to={item.link}
                className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/40 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400">
                    {item.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    ₹ {item.value.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-semibold">({pct}%)</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Operational Load Bar Chart Component
const OperationalBarChart = ({ stats }) => {
  const items = [
    { label: 'Enrolled Candidates', value: stats.totalStudents || 0, color: 'bg-red-600', link: '/students' },
    { label: 'Active Training Batches', value: stats.activeBatches || 0, color: 'bg-slate-800 dark:bg-slate-200', link: '/batches' },
    { label: "Today's Practical & Theory Classes", value: stats.todaysClasses || 0, color: 'bg-emerald-600', link: '/classes' },
    { label: 'Fresh Prospect Enquiries', value: stats.newEnquiries || 0, color: 'bg-amber-500', link: '/enquiries' },
    { label: 'Upcoming Driving Tests', value: stats.upcomingTests || 0, color: 'bg-purple-600', link: '/students' },
  ];

  const maxValue = Math.max(...items.map((it) => it.value), 10);

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <Layers size={18} className="text-red-600 dark:text-red-400" />
          Operational Pipeline & Workload (Bar Chart)
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
          Live Operational Volume
        </span>
      </div>

      <div className="space-y-3.5 py-1">
        {items.map((item, idx) => {
          const percent = Math.min(100, Math.max(6, (item.value / maxValue) * 100));

          return (
            <Link key={idx} to={item.link} className="block group">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400">
                  {item.label}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-600">
                  {item.value}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-700 ease-out group-hover:brightness-110`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

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
      setError(err.message || 'Failed to fetch MD dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = data?.stats || {};
  const lists = data?.lists || {};

  // Columns for Today's Scheduled Driving Classes table
  const todayClassesColumns = [
    {
      header: 'Candidate / Session',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{row.student?.fullName || 'Driving Session'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-bold text-red-600 dark:text-red-400">{row.student?.studentId || 'ID'}</span> &bull; {row.student?.primaryMobile || 'Active'}
          </p>
        </div>
      )
    },
    {
      header: 'Scheduled Time / Date',
      cell: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {row.timeSlot || (row.classDate ? new Date(row.classDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled')}
          </span>
          {row.classDate && (
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(row.classDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Instructor',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {typeof row.instructor === 'string' ? row.instructor : (row.instructor?.name || 'Instructor')}
        </span>
      )
    },
    {
      header: 'Vehicle No.',
      cell: (row) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded font-bold text-slate-800 dark:text-slate-200">
          {row.vehicleNo || 'KL-10-AB-5265'}
        </span>
      )
    },
    {
      header: 'Training Syllabus',
      cell: (row) => (
        <span className="text-xs px-2.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold border border-red-100 dark:border-red-900/40">
          {row.trainingType || 'Practical Driving'}
        </span>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title="Managing Director (MD) Executive Dashboard" />

      {loading ? (
        <LoadingSpinner message="Loading live executive metrics from MongoDB Atlas..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchStats} />
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
          {/* MD WELCOME BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 rounded-lg border border-slate-800 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-red-600 text-[10px] font-black uppercase tracking-wider">
                  MD Executive Portal
                </span>
                <span className="text-xs text-slate-400">&bull; Live Real-Time Operations</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white">
                RAZAIN-BENZ AUTO CONSULTANT
              </h1>
              <p className="text-xs text-slate-300">
                West Kodur Branch &bull; Executive Command Centre & Financial Cash Control
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <Link
                to="/daily-collection"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-xs flex items-center gap-1.5"
              >
                <DollarSign size={15} />
                <span>Today's Cash Collection</span>
              </Link>
              <Link
                to="/student-ledger"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition shadow-xs flex items-center gap-1.5"
              >
                <BookOpen size={15} />
                <span>Student Ledger</span>
              </Link>
            </div>
          </div>

          {/* DYNAMIC EXECUTIVE STAT CARDS (8 CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Collections"
              value={`₹ ${(stats.todaysCollections || 0).toLocaleString('en-IN')}`}
              icon={DollarSign}
              color="emerald"
              subtitle="Live Cash & Digital Receipts"
            />
            <StatCard
              title="Today's Expenditure"
              value={`₹ ${(stats.todaysExpenses || 0).toLocaleString('en-IN')}`}
              icon={TrendingDown}
              color="rose"
              subtitle="Operational Expenses"
            />
            <StatCard
              title="Total Enrolled Students"
              value={stats.totalStudents || 0}
              icon={Users}
              color="red"
              subtitle="Active & Historical Candidates"
            />
            <StatCard
              title="Pending Student Fees"
              value={stats.pendingPayments || 0}
              icon={AlertCircle}
              color="amber"
              subtitle="Candidates with due balance"
            />
            <StatCard
              title="Active Training Batches"
              value={stats.activeBatches || 0}
              icon={Layers}
              color="dark"
              subtitle="Ongoing Batches"
            />
            <StatCard
              title="Today's Classes"
              value={stats.todaysClasses || 0}
              icon={Calendar}
              color="emerald"
              subtitle="Practical & Theory sessions"
            />
            <StatCard
              title="New Enquiries"
              value={stats.newEnquiries || 0}
              icon={HelpCircle}
              color="amber"
              subtitle="Fresh Prospects"
            />
            <StatCard
              title="Upcoming Driving Tests"
              value={stats.upcomingTests || 0}
              icon={Award}
              color="purple"
              subtitle="Scheduled RTO Tests"
            />
          </div>

          {/* WORKFLOW & FOLLOW-UP OPERATIONAL PIPELINE (5 METRICS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Workflow size={14} className="text-red-600" />
                Workflow Control & Candidate Follow-Up Pipeline
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <Link to="/workflow" className="font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                  Workflow Control &rarr;
                </Link>
                <Link to="/calendar-followup" className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                  Calendar / Follow-Up &rarr;
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link to="/students" className="block group">
                <StatCard
                  title="Active Students"
                  value={stats.activeStudents || stats.totalStudents || 0}
                  icon={Users}
                  color="dark"
                  subtitle="In Active Pipeline"
                />
              </Link>
              <Link to="/calendar-followup" className="block group">
                <StatCard
                  title="Pending Follow-ups"
                  value={stats.pendingFollowups || 0}
                  icon={CalendarClock}
                  color="amber"
                  subtitle="Scheduled Tasks"
                />
              </Link>
              <Link to="/calendar-followup" className="block group">
                <StatCard
                  title="Overdue Follow-ups"
                  value={stats.overdueFollowups || 0}
                  icon={AlertCircle}
                  color="rose"
                  subtitle="Immediate Attention"
                />
              </Link>
              <Link to="/workflow?stage=Training" className="block group">
                <StatCard
                  title="Students in Training"
                  value={stats.studentsInTraining || 0}
                  icon={GraduationCap}
                  color="purple"
                  subtitle="Practical & Track Classes"
                />
              </Link>
              <Link to="/workflow?stage=DL+Test" className="block group">
                <StatCard
                  title="DL Tests Pending"
                  value={stats.dlTestsPending || 0}
                  icon={Award}
                  color="emerald"
                  subtitle="Test Scheduled / Ready"
                />
              </Link>
            </div>
          </div>

          {/* VISUAL ANALYTICS & GRAPH DASHBOARD (REPLACES QUICK ACTIONS) */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Managing Director Visual Executive Overview</span>
              <span className="text-[11px] text-slate-400 font-normal">Interactive Pie Charts & Workload Graphs</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FinancialDonutChart stats={stats} />
              <OperationalBarChart stats={stats} />
            </div>

            {/* Compact Quick Navigation Chip Row */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <Link
                to="/payments"
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition shadow-xs text-center"
              >
                <CreditCard size={16} className="text-red-600" />
                <span>Payments</span>
              </Link>
              <Link
                to="/student-ledger"
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition shadow-xs text-center"
              >
                <BookOpen size={16} className="text-blue-600" />
                <span>Student Ledger</span>
              </Link>
              <Link
                to="/daily-collection"
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition shadow-xs text-center"
              >
                <Receipt size={16} className="text-emerald-600" />
                <span>Daily Register</span>
              </Link>
              <Link
                to="/expenses"
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition shadow-xs text-center"
              >
                <TrendingDown size={16} className="text-rose-600" />
                <span>Expenses</span>
              </Link>
              <Link
                to="/students/add"
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-md flex flex-row items-center justify-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition shadow-xs text-center"
              >
                <UserPlus size={16} className="text-purple-600" />
                <span>+ Add Student</span>
              </Link>
              <Link
                to="/classes"
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center gap-2 font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition shadow-xs text-center"
              >
                <Calendar size={16} className="text-amber-600" />
                <span>Classes</span>
              </Link>
            </div>
          </div>

          {/* TODAY'S SCHEDULED CLASSES SECTION */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Calendar size={18} className="text-red-600 dark:text-red-400" />
                Today's Scheduled Driving Classes
              </h3>
              <Link
                to="/classes"
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1"
              >
                <span>View All Classes</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <DataTable
              columns={todayClassesColumns}
              data={lists.todayClasses || []}
              onRowClick={(row) => {
                const sId = row.student?._id || row.student;
                if (sId) navigate(`/students/${sId}`);
              }}
              emptyMessage="No classes scheduled for today."
            />
          </div>

          {/* UPCOMING DRIVING TESTS SECTION */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Upcoming Driving Tests</h3>
              <Link
                to="/students"
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1"
              >
                <span>Student List</span>
                <ArrowRight size={14} />
              </Link>
            </div>

              {!lists.upcomingTests || lists.upcomingTests.length === 0 ? (
                <EmptyState title="No upcoming tests" description="No students currently scheduled for RTO test." />
              ) : (
                <div className="space-y-3">
                  {lists.upcomingTests.map((stu) => {
                    const statusText = stu.currentStatus || stu.testStatus || 'Test Pending';
                    const isRetest = statusText.toLowerCase().includes('retest');
                    const isScheduled = statusText.toLowerCase().includes('scheduled');

                    const statusBadgeClass = isRetest
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                      : isScheduled
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40';

                    return (
                      <div
                        key={stu._id}
                        onClick={() => navigate(`/students/${stu._id}`)}
                        className="p-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {stu.fullName} <span className="font-mono text-red-600 dark:text-red-400 text-xs">({stu.studentId})</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Batch: {stu.batch?.name || 'Unassigned'} &bull; Mobile: {stu.primaryMobile}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-xs px-2.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-900/40">
                            {stu.testDate ? new Date(stu.testDate).toLocaleDateString() : 'Date Pending'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${statusBadgeClass}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>
      )}
    </MainLayout>
  );
};

export default DashboardPage;
