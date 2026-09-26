import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import Navbar from '../../components/Navbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import {
  getVehicleById,
  updateVehicleCompliance,
  addVehicleMaintenance,
  addVehicleFuel
} from '../../services/vehicleService';
import {
  ArrowLeft,
  Car,
  ShieldCheck,
  Wrench,
  Fuel,
  Calendar,
  CalendarCheck,
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign
} from 'lucide-react';

const VehicleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('compliance');

  // Compliance Modal State
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [compForm, setCompForm] = useState({
    rc: { rcNumber: '', ownerName: '', issueDate: '', expiryDate: '' },
    insurance: { insuranceCompany: '', policyNumber: '', agency: '', contact: '', startDate: '', expiryDate: '', premium: 0 },
    fitness: { fitnessCertificateNumber: '', issueDate: '', expiryDate: '' },
    tax: { taxType: 'Road Tax', lastPaidDate: '', nextDueDate: '', amount: 0 },
    puc: { pucNumber: '', issueDate: '', expiryDate: '' }
  });
  const [submittingComp, setSubmittingComp] = useState(false);

  // Maintenance Modal State
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintForm, setMaintForm] = useState({
    maintenanceType: 'Regular Service',
    description: '',
    cost: 0,
    vendor: 'Benz Auto Care',
    odometer: 0,
    nextDueDate: '',
    status: 'Completed',
    performedBy: ''
  });
  const [submittingMaint, setSubmittingMaint] = useState(false);

  // Fuel Modal State
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState({
    fuelQty: '',
    amount: '',
    mileage: 0,
    driverInstructor: '',
    fuelStation: 'Indian Oil',
    remarks: ''
  });
  const [submittingFuel, setSubmittingFuel] = useState(false);

  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVehicleById(id);
      setDetails(data);

      const v = data.vehicle;
      setCompForm({
        rc: {
          rcNumber: v.rc?.rcNumber || '',
          ownerName: v.rc?.ownerName || '',
          issueDate: v.rc?.issueDate ? v.rc.issueDate.split('T')[0] : '',
          expiryDate: v.rc?.expiryDate ? v.rc.expiryDate.split('T')[0] : ''
        },
        insurance: {
          insuranceCompany: v.insurance?.insuranceCompany || '',
          policyNumber: v.insurance?.policyNumber || '',
          agency: v.insurance?.agency || '',
          contact: v.insurance?.contact || '',
          startDate: v.insurance?.startDate ? v.insurance.startDate.split('T')[0] : '',
          expiryDate: v.insurance?.expiryDate ? v.insurance.expiryDate.split('T')[0] : '',
          premium: v.insurance?.premium || 0
        },
        fitness: {
          fitnessCertificateNumber: v.fitness?.fitnessCertificateNumber || '',
          issueDate: v.fitness?.issueDate ? v.fitness.issueDate.split('T')[0] : '',
          expiryDate: v.fitness?.expiryDate ? v.fitness.expiryDate.split('T')[0] : ''
        },
        tax: {
          taxType: v.tax?.taxType || 'Road Tax',
          lastPaidDate: v.tax?.lastPaidDate ? v.tax.lastPaidDate.split('T')[0] : '',
          nextDueDate: v.tax?.nextDueDate ? v.tax.nextDueDate.split('T')[0] : '',
          amount: v.tax?.amount || 0
        },
        puc: {
          pucNumber: v.puc?.pucNumber || '',
          issueDate: v.puc?.issueDate ? v.puc.issueDate.split('T')[0] : '',
          expiryDate: v.puc?.expiryDate ? v.puc.expiryDate.split('T')[0] : ''
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleDetails();
  }, [id]);

  const handleUpdateCompliance = async (e) => {
    e.preventDefault();
    try {
      setSubmittingComp(true);
      await updateVehicleCompliance(id, compForm);
      setComplianceModalOpen(false);
      fetchVehicleDetails();
    } catch (err) {
      alert(err.message || 'Failed to update compliance');
    } finally {
      setSubmittingComp(false);
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      setSubmittingMaint(true);
      await addVehicleMaintenance(id, maintForm);
      setMaintModalOpen(false);
      setMaintForm({
        maintenanceType: 'Regular Service',
        description: '',
        cost: 0,
        vendor: 'Benz Auto Care',
        odometer: details.vehicle.currentOdometer || 0,
        nextDueDate: '',
        status: 'Completed',
        performedBy: ''
      });
      fetchVehicleDetails();
    } catch (err) {
      alert(err.message || 'Failed to add maintenance log');
    } finally {
      setSubmittingMaint(false);
    }
  };

  const handleAddFuel = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFuel(true);
      await addVehicleFuel(id, fuelForm);
      setFuelModalOpen(false);
      setFuelForm({
        fuelQty: '',
        amount: '',
        mileage: details.vehicle.currentOdometer || 0,
        driverInstructor: details.vehicle.assignedInstructor?.name || '',
        fuelStation: 'Indian Oil',
        remarks: ''
      });
      fetchVehicleDetails();
    } catch (err) {
      alert(err.message || 'Failed to add fuel record');
    } finally {
      setSubmittingFuel(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Navbar title="Vehicle Profile" />
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (error || !details) {
    return (
      <MainLayout>
        <Navbar title="Vehicle Profile" />
        <div className="p-6">
          <ErrorMessage message={error || 'Vehicle not found'} onRetry={fetchVehicleDetails} />
        </div>
      </MainLayout>
    );
  }

  const { vehicle, maintenance, fuel, activeBatches } = details;

  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  const totalFuelCost = fuel.reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalFuelLitres = fuel.reduce((sum, f) => sum + (f.fuelQty || 0), 0);

  const maintenanceColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => new Date(row.date).toLocaleDateString()
    },
    {
      header: 'Type',
      accessor: 'maintenanceType',
      cell: (row) => <Badge value={row.maintenanceType} />
    },
    {
      header: 'Description',
      accessor: 'description'
    },
    {
      header: 'Cost',
      accessor: 'cost',
      cell: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">₹{row.cost}</span>
    },
    {
      header: 'Vendor / Garage',
      accessor: 'vendor'
    },
    {
      header: 'Next Due',
      accessor: 'nextDueDate',
      cell: (row) => row.nextDueDate ? new Date(row.nextDueDate).toLocaleDateString() : '—'
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <Badge value={row.status} />
    }
  ];

  const fuelColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => new Date(row.date).toLocaleDateString()
    },
    {
      header: 'Fuel Qty (L)',
      accessor: 'fuelQty',
      cell: (row) => <span className="font-bold">{row.fuelQty} L</span>
    },
    {
      header: 'Amount Paid',
      accessor: 'amount',
      cell: (row) => <span className="font-bold text-red-600">₹{row.amount}</span>
    },
    {
      header: 'Odometer (KM)',
      accessor: 'mileage',
      cell: (row) => <span className="font-mono">{row.mileage || '—'}</span>
    },
    {
      header: 'Driver / Staff',
      accessor: 'driverInstructor',
      cell: (row) => row.driverInstructor || '—'
    },
    {
      header: 'Station',
      accessor: 'fuelStation'
    }
  ];

  const trainingClasses = details.trainingClasses || [];
  const trainingStats = details.trainingStats || {
    totalKm: 0,
    totalHours: 0,
    classesCount: 0,
    studentsTrained: 0,
    latestTrainingDate: null
  };

  const trainingColumns = [
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300">
          {row.classDate ? new Date(row.classDate).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {row.student?.fullName || 'Student'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {row.student?.studentId} &bull; {row.student?.primaryMobile}
          </p>
        </div>
      )
    },
    {
      header: 'Instructor',
      cell: (row) => row.instructorRef?.name || row.instructor || 'Unassigned'
    },
    {
      header: 'Training Type',
      cell: (row) => <Badge type="class" value={row.trainingType || 'Practical Driving'} />
    },
    {
      header: 'KM',
      cell: (row) => <span className="font-bold font-mono">{row.km || 0} KM</span>
    },
    {
      header: 'Hours',
      cell: (row) => <span className="font-bold font-mono">{row.hours || 0} hr(s)</span>
    },
    {
      header: 'Notes',
      cell: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px] inline-block" title={row.notes}>
          {row.notes || '—'}
        </span>
      )
    }
  ];

  return (
    <MainLayout>
      <Navbar title={vehicle.vehicleNumber} subtitle={`Vehicle Master & Compliance Dossier • ${vehicle.vehicleId}`} />

      <div className="p-6 space-y-6">
        {/* Header and Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/vehicles')}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-600 transition shadow-sm"
              title="Back to Vehicles"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-mono tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                  {vehicle.vehicleNumber}
                </h1>
                <Badge value={vehicle.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {vehicle.brand} {vehicle.model} • {vehicle.vehicleType} • Branch: {vehicle.branch}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setComplianceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-md text-xs font-bold transition shadow-sm"
            >
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Update Compliance</span>
            </button>
            <button
              onClick={() => setMaintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-md text-xs font-bold transition shadow-sm"
            >
              <Wrench size={14} className="text-amber-600" />
              <span>Log Maintenance</span>
            </button>
            <button
              onClick={() => setFuelModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition shadow-sm"
            >
              <Fuel size={14} />
              <span>Log Fuel</span>
            </button>
          </div>
        </div>

        {/* Financial & Fleet Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Odometer Reading"
            value={`${vehicle.currentOdometer || 0} KM`}
            icon={Car}
            color="blue"
            description="Cumulative vehicle mileage"
          />
          <StatCard
            title="Total Maintenance Spent"
            value={`₹${totalMaintenanceCost}`}
            icon={Wrench}
            color="amber"
            description={`${maintenance.length} service records`}
          />
          <StatCard
            title="Total Fuel Spent"
            value={`₹${totalFuelCost}`}
            icon={Fuel}
            color="red"
            description={`${totalFuelLitres.toFixed(1)} Litres consumed`}
          />
          <StatCard
            title="Assigned Instructor"
            value={vehicle.assignedInstructor?.name || vehicle.assignedInstructorName || 'Unassigned'}
            icon={CheckCircle2}
            color="emerald"
            description={vehicle.assignedInstructor?.mobile || 'Faculty partner'}
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex space-x-6 overflow-x-auto text-sm font-semibold">
            {[
              { id: 'compliance', label: 'Legal Compliance Registers', icon: ShieldCheck },
              { id: 'training', label: `Training History (${trainingClasses.length})`, icon: CalendarCheck },
              { id: 'maintenance', label: `Maintenance History (${maintenance.length})`, icon: Wrench },
              { id: 'fuel', label: `Fuel Register (${fuel.length})`, icon: Fuel },
              { id: 'batches', label: `Batch Allocations (${activeBatches.length})`, icon: Calendar }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-bold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600 dark:text-red-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: LEGAL COMPLIANCE REGISTERS (RC, Insurance, Fitness, Tax, PUC) */}
        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. RC Register */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <FileText size={16} className="text-blue-600" />
                  <span>Registration Certificate (RC)</span>
                </span>
                <Badge value={vehicle.rc?.status || 'Valid'} />
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">RC Number:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vehicle.rc?.rcNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Registered Owner:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{vehicle.rc?.ownerName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Issue Date:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {vehicle.rc?.issueDate ? new Date(vehicle.rc.issueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Expiry Date:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {vehicle.rc?.expiryDate ? new Date(vehicle.rc.expiryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Insurance Register */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Motor Insurance Policy</span>
                </span>
                <Badge value={vehicle.insurance?.status || 'Valid'} />
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">Company:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{vehicle.insurance?.insuranceCompany || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Policy Number:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vehicle.insurance?.policyNumber || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Agency / Contact:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {vehicle.insurance?.agency || '—'} {vehicle.insurance?.contact ? `(${vehicle.insurance.contact})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Annual Premium:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹{vehicle.insurance?.premium || 0}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Expiry / Due Date:</span>
                  <span className="font-bold text-red-600">
                    {vehicle.insurance?.expiryDate ? new Date(vehicle.insurance.expiryDate).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Fitness Register */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-purple-600" />
                  <span>Fitness Certificate (FC)</span>
                </span>
                <Badge value={vehicle.fitness?.status || 'Valid'} />
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">Certificate Number:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vehicle.fitness?.fitnessCertificateNumber || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Issue Date:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {vehicle.fitness?.issueDate ? new Date(vehicle.fitness.issueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Expiry Date:</span>
                    <span className="font-bold text-red-600">
                      {vehicle.fitness?.expiryDate ? new Date(vehicle.fitness.expiryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Tax Register */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <DollarSign size={16} className="text-amber-600" />
                  <span>Motor Vehicle Road Tax</span>
                </span>
                <Badge value={vehicle.tax?.status || 'Paid'} />
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">Tax Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{vehicle.tax?.taxType || 'Road Tax'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Last Paid:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {vehicle.tax?.lastPaidDate ? new Date(vehicle.tax.lastPaidDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Next Due:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {vehicle.tax?.nextDueDate ? new Date(vehicle.tax.nextDueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Amount:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{vehicle.tax?.amount || 0}</span>
                </div>
              </div>
            </div>

            {/* 5. Pollution / PUC Register */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-teal-600" />
                  <span>Pollution Under Control (PUC)</span>
                </span>
                <Badge value={vehicle.puc?.status || 'Valid'} />
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">PUC Certificate No:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vehicle.puc?.pucNumber || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Issue Date:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {vehicle.puc?.issueDate ? new Date(vehicle.puc.issueDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Expiry Date:</span>
                    <span className="font-bold text-red-600">
                      {vehicle.puc?.expiryDate ? new Date(vehicle.puc.expiryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAINTENANCE REGISTER */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <DataTable
              columns={maintenanceColumns}
              data={maintenance}
              emptyMessage="No maintenance or service logs recorded for this vehicle."
            />
          </div>
        )}

        {/* TAB 3: FUEL REGISTER */}
        {activeTab === 'fuel' && (
          <div className="space-y-4">
            <DataTable
              columns={fuelColumns}
              data={fuel}
              emptyMessage="No fuel fill entries recorded for this vehicle."
            />
          </div>
        )}

        {/* TAB 4: ACTIVE BATCH ALLOCATIONS */}
        {activeTab === 'batches' && (
          <div className="space-y-4">
            {activeBatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBatches.map(b => (
                  <div key={b._id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 text-xs">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{b.name}</div>
                    <div className="text-slate-500">{b.courseLicenceType} • {b.session}</div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Instructor: {b.instructor}</span>
                      <Badge value={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                Vehicle is not currently assigned to any active batch.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: VEHICLE TRAINING SESSIONS */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            {/* Top Vehicle Training Statistics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Total KM Driven</span>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {trainingStats.totalKm} KM
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Fleet training distance</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Training Hours</span>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                  {trainingStats.totalHours} hrs
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Practical engine runtime</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Class Sessions</span>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
                  {trainingStats.classesCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Completed lessons</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold block">Students Trained</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  {trainingStats.studentsTrained}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Latest: {trainingStats.latestTrainingDate ? new Date(trainingStats.latestTrainingDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <DataTable
              columns={trainingColumns}
              data={trainingClasses}
              emptyMessage="No training class sessions recorded with this vehicle yet."
            />
          </div>
        )}
      </div>

      {/* Update Compliance Modal */}
      <Modal
        isOpen={complianceModalOpen}
        onClose={() => setComplianceModalOpen(false)}
        title="Update Legal Compliance Registers"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleUpdateCompliance} className="space-y-5 text-xs">
          {/* RC Section */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">1. Registration Certificate (RC)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">RC Number</label>
                <input
                  type="text"
                  value={compForm.rc.rcNumber}
                  onChange={(e) => setCompForm({ ...compForm, rc: { ...compForm.rc, rcNumber: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Owner Name</label>
                <input
                  type="text"
                  value={compForm.rc.ownerName}
                  onChange={(e) => setCompForm({ ...compForm, rc: { ...compForm.rc, ownerName: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">RC Expiry Date</label>
                <input
                  type="date"
                  value={compForm.rc.expiryDate}
                  onChange={(e) => setCompForm({ ...compForm, rc: { ...compForm.rc, expiryDate: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Insurance Section */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">2. Motor Insurance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Insurance Company</label>
                <input
                  type="text"
                  value={compForm.insurance.insuranceCompany}
                  onChange={(e) => setCompForm({ ...compForm, insurance: { ...compForm.insurance, insuranceCompany: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Policy Number</label>
                <input
                  type="text"
                  value={compForm.insurance.policyNumber}
                  onChange={(e) => setCompForm({ ...compForm, insurance: { ...compForm.insurance, policyNumber: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Insurance Expiry Date</label>
                <input
                  type="date"
                  value={compForm.insurance.expiryDate}
                  onChange={(e) => setCompForm({ ...compForm, insurance: { ...compForm.insurance, expiryDate: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Agency / Broker</label>
                <input
                  type="text"
                  value={compForm.insurance.agency}
                  onChange={(e) => setCompForm({ ...compForm, insurance: { ...compForm.insurance, agency: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={compForm.insurance.contact}
                  onChange={(e) => setCompForm({ ...compForm, insurance: { ...compForm.insurance, contact: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Premium Amount (₹)</label>
                <input
                  type="number"
                  value={compForm.insurance.premium}
                  onChange={(e) => setCompForm({ ...compForm, insurance: { ...compForm.insurance, premium: Number(e.target.value) } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Fitness, Tax & PUC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">3. Fitness Certificate</h4>
              <div>
                <label className="block font-medium mb-1">FC Number</label>
                <input
                  type="text"
                  value={compForm.fitness.fitnessCertificateNumber}
                  onChange={(e) => setCompForm({ ...compForm, fitness: { ...compForm.fitness, fitnessCertificateNumber: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={compForm.fitness.expiryDate}
                  onChange={(e) => setCompForm({ ...compForm, fitness: { ...compForm.fitness, expiryDate: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">4. Road Tax</h4>
              <div>
                <label className="block font-medium mb-1">Tax Type</label>
                <input
                  type="text"
                  value={compForm.tax.taxType}
                  onChange={(e) => setCompForm({ ...compForm, tax: { ...compForm.tax, taxType: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Next Due Date</label>
                <input
                  type="date"
                  value={compForm.tax.nextDueDate}
                  onChange={(e) => setCompForm({ ...compForm, tax: { ...compForm.tax, nextDueDate: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">5. PUC / Pollution</h4>
              <div>
                <label className="block font-medium mb-1">PUC Number</label>
                <input
                  type="text"
                  value={compForm.puc.pucNumber}
                  onChange={(e) => setCompForm({ ...compForm, puc: { ...compForm.puc, pucNumber: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={compForm.puc.expiryDate}
                  onChange={(e) => setCompForm({ ...compForm, puc: { ...compForm.puc, expiryDate: e.target.value } })}
                  className="w-full p-2 border rounded bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setComplianceModalOpen(false)}
              className="px-4 py-2 border rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingComp}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow"
            >
              {submittingComp ? 'Updating...' : 'Save Compliance Registers'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Maintenance Modal */}
      <Modal
        isOpen={maintModalOpen}
        onClose={() => setMaintModalOpen(false)}
        title="Log Vehicle Service & Maintenance"
      >
        <form onSubmit={handleAddMaintenance} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Maintenance Type *
              </label>
              <select
                value={maintForm.maintenanceType}
                onChange={(e) => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              >
                <option value="Regular Service">Regular Service</option>
                <option value="Oil Change">Oil Change</option>
                <option value="Brakes">Brakes Repair</option>
                <option value="Tyres">Tyres Change/Rotation</option>
                <option value="Repair">Mechanical Repair</option>
                <option value="Inspection">Periodic Inspection</option>
                <option value="Accident Damage">Accident Damage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cost (₹) *
              </label>
              <input
                type="number"
                required
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: Number(e.target.value) })}
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Work Done *
            </label>
            <input
              type="text"
              required
              value={maintForm.description}
              onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
              placeholder="e.g. Engine oil replaced, dual pedal brake cable adjusted"
              className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Garage
              </label>
              <input
                type="text"
                value={maintForm.vendor}
                onChange={(e) => setMaintForm({ ...maintForm, vendor: e.target.value })}
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Next Service Due Date
              </label>
              <input
                type="date"
                value={maintForm.nextDueDate}
                onChange={(e) => setMaintForm({ ...maintForm, nextDueDate: e.target.value })}
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setMaintModalOpen(false)}
              className="px-4 py-2 border rounded text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingMaint}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow"
            >
              {submittingMaint ? 'Logging...' : 'Save Maintenance Log'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Fuel Modal */}
      <Modal
        isOpen={fuelModalOpen}
        onClose={() => setFuelModalOpen(false)}
        title="Log Vehicle Fuel Expense"
      >
        <form onSubmit={handleAddFuel} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fuel Quantity (Litres) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={fuelForm.fuelQty}
                onChange={(e) => setFuelForm({ ...fuelForm, fuelQty: Number(e.target.value) })}
                placeholder="e.g. 15.5"
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Amount Paid (₹) *
              </label>
              <input
                type="number"
                required
                value={fuelForm.amount}
                onChange={(e) => setFuelForm({ ...fuelForm, amount: Number(e.target.value) })}
                placeholder="e.g. 1650"
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Odometer Reading (KM)
              </label>
              <input
                type="number"
                value={fuelForm.mileage}
                onChange={(e) => setFuelForm({ ...fuelForm, mileage: Number(e.target.value) })}
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fuel Station
              </label>
              <input
                type="text"
                value={fuelForm.fuelStation}
                onChange={(e) => setFuelForm({ ...fuelForm, fuelStation: e.target.value })}
                className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Driver / Instructor
            </label>
            <input
              type="text"
              value={fuelForm.driverInstructor}
              onChange={(e) => setFuelForm({ ...fuelForm, driverInstructor: e.target.value })}
              className="w-full p-2 border rounded text-xs bg-white dark:bg-slate-900"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setFuelModalOpen(false)}
              className="px-4 py-2 border rounded text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingFuel}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow"
            >
              {submittingFuel ? 'Logging...' : 'Save Fuel Log'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};

export default VehicleDetailPage;
