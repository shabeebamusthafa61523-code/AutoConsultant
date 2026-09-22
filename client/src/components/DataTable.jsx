import React from 'react';

const DataTable = ({ columns, data, keyField = '_id', emptyMessage = 'No records found' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 text-center border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
          {data.map((row, rowIdx) => (
            <tr key={row[keyField] || rowIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
