import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserCheck, 
  Truck, 
  Calendar, 
  MapPin, 
  Package, 
  CheckCircle2, 
  Building2,
  Phone,
  ShieldCheck,
  AlertCircle,
  Clock,
  Navigation,
  FileText
} from 'lucide-react';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { OFII_HELPERS_ROSTER, getRegisteredUsers } from '../data/userAccounts';
import { useData } from '../context/DataContext';

export interface DeliveryAssignTarget {
  id: string;
  podNumber: string;
  referenceNumber?: string;
  client: string;
  consignee: string;
  area: string;
  destination?: string;
  plannedDeliveryDate?: string;
  actualDispatchDate?: string;
  rdd?: string;
  modeOfShipment?: string;
  quantity?: number;
  unit?: string;
  driverName?: string;
  driverId?: string;
  helperName?: string;
  helperId?: string;
  plateNumber?: string;
  courier?: string;
  truckProvider?: string;
  vehicleType?: string;
  deliveryStatus?: string;
  assignmentStatus?: string;
}

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DeliveryAssignTarget | null;
}

export const AssignDriverModal: React.FC<AssignDriverModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const { assignDriverToDelivery } = useData();

  // Active driver accounts from registered users & roster
  const activeDriverProfiles = useMemo(() => {
    try {
      const regDrivers = getRegisteredUsers().filter(u => u.userRole === 'driver' && u.isActive !== false);
      if (regDrivers.length > 0) {
        return regDrivers.map(u => ({
          id: u.driverId || u.employeeId || u.id,
          name: u.driverName || u.name,
          plateNumber: u.vehiclePlate || 'NDB-4921',
          vehicleType: u.assignedVehicle || '6-Wheeler Forward Truck',
          contactNumber: u.contactNumber || '+63 917 842 1190',
          status: 'Active',
          email: u.email,
        }));
      }
    } catch (e) {
      console.warn('[AssignDriverModal] Error reading registered drivers:', e);
    }
    // Fallback to roster
    return OFII_DRIVERS_ROSTER.map(d => ({
      id: d.id,
      name: d.name,
      plateNumber: d.defaultPlate,
      vehicleType: d.vehicleType,
      contactNumber: d.contactNumber,
      status: d.status,
      email: `${d.name.toLowerCase().replace(/[^a-z]/g, '.')}@orientfreight.com`,
    }));
  }, [isOpen]);

  // Active helper crew
  const activeHelpers = useMemo(() => {
    return OFII_HELPERS_ROSTER;
  }, []);

  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  const [selectedHelperId, setSelectedHelperId] = useState<string>('');
  const [selectedHelperName, setSelectedHelperName] = useState<string>('');
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form whenever target changes
  useEffect(() => {
    if (target) {
      setErrorMessage(null);
      const existingDriver = target.driverName || '';
      const existingDriverId = target.driverId || '';

      // Match driver by ID or name
      const matchedDriver = activeDriverProfiles.find(d => 
        (existingDriverId && d.id.toLowerCase() === existingDriverId.toLowerCase()) ||
        (existingDriver && d.name.toLowerCase() === existingDriver.toLowerCase())
      );

      if (matchedDriver) {
        setSelectedDriverId(matchedDriver.id);
        setSelectedDriverName(matchedDriver.name);
        setPlateNumber(target.plateNumber || matchedDriver.plateNumber);
        setVehicleType(target.vehicleType || target.truckProvider || target.courier || matchedDriver.vehicleType);
      } else if (activeDriverProfiles.length > 0) {
        // Default to first active driver if none is currently assigned
        const defaultDriver = activeDriverProfiles[0];
        setSelectedDriverId(defaultDriver.id);
        setSelectedDriverName(defaultDriver.name);
        setPlateNumber(target.plateNumber || defaultDriver.plateNumber);
        setVehicleType(target.vehicleType || target.truckProvider || target.courier || defaultDriver.vehicleType);
      } else {
        setSelectedDriverId('');
        setSelectedDriverName('');
        setPlateNumber(target.plateNumber || '');
        setVehicleType(target.vehicleType || 'OFII Dedicated Transport');
      }

      // Helper setup
      const existingHelper = target.helperName || '';
      const existingHelperId = target.helperId || '';
      const matchedHelper = activeHelpers.find(h => 
        (existingHelperId && h.id.toLowerCase() === existingHelperId.toLowerCase()) ||
        (existingHelper && h.name.toLowerCase() === existingHelper.toLowerCase())
      );

      if (matchedHelper) {
        setSelectedHelperId(matchedHelper.id);
        setSelectedHelperName(matchedHelper.name);
      } else {
        // Default to first helper or none
        if (activeHelpers.length > 0) {
          setSelectedHelperId(activeHelpers[0].id);
          setSelectedHelperName(activeHelpers[0].name);
        } else {
          setSelectedHelperId('');
          setSelectedHelperName('');
        }
      }
    }
  }, [target, activeDriverProfiles, activeHelpers]);

  // Handle Driver Dropdown change
  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenId = e.target.value;
    setSelectedDriverId(chosenId);
    setErrorMessage(null);

    const matched = activeDriverProfiles.find(d => d.id === chosenId);
    if (matched) {
      setSelectedDriverName(matched.name);
      // Auto-populate vehicle & plate if not custom
      setPlateNumber(matched.plateNumber);
      setVehicleType(matched.vehicleType);
    } else {
      setSelectedDriverName('');
    }
  };

  // Handle Helper Dropdown change
  const handleHelperChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenVal = e.target.value;
    setErrorMessage(null);

    if (!chosenVal) {
      setSelectedHelperId('');
      setSelectedHelperName('');
      return;
    }

    const matched = activeHelpers.find(h => h.id === chosenVal || h.name === chosenVal);
    if (matched) {
      setSelectedHelperId(matched.id);
      setSelectedHelperName(matched.name);
    } else {
      setSelectedHelperId('');
      setSelectedHelperName(chosenVal);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    if (!selectedDriverName.trim() || !selectedDriverId.trim()) {
      setErrorMessage('Please select an active Driver account from the dropdown.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await assignDriverToDelivery(
        target.id,
        selectedDriverName.trim(),
        plateNumber.trim() || undefined,
        vehicleType.trim() || undefined,
        selectedHelperName.trim() || undefined,
        selectedDriverId.trim(),
        selectedHelperId.trim() || undefined
      );

      // Successfully saved to same record and generated notification
      onClose();
    } catch (err: any) {
      console.error('[AssignDriverModal] Failed to assign driver:', err);
      setErrorMessage(err?.message || 'Failed to save driver assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans">
      <div 
        id="driver-assignment-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-blue-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-wide text-white">
                  Driver & Crew Assignment
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-900/80 text-blue-200 border border-blue-600/60 rounded font-semibold">
                  POD: {target.podNumber}
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Driver Head Operations • Assign authenticated driver & helper to this delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Validation or System Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Assignment Error:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: DELIVERY INFORMATION FIRST (Requirement 3 & 12) */}
          {/* ========================================================================= */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Target Delivery Details
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Ref: {target.referenceNumber || target.podNumber}
              </span>
            </div>

            {/* Grid of Key Delivery Facts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* CLIENT (HIGH VISIBILITY) */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  CLIENT
                </span>
                <span className="font-bold text-blue-900 text-sm flex items-center gap-1.5 mt-0.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  {target.client}
                </span>
              </div>

              {/* DELIVERY AREA (HIGH VISIBILITY) */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  DELIVERY AREA
                </span>
                <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                    {target.area}
                  </span>
                </span>
              </div>

              {/* DESTINATION */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  DESTINATION / DELIVERY LOCATION
                </span>
                <span className="font-semibold text-slate-800 text-xs block mt-0.5 truncate">
                  {target.destination || target.area}
                </span>
              </div>

              {/* CONSIGNEE */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  CONSIGNEE
                </span>
                <span className="font-semibold text-slate-800 text-xs block mt-0.5 truncate">
                  {target.consignee}
                </span>
              </div>

              {/* QUANTITY */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  QUANTITY
                </span>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                  <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {target.quantity ?? '—'} {target.unit || 'cases'}
                </span>
              </div>

              {/* DELIVERY DATE */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  DELIVERY DATE
                </span>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  {target.plannedDeliveryDate || target.actualDispatchDate || 'Immediate Dispatch'}
                </span>
              </div>

              {/* VEHICLE & PLATE NUMBER */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    VEHICLE
                  </span>
                  <span className="font-semibold text-slate-800 text-xs mt-0.5 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-600" />
                    {target.vehicleType || target.truckProvider || target.courier || 'OFII Dedicated Transport'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    PLATE NUMBER
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-xs mt-0.5 block">
                    {target.plateNumber || 'TBD / Pending'}
                  </span>
                </div>
                {target.modeOfShipment && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      MODE OF SHIPMENT
                    </span>
                    <span className="font-medium text-slate-700 text-xs mt-0.5 block">
                      {target.modeOfShipment}
                    </span>
                  </div>
                )}
                {target.rdd && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      RDD (SLA)
                    </span>
                    <span className="font-medium text-slate-700 text-xs mt-0.5 block">
                      {target.rdd}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Rule Informational Notice */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">Single Record Update & Driver Notification</p>
              <p className="text-blue-800/80 text-[11px] mt-0.5 leading-relaxed">
                Confirming assignment saves directly to this delivery record without creating duplicate entries. The assigned driver will instantly receive a notification and see this order in their Driver Portal.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: ASSIGNMENT INPUTS (Requirement 3, 4, 5) */}
          {/* ========================================================================= */}
          <form id="assign-driver-form" onSubmit={handleSubmit} className="space-y-4">
            {/* DRIVER DROPDOWN */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>SELECT OFII DRIVER *</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">
                  (linked to driver account & ID)
                </span>
              </label>
              <select
                value={selectedDriverId}
                onChange={handleDriverChange}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
              >
                <option value="">-- Choose Authorized Driver --</option>
                <optgroup label="Active OFII Fleet Drivers">
                  {activeDriverProfiles.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} [{driver.id}] — {driver.plateNumber} ({driver.vehicleType})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* HELPER DROPDOWN */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>ASSIGN HELPER / CARGO CREW</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">
                  (optional cargo assistance)
                </span>
              </label>
              <select
                value={selectedHelperId}
                onChange={handleHelperChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
              >
                <option value="">-- No Helper Assigned --</option>
                <optgroup label="OFII Helper Crew">
                  {activeHelpers.map((helper) => (
                    <option key={helper.id} value={helper.id}>
                      {helper.name} [{helper.id}] ({helper.contactNumber}) — {helper.status}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* VEHICLE CONFIRMATION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  VEHICLE / TRUCK TYPE
                </label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="e.g. 6-Wheeler Forward Truck"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  PLATE NUMBER
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="e.g. NDB-4921"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer: Cancel & Confirm Assignment */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            form="assign-driver-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white uppercase tracking-wider bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'SAVING ASSIGNMENT...' : 'CONFIRM ASSIGNMENT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
