import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { getDailyReports, getMonthlyReports } from '../../services/reportService';
import {
  FileText,
  Calendar,
  DollarSign,
  Users,
  Award,
  Car,
  Printer,
  Download,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Daily Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState(null);

  // Monthly Filters
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);

  const fetchDaily = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDailyReports({ date: selectedDate });
      setDailyData(res);
    } catch (err) {
      setError(err.message || 'Failed to load daily report.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMonthlyReports({ year: selectedYear, month: selectedMonth });
      setMonthlyData(res);
    } catch (err) {
      setError(err.message || 'Failed to load monthly report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDaily();
    } else {
      fetchMonthly();
    }
  }, [activeTab, selectedDate, selectedYear, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No records to export');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <Navbar title="Management Reports & Analytics" />

      <div className="space-y-5 max-w-7xl mx-auto pb-16">
        {/* Header Ribbon */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText size={20} className="text-red-600" />
              Official Management & Operational Reports
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Admission, Collection, Training, Driving Tests, Outstanding Balances and Instructor Workload Audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              onClick={() => (activeTab === 'daily' ? fetchDaily() : fetchMonthly())}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab Controls & Filter Bar */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Calendar size={14} /> Daily Reports
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'monthly'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <TrendingUp size={14} /> Monthly Management Summary
            </button>
          </div>

          {/* Date / Month Filter Controls */}
          {activeTab === 'daily' ? (
            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-500">Report Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-500">Month & Year:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {loading ? (
          <LoadingSpinner message="Generating report calculations..." />
        ) : activeTab === 'daily' && dailyData ? (
          /* ========================================================================= */
          /* DAILY REPORT VIEW */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Top 4 Daily KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase">New Admissions</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {dailyData.summary?.newAdmissionsCount || 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">Registered on {selectedDate}</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-600 uppercase">Daily Collections</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  ₹ {(dailyData.summary?.totalCollectionsAmount || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Cash: ₹{dailyData.summary?.cashCollectionsAmount || 0} | Digital: ₹{dailyData.summary?.digitalCollectionsAmount || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-blue-600 uppercase">Training Sessions</span>
                <p className="text-2xl font-black text-blue-600 mt-1">
                  {dailyData.summary?.trainingSessionsCount || 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {dailyData.summary?.totalKmDriven || 0} KM Driven &bull; {dailyData.summary?.totalHPractices || 0} H Tracks
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-purple-600 uppercase">RTO Tests</span>
                <p className="text-2xl font-black text-purple-600 mt-1">
                  {dailyData.summary?.testsCount || 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">Scheduled Driving & LL Tests</span>
              </div>
            </div>

            {/* Daily Collections Section */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <DollarSign size={16} className="text-emerald-600" />
                  Daily Collection Transactions ({dailyData.data?.collections?.length || 0})
                </h3>
                <button
                  onClick={() =>
                    exportCSV(
                      (dailyData.data?.collections || []).map((p) => ({
                        ReceiptNo: p.receiptNo || 'N/A',
                        StudentName: p.student?.fullName || 'N/A',
                        Mobile: p.student?.primaryMobile || 'N/A',
                        Amount: p.amount,
                        Mode: p.paymentMethod,
                        Type: p.paymentType,
                        ReceivedBy: p.receivedBy || 'Staff'
                      })),
                      'Daily_Collections'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Download size={12} /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2">Receipt No</th>
                      <th className="p-2">Student Name</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Payment Mode</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Received By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {dailyData.data?.collections?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-slate-400 italic">
                          No collection entries for this date.
                        </td>
                      </tr>
                    ) : (
                      dailyData.data?.collections?.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-2 font-mono font-bold text-red-600">{p.receiptNo || 'REC'}</td>
                          <td className="p-2 font-medium">{p.student?.fullName || 'Candidate'}</td>
                          <td className="p-2 font-mono font-bold text-emerald-600">₹ {p.amount}</td>
                          <td className="p-2">{p.paymentMethod || 'Cash'}</td>
                          <td className="p-2">{p.paymentType || 'Fee Payment'}</td>
                          <td className="p-2 text-slate-500">{p.receivedBy || 'Staff'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Training Log Section */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Car size={16} className="text-blue-600" />
                  Daily Training Sessions ({dailyData.data?.training?.length || 0})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2">Student Name</th>
                      <th className="p-2">Training Type</th>
                      <th className="p-2">KM Driven</th>
                      <th className="p-2">H Practices</th>
                      <th className="p-2">Instructor</th>
                      <th className="p-2">Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {dailyData.data?.training?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-slate-400 italic">
                          No training classes conducted on this date.
                        </td>
                      </tr>
                    ) : (
                      dailyData.data?.training?.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-2 font-medium">{c.student?.fullName || 'Candidate'}</td>
                          <td className="p-2">{c.trainingType || 'Practical Driving'}</td>
                          <td className="p-2 font-mono font-bold text-red-600">{c.kmDriven || c.km || 0} KM</td>
                          <td className="p-2 font-mono font-bold text-emerald-600">{c.hPracticeCount || 0} Tracks</td>
                          <td className="p-2">{c.instructor || 'Instructor'}</td>
                          <td className="p-2 font-mono text-slate-500">{c.vehicleNo || 'Vehicle'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MONTHLY REPORT VIEW */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Top 4 Monthly KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Monthly Admissions</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {monthlyData?.summary?.totalAdmissions || 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">New Student Enrollments</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-600 uppercase">Total Collected</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  ₹ {(monthlyData?.summary?.totalCollected || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">Monthly Inflow</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-rose-600 uppercase">Total Outstanding</span>
                <p className="text-2xl font-black text-rose-600 mt-1">
                  ₹ {(monthlyData?.summary?.totalOutstanding || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {monthlyData?.summary?.outstandingCount || 0} Candidates with Dues
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] font-bold text-purple-600 uppercase">RTO Tests</span>
                <p className="text-2xl font-black text-purple-600 mt-1">
                  {monthlyData?.summary?.testsConducted || 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Passed: {monthlyData?.summary?.testsPassed || 0} | Failed: {monthlyData?.summary?.testsFailed || 0}
                </span>
              </div>
            </div>

            {/* Outstanding Balances Register */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-rose-600" />
                  Outstanding Fee Register ({monthlyData?.data?.outstandingCandidates?.length || 0} Candidates)
                </h3>
                <button
                  onClick={() =>
                    exportCSV(
                      (monthlyData?.data?.outstandingCandidates || []).map((o) => ({
                        StudentID: o.studentId,
                        Name: o.fullName,
                        Mobile: o.primaryMobile,
                        Course: o.coursePackage,
                        TotalFee: o.totalFee,
                        Paid: o.paidAmount,
                        BalanceDue: o.balance,
                        NextAction: o.nextAction
                      })),
                      'Outstanding_Balance_Register'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Download size={12} /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2">Student ID</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Mobile</th>
                      <th className="p-2">Course</th>
                      <th className="p-2">Total Fee</th>
                      <th className="p-2">Paid</th>
                      <th className="p-2">Balance Due</th>
                      <th className="p-2">Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {monthlyData?.data?.outstandingCandidates?.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-4 text-center text-slate-400 italic">
                          No pending outstanding balances!
                        </td>
                      </tr>
                    ) : (
                      monthlyData?.data?.outstandingCandidates?.slice(0, 15).map((o) => (
                        <tr key={o._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-2 font-mono font-bold text-red-600">{o.studentId}</td>
                          <td className="p-2 font-medium">{o.fullName}</td>
                          <td className="p-2 font-mono">{o.primaryMobile}</td>
                          <td className="p-2 text-slate-500">{o.coursePackage}</td>
                          <td className="p-2 font-mono">₹ {o.totalFee}</td>
                          <td className="p-2 font-mono text-emerald-600 font-bold">₹ {o.paidAmount}</td>
                          <td className="p-2 font-mono text-rose-600 font-black">₹ {o.balance}</td>
                          <td className="p-2 font-bold text-slate-700 dark:text-slate-300">{o.nextAction}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instructor Monthly Performance Table */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Users size={16} className="text-blue-600" />
                  Instructor Operational Workload Analysis
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2">Instructor Name</th>
                      <th className="p-2">Mobile</th>
                      <th className="p-2">Classes Conducted</th>
                      <th className="p-2">KM Covered</th>
                      <th className="p-2">H Track Sessions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {monthlyData?.data?.instructorPerformance?.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-400 italic">
                          No instructor sessions found for this period.
                        </td>
                      </tr>
                    ) : (
                      monthlyData?.data?.instructorPerformance?.map((ins) => (
                        <tr key={ins._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="p-2 font-bold">{ins.name}</td>
                          <td className="p-2 font-mono text-slate-500">{ins.mobile}</td>
                          <td className="p-2 font-mono font-bold text-blue-600">{ins.classesCount} Classes</td>
                          <td className="p-2 font-mono font-bold text-red-600">{ins.kmCovered} KM</td>
                          <td className="p-2 font-mono font-bold text-emerald-600">{ins.hPracticesCount} Tracks</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
