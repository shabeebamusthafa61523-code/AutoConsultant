import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { getStudents, updateStudent } from '../../services/studentService';
import { getClasses } from '../../services/classService';
import {
  Calendar as CalendarIcon,
  Clock,
  PhoneCall,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  X,
  RefreshCw,
  BellRing,
  GraduationCap,
  Car,
  UserPlus
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad2 = (n) => String(n).padStart(2, '0');

// Bulletproof helper to format Date/String to local YYYY-MM-DD
const toLocalYYYYMMDD = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    return dateInput.split('T')[0];
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const CalendarFollowUpPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'calendar' | 'followup_list'
  const [activeTab, setActiveTab] = useState('calendar');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL'); // 'ALL' | 'TEST' | 'FOLLOWUP' | 'CLASS' | 'REGISTRATION'

  // Calendar Date Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null); // YYYY-MM-DD

  // Selected Date Full Details Drawer
  const [viewingDateDetails, setViewingDateDetails] = useState(null);

  // Edit / Action Modal
  const [actionStudent, setActionStudent] = useState(null);
  const [modalFollowUpDate, setModalFollowUpDate] = useState('');
  const [modalNextAction, setModalNextAction] = useState('');
  const [savingModal, setSavingModal] = useState(false);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stuRes, classRes] = await Promise.all([
        getStudents({ limit: 500 }),
        getClasses({ limit: 500 })
      ]);

      const studentData = stuRes && stuRes.students ? stuRes.students : (Array.isArray(stuRes) ? stuRes : []);
      const classData = classRes && classRes.classes ? classRes.classes : (Array.isArray(classRes) ? classRes : []);

      setStudents(studentData);
      setClasses(classData);
    } catch (err) {
      console.error('Error fetching calendar follow-up data:', err);
      setError('Failed to load complete calendar events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const todayStr = useMemo(() => toLocalYYYYMMDD(new Date()), []);

  // Collect ALL saved calendar items across all categories using local date strings
  const allEvents = useMemo(() => {
    const events = [];

    // 1. Student Follow-ups
    students.forEach((st) => {
      if (st.followUpDate) {
        const dStr = toLocalYYYYMMDD(st.followUpDate);
        events.push({
          id: `fu-${st._id}`,
          studentId: st._id,
          studentName: st.fullName,
          phone: st.primaryMobile,
          code: st.studentId,
          type: 'FOLLOWUP',
          dateStr: dStr,
          title: `Follow Up: ${st.fullName}`,
          action: st.nextAction || 'Call candidate for update',
          status: dStr < todayStr ? 'Overdue' : dStr === todayStr ? 'Today' : 'Upcoming',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
          rawStudent: st
        });
      }

      // 2. RTO Driving Test (Check both top-level testDate and nested testDetails.testDate)
      const rtoTestDate = st.testDate || st.testDetails?.testDate;
      if (rtoTestDate) {
        const dStr = toLocalYYYYMMDD(rtoTestDate);
        events.push({
          id: `test-${st._id}`,
          studentId: st._id,
          studentName: st.fullName,
          phone: st.primaryMobile,
          code: st.studentId,
          type: 'TEST',
          dateStr: dStr,
          title: `RTO Test: ${st.fullName}`,
          action: `RTO Test Status: ${st.testStatus || st.testDetails?.testStatus || 'Scheduled'} (${st.licenceCategory || 'LMV'})`,
          status: dStr < todayStr ? 'Completed Test' : dStr === todayStr ? 'Today Test' : 'Scheduled Test',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
          rawStudent: st
        });
      }

      // 2b. Learner Licence (LL) Test / Slot Date
      if (st.learnerLicence?.appliedDate) {
        const llDateStr = toLocalYYYYMMDD(st.learnerLicence.appliedDate);
        const rtoStr = rtoTestDate ? toLocalYYYYMMDD(rtoTestDate) : '';
        if (llDateStr !== rtoStr) {
          events.push({
            id: `ll-test-${st._id}`,
            studentId: st._id,
            studentName: st.fullName,
            phone: st.primaryMobile,
            code: st.studentId,
            type: 'TEST',
            dateStr: llDateStr,
            title: `LL Slot/Test: ${st.fullName}`,
            action: `LL Status: ${st.learnerLicence.status || 'Slot Booked'} (${st.learnerLicence.llNumber || 'No LL#'})`,
            status: llDateStr < todayStr ? 'Past LL Test' : llDateStr === todayStr ? 'Today LL Test' : 'Scheduled LL Test',
            badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300',
            rawStudent: st
          });
        }
      }

      // 3. Candidate Registration Date
      if (st.registrationDate) {
        const dStr = toLocalYYYYMMDD(st.registrationDate);
        events.push({
          id: `reg-${st._id}`,
          studentId: st._id,
          studentName: st.fullName,
          phone: st.primaryMobile,
          code: st.studentId,
          type: 'REGISTRATION',
          dateStr: dStr,
          title: `New Admission: ${st.fullName}`,
          action: `Enrolled in ${st.coursePackage || 'Fresh Licence'}`,
          status: 'New Student',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
          rawStudent: st
        });
      }
    });

    // 4. Scheduled Training Classes
    classes.forEach((cls) => {
      if (cls.date) {
        const dStr = toLocalYYYYMMDD(cls.date);
        const studentNames = cls.students ? cls.students.map(s => s.fullName || s.studentId || 'Student').join(', ') : 'Enrolled candidates';
        events.push({
          id: `class-${cls._id}`,
          classId: cls._id,
          type: 'CLASS',
          dateStr: dStr,
          title: `Class: ${cls.topic || cls.classType || 'Driving Training'}`,
          studentName: studentNames,
          action: `${cls.instructorName ? `Instructor: ${cls.instructorName}` : ''} (${cls.students?.length || 0} student(s))`,
          status: cls.status || 'Scheduled',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
          rawClass: cls
        });
      }
    });

    return events;
  }, [students, classes, todayStr]);

  // Metrics summary
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let upcomingTestCount = 0;
    let classesCount = classes.length;

    allEvents.forEach((ev) => {
      if (ev.type === 'FOLLOWUP') {
        if (ev.status === 'Overdue') overdueCount++;
        if (ev.status === 'Today') todayCount++;
      }
      if (ev.type === 'TEST' && ev.dateStr >= todayStr) {
        upcomingTestCount++;
      }
    });

    return { overdueCount, todayCount, upcomingTestCount, classesCount, totalEvents: allEvents.length };
  }, [allEvents, classes, todayStr]);

  // Map of events grouped by YYYY-MM-DD
  const eventsByDateMap = useMemo(() => {
    const map = {};
    allEvents.forEach((ev) => {
      if (!map[ev.dateStr]) map[ev.dateStr] = [];
      map[ev.dateStr].push(ev);
    });
    return map;
  }, [allEvents]);

  // Filtered list of events based on active filters
  const filteredEventsList = useMemo(() => {
    return allEvents.filter((ev) => {
      if (eventTypeFilter !== 'ALL' && ev.type !== eventTypeFilter) return false;
      if (selectedDateStr && ev.dateStr !== selectedDateStr) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        ev.title?.toLowerCase().includes(term) ||
        ev.studentName?.toLowerCase().includes(term) ||
        ev.phone?.includes(term) ||
        ev.code?.toLowerCase().includes(term) ||
        ev.action?.toLowerCase().includes(term)
      );
    });
  }, [allEvents, eventTypeFilter, selectedDateStr, searchTerm]);

  // Compute Grid Days for Month with Local Date Matching
  const calendarGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthDays - i;
      const pMonth = month === 0 ? 12 : month;
      const pYear = month === 0 ? year - 1 : year;
      const dateStr = `${pYear}-${pad2(pMonth)}-${pad2(pDay)}`;
      grid.push({
        dateStr,
        dayNumber: pDay,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
      grid.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true
      });
    }

    // Next month padding
    const remainingCells = (7 - (grid.length % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const nMonth = month === 11 ? 1 : month + 2;
      const nYear = month === 11 ? year + 1 : year;
      const dateStr = `${nYear}-${pad2(nMonth)}-${pad2(day)}`;
      grid.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false
      });
    }

    return grid;
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateStr(todayStr);
  };

  // Open Followup edit modal
  const handleOpenActionModal = (student) => {
    setActionStudent(student);
    const existingDate = student.followUpDate
      ? toLocalYYYYMMDD(student.followUpDate)
      : todayStr;
    setModalFollowUpDate(existingDate);
    setModalNextAction(student.nextAction || '');
  };

  // Save follow-up
  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!actionStudent) return;
    try {
      setSavingModal(true);
      await updateStudent(actionStudent._id, {
        followUpDate: modalFollowUpDate || null,
        nextAction: modalNextAction
      });
      await fetchCalendarData();
      setActionStudent(null);
    } catch (err) {
      console.error('Error saving follow-up:', err);
      alert('Failed to save follow-up details.');
    } finally {
      setSavingModal(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <Navbar title="Calendar & Daily Overview" />

        {/* Top Control Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-red-600" />
              Calendar & Saved Records Overview
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Displays every saved RTO test, follow-up call, candidate admission, and training class session by date.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-600">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'calendar'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Calendar Grid
              </button>
              <button
                onClick={() => setActiveTab('followup_list')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'followup_list'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Event Ledger
              </button>
            </div>

            <button
              onClick={fetchCalendarData}
              className="p-2 text-slate-600 hover:text-red-600 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
              title="Refresh Calendar Records"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Upcoming Tests</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.upcomingTestCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Follow-Ups Today</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.todayCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Training Classes</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.classesCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Total Saved Events</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{metrics.totalEvents}</h3>
            </div>
          </div>
        </div>

        {/* Legend for Calendar Event Types */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Event Key:</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[11px]">
              🚗 RTO Test
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-[11px]">
              📞 Follow Up
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px]">
              🎓 Training Class
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[11px]">
              👤 New Admission
            </span>
          </div>
        </div>

        {/* CALENDAR GRID VIEW */}
        {activeTab === 'calendar' && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs p-5 space-y-4">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Jump to Today
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Comprehensive Grid: Every Date Cell Shows Everything Saved */}
            <div className="grid grid-cols-7 gap-1.5 bg-slate-200 dark:bg-slate-700 p-1.5 rounded-xl">
              {/* Day Headers */}
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-xs font-black uppercase text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-md"
                >
                  {day}
                </div>
              ))}

              {/* Day Cells */}
              {calendarGridDays.map((cell, idx) => {
                const dayEvents = eventsByDateMap[cell.dateStr] || [];
                const isToday = cell.dateStr === todayStr;
                const isSelected = selectedDateStr === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDateStr(isSelected ? null : cell.dateStr);
                      if (dayEvents.length > 0) setViewingDateDetails(cell.dateStr);
                    }}
                    className={`min-h-[125px] p-2 bg-white dark:bg-slate-800 rounded-xl flex flex-col justify-between cursor-pointer transition border ${
                      isSelected
                        ? 'border-red-600 ring-2 ring-red-500/30 z-10 shadow-md'
                        : isToday
                        ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/30 ring-1 ring-amber-400'
                        : cell.isCurrentMonth
                        ? 'border-slate-200 dark:border-slate-700/80 hover:border-red-400 dark:hover:border-slate-500'
                        : 'opacity-40 border-transparent bg-slate-50 dark:bg-slate-900'
                    }`}
                  >
                    {/* Top Row: Day Number & Event Count Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ${
                          isToday
                            ? 'bg-red-600 text-white font-black shadow-xs'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {dayEvents.length} saved
                        </span>
                      )}
                    </div>

                    {/* Cell Body: Detailed Badges for EVERY Saved Item on this Date */}
                    <div className="space-y-1 my-1 overflow-hidden flex-1">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] font-bold leading-tight p-1 rounded-md border truncate transition ${ev.badgeColor}`}
                          title={`${ev.title} — ${ev.action}`}
                        >
                          <div className="truncate font-black">
                            {ev.type === 'TEST' && '🚗 Test: '}
                            {ev.type === 'FOLLOWUP' && '📞 FU: '}
                            {ev.type === 'CLASS' && '🎓 Class: '}
                            {ev.type === 'REGISTRATION' && '👤 Reg: '}
                            {ev.studentName}
                          </div>
                          {ev.action && (
                            <div className="text-[9px] font-medium truncate opacity-90">
                              {ev.action}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Bottom Indicator if Cell Has Events */}
                    {dayEvents.length > 0 && (
                      <div className="text-[9px] font-black text-red-600 dark:text-red-400 text-right underline">
                        Click for full view →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EVENT LEDGER VIEW & SELECTED DATE LIST */}
        {(activeTab === 'followup_list' || selectedDateStr) && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-600" />
                  {selectedDateStr ? `Saved Records for ${selectedDateStr}` : 'Complete Saved Events Ledger'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Displayed: {filteredEventsList.length} saved record(s)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative w-56">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidate / class / phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Event Type Filter Buttons */}
                <div className="flex items-center gap-1">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'TEST', label: 'RTO Tests' },
                    { id: 'FOLLOWUP', label: 'Follow-ups' },
                    { id: 'CLASS', label: 'Classes' },
                    { id: 'REGISTRATION', label: 'New Admissions' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setEventTypeFilter(f.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                        eventTypeFilter === f.id
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {selectedDateStr && (
                  <button
                    onClick={() => { setSelectedDateStr(null); setViewingDateDetails(null); }}
                    className="text-xs font-bold text-red-600 hover:underline ml-2"
                  >
                    Clear Selected Date
                  </button>
                )}
              </div>
            </div>

            {/* Events List Table */}
            {loading ? (
              <div className="p-12 flex justify-center">
                <LoadingSpinner message="Loading saved date events..." />
              </div>
            ) : filteredEventsList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                No records saved for this date or criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">Saved Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Candidate / Item Title</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Details & Saved Actions</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-xs">
                    {filteredEventsList.map((ev) => (
                      <tr
                        key={ev.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition"
                      >
                        {/* Saved Date */}
                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                          {new Date(ev.dateStr).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase ${ev.badgeColor}`}>
                            {ev.type === 'TEST' && '🚗 RTO Test'}
                            {ev.type === 'FOLLOWUP' && '📞 Follow Up'}
                            {ev.type === 'CLASS' && '🎓 Class'}
                            {ev.type === 'REGISTRATION' && '👤 Admission'}
                          </span>
                        </td>

                        {/* Title / Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {ev.studentName || ev.title}
                          </div>
                          {ev.code && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              ID: {ev.code}
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          {ev.phone ? (
                            <a
                              href={`tel:${ev.phone}`}
                              className="flex items-center gap-1.5 font-bold text-red-600 hover:underline"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                              <span>{ev.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">N/A</span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {ev.action}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ev.studentId && (
                              <button
                                onClick={() => navigate(`/students/${ev.studentId}`)}
                                title="View Candidate Profile"
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {ev.rawStudent && (
                              <button
                                onClick={() => handleOpenActionModal(ev.rawStudent)}
                                title="Update Follow-up Details"
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Full Details Modal for Selected Date */}
        {viewingDateDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-red-600" />
                    Everything Saved on {viewingDateDetails}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing all saved tests, follow-ups, registrations, and class sessions for this date.
                  </p>
                </div>
                <button
                  onClick={() => setViewingDateDetails(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                {(eventsByDateMap[viewingDateDetails] || []).map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${ev.badgeColor}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase">
                          {ev.type === 'TEST' && '🚗 RTO Test'}
                          {ev.type === 'FOLLOWUP' && '📞 Follow Up Call'}
                          {ev.type === 'CLASS' && '🎓 Training Session'}
                          {ev.type === 'REGISTRATION' && '👤 New Candidate Admission'}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {ev.studentName || ev.title}
                      </h4>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {ev.action}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev.phone && (
                        <a
                          href={`tel:${ev.phone}`}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition"
                        >
                          Call
                        </a>
                      )}
                      {ev.studentId && (
                        <button
                          onClick={() => { setViewingDateDetails(null); navigate(`/students/${ev.studentId}`); }}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setViewingDateDetails(null)}
                  className="px-4 py-2 font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule & Follow-Up Update Modal */}
        {actionStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Update Candidate Follow-Up
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {actionStudent.fullName} ({actionStudent.studentId})
                  </p>
                </div>
                <button
                  onClick={() => setActionStudent(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFollowUp} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={modalFollowUpDate}
                    onChange={(e) => setModalFollowUpDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Next Required Action / Remark
                  </label>
                  <textarea
                    rows={3}
                    value={modalNextAction}
                    onChange={(e) => setModalNextAction(e.target.value)}
                    placeholder="e.g. Called candidate, confirmed slot for Thursday..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActionStudent(null)}
                    className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingModal}
                    className="px-5 py-2 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
                  >
                    {savingModal ? 'Saving...' : 'Save Follow-Up'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CalendarFollowUpPage;
