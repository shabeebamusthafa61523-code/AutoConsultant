import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'red', subtitle }) => {
  const colorStyles = {
    red: 'bg-red-50 text-red-600 border-red-200',
    dark: 'bg-slate-100 text-slate-800 border-slate-300',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:border-red-200 transition">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value !== undefined && value !== null ? value : 0}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg border ${colorStyles[color] || colorStyles.red}`}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
