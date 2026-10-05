import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../components/Modal';
import { bulkImportStudents, getStudents } from '../../services/studentService';
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
  Sliders,
  Check,
  Eye,
  Settings
} from 'lucide-react';

// All 26 System Fields definition with auto-match header aliases
const SYSTEM_FIELDS = [
  { key: 'category', label: 'Register Category', defaultHeaders: ['Category', 'category', 'Category Name', 'Register Category'] },
  { key: 'studentId', label: 'Student ID', defaultHeaders: ['Student ID', 'Student ID ', 'studentId', 'ID', 'Student Code'] },
  { key: 'fullName', label: 'Full Name', required: true, defaultHeaders: ['Name', 'Name ', 'Full Name', 'fullName', 'Student Name', 'Candidate Name'] },
  { key: 'primaryMobile', label: 'Primary Mobile', required: true, defaultHeaders: ['Mobile', 'Mobile ', 'primaryMobile', 'Phone', 'Primary Mobile', 'Contact'] },
  { key: 'status', label: 'Status', defaultHeaders: ['Status', 'Status ', 'currentStatus', 'Student Status'] },
  { key: 'nextAction', label: 'Next Action', defaultHeaders: ['Next Action', 'Next Action ', 'nextAction'] },
  { key: 'nextActionDate', label: 'Next Action Date', defaultHeaders: ['Next Action Date', 'Next Action, Date', 'Next Action Date ', 'nextActionDate', 'Follow Up Date', 'followUpDate'] },
  { key: 'totalFee', label: 'Total Fee', defaultHeaders: ['Total Fee', 'Total Fee ', 'totalFee', 'Course Fee'] },
  { key: 'paidAmount', label: 'Paid Amount', defaultHeaders: ['Paid', 'Paid ', 'Paid Amount', 'paidAmount'] },
  { key: 'advanceAmount', label: 'Advance Amount', defaultHeaders: ['Advance Amount', 'Advance Amount ', 'advanceAmount', 'Advance'] },
  { key: 'balance', label: 'Balance', defaultHeaders: ['Balance', 'Balance ', 'balance'] },
  { key: 'service', label: 'Service', defaultHeaders: ['Service', 'Service ', 'licenceServiceType', 'Service Type'] },
  { key: 'vehicleCov', label: 'Vehicle / COV', defaultHeaders: ['Vehicle / COV', 'Vehicle / COV ', 'Vehicle/COV', 'Vehicle Type', 'vehicleType', 'COV'] },
  { key: 'batchName', label: 'Batch Name', defaultHeaders: ['Batch', 'Batch ', 'batchName', 'Batch Name'] },
  { key: 'sarathiAppNo', label: 'Sarathi App No', defaultHeaders: ['Sarathi App No', 'Sarathi App No ', 'Sarathi App No.', 'Sarathi No', 'sarathiAppNo', 'applicationNo'] },
  { key: 'llTestDate', label: 'LL Test Date', defaultHeaders: ['LL Test Date', 'LL Test Date ', 'llTestDate'] },
  { key: 'finalTestDate', label: 'Final Test Date', defaultHeaders: ['Final Test Date', 'Final Test Date ', 'finalTestDate'] },
  { key: 'gender', label: 'Gender', defaultHeaders: ['Gender', 'Gender ', 'gender'] },
  { key: 'dob', label: 'Date of Birth', defaultHeaders: ['DOB', 'DOB ', 'Date of Birth', 'dob'] },
  { key: 'bloodGroup', label: 'Blood Group', defaultHeaders: ['Blood', 'Blood ', 'Blood Group', 'Blood Group ', 'bloodGroup', 'blood group', 'blood', 'bg', 'b.g', 'bloodgroup', 'blood_group', 'Blood Type', 'Blood-Group'] },
  { key: 'guardian', label: 'Guardian Name', defaultHeaders: ['Guardian', 'Guardian ', 'Guardian Name', 'guardian'] },
  { key: 'alternateMobile', label: 'Alt Mobile', defaultHeaders: ['Alt Mobile', 'Alt Mobile ', 'Alternate Mobile', 'alternateMobile'] },
  { key: 'address', label: 'Full Address', defaultHeaders: ['Address', 'Address ', 'address', 'Alt Mobile Address'] },
  { key: 'pincode', label: 'Pincode', defaultHeaders: ['Pincode', 'Pincode ', 'pincode', 'Pin Code'] },
  { key: 'verification', label: 'Verification Details', defaultHeaders: ['Verification', 'Verification ', 'verificationNotes', 'Verification Details'] },
  { key: 'notes', label: 'Notes & Remarks', defaultHeaders: ['Notes', 'Notes ', 'notes', 'Remarks'] }
];

const BulkIntakeTab = ({ batches = [], onImportSuccess }) => {
  const [stagedStudents, setStagedStudents] = useState([]);
  const [rawFileData, setRawFileData] = useState([]);
  const [raw2DData, setRaw2DData] = useState([]);
  const [selectedHeaderRowIdx, setSelectedHeaderRowIdx] = useState(0);
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [existingMobileMap, setExistingMobileMap] = useState({});

  // Fetch existing mobile map to detect duplicate mobile warnings in advance
  useEffect(() => {
    const fetchExistingMobiles = async () => {
      try {
        const res = await getStudents({ limit: 5000 });
        const list = res?.students || res || [];
        const map = {};
        if (Array.isArray(list)) {
          list.forEach((s) => {
            if (s.primaryMobile) {
              const digits = String(s.primaryMobile).replace(/\D/g, '');
              const cleanDigits = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
              map[cleanDigits] = s.studentId ? `${s.studentId} (${s.fullName})` : s.fullName;
            }
          });
        }
        setExistingMobileMap(map);
      } catch (e) {
        console.error('Failed to pre-fetch mobile map:', e);
      }
    };
    fetchExistingMobiles();
  }, []);

  // Field Mapping Modal State
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});

  // Helper to sanitize Indian mobile numbers
  const cleanPhone = (val) => {
    if (!val) return '';
    let digits = String(val).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    return digits;
  };

  // Helper to format any raw Excel date value (serial number, Date object, string) to YYYY-MM-DD
  const formatExcelDateString = (val) => {
    if (val === undefined || val === null || val === '') return '';

    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const yyyy = val.getFullYear();
      if (yyyy < 1900 || yyyy > 2100) return '';
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    const str = String(val).trim();
    if (!str) return '';

    // Handle Excel Serial Numbers (e.g. 39308, 38000, 42000, 46000)
    const num = Number(str);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      const utc_days = Math.floor(num - 25569);
      const utc_value = utc_days * 86400;
      const d = new Date(utc_value * 1000);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        if (yyyy >= 1900 && yyyy <= 2100) {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }
      return '';
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY (Indian format: 15/10/2026, 1/1/2026)
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
      let day = parseInt(dmyMatch[1], 10);
      let month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += year < 50 ? 2000 : 1900;
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Handle YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      let year = parseInt(ymdMatch[1], 10);
      let month = parseInt(ymdMatch[2], 10);
      let day = parseInt(ymdMatch[3], 10);
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      if (yyyy >= 1900 && yyyy <= 2100) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    return '';
  };

  // Helper to process raw JSON row into staged student using mappings
  const mapRawRowToStagedStudent = (row, index, mappingsToUse) => {
    const getValue = (fieldKey, fallback = '') => {
      const config = mappingsToUse[fieldKey];
      if (!config || !config.enabled || !config.excelHeader) return fallback;
      const val = row[config.excelHeader];
      return val !== undefined && val !== null ? val : fallback;
    };

    const category = String(getValue('category', '')).trim();
    const studentId = String(getValue('studentId', '')).trim();
    const fullName = String(getValue('fullName', '')).trim();
    const primaryMobile = cleanPhone(getValue('primaryMobile', ''));
    const status = String(getValue('status', 'Active')).trim();
    const nextAction = String(getValue('nextAction', '')).trim();
    const nextActionDate = formatExcelDateString(getValue('nextActionDate', ''));

    const rawTotal = getValue('totalFee', '9000');
    const rawPaid = getValue('paidAmount', '0');
    const rawAdv = getValue('advanceAmount', '0');
    const totalFee = Number(rawTotal) || 9000;
    const paidAmount = Number(rawPaid) || 0;
    const advanceAmount = Number(rawAdv) || 0;

    const rawBal = getValue('balance', '');
    const balance = rawBal !== '' && !isNaN(Number(rawBal)) ? Number(rawBal) : (totalFee - paidAmount - advanceAmount);

    const service = String(getValue('service', '')).trim();
    const vehicleCov = String(getValue('vehicleCov', 'LMV+MCWG')).trim();
    const batchName = String(getValue('batchName', '')).trim();
    const sarathiAppNo = String(getValue('sarathiAppNo', '')).trim();
    const llTestDate = formatExcelDateString(getValue('llTestDate', ''));
    const finalTestDate = formatExcelDateString(getValue('finalTestDate', ''));

    const gender = ['Male', 'Female', 'Other'].includes(String(getValue('gender', 'Male')).trim()) ? String(getValue('gender', 'Male')).trim() : 'Male';
    const dob = formatExcelDateString(getValue('dob', ''));
    const bloodGroup = String(getValue('bloodGroup', '')).trim();
    const guardian = String(getValue('guardian', '')).trim();
    const alternateMobile = cleanPhone(getValue('alternateMobile', ''));
    const address = String(getValue('address', '')).trim();
    const pincode = getValue('pincode', '');
    const verification = getValue('verification', '');
    const notes = getValue('notes', 'Bulk Intake Import');

    // Validation flags
    const isValidMobile = /^[6-9]\d{9}$/.test(primaryMobile);
    const isValidName = fullName.trim().length >= 2;

    return {
      _tempId: `staged_${Date.now()}_${index}`,
      category,
      studentId,
      fullName,
      primaryMobile,
      alternateMobile,
      status,
      nextAction,
      nextActionDate,
      totalFee: isNaN(totalFee) ? 9000 : totalFee,
      paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
      advanceAmount: isNaN(advanceAmount) ? 0 : advanceAmount,
      balance,
      service,
      vehicleCov,
      vehicleType: vehicleCov,
      coursePackage: `${service} (${vehicleCov})`,
      batchName,
      sarathiAppNo,
      llTestDate,
      finalTestDate,
      gender,
      dob,
      bloodGroup,
      guardian,
      address,
      pincode,
      verification,
      verificationNotes: verification,
      notes,
      isValid: isValidName && isValidMobile,
      validationError: !isValidName ? 'Missing Name' : (!isValidMobile ? 'Invalid Mobile' : null)
    };
  };

  // Process a selected header row from 2D data & auto-fetch all 26 fields into staged table
  const processHeaderRow = (headerRowIndex, raw2D) => {
    const rawHeaderRow = raw2D[headerRowIndex] || [];
    const headers = [];
    rawHeaderRow.forEach((h, colIdx) => {
      let cleanH = String(h || '')
        .replace(/[\r\n\u00a0]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanH) {
        cleanH = `__EMPTY_${colIdx}`;
      } else {
        let count = 1;
        let baseH = cleanH;
        while (headers.includes(cleanH)) {
          cleanH = `${baseH}_${count}`;
          count++;
        }
      }
      headers.push(cleanH);
    });

    const rawJson = [];
    for (let i = headerRowIndex + 1; i < raw2D.length; i++) {
      const rowArray = raw2D[i];
      if (!Array.isArray(rowArray)) continue;

      const isRowEmpty = rowArray.every((val) => val === '' || val === null || val === undefined);
      if (isRowEmpty) continue;

      const rowObj = {};
      let hasContent = false;
      headers.forEach((hKey, colIdx) => {
        const val = rowArray[colIdx] !== undefined && rowArray[colIdx] !== null ? rowArray[colIdx] : '';
        if (!hKey.startsWith('__EMPTY_')) {
          rowObj[hKey] = val;
        }
        if (String(val).trim() !== '') hasContent = true;
      });

      if (hasContent) {
        rawJson.push(rowObj);
      }
    }

    setRawFileData(rawJson);
    const validHeaders = headers.filter((h) => !h.startsWith('__EMPTY_'));
    setDetectedHeaders(validHeaders);

    const initialMappings = {};
    SYSTEM_FIELDS.forEach((sysField) => {
      let matchedHeader = '';
      for (const alias of sysField.defaultHeaders) {
        const found = validHeaders.find((h) => h.trim().toLowerCase() === alias.trim().toLowerCase());
        if (found) {
          matchedHeader = found;
          break;
        }
      }
      if (!matchedHeader) {
        const foundSub = validHeaders.find((h) => {
          const lowerH = h.trim().toLowerCase();
          return lowerH.includes(sysField.key.toLowerCase()) || sysField.defaultHeaders.some((alias) => lowerH.includes(alias.trim().toLowerCase()));
        });
        if (foundSub) matchedHeader = foundSub;
      }

      initialMappings[sysField.key] = {
        enabled: Boolean(matchedHeader || sysField.required),
        excelHeader: matchedHeader
      };
    });

    setFieldMappings(initialMappings);

    // AUTO-FETCH: Instantly parse rows and populate staging preview with all 26 fields
    applyFieldMapping(initialMappings, rawJson);

    return { rawJson, initialMappings };
  };

  const handleHeaderRowChange = (newRowIdx) => {
    setSelectedHeaderRowIdx(newRowIdx);
    if (raw2DData && raw2DData.length > 0) {
      processHeaderRow(newRowIdx, raw2DData);
    }
  };

  // 1. Download Sample Excel/CSV Template matching BENZ Driving School Student Register (All 26 Fields)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Sl': 1,
        'Category': 'A – New Application',
        'Student ID': 'RB26-001',
        'Name': 'Muhammed Bayis',
        'Mobile': '7012362922',
        'Status': 'New LL Application Submitted / Processing',
        'Next Action': 'Complete Documents + Fee + LL Slot Booking',
        'Next Action Date': '2026-10-15',
        'Total Fee': 9000,
        'Paid': 3000,
        'Balance': 6000,
        'Service': 'New Driving Licence',
        'Vehicle / COV': 'LMV+MCWG',
        'Batch': '2026 NEW LL',
        'Sarathi App No': '3739581826',
        'LL Test Date': '2026-10-11',
        'Final Test Date': '2026-11-14',
        'Gender': 'Male',
        'DOB': '1998-04-13',
        'Blood': 'O+',
        'Guardian': 'Rasiya K (Mother)',
        'Alt Mobile': '9876543210',
        'Address': '212A, Malappuram (M + OG), Ernad, Malappuram, Kerala',
        'Pincode': '676519',
        'Verification': 'Source Verified / Acknowledgement',
        'Notes': 'New LL acknowledgement verified.'
      },
      {
        'Sl': 2,
        'Category': 'B – LL Done, Test Pending',
        'Student ID': 'AC-003',
        'Name': 'Rinsha',
        'Mobile': '8848241293',
        'Status': 'LL Done',
        'Next Action': 'Final Test Booking',
        'Next Action Date': '2026-10-20',
        'Total Fee': 9000,
        'Paid': 2000,
        'Balance': 7000,
        'Service': 'New Driving Licence',
        'Vehicle / COV': '2/4 Wheeler',
        'Batch': 'BATCH 1',
        'Sarathi App No': '1877958825',
        'LL Test Date': '2026-10-01',
        'Final Test Date': '',
        'Gender': 'Female',
        'DOB': '2005-10-15',
        'Blood': 'B+',
        'Guardian': 'Usman (Father)',
        'Alt Mobile': '',
        'Address': 'West Kodur PO, Malappuram',
        'Pincode': '676504',
        'Verification': 'Imported / Not Reviewed',
        'Notes': 'Historical link verified.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student_Register');

    // Export file
    XLSX.writeFile(workbook, 'BENZ_Driving_School_Student_Register_Template.xlsx');
  };

  // 2. Parse Excel/CSV File & Initialize Column Auto-Matching with Smart Header Detection
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
        // Multi-sheet and 30-row deep scan to locate the true BENZ Student Register table
        let bestSheetName = workbook.SheetNames[0];
        let bestHeaderRowIdx = 0;
        let bestMaxScore = -1;
        let bestRaw2D = [];

        const keywords = [
          'name', 'mobile', 'phone', 'student', 'category', 'status', 'fee', 'sl',
          'paid', 'balance', 'service', 'batch', 'gender', 'dob', 'address', 'sarathi',
          'cov', 'vehicle', 'pincode', 'guardian', 'blood', 'verification', 'notes'
        ];

        // Scan all sheets in the workbook
        for (const sName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sName];
          const raw2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (!raw2D || raw2D.length === 0) continue;

          for (let i = 0; i < Math.min(30, raw2D.length); i++) {
            const row = raw2D[i];
            if (!Array.isArray(row)) continue;

            let hasNameHeader = false;
            let hasMobileHeader = false;
            let filledCols = 0;
            let keywordMatches = 0;

            for (const cell of row) {
              const cellStr = String(cell || '').toLowerCase().trim();
              if (!cellStr) continue;
              filledCols++;

              if (['name', 'full name', 'student name', 'candidate name'].some((k) => cellStr === k || cellStr.includes(k))) {
                hasNameHeader = true;
              }
              if (['mobile', 'phone', 'contact', 'primary mobile'].some((k) => cellStr === k || cellStr.includes(k))) {
                hasMobileHeader = true;
              }

              if (keywords.some((k) => cellStr.includes(k))) {
                keywordMatches++;
              }
            }

            let score = keywordMatches * 10 + filledCols;
            // High priority boost when BOTH Name and Mobile are present in a row with 8+ filled columns
            if (hasNameHeader && hasMobileHeader) {
              score += 1000 + (filledCols >= 8 ? 500 : 0);
            } else if (hasNameHeader || hasMobileHeader) {
              score += 200;
            }

            if (score > bestMaxScore) {
              bestMaxScore = score;
              bestHeaderRowIdx = i;
              bestSheetName = sName;
              bestRaw2D = raw2D;
            }
          }
        }

        if (!bestRaw2D || bestRaw2D.length === 0) {
          setError('Uploaded spreadsheet is empty or could not be parsed. Please check the file contents.');
          return;
        }

        setRaw2DData(bestRaw2D);
        setSelectedHeaderRowIdx(bestHeaderRowIdx);
        processHeaderRow(bestHeaderRowIdx, bestRaw2D);
        setMappingModalOpen(true);
      } catch (err) {
        console.error('Excel parse error:', err);
        setError('Failed to parse file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. Process Raw File Data using Selected Field Mappings (Filter section header rows & inherit category)
  function applyFieldMapping(mappingsToUse = fieldMappings, dataToUse = rawFileData) {
    if (!dataToUse || dataToUse.length === 0) return;

    const getValue = (row, fieldKey, fallback = '') => {
      const config = mappingsToUse[fieldKey];
      if (!config || !config.enabled || !config.excelHeader) return fallback;
      const val = row[config.excelHeader];
      return val !== undefined && val !== null ? String(val).trim() : fallback;
    };

    let currentCategorySection = '';
    const parsedRows = [];

    dataToUse.forEach((row, index) => {
      const fullName = getValue(row, 'fullName', '');
      const rawPrimary = getValue(row, 'primaryMobile', '');
      const rawAlt = getValue(row, 'alternateMobile', '');
      const explicitCategory = getValue(row, 'category', '');
      const verification = getValue(row, 'verification', '');
      const status = getValue(row, 'status', 'Active');

      let primaryMobile = cleanPhone(rawPrimary);
      let alternateMobile = cleanPhone(rawAlt);

      // Check if this row is a Section Header Row (e.g. "A – New Application", "B – LL Done")
      const isSectionHeader = (!fullName || fullName.trim() === '') && (!primaryMobile || primaryMobile.trim() === '') && (!alternateMobile || alternateMobile.trim() === '');

      if (isSectionHeader) {
        const potentialCategory = explicitCategory || Object.values(row).find((val) => {
          const s = String(val || '').trim();
          return s.length > 2 && !/^\d+$/.test(s) && !s.startsWith('__EMPTY');
        });

        if (potentialCategory) {
          currentCategorySection = String(potentialCategory).trim();
        }
        return;
      }

      // If primaryMobile is blank in Excel, check alternateMobile or assign system placeholder
      if (!primaryMobile) {
        if (alternateMobile && /^[6-9]\d{9}$/.test(alternateMobile)) {
          primaryMobile = alternateMobile;
        } else {
          const seedStr = String(index + 1).padStart(5, '0');
          primaryMobile = `90000${seedStr}`;
        }
      }

      // Category derivation
      let category = explicitCategory || currentCategorySection;
      if (!category) {
        if (verification && verification.toLowerCase().includes('category')) {
          category = 'Fee Collection Follow Up';
        } else if (status === 'Passed') {
          category = 'Passed';
        } else {
          category = 'A – New Application';
        }
      }

      const studentId = getValue(row, 'studentId', '');
      const nextAction = getValue(row, 'nextAction', '');
      const nextActionDate = getValue(row, 'nextActionDate', '');

      const rawTotal = getValue(row, 'totalFee', '9000');
      const rawPaid = getValue(row, 'paidAmount', '0');
      const rawAdv = getValue(row, 'advanceAmount', '0');
      const totalFee = Number(rawTotal) || 9000;
      const paidAmount = Number(rawPaid) || 0;
      const advanceAmount = Number(rawAdv) || 0;

      const rawBal = getValue(row, 'balance', '');
      const balance = rawBal !== '' && !isNaN(Number(rawBal)) ? Number(rawBal) : (totalFee - paidAmount - advanceAmount);

      const service = getValue(row, 'service', '');
      const vehicleCov = getValue(row, 'vehicleCov', 'LMV+MCWG');
      const batchName = getValue(row, 'batchName', '');
      const sarathiAppNo = getValue(row, 'sarathiAppNo', '');
      const llTestDate = getValue(row, 'llTestDate', '');
      const finalTestDate = getValue(row, 'finalTestDate', '');

      const gender = ['Male', 'Female', 'Other'].includes(getValue(row, 'gender', 'Male')) ? getValue(row, 'gender', 'Male') : 'Male';
      const dob = getValue(row, 'dob', '');
      const bloodGroup = getValue(row, 'bloodGroup', '');
      const guardian = getValue(row, 'guardian', '');
      const address = getValue(row, 'address', '');
      const pincode = getValue(row, 'pincode', '');
      const notes = getValue(row, 'notes', 'Bulk Intake Import');

      // Validation flags
      const isValidMobile = /^[6-9]\d{9}$/.test(primaryMobile);
      const isValidName = fullName.trim().length >= 2;

      // Check if primaryMobile exists in database map
      const existingOwner = existingMobileMap[primaryMobile];
      const hasDuplicateMobileWarning = Boolean(existingOwner && !primaryMobile.startsWith('90000'));

      parsedRows.push({
        _tempId: `staged_${Date.now()}_${index}`,
        category,
        studentId,
        fullName,
        primaryMobile,
        alternateMobile,
        status,
        nextAction,
        nextActionDate,
        totalFee: isNaN(totalFee) ? 9000 : totalFee,
        paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
        advanceAmount: isNaN(advanceAmount) ? 0 : advanceAmount,
        balance,
        service,
        licenceServiceType: service,
        vehicleCov,
        vehicleType: vehicleCov,
        coursePackage: service ? `${service} (${vehicleCov})` : vehicleCov,
        batchName,
        sarathiAppNo,
        llTestDate,
        finalTestDate,
        gender,
        dob,
        bloodGroup,
        guardian,
        address,
        pincode,
        verification,
        verificationNotes: verification,
        notes,
        hasDuplicateMobileWarning,
        duplicateMobileOwner: existingOwner || '',
        isValid: isValidName && isValidMobile,
        validationError: !isValidName ? 'Missing Name' : (!isValidMobile ? 'Invalid Mobile' : null)
      });
    });

    setStagedStudents(parsedRows);
    setMappingModalOpen(false);
  };

  // Helper to toggle mapping check
  const handleToggleField = (fieldKey) => {
    setFieldMappings((prev) => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        enabled: !prev[fieldKey]?.enabled
      }
    }));
  };

  // Helper to update column header mapping
  const handleHeaderChange = (fieldKey, headerName) => {
    setFieldMappings((prev) => ({
      ...prev,
      [fieldKey]: {
        enabled: Boolean(headerName),
        excelHeader: headerName
      }
    }));
  };

  // Select / Deselect All Fields
  const handleSelectAllFields = (enable) => {
    setFieldMappings((prev) => {
      const updated = { ...prev };
      SYSTEM_FIELDS.forEach((sf) => {
        if (updated[sf.key]) {
          updated[sf.key] = {
            ...updated[sf.key],
            enabled: enable || Boolean(sf.required)
          };
        }
      });
      return updated;
    });
  };

  // 4. Delete individual candidate from staged preview list
  const handleDeleteRow = (tempId) => {
    setStagedStudents((prev) => prev.filter((s) => s._tempId !== tempId));
  };

  // 5. Clear all staged records
  const handleClearAll = () => {
    setStagedStudents([]);
    setRawFileData([]);
    setDetectedHeaders([]);
    setFileInfo(null);
    setError(null);
    setImportResult(null);
  };

  // 6. Submit Bulk Import to Backend API
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
              BENZ Student Register Hub
            </span>
            <span className="text-xs text-slate-400">&bull; 26-Field Excel & CSV Batch Upload</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            Upload & Batch Register BENZ Driving School Register
          </h2>
          <p className="text-xs text-slate-300">
            Upload your BENZ Driving School Excel sheet with all 26 fields (Category, Student ID, Name, Mobile, Service, Vehicle/COV, Sarathi App No, LL & Final Test Dates, DOB, Guardian, Pincode, Notes).
          </p>
        </div>

        {/* Download Sample Template */}
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-xs font-bold transition flex items-center gap-2 shrink-0 border border-slate-600 shadow-xs"
        >
          <Download size={15} className="text-emerald-400" />
          <span>Download 26-Field Excel Template</span>
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
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle size={18} className="text-emerald-600" />
              <span>{importResult.message || `Imported ${importResult.importedCount} candidates successfully!`}</span>
            </div>
            <button onClick={() => setImportResult(null)} className="text-emerald-600 hover:text-emerald-800">
              <X size={16} />
            </button>
          </div>

          {importResult.warningCount > 0 && (
            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-md border border-amber-300 dark:border-amber-800 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>Imported with Warnings ({importResult.warningCount} Duplicate Mobile Number(s) Allowed & Imported):</span>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-300">
                {importResult.warningRecords?.map((wr, idx) => (
                  <li key={idx}>
                    <span className="font-bold">Row {wr.row}:</span> <span className="font-semibold">{wr.name}</span> ({wr.mobile}) &bull; {wr.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {importResult.skippedCount > 0 && (
            <div className="text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded border border-rose-200 dark:border-rose-900/30 space-y-1">
              <p className="font-bold">{importResult.skippedCount} record(s) were skipped (e.g. missing candidate name):</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {importResult.skippedRecords?.slice(0, 10).map((sk, idx) => (
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
              Select or Drop BENZ Student Register File (.xlsx / .csv)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive column selector & field mapping modal will pop up for you to map & enable specific fields before importing.
            </p>
          </div>

          <div className="pt-2">
            <label className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-sm transition cursor-pointer inline-flex items-center gap-2">
              <Upload size={16} />
              <span>Browse File to Upload & Map Fields</span>
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
        /* PRE-IMPORT STAGING TABLE WITH INDIVIDUAL DELETE BUTTON & MAPPING CONFIG BUTTON */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-red-600" />
                Staged Candidate Preview ({stagedStudents.length} Records)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                File: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{fileInfo?.name}</span> ({fileInfo?.size}). Review staged rows or adjust field mappings before importing.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setMappingModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md font-bold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-600"
              >
                <Sliders size={14} className="text-red-600" />
                <span>Configure Field Mapping</span>
              </button>
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
          {/* WARNING BANNER FOR DUPLICATE MOBILE NUMBERS WITH DIRECT IMPORT BUTTON */}
          {stagedStudents.some((s) => s.hasDuplicateMobileWarning) && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <span>⚠️ {stagedStudents.filter((s) => s.hasDuplicateMobileWarning).length} Candidate(s) Have Shared / Duplicate Mobile Numbers</span>
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    The following candidates share contact numbers with existing registered students in the database:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    {stagedStudents
                      .filter((s) => s.hasDuplicateMobileWarning)
                      .slice(0, 5)
                      .map((wc, idx) => (
                        <li key={idx}>
                          <span>{wc.fullName}</span> ({wc.primaryMobile}) &bull; Shared with {wc.duplicateMobileOwner}
                        </li>
                      ))}
                    {stagedStudents.filter((s) => s.hasDuplicateMobileWarning).length > 5 && (
                      <li>...and {stagedStudents.filter((s) => s.hasDuplicateMobileWarning).length - 5} more candidates</li>
                    )}
                  </ul>
                </div>
              </div>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-md border border-amber-500"
              >
                <UserPlus size={16} />
                <span>Import All ({stagedStudents.length} Candidates)</span>
              </button>
            </div>
          )}

          {/* STAGING PREVIEW TABLE FOR ALL 26 FIELDS */}
          <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <th className="px-2.5 py-2.5">#</th>
                  <th className="px-2.5 py-2.5">Category & ID</th>
                  <th className="px-2.5 py-2.5">Name & Mobile</th>
                  <th className="px-2.5 py-2.5">Service & COV</th>
                  <th className="px-2.5 py-2.5">Batch</th>
                  <th className="px-2.5 py-2.5">Sarathi App No</th>
                  <th className="px-2.5 py-2.5">LL Test Date</th>
                  <th className="px-2.5 py-2.5">Final Test Date</th>
                  <th className="px-2.5 py-2.5">Fee (Total/Paid/Bal)</th>
                  <th className="px-2.5 py-2.5">Status</th>
                  <th className="px-2.5 py-2.5">Next Action</th>
                  <th className="px-2.5 py-2.5">Next Action Date</th>
                  <th className="px-2.5 py-2.5">Guardian & Address</th>
                  <th className="px-2.5 py-2.5">Verification & Notes</th>
                  <th className="px-2.5 py-2.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                {stagedStudents.map((row, index) => (
                  <tr
                    key={row._tempId}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition ${
                      row.hasDuplicateMobileWarning
                        ? 'bg-amber-50/30 dark:bg-amber-950/20'
                        : !row.isValid
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : ''
                    }`}
                  >
                    <td className="px-2.5 py-2 font-mono text-slate-400">{index + 1}</td>
                    <td className="px-2.5 py-2">
                      <span className="font-bold text-red-600 dark:text-red-400 block font-mono text-[10px]">{row.studentId || 'Auto STU ID'}</span>
                      <span className="text-[10px] text-slate-500 font-medium block">{row.category || 'N/A'}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{row.fullName || <span className="text-rose-500 italic">Missing Name</span>}</span>
                      <span className="font-mono text-slate-500 text-[10px] block">{row.primaryMobile || <span className="text-rose-500 italic">Missing Phone</span>}</span>
                      {row.bloodGroup && (
                        <span className="text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900 inline-block mt-0.5 mr-1 font-mono">
                          Blood: {row.bloodGroup}
                        </span>
                      )}
                      {row.hasDuplicateMobileWarning && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                          <AlertTriangle size={10} className="text-amber-600 shrink-0" />
                          <span>Duplicate (Shared with {row.duplicateMobileOwner})</span>
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-slate-600 dark:text-slate-300">
                      <span className="font-semibold block text-slate-800 dark:text-slate-200">{row.vehicleCov}</span>
                      <span className="text-[10px] text-slate-400 block">{row.service}</span>
                    </td>
                    <td className="px-2.5 py-2 font-bold text-slate-700 dark:text-slate-300">
                      {row.batchName || <span className="text-amber-600 italic">Unassigned</span>}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {row.sarathiAppNo || '—'}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.llTestDate || '—'}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.finalTestDate || '—'}
                    </td>
                    <td className="px-2.5 py-2 font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">₹{row.totalFee.toLocaleString('en-IN')}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block">Paid: ₹{row.paidAmount.toLocaleString('en-IN')}</span>
                      <span className="text-rose-500 text-[10px] block">Bal: ₹{row.balance.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block truncate max-w-[110px]" title={row.status}>{row.status}</span>
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="block truncate max-w-[120px]" title={row.nextAction || ''}>{row.nextAction || '—'}</span>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.nextActionDate || '—'}
                    </td>
                    <td className="px-2.5 py-2 text-[10px]">
                      {row.guardian && <span className="font-bold text-slate-700 dark:text-slate-300 block">{row.guardian}</span>}
                      {row.address && <span className="text-slate-500 block truncate max-w-[120px]" title={row.address}>{row.address}</span>}
                    </td>
                    <td className="px-2.5 py-2 text-[10px]">
                      {row.verification && <span className="text-slate-700 dark:text-slate-300 block font-semibold">{row.verification}</span>}
                      {row.notes && <span className="text-slate-400 block truncate max-w-[100px]" title={row.notes}>{row.notes}</span>}
                    </td>
                    {/* INDIVIDUAL DELETE BUTTON FOR EACH STAGED STUDENT */}
                    <td className="px-2.5 py-2 text-right">
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

      {/* ========================================================================= */}
      {/* INTERACTIVE FIELD SELECTION & COLUMN MAPPING MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        title="Configure Excel Column & Field Mapping"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Match Excel Columns to System Student Fields ({detectedHeaders.length} Excel Columns Detected out of 26 System Fields)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Check/uncheck fields to enable or disable them during import. Match Excel headers to system fields below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
              {raw2DData && raw2DData.length > 0 && (
                <div className="flex items-center gap-1.5 mr-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Header Row:</label>
                  <select
                    value={selectedHeaderRowIdx}
                    onChange={(e) => handleHeaderRowChange(parseInt(e.target.value, 10))}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[11px] font-bold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    {raw2DData.slice(0, 15).map((row, idx) => {
                      const filledCount = Array.isArray(row) ? row.filter(c => String(c || '').trim() !== '').length : 0;
                      const sample = Array.isArray(row) ? row.filter(c => String(c || '').trim() !== '').slice(0, 3).join(', ') : '';
                      return (
                        <option key={idx} value={idx}>
                          Row {idx + 1} ({filledCount} Cols): {sample ? sample.substring(0, 30) : 'Row ' + (idx + 1)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleSelectAllFields(true)}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[11px] font-bold transition"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllFields(false)}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-[11px] font-bold transition"
              >
                Required Only
              </button>
            </div>
          </div>

          {/* FIELDS MAPPING SELECTION TABLE */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-center w-10">Import</th>
                  <th className="px-3 py-2">System Field Name</th>
                  <th className="px-3 py-2">Mapped Excel Column Header</th>
                  <th className="px-3 py-2">Sample Row 1 Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {SYSTEM_FIELDS.map((sysField) => {
                  const mapping = fieldMappings[sysField.key] || { enabled: false, excelHeader: '' };
                  const sampleVal = mapping.excelHeader && rawFileData[0] ? rawFileData[0][mapping.excelHeader] : '';

                  return (
                    <tr
                      key={sysField.key}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${
                        mapping.enabled ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={sysField.required}
                          checked={mapping.enabled}
                          onChange={() => handleToggleField(sysField.key)}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{sysField.label}</span>
                          {sysField.required && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-black text-[9px] uppercase">Required</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={mapping.excelHeader}
                          onChange={(e) => handleHeaderChange(sysField.key, e.target.value)}
                          className="w-full px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded text-xs font-semibold focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">-- Skip Field / Not Mapped --</option>
                          {detectedHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500 text-[11px] truncate max-w-[180px]">
                        {sampleVal !== undefined && sampleVal !== '' ? (
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{String(sampleVal)}</span>
                        ) : (
                          <span className="text-slate-400 italic">No sample</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setMappingModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => applyFieldMapping()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition shadow-md flex items-center gap-2"
            >
              <Check size={16} />
              <span>Apply Field Mapping & Preview Staged Data</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BulkIntakeTab;
