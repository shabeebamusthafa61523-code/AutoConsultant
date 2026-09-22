import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Navbar = ({ title }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3.5 flex items-center justify-between shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Interactive Light / Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-xs font-bold shadow-xs cursor-pointer"
        >
          {isDark ? (
            <>
              <Sun size={16} className="text-amber-400 animate-spin-slow" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={16} className="text-slate-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Live Status Badge */}
        <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
          <span className="text-slate-800 dark:text-slate-200">BENZ Live</span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-red-600 font-bold">West Kodur</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
