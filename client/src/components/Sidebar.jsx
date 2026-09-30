import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  HelpCircle,
  CreditCard,
  Receipt,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
  Car,
  FileCheck,
  AlertCircle,
  GitPullRequest,
  BookOpen,
  TrendingDown,
  Clock,
  Briefcase
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const navSections = [
    {
      title: 'MAIN NAVIGATION',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Students', path: '/students', icon: Users },
        { label: 'Workflow Control', path: '/workflow', icon: GitPullRequest },
        { label: 'Calendar / Follow-Up', path: '/calendar', icon: CalendarCheck },
        { label: 'Enquiries', path: '/enquiries', icon: HelpCircle }
      ]
    },
    {
      title: 'FINANCIALS & LEDGER',
      items: [
        { label: 'Payment & Receipts', path: '/payments', icon: CreditCard },
        { label: 'Student Ledger', path: '/student-ledger', icon: BookOpen },
        { label: 'Daily Collection', path: '/daily-collection', icon: CalendarCheck },
        { label: 'Expenses', path: '/expenses', icon: TrendingDown },
        { label: 'Refund / Credit / Debit Notes', path: '/refund-notes', icon: Receipt },
        { label: 'Services', path: '/services', icon: Briefcase }
      ]
    },
    {
      title: 'TRAINING & FLEET',
      items: [
        { label: 'Batches', path: '/batches', icon: Layers },
        { label: 'Class Register', path: '/classes?tab=ledger', icon: CalendarCheck },
        { label: 'Class Timetable', path: '/classes?tab=schedules', icon: Clock },
        { label: 'Instructors', path: '/instructors', icon: GraduationCap },
        { label: 'Vehicles', path: '/vehicles', icon: Car }
      ]
    },
    {
      title: 'RECORDS & ADMIN',
      items: [
        { label: 'Student Documents', path: '/student-documents', icon: FileCheck },
        { label: 'Complaints', path: '/complaints', icon: AlertCircle },
        { label: 'Users', path: '/users', icon: UserCheck }
      ]
    }
  ];

  return (
    <aside
      className={`sticky top-0 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Toggle Arrow Button (In / Out) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        className="absolute -right-3 top-6 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-md text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-full transition-all z-20"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* BENZ Logo Header (Image Only) */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
        <img
          src="/logo.png"
          alt="BENZ Driving School"
          className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'h-16 w-auto max-w-full'}`}
        />
      </div>

      {/* Categorized Navigation Menu - Hidden Scrollbar */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar min-h-0">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed ? (
              <h4 className="px-3.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </h4>
            ) : (
              idx > 0 && <div className="my-2 border-t border-slate-100 dark:border-slate-700/60" />
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const currentPathWithSearch = window.location.pathname + window.location.search;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) => {
                    const isItemActive = item.path.includes('?')
                      ? currentPathWithSearch === item.path
                      : (isActive && !window.location.search.includes('tab='));

                    return `flex items-center gap-3 px-3.5 py-2 rounded-md text-xs font-semibold transition ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      isItemActive
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold border-l-4 border-red-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                    }`;
                  }}
                >
                  <Icon size={18} className="shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Info & Actions at Sidebar Bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 space-y-2 shrink-0">
        {!isCollapsed && user && (
          <div className="px-2 py-1 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{user.name || 'User'}</p>
            <p className="text-[10px] text-red-600 font-bold uppercase">{user.role || 'Superadmin'}</p>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out of BENZ Portal"
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 transition ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={16} className="shrink-0 text-red-600" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
