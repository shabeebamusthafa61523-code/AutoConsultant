import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { Printer, ExternalLink, Download, MessageCircle } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, payment, student }) => {
  const receiptPrintRef = useRef(null);

  if (!payment) return null;

  const stu = payment.student && typeof payment.student === 'object' ? payment.student : student || {};
  const totalFee = Number(stu.totalFee) || 0;
  const paidAmount = Number(payment.amount) || 0;

  const isFeePayment =
    !payment.paymentType ||
    payment.paymentType === 'Fee Payment' ||
    payment.paymentType === 'Advance Payment';

  const prevBal =
    payment.previousBalance !== undefined
      ? Number(payment.previousBalance)
      : Math.max(0, totalFee - ((Number(stu.paidAmount) || 0) + (Number(stu.advanceAmount) || 0)) + paidAmount);

  const remBal =
    payment.balanceAfter !== undefined
      ? Number(payment.balanceAfter)
      : Math.max(0, prevBal - paidAmount);

  const receiptNumber =
    payment.receiptNo || payment.paymentId || `REC-${String(payment._id || '0000').slice(-4).toUpperCase()}`;

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Fee Payment Receipt" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Printable Receipt Paper Container */}
        <div
          ref={receiptPrintRef}
          className="bg-white text-slate-900 p-6 rounded-lg border border-slate-200 shadow-xs space-y-4 font-sans print:p-0 print:border-none print:shadow-none"
        >
          {/* Organization Header with Logo */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="BENZ Driving School Logo"
                className="h-14 w-auto object-contain max-w-[120px]"
              />
              <div>
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  RAZAIN-BENZ AUTO CONSULTANT
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  Government Approved Motor Driving School & RTO Consultancy
                </p>
                <p className="text-[10px] text-slate-500">
                  West Kodur, Malappuram, Kerala &bull; Phone: +91 62828 92320 / 62384 54540
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 inline-block">
                RECEIPT
              </span>
              <span className="font-mono text-sm font-black text-red-600 block mt-1">
                {receiptNumber}
              </span>
            </div>
          </div>

          {/* Candidate & Transaction Meta Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Candidate Details
              </span>
              <p className="font-bold text-sm text-slate-900">{stu.fullName || 'Student'}</p>
              <p className="font-mono text-slate-600">ID: {stu.studentId || '—'}</p>
              {payment.applicationId && (
                <p className="font-mono text-slate-600">App ID: {payment.applicationId}</p>
              )}
              <p className="text-slate-600">Mobile: {stu.primaryMobile || '—'}</p>
              <p className="text-slate-600">
                Course: {stu.coursePackage || stu.vehicleType || 'LMV Fresh Licence'}
              </p>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Transaction Details
              </span>
              <p className="font-semibold text-slate-700">
                Date:{' '}
                <strong className="font-mono">
                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '—'}
                </strong>
              </p>
              <p className="text-slate-600">
                Payment Mode: <strong className="font-semibold">{payment.paymentMethod || 'Cash'}</strong>
              </p>
              {payment.receivedBy && (
                <p className="text-slate-600">
                  Received By: <strong className="font-semibold">{payment.receivedBy}</strong>
                </p>
              )}
              <p className="text-slate-600">
                Type: <strong className="font-semibold">{payment.paymentType || 'Fee Payment'}</strong>
              </p>
              {payment.reference && (
                <p className="font-mono text-[11px] text-slate-500">Ref: {payment.reference}</p>
              )}
            </div>
          </div>

          {/* Financial Ledger Breakdown Table */}
          <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payment.feeBreakdown?.packageFee ? (
                  <>
                    <tr>
                      <td className="p-2.5 text-slate-600">Package Fee</td>
                      <td className="p-2.5 text-right font-mono font-semibold">₹ {payment.feeBreakdown.packageFee.toLocaleString('en-IN')}</td>
                    </tr>
                    {payment.feeBreakdown.rtoServiceFee > 0 && (
                      <tr>
                        <td className="p-2.5 text-slate-600">RTO / Service Fee</td>
                        <td className="p-2.5 text-right font-mono font-semibold">₹ {payment.feeBreakdown.rtoServiceFee.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {payment.feeBreakdown.retestFee > 0 && (
                      <tr>
                        <td className="p-2.5 text-slate-600">Retest Fee</td>
                        <td className="p-2.5 text-right font-mono font-semibold">₹ {payment.feeBreakdown.retestFee.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    {payment.feeBreakdown.discount > 0 && (
                      <tr>
                        <td className="p-2.5 text-emerald-700 font-medium">Discount Deducted</td>
                        <td className="p-2.5 text-right font-mono text-emerald-700 font-semibold">- ₹ {payment.feeBreakdown.discount.toLocaleString('en-IN')}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5 text-slate-800">Net Payable</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹ {payment.feeBreakdown.netPayable.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold text-slate-900">
                      <td className="p-2.5 text-emerald-800">
                        Amount Paid Now ({payment.paymentType || 'Receipt'})
                      </td>
                      <td className="p-2.5 text-right font-mono text-base text-emerald-700 font-black">
                        ₹ {paidAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5 text-slate-800">Remaining Balance Due</td>
                      <td
                        className={`p-2.5 text-right font-mono text-sm font-black ${
                          (payment.feeBreakdown.balanceDue || remBal) > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        ₹ {(payment.feeBreakdown.balanceDue !== undefined ? payment.feeBreakdown.balanceDue : remBal).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </>
                ) : isFeePayment ? (
                  <>
                    <tr>
                      <td className="p-2.5 text-slate-600">Total Enrolled Course Fee</td>
                      <td className="p-2.5 text-right font-mono font-semibold">₹ {totalFee.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-600">Previous Outstanding Balance</td>
                      <td className="p-2.5 text-right font-mono font-semibold">₹ {prevBal.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold text-slate-900">
                      <td className="p-2.5 text-emerald-800">
                        Amount Paid Now ({payment.paymentType || 'Fee Receipt'})
                      </td>
                      <td className="p-2.5 text-right font-mono text-base text-emerald-700 font-black">
                        ₹ {paidAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5 text-slate-800">Remaining Balance Due</td>
                      <td
                        className={`p-2.5 text-right font-mono text-sm font-black ${
                          remBal > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        ₹ {remBal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr className="bg-emerald-50/60 font-bold text-slate-900">
                    <td className="p-2.5 text-emerald-800">
                      {payment.paymentType || 'Item Payment'} ({payment.paymentMethod || 'Cash'})
                    </td>
                    <td className="p-2.5 text-right font-mono text-base text-emerald-700 font-black">
                      ₹ {paidAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {payment.notes && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
              <span className="font-bold text-slate-800">Remarks: </span>
              {payment.notes}
            </div>
          )}

          {/* Footer Auth Sign */}
          <div className="pt-4 flex justify-between items-end text-[10px] text-slate-400">
            <div>
              <p>Generated by BENZ Management System</p>
              <p>This is a computer-generated official receipt.</p>
            </div>
            <div className="text-right border-t border-slate-400 pt-1 w-36">
              <p className="font-bold text-slate-700 text-xs">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          {stu._id ? (
            <Link
              to={`/students/${stu._id}`}
              className="text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 flex items-center gap-1"
            >
              <ExternalLink size={14} />
              <span>View Candidate Full Profile</span>
            </Link>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Close
            </button>
            {stu.primaryMobile && (
              <a
                href={`https://wa.me/${(stu.primaryMobile || '').replace(/\D/g, '').length === 10 ? '91' + (stu.primaryMobile || '').replace(/\D/g, '') : (stu.primaryMobile || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Dear ${stu.fullName || 'Candidate'}, your payment of ₹${paidAmount} has been successfully recorded at BENZ Auto Consultant (Receipt No: ${receiptNumber}, Mode: ${payment.paymentMethod || 'Cash'}). Remaining Balance: ₹${remBal}. Thank you!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-sm"
                title="Send Official Receipt via WhatsApp"
              >
                <MessageCircle size={15} />
                <span>WhatsApp Receipt</span>
              </a>
            )}
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-sm"
              title="Print or Save Receipt as PDF"
            >
              <Printer size={15} />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition flex items-center gap-1.5 shadow-sm"
              title="Export Receipt to PDF"
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
