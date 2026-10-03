import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { globalSearch } from '../services/studentService';
import {
  Sun,
  Moon,
  Search,
  X,
  User,
  Layers,
  ChevronRight,
  Phone,
  AlertCircle,
  Loader2
} from 'lucide-react';

const Navbar = ({ title }) => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await globalSearch(searchQuery.trim());
        setSearchResults(res.results || []);
        setDropdownOpen(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item) => {
    setDropdownOpen(false);
    setSearchQuery('');
    if (item.studentMongoId) {
      navigate(`/students/${item.studentMongoId}`);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between shadow-xs transition-colors duration-200 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h2>
      </div>

      {/* Global Real-Time Search Bar */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setDropdownOpen(true)}
            placeholder="Search candidate by Name, Phone, Student ID, App ID, LL, DL..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white dark:focus:bg-slate-900 transition"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setDropdownOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown Overlay */}
        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-850 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in duration-150">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center text-[11px] text-slate-400">
              <span className="font-bold uppercase tracking-wider">Search Results</span>
              {isSearching && (
                <span className="flex items-center gap-1 text-red-600">
                  <Loader2 size={11} className="animate-spin" /> Searching...
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750">
              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {isSearching ? 'Searching database...' : `No records found matching "${searchQuery}".`}
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectResult(item)}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition truncate">
                          {item.studentName}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.2 rounded border border-red-200 dark:border-red-900">
                          {item.studentId}
                        </span>
                        {item.applicationId && item.applicationId !== 'N/A' && (
                          <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-900">
                            {item.applicationId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone size={11} className="text-slate-400" />
                          {item.mobile}
                        </span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {item.currentStatus || 'Registered'}
                        </span>
                        {item.balance !== undefined && (
                          <>
                            <span>&bull;</span>
                            <span className={item.balance > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                              Due: ₹{item.balance}
                            </span>
                          </>
                        )}
                      </div>

                      {item.nextAction && item.nextAction !== 'N/A' && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                          Next: {item.nextAction}
                        </p>
                      )}
                    </div>

                    <ChevronRight size={15} className="text-slate-400 group-hover:text-red-600 shrink-0 transition" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-xs font-bold shadow-xs cursor-pointer"
        >
          {isDark ? (
            <>
              <Sun size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={15} className="text-slate-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Live Status Badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          <span className="text-slate-800 dark:text-slate-200">BENZ OS</span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-red-600 font-bold">West Kodur</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
