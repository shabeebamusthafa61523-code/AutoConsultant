import React from 'react';

const DataTable = ({ columns, data, keyField = '_id', emptyMessage = 'No records found' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-8 text-center border border-slate-200 rounded-lg text-slate-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {data.map((row, rowIdx) => (
            <tr key={row[keyField] || rowIdx} className="hover:bg-slate-50/80 transition">
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
