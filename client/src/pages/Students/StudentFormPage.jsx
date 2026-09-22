import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { createStudent, getStudentById, updateStudent } from '../../services/studentService';
import { getBatches } from '../../services/batchService';
import { Save, X, ArrowLeft } from 'lucide-react';

const StudentFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    aliasSourceName: '',
    primaryMobile: '',
    alternateMobile: '',
    dob: '',
    licenceServiceType: 'Fresh Licence',
    vehicleType: '4 Wheeler',
    applicationNo: '',
    registrationDate: new Date().toISOString().split('T')[0],
    licenceCategory: 'LMV',
    batch: '',
    workflowStage: 'Registration',
    currentStatus: 'Active',
    applicationOpen: true,
    newApplication: true,
    nextAction: '',
    followUpDate: '',
    testDate: '',
    testStatus: 'Not Scheduled',
    totalFee: 0,
    paidAmount: 0,
    advanceAmount: 0,
    documentReadiness: {
      aadhaarVerified: false,
      photoVerified: false,
      addressProofVerified: false,
      bloodGroupRecorded: false,
      form15Ready: false
    },
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const batchList = await getBatches();
        setBatches(batchList || []);

        if (isEdit) {
          const student = await getStudentById(id);
          setFormData({
            ...student,
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
            registrationDate: student.registrationDate ? new Date(student.registrationDate).toISOString().split('T')[0] : '',
            followUpDate: student.followUpDate ? new Date(student.followUpDate).toISOString().split('T')[0] : '',
            testDate: student.testDate ? new Date(student.testDate).toISOString().split('T')[0] : '',
            batch: student.batch ? (typeof student.batch === 'object' ? student.batch._id : student.batch) : '',
            documentReadiness: student.documentReadiness || {
              aadhaarVerified: false,
              photoVerified: false,
              addressProofVerified: false,
              bloodGroupRecorded: false,
              form15Ready: false
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name.startsWith('doc_')) {
        const docKey = name.replace('doc_', '');
        setFormData(prev => ({
          ...prev,
          documentReadiness: {
            ...prev.documentReadiness,
            [docKey]: checked
          }
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Dynamic balance calculation
  const totalFeeNum = Number(formData.totalFee) || 0;
  const paidNum = Number(formData.paidAmount) || 0;
  const advanceNum = Number(formData.advanceAmount) || 0;
  const calculatedBalance = totalFeeNum - paidNum - advanceNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.primaryMobile.trim()) {
      alert('Full Name and Primary Mobile are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        ...formData,
        totalFee: totalFeeNum,
        paidAmount: paidNum,
        advanceAmount: advanceNum,
        batch: formData.batch || null,
        followUpDate: formData.followUpDate || null,
        testDate: formData.testDate || null,
        dob: formData.dob || null
      };

      if (isEdit) {
        await updateStudent(id, payload);
      } else {
        await createStudent(payload);
      }
      navigate('/students');
    } catch (err) {
      setError(err.message || 'Failed to save student record');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title={isEdit ? 'Edit Student' : 'Add New Student'} />
        <LoadingSpinner message="Loading student details..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Navbar title={isEdit ? `Edit Student: ${formData.studentId || ''}` : 'Add New Student'} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-between">
          <Link
            to="/students"
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back to Students
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md transition flex items-center gap-2 shadow-sm"
            >
              <Save size={18} />
              {submitting ? 'Saving...' : isEdit ? 'Update Student' : 'Save Student'}
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* SECTION 1: Basic Details */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
            1. Basic Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student ID (Auto)</label>
                <input
                  type="text"
                  value={formData.studentId || ''}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm font-mono font-bold text-indigo-700"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alias / Source Name</label>
              <input
                type="text"
                name="aliasSourceName"
                value={formData.aliasSourceName}
                onChange={handleChange}
                placeholder="e.g. Walk-in, Website, Referral"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Primary Mobile <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="primaryMobile"
                required
                value={formData.primaryMobile}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alternate Mobile</label>
              <input
                type="text"
                name="alternateMobile"
                value={formData.alternateMobile}
                onChange={handleChange}
                placeholder="Alternate contact"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Licence / Service */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
            2. Licence & Service Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Licence / Service Type</label>
              <input
                type="text"
                name="licenceServiceType"
                value={formData.licenceServiceType}
                onChange={handleChange}
                placeholder="e.g. Fresh Licence, Renewal"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Type</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
                <option value="Both">Both (2 & 4 Wheeler)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Licence Category</label>
              <input
                type="text"
                name="licenceCategory"
                value={formData.licenceCategory}
                onChange={handleChange}
                placeholder="e.g. LMV, MCWG, HMV"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Application No.</label>
              <input
                type="text"
                name="applicationNo"
                value={formData.applicationNo}
                onChange={handleChange}
                placeholder="RTO Application Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Date</label>
              <input
                type="date"
                name="registrationDate"
                value={formData.registrationDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Batch & Workflow */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
            3. Batch & Workflow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Batch</label>
              <select
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Batch --</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.vehicleType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Workflow Stage</label>
              <select
                name="workflowStage"
                value={formData.workflowStage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Registration">Registration</option>
                <option value="LL Approved">LL Approved</option>
                <option value="DL Training">DL Training</option>
                <option value="DL Test Scheduled">DL Test Scheduled</option>
                <option value="DL Issued">DL Issued</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Current Status</label>
              <select
                name="currentStatus"
                value={formData.currentStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Next Action</label>
              <input
                type="text"
                name="nextAction"
                value={formData.nextAction}
                onChange={handleChange}
                placeholder="e.g. Schedule Class 3"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Follow-up Date</label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Test Date</label>
              <input
                type="date"
                name="testDate"
                value={formData.testDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Test Status</label>
              <select
                name="testStatus"
                value={formData.testStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Not Scheduled">Not Scheduled</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: Fee Details & Dynamic Balance */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
            4. Fee Details & Dynamic Balance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Total Fee (₹)</label>
              <input
                type="number"
                name="totalFee"
                min="0"
                value={formData.totalFee}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Paid Amount (₹)</label>
              <input
                type="number"
                name="paidAmount"
                min="0"
                value={formData.paidAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advance Amount (₹)</label>
              <input
                type="number"
                name="advanceAmount"
                min="0"
                value={formData.advanceAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-500">Calculated Balance</span>
              <span className={`text-lg font-bold ${calculatedBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹ {calculatedBalance}
              </span>
              <span className="text-[10px] text-slate-400">Total Fee - Paid - Advance</span>
            </div>
          </div>
        </div>

        {/* SECTION 5: Document / Form Readiness */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
            5. Document & Verification Checkboxes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'doc_aadhaarVerified', label: 'Aadhaar / ID Verified' },
              { id: 'doc_photoVerified', label: 'Photo Verified' },
              { id: 'doc_addressProofVerified', label: 'Address Proof Verified' },
              { id: 'doc_bloodGroupRecorded', label: 'Blood Group Recorded' },
              { id: 'doc_form15Ready', label: 'Form 15 Ready' }
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  name={item.id}
                  checked={Boolean(formData.documentReadiness?.[item.id.replace('doc_', '')])}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SECTION 6: Notes */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
            6. Additional Notes
          </h3>
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter any additional remarks, special requests, or progress notes..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md transition flex items-center gap-2 shadow-sm"
          >
            <Save size={18} />
            {submitting ? 'Saving...' : isEdit ? 'Update Student' : 'Save Student'}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default StudentFormPage;
