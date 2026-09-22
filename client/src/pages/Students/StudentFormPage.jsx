import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { createStudent, getStudentById, updateStudent } from '../../services/studentService';
import { getBatches } from '../../services/batchService';
import {
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Layers,
  ShieldCheck,
  Check,
  User,
  Info
} from 'lucide-react';

const StudentFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    // Section 1: Basic Information
    fullName: '',
    aliasSourceName: '',
    primaryMobile: '',
    alternateMobile: '',
    dob: '',

    // Section 2: Licence & Service
    licenceServiceType: 'Fresh Licence',
    vehicleType: '4 Wheeler',
    applicationNo: '',
    registrationDate: new Date().toISOString().split('T')[0],
    licenceCategory: 'LMV',
    newApplication: true,
    applicationOpen: true,

    // Section 3: Batch & Workflow
    batch: '',
    workflowStage: 'Registration',
    application: '',
    currentStatus: 'Active',
    nextAction: '',
    followUpDate: '',
    testDate: '',
    testStatus: 'Not Scheduled',

    // Section 4: Fees
    totalFee: 9000,
    paidAmount: 0,
    advanceAmount: 0,

    // Section 5: Document / Form Readiness
    documentReadiness: {
      aadhaarVerified: false,
      photoVerified: false,
      addressProofVerified: false,
      bloodGroupRecorded: false,
      form15Ready: false
    },

    // Section 6: Notes
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const batchList = await getBatches();
        setBatches(batchList || []);

        if (isEdit) {
          const student = await getStudentById(id);
          setFormData({
            fullName: student.fullName || '',
            aliasSourceName: student.aliasSourceName || '',
            primaryMobile: student.primaryMobile || '',
            alternateMobile: student.alternateMobile || '',
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
            licenceServiceType: student.licenceServiceType || 'Fresh Licence',
            vehicleType: student.vehicleType || '4 Wheeler',
            applicationNo: student.applicationNo || '',
            registrationDate: student.registrationDate ? new Date(student.registrationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            licenceCategory: student.licenceCategory || 'LMV',
            newApplication: student.newApplication !== undefined ? student.newApplication : true,
            applicationOpen: student.applicationOpen !== undefined ? student.applicationOpen : true,
            batch: student.batch ? (typeof student.batch === 'object' ? student.batch._id : student.batch) : '',
            workflowStage: student.workflowStage || 'Registration',
            application: student.application || '',
            currentStatus: student.currentStatus || 'Active',
            nextAction: student.nextAction || '',
            followUpDate: student.followUpDate ? new Date(student.followUpDate).toISOString().split('T')[0] : '',
            testDate: student.testDate ? new Date(student.testDate).toISOString().split('T')[0] : '',
            testStatus: student.testStatus || 'Not Scheduled',
            totalFee: student.totalFee !== undefined ? student.totalFee : 9000,
            paidAmount: student.paidAmount || 0,
            advanceAmount: student.advanceAmount || 0,
            documentReadiness: student.documentReadiness || {
              aadhaarVerified: false,
              photoVerified: false,
              addressProofVerified: false,
              bloodGroupRecorded: false,
              form15Ready: false
            },
            notes: student.notes || '',
            studentId: student.studentId || ''
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEdit]);

  // Clean and test Indian 10-digit mobile
  const cleanPhone = (num) => {
    if (!num) return '';
    let digits = String(num).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    return digits;
  };

  const isValidIndianMobile = (num) => {
    const cleaned = cleanPhone(num);
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Clear specific field error when edited
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }

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

  // Live financial calculations
  const totalFeeNum = Number(formData.totalFee) || 0;
  const paidNum = Number(formData.paidAmount) || 0;
  const advanceNum = Number(formData.advanceAmount) || 0;
  const calculatedBalance = totalFeeNum - paidNum - advanceNum;
  const isNegativeBalance = calculatedBalance < 0;

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errors.fullName = 'Full Name is required (minimum 2 characters).';
    }

    if (!formData.primaryMobile || !formData.primaryMobile.trim()) {
      errors.primaryMobile = 'Primary Mobile number is required.';
    } else if (!isValidIndianMobile(formData.primaryMobile)) {
      errors.primaryMobile = 'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).';
    }

    if (formData.alternateMobile && formData.alternateMobile.trim() !== '') {
      if (!isValidIndianMobile(formData.alternateMobile)) {
        errors.alternateMobile = 'Enter a valid 10-digit Indian mobile number.';
      }
    }

    if (totalFeeNum < 0) {
      errors.totalFee = 'Total Fee must be a non-negative number.';
    }
    if (paidNum < 0) {
      errors.paidAmount = 'Paid Amount must be a non-negative number.';
    }
    if (advanceNum < 0) {
      errors.advanceAmount = 'Advance Amount must be a non-negative number.';
    }
    if (isNegativeBalance) {
      errors.fees = `Paid + Advance (₹${paidNum + advanceNum}) exceeds Total Fee (₹${totalFeeNum}). Balance cannot be negative.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      // Scroll smoothly to top of form to see errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        fullName: formData.fullName.trim(),
        aliasSourceName: formData.aliasSourceName ? formData.aliasSourceName.trim() : '',
        totalFee: totalFeeNum,
        paidAmount: paidNum,
        advanceAmount: advanceNum,
        batch: formData.batch || null,
        followUpDate: formData.followUpDate || null,
        testDate: formData.testDate || null,
        dob: formData.dob || null,
        application: formData.application ? formData.application.trim() : ''
      };

      if (isEdit) {
        await updateStudent(id, payload);
        setSuccessMessage('Student record updated successfully! Redirecting...');
        setTimeout(() => {
          navigate(`/students/${id}`);
        }, 800);
      } else {
        const created = await createStudent(payload);
        setSuccessMessage(`Student ${created.studentId || ''} created successfully! Redirecting to student profile...`);
        setTimeout(() => {
          navigate(`/students/${created._id}`);
        }, 900);
      }
    } catch (err) {
      setError(err.message || 'Failed to save student record. Please review inputs.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title={isEdit ? 'Edit Student Profile' : 'Add New Student'} />
        <LoadingSpinner message="Loading student details..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Navbar title={isEdit ? `Edit Student: ${formData.studentId || ''}` : 'Add New Student Record'} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-16">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
          <Link
            to={isEdit ? `/students/${id}` : '/students'}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={16} /> Back to {isEdit ? 'Student Profile' : 'Students List'}
          </Link>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-bold rounded-md transition flex items-center gap-2 shadow-sm"
            >
              <Save size={18} />
              {submitting ? 'Saving to Database...' : isEdit ? 'Update Student Record' : 'Save Student Record'}
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && <ErrorMessage message={error} />}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-md flex items-center gap-3 shadow-sm animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold">{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 1: Basic Information */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <User size={18} className="text-red-600" />
              Section 1 — Basic Information
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Personal & Contact Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Student ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student ID <span className="text-slate-400 font-normal">(System Generated)</span>
              </label>
              {isEdit ? (
                <input
                  type="text"
                  value={formData.studentId || ''}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm font-mono font-bold text-red-600 cursor-not-allowed"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-md text-xs font-mono text-slate-500 flex items-center gap-1.5">
                  <span className="font-bold text-red-600">STU-XXXX</span> (Auto-assigned upon save)
                </div>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-600 font-bold">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Anand Varma"
                className={`w-full px-3 py-2 border rounded-md text-sm transition ${
                  fieldErrors.fullName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Alias / Source Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alias / Source Name
              </label>
              <input
                type="text"
                name="aliasSourceName"
                value={formData.aliasSourceName}
                onChange={handleChange}
                placeholder="e.g. Walk-in, Referral, Website"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Primary Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Mobile <span className="text-red-600 font-bold">*</span>
              </label>
              <input
                type="tel"
                name="primaryMobile"
                required
                maxLength={14}
                value={formData.primaryMobile}
                onChange={handleChange}
                placeholder="10 digit mobile (e.g. 9876543210)"
                className={`w-full px-3 py-2 border rounded-md text-sm font-mono transition ${
                  fieldErrors.primaryMobile ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                }`}
              />
              {fieldErrors.primaryMobile ? (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.primaryMobile}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">Indian 10-digit mobile number</p>
              )}
            </div>

            {/* Alternate Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Mobile <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                name="alternateMobile"
                maxLength={14}
                value={formData.alternateMobile}
                onChange={handleChange}
                placeholder="Secondary contact"
                className={`w-full px-3 py-2 border rounded-md text-sm font-mono transition ${
                  fieldErrors.alternateMobile ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'
                }`}
              />
              {fieldErrors.alternateMobile && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.alternateMobile}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: Licence / Service */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <FileText size={18} className="text-red-600" />
              Section 2 — Licence / Service
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">RTO Application & Category</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Licence / Service Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Licence / Service Type
              </label>
              <input
                type="text"
                name="licenceServiceType"
                value={formData.licenceServiceType}
                onChange={handleChange}
                placeholder="e.g. Fresh Licence, Renewal"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* 2/4 Wheeler (vehicleType) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2/4 Wheeler Vehicle Type
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-medium"
              >
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
                <option value="Both">Both (2 & 4 Wheeler)</option>
              </select>
            </div>

            {/* Application No. */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application No.
              </label>
              <input
                type="text"
                name="applicationNo"
                value={formData.applicationNo}
                onChange={handleChange}
                placeholder="RTO Application Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
              />
            </div>

            {/* Registration / Application Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration / Application Date
              </label>
              <input
                type="date"
                name="registrationDate"
                value={formData.registrationDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Licence Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Licence Category
              </label>
              <input
                type="text"
                name="licenceCategory"
                value={formData.licenceCategory}
                onChange={handleChange}
                placeholder="e.g. LMV, MCWG, Both"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* New Application & Application Open Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                name="newApplication"
                checked={Boolean(formData.newApplication)}
                onChange={handleChange}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">New Application</span>
                <span className="text-[11px] text-slate-400">Is this a fresh RTO candidate registration</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                name="applicationOpen"
                checked={Boolean(formData.applicationOpen)}
                onChange={handleChange}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Application Open</span>
                <span className="text-[11px] text-slate-400">Candidate application is active in RTO pipeline</span>
              </div>
            </label>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: Batch & Workflow */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Layers size={18} className="text-red-600" />
              Section 3 — Batch & Workflow
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Training Schedule & Progress Stage</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Batch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Batch
              </label>
              <select
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-medium"
              >
                <option value="">-- Select Batch --</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Stage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Workflow Stage
              </label>
              <select
                name="workflowStage"
                value={formData.workflowStage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-medium"
              >
                <option value="Registration">Registration</option>
                <option value="LL Approved">LL Approved</option>
                <option value="DL Training">DL Training</option>
                <option value="DL Test Scheduled">DL Test Scheduled</option>
                <option value="DL Issued">DL Issued</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Application */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application
              </label>
              <input
                type="text"
                name="application"
                value={formData.application}
                onChange={handleChange}
                placeholder="e.g. Parivahan / RTO Status"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Current Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Status
              </label>
              <select
                name="currentStatus"
                value={formData.currentStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-800"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>

            {/* Next Action */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Action
              </label>
              <input
                type="text"
                name="nextAction"
                value={formData.nextAction}
                onChange={handleChange}
                placeholder="e.g. Schedule Driving Class 1"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Follow Up */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Follow Up Date
              </label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Test Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Test Date
              </label>
              <input
                type="date"
                name="testDate"
                value={formData.testDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            {/* Test Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Test Status
              </label>
              <select
                name="testStatus"
                value={formData.testStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-medium"
              >
                <option value="Not Scheduled">Not Scheduled</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: Fees */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <CreditCard size={18} className="text-red-600" />
              Section 4 — Fees & Dynamic Balance
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Standard Default: ₹9,000</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Total Fee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Fee (₹)
              </label>
              <input
                type="number"
                name="totalFee"
                min="0"
                step="100"
                value={formData.totalFee}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-black text-slate-900 focus:ring-2 focus:ring-red-500"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Default package fee: ₹9,000</p>
            </div>

            {/* Paid / Working Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paid / Working Amount (₹)
              </label>
              <input
                type="number"
                name="paidAmount"
                min="0"
                step="100"
                value={formData.paidAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-black text-emerald-700 focus:ring-2 focus:ring-red-500"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Amount already paid/collected</p>
            </div>

            {/* Advance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Advance (₹)
              </label>
              <input
                type="number"
                name="advanceAmount"
                min="0"
                step="100"
                value={formData.advanceAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-black text-blue-700 focus:ring-2 focus:ring-red-500"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Initial advance deposit</p>
            </div>

            {/* Calculated Dynamic Balance Card */}
            <div className={`p-3.5 rounded-lg border flex flex-col justify-between transition ${
              isNegativeBalance
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : calculatedBalance === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block">Calculated Balance</span>
                <p className="text-xl font-black mt-0.5">
                  ₹ {calculatedBalance}
                </p>
              </div>
              <p className="text-[10px] mt-1 opacity-75 font-mono">
                Total (₹{totalFeeNum}) - Paid (₹{paidNum}) - Advance (₹{advanceNum})
              </p>
            </div>
          </div>

          {/* Negative Balance Warning */}
          {isNegativeBalance && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-md text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>Warning: Total Paid + Advance exceeds Total Fee. Negative balance is not allowed.</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: Document / Form Readiness */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-red-600" />
              Section 5 — Document / Form Readiness
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Compliance & Verification Badges</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'doc_aadhaarVerified', key: 'aadhaarVerified', label: 'Aadhaar / ID Verified' },
              { id: 'doc_photoVerified', key: 'photoVerified', label: 'Photo Verified' },
              { id: 'doc_addressProofVerified', key: 'addressProofVerified', label: 'Address Proof Verified' },
              { id: 'doc_bloodGroupRecorded', key: 'bloodGroupRecorded', label: 'Blood Group Recorded' },
              { id: 'doc_form15Ready', key: 'form15Ready', label: 'Form 15 Ready' }
            ].map(item => {
              const isChecked = Boolean(formData.documentReadiness?.[item.key]);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition ${
                    isChecked
                      ? 'bg-red-50/50 border-red-200 text-red-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    name={item.id}
                    checked={isChecked}
                    onChange={handleChange}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500 shrink-0"
                  />
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs font-semibold">{item.label}</span>
                    {isChecked && <Check size={14} className="text-red-600" />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 6: Notes */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Info size={18} className="text-red-600" />
              Section 6 — Notes
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Remarks, special requests, or progress notes</span>
          </div>

          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter any additional remarks, test requirements, or notes regarding this candidate..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-red-500"
          ></textarea>
        </div>

        {/* Bottom Submission Action Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-bold rounded-md transition flex items-center gap-2 shadow-md"
          >
            <Save size={18} />
            {submitting ? 'Saving to Database...' : isEdit ? 'Update Student Record' : 'Save Student Record'}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default StudentFormPage;
