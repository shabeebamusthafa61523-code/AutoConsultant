import React from 'react';

const Navbar = ({ title }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2.5 text-xs text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
        <span className="text-slate-800">BENZ Live</span>
        <span className="text-slate-400">&bull;</span>
        <span className="text-red-600">West Kodur</span>
      </div>
    </header>
  );
};

export default Navbar;
