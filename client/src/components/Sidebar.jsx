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
  AlertCircle
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Batches', path: '/batches', icon: Layers },
    { label: 'Classes', path: '/classes', icon: CalendarCheck },
    { label: 'Instructors', path: '/instructors', icon: GraduationCap },
    { label: 'Vehicles', path: '/vehicles', icon: Car },
    { label: 'Student Documents', path: '/student-documents', icon: FileCheck },
    { label: 'Complaints', path: '/complaints', icon: AlertCircle },
    { label: 'Enquiries', path: '/enquiries', icon: HelpCircle },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Course Fee', path: '/course-fees', icon: Receipt },
    { label: 'Users', path: '/users', icon: UserCheck }
  ];

  return (
    <aside
      className={`relative bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-sm ${
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
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="BENZ Driving School"
          className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'h-16 w-auto max-w-full'}`}
        />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold border-l-4 border-red-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Actions at Sidebar Bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 space-y-2">
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
