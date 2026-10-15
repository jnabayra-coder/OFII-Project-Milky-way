import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserCheck, 
  Truck, 
  Calendar, 
  Clock, 
  MapPin, 
  Package, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  FileText 
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { OFII_HELPERS_ROSTER, getRegisteredUsers } from '../data/userAccounts';
import { DeliveryAssignment } from '../types';

export interface OriginalDeliveryInfo {
  deliveryId: string;
  client: string;
  consignee: string;
  destination: string;
  area: string;
  quantity: number | string;
  unit?: string;
  freightType: string;
  rdd?: string;
  podNumber?: string;
  referenceNumber?: string;
  plannedDeliveryDate?: string;
  actualDispatchDate?: string;
}

interface CreateDeliveryAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: OriginalDeliveryInfo | null;
  onSuccess?: (assignment: DeliveryAssignment) => void;
}

export const CreateDeliveryAssignmentModal: React.FC<CreateDeliveryAssignmentModalProps> = ({
  isOpen,
  onClose,
  delivery,
  onSuccess,
}) => {
  const { createDeliveryAssignment, getDeliveryAssignmentByOriginalDeliveryId } = useData();

  // Active driver accounts from registered users & fleet roster
  const driverProfiles = useMemo(() => {
    try {
      const regDrivers = getRegisteredUsers().filter(
        (u) => u.userRole === 'driver' && u.isActive !== false
      );
      if (regDrivers.length > 0) {
        return regDrivers.map((u) => ({
          id: u.driverId || u.employeeId || u.id,
          name: u.driverName || u.name,
          plateNumber: u.vehiclePlate || 'ABC-1234',
          vehicleType: u.assignedVehicle || '6-Wheeler Forward Truck',
        }));
      }
    } catch (e) {
      console.warn('[CreateDeliveryAssignmentModal] Error reading registered drivers:', e);
    }
    return OFII_DRIVERS_ROSTER.map((d) => ({
      id: d.id,
      name: d.name,
      plateNumber: d.defaultPlate || 'ABC-1234',
      vehicleType: d.vehicleType || '10-Wheeler Wing Van',
    }));
  }, [isOpen]);

  // Active helper crew roster
  const helperList = useMemo(() => {
    return OFII_HELPERS_ROSTER.map((h) => ({
      id: h.id,
      name: h.name,
    }));
  }, []);

  // Form State (Editable Assignment Fields)
  const [driverName, setDriverName] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [helperName, setHelperName] = useState<string>('');
  const [helperId, setHelperId] = useState<string>('');
  const [vehicle, setVehicle] = useState<string>('');
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [assignmentDate, setAssignmentDate] = useState<string>('');
  const [assignmentTime, setAssignmentTime] = useState<string>('');
  const [assignmentStatus] = useState<string>('ASSIGNED');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAssignment, setSuccessAssignment] = useState<DeliveryAssignment | null>(null);

  // Check if an active assignment already exists for this Delivery
  const existingActiveAssignment = useMemo(() => {
    if (!delivery?.deliveryId) return undefined;
    return getDeliveryAssignmentByOriginalDeliveryId(delivery.deliveryId);
  }, [delivery?.deliveryId, getDeliveryAssignmentByOriginalDeliveryId, isOpen]);

  // Initialize or reset form when delivery changes
  useEffect(() => {
    if (delivery && isOpen) {
      setErrorMessage(null);
      setSuccessAssignment(null);

      // Default date to today (YYYY-MM-DD)
      const todayStr = new Date().toISOString().split('T')[0];
      setAssignmentDate(todayStr);

      // Default time to current time
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setAssignmentTime(timeStr);

      // If an existing assignment already exists, prefill from it in view mode
      if (existingActiveAssignment) {
        setDriverName(existingActiveAssignment.driver);
        setDriverId(existingActiveAssignment.driverId || '');
        setHelperName(existingActiveAssignment.helper);
        setHelperId(existingActiveAssignment.helperId || '');
        setVehicle(existingActiveAssignment.vehicle);
        setPlateNumber(existingActiveAssignment.plateNumber);
        setAssignmentDate(existingActiveAssignment.assignmentDate);
        setAssignmentTime(existingActiveAssignment.assignmentTime);
      } else {
        // Default to first driver if available or empty
        if (driverProfiles.length > 0) {
          const firstDriver = driverProfiles[0];
          setDriverName(firstDriver.name);
          setDriverId(firstDriver.id);
          setPlateNumber(firstDriver.plateNumber);
          setVehicle(firstDriver.vehicleType);
        } else {
          setDriverName('');
          setDriverId('');
          setPlateNumber('');
          setVehicle('OFII Dedicated Truck');
        }

        if (helperList.length > 0) {
          setHelperName(helperList[0].name);
          setHelperId(helperList[0].id);
        } else {
          setHelperName('');
          setHelperId('');
        }
      }
    }
  }, [delivery, isOpen, existingActiveAssignment, driverProfiles, helperList]);

  // Handle Driver Selection change
  const handleDriverSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setErrorMessage(null);

    if (selected === '__CUSTOM__') {
      setDriverId('');
      return;
    }

    const matched = driverProfiles.find((d) => d.id === selected || d.name === selected);
    if (matched) {
      setDriverId(matched.id);
      setDriverName(matched.name);
      setPlateNumber(matched.plateNumber);
      setVehicle(matched.vehicleType);
    } else {
      setDriverName(selected);
      setDriverId('');
    }
  };

  // Handle Helper Selection change
  const handleHelperSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setErrorMessage(null);

    if (selected === '__CUSTOM__') {
      setHelperId('');
      return;
    }

    const matched = helperList.find((h) => h.id === selected || h.name === selected);
    if (matched) {
      setHelperId(matched.id);
      setHelperName(matched.name);
    } else {
      setHelperName(selected);
      setHelperId('');
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;

    // Safety: Check if assignment already exists
    if (existingActiveAssignment) {
      setErrorMessage('This delivery already has an active assignment.');
      return;
    }

    if (!driverName.trim()) {
      setErrorMessage('Driver name is required.');
      return;
    }

    if (!vehicle.trim()) {
      setErrorMessage('Vehicle / Truck information is required.');
      return;
    }

    if (!plateNumber.trim()) {
      setErrorMessage('Plate Number is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const savedAssignment = await createDeliveryAssignment({
        originalDeliveryId: delivery.deliveryId,
        driver: driverName.trim(),
        driverId: driverId.trim() || undefined,
        helper: helperName.trim() || 'No Helper Assigned',
        helperId: helperId.trim() || undefined,
        vehicle: vehicle.trim(),
        plateNumber: plateNumber.trim(),
        assignmentDate: assignmentDate.trim() || new Date().toISOString().split('T')[0],
        assignmentTime: assignmentTime.trim() || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        assignmentStatus: 'ASSIGNED',
      });

      setSuccessAssignment(savedAssignment);
      if (onSuccess) {
        onSuccess(savedAssignment);
      }

      // Automatically close modal after brief visual feedback
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('[CreateDeliveryAssignmentModal] Error:', err);
      // Requirement 9: Error handling - show clear error message, allow retry
      setErrorMessage(err?.message || 'Failed to save delivery assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !delivery) return null;

  const isDuplicate = !!existingActiveAssignment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div 
        id="create-delivery-assignment-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[94vh]"
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
                  Create Delivery Assignment
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-900/80 text-blue-200 border border-blue-600/60 rounded font-semibold">
                  Delivery ID: {delivery.deliveryId}
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Phase 1 Delivery Assignment Workflow • Links driver crew to original coordinator delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          
          {/* SUCCESS MESSAGE */}
          {successAssignment && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3 text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Delivery Assignment Saved Successfully!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Generated <strong>Assignment ID: {successAssignment.assignmentId}</strong> linked to Original Delivery <strong>{successAssignment.originalDeliveryId}</strong>. Status: <span className="font-bold uppercase">ASSIGNED</span>.
                </p>
              </div>
            </div>
          )}

          {/* DUPLICATE ACTIVE ASSIGNMENT ALERT (Requirement 6) */}
          {isDuplicate && !successAssignment && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-amber-900">
                  This delivery already has an active assignment.
                </p>
                <p className="text-xs text-amber-800">
                  Original Delivery <strong className="font-mono">{delivery.deliveryId}</strong> is already assigned under <strong className="font-mono">{existingActiveAssignment?.assignmentId}</strong> to <strong>{existingActiveAssignment?.driver}</strong> (Vehicle: {existingActiveAssignment?.vehicle}, Plate: {existingActiveAssignment?.plateNumber}).
                </p>
                <p className="text-[11px] text-amber-700 font-medium">
                  Duplicate active assignments for the same delivery are prevented by system policy.
                </p>
              </div>
            </div>
          )}

          {/* ERROR MESSAGE (Requirement 9) */}
          {errorMessage && !successAssignment && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold text-xs">{errorMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: ORIGINAL DELIVERY INFORMATION (READ-ONLY) (Requirements 1, 3, 4) */}
          {/* ========================================================================= */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                  Original Master Delivery Details (Coordinator Record)
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                <Lock className="w-3 h-3 text-slate-500" />
                READ-ONLY MASTER DATA
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Delivery ID */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery ID</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{delivery.deliveryId}</span>
              </div>

              {/* Client */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
                <span className="font-bold text-blue-900 text-xs truncate block">{delivery.client}</span>
              </div>

              {/* Consignee / Receiver */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Consignee / Receiver</span>
                <span className="font-semibold text-slate-900 text-xs truncate block">{delivery.consignee}</span>
              </div>

              {/* Destination */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                <span className="font-medium text-slate-800 text-xs truncate block">{delivery.destination}</span>
              </div>

              {/* Delivery Area */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Area</span>
                <span className="font-bold text-amber-800 text-xs block">{delivery.area}</span>
              </div>

              {/* Quantity */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Quantity</span>
                <span className="font-mono font-bold text-slate-900 text-xs block">
                  {delivery.quantity} {delivery.unit || 'Boxes'}
                </span>
              </div>

              {/* Freight Type / Mode */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Freight Type / Mode</span>
                <span className="font-semibold text-slate-800 text-xs block">{delivery.freightType}</span>
              </div>

              {/* RDD (Request Delivery Date) */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">RDD (Requested Date)</span>
                <span className="font-mono font-bold text-indigo-700 text-xs block">
                  {delivery.rdd || 'Standard SLA'}
                </span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 italic">
              Driver Head does not modify Coordinator delivery info. The original delivery remains the master source of shipment details.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: EDITABLE DELIVERY ASSIGNMENT FIELDS (Requirements 2 & 4) */}
          {/* ========================================================================= */}
          <form id="delivery-assignment-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-700" />
                  <span className="font-bold uppercase tracking-wider text-[11px] text-blue-900">
                    Delivery Assignment Parameters
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-blue-700">
                  Separate Assignment Record Linked to Delivery
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. DRIVER SELECTION */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Driver <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={isDuplicate || isSubmitting}
                    value={driverId || (driverProfiles.some(d => d.name === driverName) ? driverName : '__CUSTOM__')}
                    onChange={handleDriverSelect}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Authenticated Driver --</option>
                    {driverProfiles.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.plateNumber} • {d.vehicleType})
                      </option>
                    ))}
                    <option value="Example Driver">Example Driver (Phase 1 Acceptance Test)</option>
                    <option value="__CUSTOM__">Other / Custom Driver Name</option>
                  </select>

                  {/* Free text driver input if custom or example */}
                  {(!driverProfiles.some(d => d.id === driverId) || driverId === '') && (
                    <input
                      type="text"
                      disabled={isDuplicate || isSubmitting}
                      placeholder="Enter driver name (e.g. Example Driver)"
                      value={driverName}
                      onChange={(e) => {
                        setDriverName(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="mt-1.5 w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  )}
                </div>

                {/* 2. HELPER SELECTION */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Helper <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    disabled={isDuplicate || isSubmitting}
                    value={helperId || (helperList.some(h => h.name === helperName) ? helperName : '__CUSTOM__')}
                    onChange={handleHelperSelect}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Crew Helper --</option>
                    {helperList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                    <option value="Example Helper">Example Helper (Phase 1 Acceptance Test)</option>
                    <option value="__CUSTOM__">Other / Custom Helper Name</option>
                  </select>

                  {/* Free text helper input if custom or example */}
                  {(!helperList.some(h => h.id === helperId) || helperId === '') && (
                    <input
                      type="text"
                      disabled={isDuplicate || isSubmitting}
                      placeholder="Enter helper name (e.g. Example Helper)"
                      value={helperName}
                      onChange={(e) => {
                        setHelperName(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="mt-1.5 w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  )}
                </div>

                {/* 3. VEHICLE / TRUCK */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vehicle / Truck <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isDuplicate || isSubmitting}
                    placeholder="e.g. 6-Wheeler Forward Truck or Example Truck"
                    value={vehicle}
                    onChange={(e) => {
                      setVehicle(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Selects from fleet vehicle profile or enter custom unit
                  </p>
                </div>

                {/* 4. PLATE NUMBER */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Plate Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isDuplicate || isSubmitting}
                    placeholder="e.g. ABC-1234 or NDB-4921"
                    value={plateNumber}
                    onChange={(e) => {
                      setPlateNumber(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Official vehicle registration plate code
                  </p>
                </div>

                {/* 5. ASSIGNMENT DATE */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assignment Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      disabled={isDuplicate || isSubmitting}
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* 6. ASSIGNMENT TIME */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assignment Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      disabled={isDuplicate || isSubmitting}
                      placeholder="e.g. 08:30 AM"
                      value={assignmentTime}
                      onChange={(e) => setAssignmentTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 7. ASSIGNMENT STATUS (Fixed / Read-only as ASSIGNED) */}
              <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block">Assignment Status</span>
                  <span className="text-[10px] text-slate-500">Initial assignment lifecycle stage</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {assignmentStatus}
                </span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {isDuplicate ? (
                  <div className="text-xs font-semibold text-amber-700 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    Active Assignment Already Exists
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !!successAssignment}
                    className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving Assignment...' : 'Save Delivery Assignment'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
