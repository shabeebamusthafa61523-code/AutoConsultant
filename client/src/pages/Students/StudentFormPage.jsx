import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { createStudent, getStudentById, updateStudent } from '../../services/studentService';
import { getBatches } from '../../services/batchService';
import { getCourseFees } from '../../services/courseFeeService';
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
  Info,
  Phone,
  MapPin
} from 'lucide-react';

const StudentFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [batches, setBatches] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    // Section 1: Basic Information & Register Identity
    category: 'A – New Application',
    studentId: '',
    fullName: '',
    aliasSourceName: '',
    gender: 'Male',
    dob: '',
    bloodGroup: '',
    guardian: '',

    // Section 2: Contact & Address
    primaryMobile: '',
    alternateMobile: '',
    address: {
      houseName: '',
      place: '',
      postOffice: '',
      district: 'Malappuram',
      pincode: ''
    },
    emergencyContact: {
      name: '',
      relation: 'Guardian',
      phone: ''
    },

    // Section 3: Course & Package
    coursePackage: 'LMV+MCWG (Fresh Licence)',
    services: [],
    licenceServiceType: '',
    vehicleType: 'Both',
    licenceCategory: 'LMV',
    registrationDate: new Date().toISOString().split('T')[0],
    admissionNumber: '',

    // Section 4: Batch & Workflow
    batch: '',
    workflowStage: 'Registration',
    currentStatus: 'Active',
    nextAction: '',
    followUpDate: '',
    llTestDate: '',
    finalTestDate: '',

    // Section 5: Licence & RTO
    sarathiAppNo: '',
    applicationNo: '',
    applicationOpen: true,
    newApplication: true,
    testDate: '',
    testStatus: 'Not Scheduled',
    verificationNotes: '',

    // Section 6: Fees
    totalFee: 9000,
    paidAmount: 0,
    advanceAmount: 0,

    // Section 7: Document Readiness & Remarks
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
        setError(null);
        const [batchList, feeList] = await Promise.all([
          getBatches(),
          getCourseFees({ limit: 500 })
        ]);
        setBatches(batchList || []);
        const srvList = Array.isArray(feeList) ? feeList : (feeList?.data || []);
        setAvailableServices(srvList);

        if (isEdit) {
          const student = await getStudentById(id);
          let initialServices = [];
          if (Array.isArray(student.services) && student.services.length > 0) {
            initialServices = student.services;
          } else if (student.licenceServiceType) {
            initialServices = student.licenceServiceType.split(',').map(s => s.trim()).filter(Boolean);
          }

          setFormData({
            category: student.category || 'A – New Application',
            studentId: student.studentId || '',
            fullName: student.fullName || '',
            aliasSourceName: student.aliasSourceName || '',
            gender: student.gender || 'Male',
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
            bloodGroup: student.bloodGroup || '',
            guardian: student.guardian || student.emergencyContact?.name || '',

            primaryMobile: student.primaryMobile || '',
            alternateMobile: student.alternateMobile || '',
            address: {
              houseName: student.address?.houseName || '',
              place: student.address?.place || '',
              postOffice: student.address?.postOffice || '',
              district: student.address?.district || 'Malappuram',
              pincode: student.address?.pincode || ''
            },
            emergencyContact: {
              name: student.guardian || student.emergencyContact?.name || '',
              relation: student.emergencyContact?.relation || 'Guardian',
              phone: student.emergencyContact?.phone || ''
            },

            coursePackage: student.coursePackage || 'LMV+MCWG (Fresh Licence)',
            services: initialServices,
            licenceServiceType: student.licenceServiceType || initialServices.join(', '),
            vehicleType: student.vehicleType || 'Both',
            licenceCategory: student.licenceCategory || 'LMV',
            registrationDate: student.registrationDate ? new Date(student.registrationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            admissionNumber: student.admissionNumber || '',

            batch: student.batch ? (typeof student.batch === 'object' ? student.batch._id : student.batch) : '',
            workflowStage: student.workflowStage || 'Registration',
            currentStatus: student.currentStatus || 'Active',
            nextAction: student.nextAction || '',
            followUpDate: student.followUpDate ? new Date(student.followUpDate).toISOString().split('T')[0] : '',
            llTestDate: student.llTestDate ? new Date(student.llTestDate).toISOString().split('T')[0] : '',
            finalTestDate: student.finalTestDate ? new Date(student.finalTestDate).toISOString().split('T')[0] : '',

            sarathiAppNo: student.sarathiAppNo || student.applicationNo || '',
            applicationNo: student.applicationNo || student.sarathiAppNo || '',
            applicationOpen: student.applicationOpen !== undefined ? student.applicationOpen : true,
            newApplication: student.newApplication !== undefined ? student.newApplication : true,
            testDate: student.testDate ? new Date(student.testDate).toISOString().split('T')[0] : '',
            testStatus: student.testStatus || 'Not Scheduled',
            verificationNotes: student.verificationNotes || '',

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
            notes: student.notes || ''
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

  const cleanPhone = (num) => {
    if (!num) return '';
    let digits = String(num).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    return digits;
  };

  const isValidIndianMobile = (num) => {
    const cleaned = cleanPhone(num);
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handleAddService = (serviceName) => {
    if (!serviceName) return;
    setFormData(prev => {
      const current = prev.services || [];
      if (current.includes(serviceName)) return prev;
      const updated = [...current, serviceName];

      // Sum fees of all selected services
      let newTotalFee = 0;
      updated.forEach(srv => {
        const matched = availableServices.find(s => s.service === srv);
        if (matched && matched.totalFee) {
          newTotalFee += Number(matched.totalFee);
        }
      });

      return {
        ...prev,
        services: updated,
        licenceServiceType: updated.join(', '),
        totalFee: newTotalFee > 0 ? newTotalFee : prev.totalFee
      };
    });
  };

  const handleRemoveService = (serviceName) => {
    setFormData(prev => {
      const current = prev.services || [];
      const updated = current.filter(s => s !== serviceName);

      let newTotalFee = 0;
      updated.forEach(srv => {
        const matched = availableServices.find(s => s.service === srv);
        if (matched && matched.totalFee) {
          newTotalFee += Number(matched.totalFee);
        }
      });

      return {
        ...prev,
        services: updated,
        licenceServiceType: updated.join(', '),
        totalFee: updated.length === 0 ? 9000 : (newTotalFee > 0 ? newTotalFee : prev.totalFee)
      };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [field]: value }
      }));
    } else if (type === 'checkbox') {
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

  // Fee calculations
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

    if (totalFeeNum < 0) errors.totalFee = 'Total Fee must be a non-negative number.';
    if (paidNum < 0) errors.paidAmount = 'Paid Amount must be a non-negative number.';
    if (advanceNum < 0) errors.advanceAmount = 'Advance Amount must be a non-negative number.';
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
        dob: formData.dob || null
      };

      if (isEdit) {
        await updateStudent(id, payload);
        setSuccessMessage('Student profile updated successfully! Redirecting...');
        setTimeout(() => {
          navigate(`/students/${id}`);
        }, 800);
      } else {
        const created = await createStudent(payload);
        setSuccessMessage(`Student ${created.studentId || ''} created successfully! Redirecting to profile...`);
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

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-10">
          <Link
            to={isEdit ? `/students/${id}` : '/students'}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft size={16} /> Back to {isEdit ? 'Student Profile' : 'Student Directory'}
          </Link>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-md transition flex items-center gap-2 shadow-sm"
            >
              <Save size={16} />
              {submitting ? 'Saving to Database...' : isEdit ? 'Update Student Profile' : 'Save Student Record'}
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-md flex items-center gap-3 shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{successMessage}</span>
          </div>
        )}

        {/* SECTION 1: Personal Information */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <User size={17} className="text-red-600" />
              Section 1 — Student Identity & Demographics
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Personal Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Register Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-bold"
              >
                <option value="A – New Application">A – New Application</option>
                <option value="B – LL Done, Test Pending">B – LL Done, Test Pending</option>
                <option value="C – Final Test Done">C – Final Test Done</option>
                <option value="D – Failed / Retest">D – Failed / Retest</option>
                <option value="E – Passed, Fee Collection">E – Passed, Fee Collection</option>
                <option value="F – Settled / Closed">F – Settled / Closed</option>
                <option value="Archived / Removed">Archived / Removed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student ID
              </label>
              {isEdit ? (
                <input
                  type="text"
                  value={formData.studentId || ''}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-mono font-bold text-red-600 dark:text-red-400 cursor-not-allowed"
                />
              ) : (
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId || ''}
                  onChange={handleChange}
                  placeholder="Custom ID (e.g. RB26-001) or leave blank for auto-gen"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-mono text-slate-800 dark:text-slate-100 font-bold"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Muhammed Bayis"
                className={`w-full px-3 py-2 border rounded-md text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.fullName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono"
              >
                <option value="">-- Select Blood Group --</option>
                <option value="O+">O+</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O-">O-</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Guardian Name & Relation
              </label>
              <input
                type="text"
                name="guardian"
                value={formData.guardian}
                onChange={handleChange}
                placeholder="e.g. Alavikutty M (Father)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alias / Referral Source
              </label>
              <input
                type="text"
                name="aliasSourceName"
                value={formData.aliasSourceName}
                onChange={handleChange}
                placeholder="e.g. Walk-in, Jasirata, Sahla C/O"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Contact & Address */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Phone size={17} className="text-red-600" />
              Section 2 — Contact & Address Details
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Communication Channels</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Mobile <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                name="primaryMobile"
                required
                maxLength={14}
                value={formData.primaryMobile}
                onChange={handleChange}
                placeholder="10 digit Indian mobile (e.g. 7012362922)"
                className={`w-full px-3 py-2 border rounded-md text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 ${
                  fieldErrors.primaryMobile ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {fieldErrors.primaryMobile && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.primaryMobile}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alt Mobile
              </label>
              <input
                type="tel"
                name="alternateMobile"
                maxLength={14}
                value={formData.alternateMobile}
                onChange={handleChange}
                placeholder="Secondary mobile"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Address
              </label>
              <input
                type="text"
                name="address.place"
                value={formData.address?.place || ''}
                onChange={handleChange}
                placeholder="e.g. 212A, Malappuram (M + OG), Ernad, Malappuram, Kerala"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pincode
              </label>
              <input
                type="text"
                name="address.pincode"
                value={formData.address?.pincode || ''}
                onChange={handleChange}
                placeholder="e.g. 676519"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                District
              </label>
              <input
                type="text"
                name="address.district"
                value={formData.address?.district || 'Malappuram'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Course, Batch, Sarathi & Test Dates */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Layers size={17} className="text-red-600" />
              Section 3 — Service, Vehicle/COV, Batch, Sarathi & Test Dates
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Training Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assigned Services (Select one or more services)
              </label>

              {/* Selected Services Badges */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-[42px] p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md">
                {formData.services && formData.services.length > 0 ? (
                  formData.services.map((srv, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold rounded-md shadow-2xs"
                    >
                      <span>{srv}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(srv)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-bold ml-0.5 focus:outline-none"
                        title={`Remove ${srv}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No services assigned. Select from dropdown below to add services.</span>
                )}
              </div>

              {/* Service Selection Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddService(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-semibold focus:ring-2 focus:ring-red-500"
                >
                  <option value="" disabled>+ Add Official Service Package (Official 2026 BENZ Structure)...</option>
                  {availableServices.map((s) => {
                    const isSelected = formData.services?.includes(s.service);
                    return (
                      <option key={s._id || s.feeId} value={s.service} disabled={isSelected}>
                        {isSelected ? '✓ ' : '+ '}{s.service} (₹{s.totalFee ? s.totalFee.toLocaleString('en-IN') : '0'})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle / COV
              </label>
              <input
                type="text"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                placeholder="e.g. LMV+MCWG, 2/4 Wheeler, MCWOG, MCWG"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch
              </label>
              <input
                type="text"
                name="batchName"
                value={formData.batchName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, batchName: e.target.value }))}
                placeholder="e.g. 2026 NEW LL, BATCH 1, FINAL LL INTAKE"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sarathi App No
              </label>
              <input
                type="text"
                name="sarathiAppNo"
                value={formData.sarathiAppNo}
                onChange={handleChange}
                placeholder="Sarathi Application Number (e.g. 3739581826)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                LL Test Date
              </label>
              <input
                type="date"
                name="llTestDate"
                value={formData.llTestDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Final Test Date
              </label>
              <input
                type="date"
                name="finalTestDate"
                value={formData.finalTestDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <input
                type="text"
                name="currentStatus"
                value={formData.currentStatus}
                onChange={handleChange}
                placeholder="e.g. New LL Application Submitted, LL Slot Booked, Passed"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Action
              </label>
              <input
                type="text"
                name="nextAction"
                value={formData.nextAction}
                onChange={handleChange}
                placeholder="e.g. Complete Documents + Fee + LL Slot Booking, Attend LL Test"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Action Date
              </label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Fees & Dynamic Math */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <CreditCard size={17} className="text-red-600" />
              Section 4 — Fees & Dynamic Balance Calculation
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Standard Default: ₹9,000</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Package Fee (₹)
              </label>
              <input
                type="number"
                name="totalFee"
                min="0"
                step="any"
                value={formData.totalFee}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-sm font-black focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paid / Installment Amount (₹)
              </label>
              <input
                type="number"
                name="paidAmount"
                min="0"
                step="any"
                value={formData.paidAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 rounded-md text-sm font-black focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Advance Deposit (₹)
              </label>
              <input
                type="number"
                name="advanceAmount"
                min="0"
                step="any"
                value={formData.advanceAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-md text-sm font-black focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Calculated Dynamic Balance Card */}
            <div className={`p-3.5 rounded-lg border flex flex-col justify-between transition ${
              isNegativeBalance
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                : calculatedBalance === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block">Calculated Balance</span>
                <p className="text-xl font-black mt-0.5">
                  ₹ {calculatedBalance}
                </p>
              </div>
              <p className="text-[10px] opacity-75 font-mono">
                Total (₹{totalFeeNum}) - Paid (₹{paidNum}) - Advance (₹{advanceNum})
              </p>
            </div>
          </div>

          {isNegativeBalance && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-md text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>Warning: Total Paid + Advance exceeds Total Fee. Negative balance is not allowed.</span>
            </div>
          )}
        </div>

        {/* SECTION 5: Document Readiness & Remarks */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <ShieldCheck size={17} className="text-red-600" />
              Section 5 — Document Readiness & Remarks
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Compliance Flags</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'doc_aadhaarVerified', key: 'aadhaarVerified', label: 'Aadhaar / ID Card Verified' },
              { id: 'doc_photoVerified', key: 'photoVerified', label: 'Passport Photo Collected' },
              { id: 'doc_addressProofVerified', key: 'addressProofVerified', label: 'Address Proof Verified' },
              { id: 'doc_bloodGroupRecorded', key: 'bloodGroupRecorded', label: 'Blood Group Recorded' },
              { id: 'doc_form15Ready', key: 'form15Ready', label: 'Form 15 & Medical 1A Ready' }
            ].map(item => {
              const isChecked = Boolean(formData.documentReadiness?.[item.key]);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    isChecked
                      ? 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-950 dark:text-red-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
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
                    {isChecked && <Check size={14} className="text-red-600 dark:text-red-400" />}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verification Details & Source Status
              </label>
              <input
                type="text"
                name="verificationNotes"
                value={formData.verificationNotes}
                onChange={handleChange}
                placeholder="e.g. Source Verified / Acknowledgement, Imported / Not Reviewed"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs font-medium focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                General Remarks & Notes
              </label>
              <textarea
                name="notes"
                rows="2"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g. Needs evening slots, preparing for test in May, previous DL retest"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md text-xs focus:ring-2 focus:ring-red-500"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Submit Bottom Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/students/${id}` : '/students')}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-md transition flex items-center gap-2 shadow-md"
          >
            <Save size={16} />
            {submitting ? 'Saving to Database...' : isEdit ? 'Update Student Record' : 'Save Student Record'}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default StudentFormPage;
