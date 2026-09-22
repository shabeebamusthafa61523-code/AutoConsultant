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
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Batches', path: '/batches', icon: Layers },
    { label: 'Classes', path: '/classes', icon: CalendarCheck },
    { label: 'Enquiries', path: '/enquiries', icon: HelpCircle },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Users', path: '/users', icon: UserCheck }
  ];

  return (
    <aside
      className={`relative bg-white border-r border-slate-200 min-h-screen flex flex-col shrink-0 transition-all duration-300 ease-in-out shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Toggle Arrow Button (In / Out) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        className="absolute -right-3 top-6 bg-white border border-slate-300 shadow-md text-slate-700 hover:text-red-600 hover:border-red-500 p-1 rounded-full transition-all z-20"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* BENZ Logo Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-center">
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
                    ? 'bg-red-50 text-red-600 font-bold border-l-4 border-red-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Button at Sidebar Bottom */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80 space-y-2">
        {!isCollapsed && user && (
          <div className="px-2 py-1 text-xs">
            <p className="font-bold text-slate-900 truncate">{user.name || 'User'}</p>
            <p className="text-[10px] text-red-600 font-bold uppercase">{user.role || 'Superadmin'}</p>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign Out of BENZ Portal"
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-md text-xs font-bold text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition ${
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
