import React, { useRef } from 'react';
import Modal from './Modal';
import { Printer, Download, Award, Car, CheckCircle } from 'lucide-react';

const ClassSlipModal = ({ isOpen, onClose, data }) => {
  const printRef = useRef(null);

  if (!data) return null;

  const { student = {}, application = {}, roadTraining = [], hPractice = [], summary = {} } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Student Class Slip / Training Log" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Printable Certificate/Slip Container */}
        <div
          ref={printRef}
          className="bg-white text-slate-900 p-6 rounded-lg border border-slate-200 shadow-xs space-y-5 font-sans print:p-0 print:border-none print:shadow-none"
        >
          {/* Header Banner */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="BENZ Logo"
                className="h-14 w-auto object-contain max-w-[120px]"
              />
              <div>
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  BENZ AUTO CONSULTANT & DRIVING SCHOOL
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  West Kodur, Malappuram, Kerala &bull; Official Practical Training Slip
                </p>
                <p className="text-[10px] text-slate-500">
                  Government Approved &bull; Reg No: BENZ-KL10-MVD &bull; Phone: +91 98471 23456
                </p>
              </div>
            </div>
            <div className="text-right border-l pl-4 border-slate-200">
              <span className="px-2.5 py-1 bg-red-600 text-white font-black text-[10px] rounded uppercase tracking-wider block text-center">
                Class Slip
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Date: {new Date().toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Student & Application Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Candidate Name</p>
              <p className="font-extrabold text-slate-900">{student.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Student ID</p>
              <p className="font-mono font-bold text-red-600">{student.studentId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Application ID</p>
              <p className="font-mono font-bold text-slate-800">{application.applicationId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Course / Package</p>
              <p className="font-semibold text-slate-800">{student.coursePackage || 'LMV+MCWG'}</p>
            </div>
          </div>

          {/* ROAD TRAINING LEDGER TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <Car size={14} className="text-red-600" />
              <span>1. Road Training Log (5 KM = 1 Road Class)</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="px-2.5 py-1.5">#</th>
                    <th className="px-2.5 py-1.5">Date</th>
                    <th className="px-2.5 py-1.5">KM Start</th>
                    <th className="px-2.5 py-1.5">KM End</th>
                    <th className="px-2.5 py-1.5">KM Driven</th>
                    <th className="px-2.5 py-1.5">Duration</th>
                    <th className="px-2.5 py-1.5">Vehicle</th>
                    <th className="px-2.5 py-1.5">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roadTraining.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-2.5 py-2 text-center text-slate-400 italic">
                        No road driving classes logged yet.
                      </td>
                    </tr>
                  ) : (
                    roadTraining.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-2.5 py-1.5 font-mono text-slate-400">{i + 1}</td>
                        <td className="px-2.5 py-1.5 font-medium">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-2.5 py-1.5 font-mono">{r.kmStart || '-'}</td>
                        <td className="px-2.5 py-1.5 font-mono">{r.kmEnd || '-'}</td>
                        <td className="px-2.5 py-1.5 font-bold font-mono text-red-600">{r.kmDriven} KM</td>
                        <td className="px-2.5 py-1.5">{r.duration} min</td>
                        <td className="px-2.5 py-1.5">{r.vehicle}</td>
                        <td className="px-2.5 py-1.5">{r.instructor}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* H PRACTICE LEDGER TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <Award size={14} className="text-emerald-600" />
              <span>2. H Track Practice Log (3 H Practices = 1 H Class)</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="px-2.5 py-1.5">#</th>
                    <th className="px-2.5 py-1.5">Date</th>
                    <th className="px-2.5 py-1.5">H Practice Count</th>
                    <th className="px-2.5 py-1.5">Duration</th>
                    <th className="px-2.5 py-1.5">Instructor</th>
                    <th className="px-2.5 py-1.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hPractice.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-2.5 py-2 text-center text-slate-400 italic">
                        No H track practice sessions logged yet.
                      </td>
                    </tr>
                  ) : (
                    hPractice.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-2.5 py-1.5 font-mono text-slate-400">{i + 1}</td>
                        <td className="px-2.5 py-1.5 font-medium">{new Date(h.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-2.5 py-1.5 font-bold font-mono text-emerald-600">{h.hPracticeCount} Tracks</td>
                        <td className="px-2.5 py-1.5">{h.duration} min</td>
                        <td className="px-2.5 py-1.5">{h.instructor}</td>
                        <td className="px-2.5 py-1.5 text-slate-500">{h.remarks || 'Cleared'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AUTOMATIC SUMMARY CARD */}
          <div className="bg-slate-900 text-white p-4 rounded-lg grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="border-r border-slate-700/60 pr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total KM Driven</p>
              <p className="text-base font-black font-mono text-white">{summary.totalKm || 0} KM</p>
            </div>
            <div className="border-r border-slate-700/60 pr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Road Classes</p>
              <p className="text-base font-black font-mono text-red-400">{summary.roadClasses || 0}</p>
            </div>
            <div className="border-r border-slate-700/60 pr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total H Practices</p>
              <p className="text-base font-black font-mono text-white">{summary.totalHPractices || 0}</p>
            </div>
            <div className="border-r border-slate-700/60 pr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase">H Classes</p>
              <p className="text-base font-black font-mono text-emerald-400">{summary.hClasses || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Classes</p>
              <p className="text-lg font-black font-mono text-amber-400">{summary.totalClasses || 0}</p>
            </div>
          </div>

          {/* Signature / Validation Footer */}
          <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs text-slate-600">
            <div>
              <p className="font-semibold">Candidate Signature</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-36 mt-1"></div>
            </div>
            <div className="text-right">
              <p className="font-semibold">Authorized Chief Instructor / MD</p>
              <div className="h-10 border-b border-dashed border-slate-400 w-44 mt-1 ml-auto"></div>
              <p className="text-[10px] text-slate-400 mt-1">RAZAIN-BENZ Driving School</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Printer size={15} />
            <span>Download PDF / Print Slip</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ClassSlipModal;
