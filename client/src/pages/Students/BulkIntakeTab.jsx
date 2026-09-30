import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { bulkImportStudents } from '../../services/studentService';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  X,
  FileText,
  Building,
  Phone,
  DollarSign
} from 'lucide-react';

const BulkIntakeTab = ({ batches = [], onImportSuccess }) => {
  const [stagedStudents, setStagedStudents] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // Helper to sanitize Indian mobile numbers
  const cleanPhone = (val) => {
    if (!val) return '';
    let digits = String(val).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    return digits;
  };

  // 1. Download Sample Excel/CSV Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Full Name': 'Muhammed Niyas',
        'Mobile': '9876543210',
        'Gender': 'Male',
        'Vehicle Type': '4 Wheeler',
        'Course Package': 'LMV+MCWG (Fresh Licence)',
        'Total Fee': 9000,
        'Paid Amount': 3000,
        'Advance Amount': 0,
        'Batch Name': batches[0]?.name || 'Morning Batch A',
        'Address': 'West Kodur, Malappuram',
        'Notes': 'Fresh Admission via Bulk Intake'
      },
      {
        'Full Name': 'Fathima Suhra',
        'Mobile': '9847123456',
        'Gender': 'Female',
        'Vehicle Type': '2 Wheeler',
        'Course Package': 'MCWG Only',
        'Total Fee': 4500,
        'Paid Amount': 4500,
        'Advance Amount': 0,
        'Batch Name': batches[1]?.name || 'Evening Batch B',
        'Address': 'Kottakkal, Malappuram',
        'Notes': 'Full payment on admission'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Import');

    // Export file
    XLSX.writeFile(workbook, 'BENZ_Student_Bulk_Intake_Template.xlsx');
  };

  // 2. Parse Excel/CSV File
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setImportResult(null);
    setFileInfo({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setError('Uploaded spreadsheet is empty. Please check the file contents.');
          return;
        }

        // Map and normalize parsed rows
        const parsedRows = rawJson.map((row, index) => {
          const fullName = row['Full Name'] || row['fullName'] || row['Name'] || row['Student Name'] || row['Candidate Name'] || '';
          const primaryMobile = cleanPhone(row['Mobile'] || row['primaryMobile'] || row['Phone'] || row['Primary Mobile'] || row['Contact'] || '');
          const gender = ['Male', 'Female', 'Other'].includes(row['Gender'] || row['gender']) ? (row['Gender'] || row['gender']) : 'Male';
          const vehicleType = row['Vehicle Type'] || row['vehicleType'] || '4 Wheeler';
          const coursePackage = row['Course Package'] || row['coursePackage'] || row['Course'] || 'LMV+MCWG (Fresh Licence)';
          const totalFee = Number(row['Total Fee'] || row['totalFee'] || row['Course Fee'] || 9000);
          const paidAmount = Number(row['Paid Amount'] || row['paidAmount'] || row['Paid'] || 0);
          const advanceAmount = Number(row['Advance Amount'] || row['advanceAmount'] || row['Advance'] || 0);
          const batchName = row['Batch Name'] || row['batchName'] || row['Batch'] || '';
          const address = row['Address'] || row['address'] || '';
          const notes = row['Notes'] || row['notes'] || row['Remarks'] || 'Bulk Intake Import';

          // Basic validation flag
          const isValidMobile = /^[6-9]\d{9}$/.test(primaryMobile);
          const isValidName = fullName.trim().length >= 2;

          return {
            _tempId: `staged_${Date.now()}_${index}`,
            fullName,
            primaryMobile,
            gender,
            vehicleType,
            coursePackage,
            totalFee: isNaN(totalFee) ? 9000 : totalFee,
            paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
            advanceAmount: isNaN(advanceAmount) ? 0 : advanceAmount,
            batchName,
            address,
            notes,
            isValid: isValidName && isValidMobile,
            validationError: !isValidName ? 'Missing Name' : (!isValidMobile ? 'Invalid Mobile' : null)
          };
        });

        setStagedStudents(parsedRows);
      } catch (err) {
        setError('Failed to parse file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. Delete individual candidate from staged preview list
  const handleDeleteRow = (tempId) => {
    setStagedStudents((prev) => prev.filter((s) => s._tempId !== tempId));
  };

  // 4. Clear all staged records
  const handleClearAll = () => {
    setStagedStudents([]);
    setFileInfo(null);
    setError(null);
    setImportResult(null);
  };

  // 5. Submit Bulk Import to Backend API
  const handleConfirmImport = async () => {
    if (stagedStudents.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const res = await bulkImportStudents(stagedStudents);
      setImportResult(res);

      if (res.importedCount > 0) {
        setStagedStudents([]);
        if (onImportSuccess) onImportSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to complete bulk import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER & INSTRUCTIONS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 rounded-lg border border-slate-800 shadow-sm text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-red-600 text-[10px] font-black uppercase tracking-wider">
              Bulk Candidate Intake Hub
            </span>
            <span className="text-xs text-slate-400">&bull; Excel & CSV Batch Register</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            Upload & Batch Register Candidates
          </h2>
          <p className="text-xs text-slate-300">
            Upload your student spreadsheet, review staged rows, delete unwanted candidates, and batch import to MongoDB Atlas.
          </p>
        </div>

        {/* Download Sample Template */}
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-xs font-bold transition flex items-center gap-2 shrink-0 border border-slate-600 shadow-xs"
        >
          <Download size={15} className="text-emerald-400" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {/* ERROR / SUCCESS NOTICES */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-lg text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      )}

      {importResult && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle size={18} className="text-emerald-600" />
              <span>{importResult.message || `Imported ${importResult.importedCount} candidates successfully!`}</span>
            </div>
            <button onClick={() => setImportResult(null)} className="text-emerald-600 hover:text-emerald-800">
              <X size={16} />
            </button>
          </div>
          {importResult.skippedCount > 0 && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 dark:border-amber-900/30 space-y-1">
              <p className="font-bold">{importResult.skippedCount} record(s) were skipped (e.g. duplicate mobile numbers or missing fields):</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {importResult.skippedRecords?.slice(0, 5).map((sk, idx) => (
                  <li key={idx}>
                    Row {sk.row}: {sk.name || 'Candidate'} ({sk.mobile || 'No Phone'}) &bull; {sk.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* FILE UPLOAD & DROPZONE */}
      {stagedStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <FileSpreadsheet size={32} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
              Select or Drop Excel / CSV Student File
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports <span className="font-semibold text-slate-700 dark:text-slate-300">.xlsx, .xls, .csv</span> spreadsheets with headers (Full Name, Mobile, Gender, Vehicle Type, Total Fee, Paid Amount, Batch Name).
            </p>
          </div>

          <div className="pt-2">
            <label className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-sm transition cursor-pointer inline-flex items-center gap-2">
              <Upload size={16} />
              <span>Browse File to Upload</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        /* PRE-IMPORT STAGING TABLE WITH INDIVIDUAL DELETE BUTTON FOR EACH ROW */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-red-600" />
                Staged Candidate Preview ({stagedStudents.length} Records)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                File: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{fileInfo?.name}</span> ({fileInfo?.size}). Review and delete any unwanted rows before finalizing import.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-bold transition flex items-center gap-1"
              >
                <RefreshCw size={14} />
                <span>Clear & Re-upload</span>
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md font-bold transition shadow-sm flex items-center gap-2"
              >
                {loading ? (
                  <span>Importing...</span>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Import {stagedStudents.length} Candidates</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STAGING PREVIEW TABLE */}
          <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Full Name</th>
                  <th className="px-3 py-2.5">Mobile Number</th>
                  <th className="px-3 py-2.5">Gender</th>
                  <th className="px-3 py-2.5">Vehicle / Course</th>
                  <th className="px-3 py-2.5">Total Fee</th>
                  <th className="px-3 py-2.5">Paid / Advance</th>
                  <th className="px-3 py-2.5">Target Batch</th>
                  <th className="px-3 py-2.5">Validation</th>
                  <th className="px-3 py-2.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-800 dark:text-slate-200">
                {stagedStudents.map((row, index) => (
                  <tr
                    key={row._tempId}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition ${
                      !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">{index + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {row.fullName || <span className="text-rose-500 italic">Missing Name</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {row.primaryMobile ? (
                        <span>{row.primaryMobile}</span>
                      ) : (
                        <span className="text-rose-500 italic">Missing Mobile</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{row.gender}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {row.vehicleType} &bull; <span className="text-[11px] text-slate-400">{row.coursePackage}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹ {row.totalFee.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ₹ {row.paidAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-bold">
                      {row.batchName || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.isValid ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 font-bold text-[10px]">
                          Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 font-bold text-[10px]">
                          {row.validationError || 'Invalid Data'}
                        </span>
                      )}
                    </td>
                    {/* INDIVIDUAL DELETE BUTTON FOR EACH STAGED STUDENT */}
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteRow(row._tempId)}
                        title="Delete candidate from staging preview before import"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkIntakeTab;
