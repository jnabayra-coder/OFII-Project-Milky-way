import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Package,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Building2,
  Hash,
  Save,
  Check,
} from 'lucide-react';
import { IndividualDelivery, TruckRun, DeliveryDispatchData } from '../types';
import { deriveDeliveryOperationalStatus, formatToAmPm } from '../utils/dispatchUtils';
import { parseAndConvertMilitaryTime } from '../utils/timeUtils';

interface DispatchEncodingModalProps {
  isOpen: boolean;
  delivery: IndividualDelivery | null;
  truckRun?: TruckRun | null;
  onClose: () => void;
  onSave: (deliveryId: string, data: DeliveryDispatchData) => Promise<void>;
  currentUserDispatcherName?: string;
}

export const DispatchEncodingModal: React.FC<DispatchEncodingModalProps> = ({
  isOpen,
  delivery,
  truckRun,
  onClose,
  onSave,
  currentUserDispatcherName = 'Eduardo G. Ramos',
}) => {
  // Operational form state
  const [timeArrived, setTimeArrived] = useState('');
  const [truckName, setTruckName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [driver, setDriver] = useState('');
  const [helper, setHelper] = useState('');
  const [truckerContact, setTruckerContact] = useState('');
  const [startLoadingTime, setStartLoadingTime] = useState('');
  const [endLoadingTime, setEndLoadingTime] = useState('');
  const [actualDeparture, setActualDeparture] = useState('');
  const [transportDispatcher, setTransportDispatcher] = useState('');
  const [truckDispatchPod, setTruckDispatchPod] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when a delivery opens
  useEffect(() => {
    if (delivery) {
      setTimeArrived(formatToAmPm(delivery.timeArrived || ''));
      setTruckName(delivery.truckName || truckRun?.truckName || truckRun?.truckSource || '');
      setPlateNumber(delivery.plateNumber || truckRun?.plateNumber || '');
      setDriver(delivery.driver || truckRun?.driver || '');
      setHelper(delivery.helper || truckRun?.helper || '');
      setTruckerContact(delivery.truckerContact || truckRun?.truckerContact || truckRun?.driverContact || '');
      setStartLoadingTime(formatToAmPm(delivery.startLoadingTime || ''));
      setEndLoadingTime(formatToAmPm(delivery.endLoadingTime || ''));
      setActualDeparture(formatToAmPm(delivery.actualDeparture || ''));
      setTransportDispatcher(
        delivery.transportDispatcher ||
        truckRun?.transportDispatcher ||
        currentUserDispatcherName ||
        'Eduardo G. Ramos'
      );
      setTruckDispatchPod(
        delivery.truckDispatchPod ||
        truckRun?.truckDispatchPod ||
        ''
      );
      setRemarks(delivery.remarks || '');
      setErrorMessage(null);
      setSaveSuccess(false);
    }
  }, [delivery, truckRun, currentUserDispatcherName]);

  if (!isOpen || !delivery) return null;

  // Derive live operational status
  const currentStatus = deriveDeliveryOperationalStatus(
    timeArrived,
    startLoadingTime,
    endLoadingTime,
    actualDeparture
  );

  // Helper to set current time in AM/PM format
  const handleSetNow = (setter: (val: string) => void) => {
    const now = new Date();
    const formatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setter(formatted);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Normalize times to AM/PM format
      const formattedTimeArrived = formatToAmPm(timeArrived);
      const formattedStartLoading = formatToAmPm(startLoadingTime);
      const formattedEndLoading = formatToAmPm(endLoadingTime);
      const formattedActualDeparture = formatToAmPm(actualDeparture);

      await onSave(delivery.id, {
        timeArrived: formattedTimeArrived,
        truckName: truckName.trim(),
        plateNumber: plateNumber.trim(),
        driver: driver.trim(),
        helper: helper.trim(),
        truckerContact: truckerContact.trim(),
        startLoadingTime: formattedStartLoading,
        endLoadingTime: formattedEndLoading,
        actualDeparture: formattedActualDeparture,
        transportDispatcher: transportDispatcher.trim() || currentUserDispatcherName,
        truckDispatchPod: truckDispatchPod.trim(),
        remarks: remarks.trim(),
      });

      // Show save confirmation and return user to table smoothly
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
      }, 500);
    } catch (err: any) {
      console.error('[Dispatch Save Error]:', err);
      // Safe error handling: Keep modal open and show clear message
      setErrorMessage(
        err?.message || 'Failed to save operational dispatch. Please check your entries and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status badge styling
  const renderStatusPill = () => {
    switch (currentStatus) {
      case 'DEPARTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
            <Check className="w-3.5 h-3.5" />
            DEPARTED
          </span>
        );
      case 'LOADING COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            LOADING COMPLETED
          </span>
        );
      case 'LOADING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            LOADING
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            ARRIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            READY FOR DISPATCH
          </span>
        );
    }
  };

  // Helper for rendering operational time fields with AM/PM support and + Now button
  const renderTimeInput = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    stepDescription: string
  ) => {
    const parsed = parseAndConvertMilitaryTime(value);

    return (
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {label}
          </label>
          <button
            type="button"
            onClick={() => handleSetNow(onChange)}
            className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded shadow-2xs transition-colors cursor-pointer"
            title="Set to current local time"
          >
            + Now
          </button>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (value.trim()) {
              const formatted = formatToAmPm(value);
              if (formatted) onChange(formatted);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />

        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
          <span>
            {value.trim() ? (
              parsed.isValid && parsed.time12 && parsed.time12 !== '—' ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {parsed.time12}
                </span>
              ) : (
                <span className="text-slate-400 font-mono">{value}</span>
              )
            ) : (
              <span className="text-slate-400 italic">Not set</span>
            )}
          </span>
          <span className="text-[9px] text-slate-400">{stepDescription}</span>
        </div>
      </div>
    );
  };

  // Determine linked Truck Run display (Requirement 9)
  const linkedTruckRunDisplay =
    truckRun?.truckRunNumber ||
    delivery.truckRunNumber ||
    (delivery.truckRunId ? `TR-${delivery.truckRunId.replace(/[^0-9]/g, '') || delivery.truckRunId}` : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono font-bold text-xs">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                DISPATCH ENCODING
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {delivery.deliveryId}
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs font-medium text-slate-300">
                {linkedTruckRunDisplay ? (
                  <span className="text-emerald-300 font-semibold font-mono">
                    Truck Run: {linkedTruckRunDisplay}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Truck Run: Not yet assigned</span>
                )}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Operational Dispatch Encoding — {delivery.deliveryId}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record arrival, loading intervals, driver assignment, and gate departure for this specific delivery consignment.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {renderStatusPill()}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* SUCCESS BANNER */}
          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-3 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="font-bold text-sm block text-emerald-950">Dispatch Information Saved Successfully!</strong>
                <p className="mt-0.5 text-emerald-800">
                  Operational dispatch for <span className="font-mono font-bold">{delivery.deliveryId}</span> updated to status <span className="font-bold uppercase tracking-wider">{currentStatus}</span>. Returning to table...
                </p>
              </div>
            </div>
          )}

          {/* SAFE ERROR BANNER (Requirement 11) */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block">Unable to Save Dispatch</strong>
                <p className="mt-0.5 text-rose-800">{errorMessage}</p>
                <p className="mt-1 text-[11px] text-rose-600">
                  Your typed operational details have been kept in this form. Please correct any missing fields and click SAVE DISPATCH again.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 1: READ-ONLY AUTO-POPULATED DELIVERY INFORMATION (Requirements 2, 4, 5) */}
          <div className="bg-slate-50/90 rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                CONSIGNMENT INFORMATION (AUTO-POPULATED)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Verified delivery record • Read-only
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery ID</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">{delivery.deliveryId}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Name / Batch</span>
                <span className="font-semibold text-slate-900 truncate block" title={delivery.batchName}>
                  {delivery.batchName || 'General Project'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Client</span>
                <span className="font-semibold text-slate-900 truncate block" title={delivery.client}>
                  {delivery.client}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Consignee</span>
                <span className="font-bold text-slate-900 truncate block" title={delivery.consignee}>
                  {delivery.consignee}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Place</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 truncate" title={delivery.destination || delivery.area}>
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {delivery.destination || delivery.area || '—'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Area</span>
                <span className="font-semibold text-slate-800">{delivery.area || 'Luzon'}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Quantity</span>
                <span className="font-bold text-slate-900 text-sm">
                  {delivery.quantity} <span className="text-xs font-normal text-slate-500">{delivery.unit || 'cases'}</span>
                </span>
              </div>

              {/* CRUCIAL POD DISTINCTION BOX (Requirement 4) */}
              <div className="bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-300 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      INDIVIDUAL DELIVERY POD / POD DELIVERY NUMBER
                    </span>
                    <span className="font-mono font-black text-emerald-950 text-base mt-0.5 block">
                      #{delivery.individualDeliveryPod || '87890'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-white/80 px-2 py-1 rounded border border-emerald-200">
                    Individual Consignment POD • Protected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FORM FOR OPERATIONAL ENCODING */}
          <form id="dispatch-encoding-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 2: OPERATIONAL TIMESTAMPS (Requirement 3 & 7) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  1. OPERATIONAL TIMESTAMPS (STATUS PROGRESSION)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Supports standard time (e.g. 08:15 AM or 14:30) • Saved in AM/PM format
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {renderTimeInput(
                  'Time Arrived',
                  timeArrived,
                  setTimeArrived,
                  'e.g. 07:30 AM',
                  'Triggers: ARRIVED'
                )}

                {renderTimeInput(
                  'Start Loading Time',
                  startLoadingTime,
                  setStartLoadingTime,
                  'e.g. 08:00 AM',
                  'Triggers: LOADING'
                )}

                {renderTimeInput(
                  'End Loading Time',
                  endLoadingTime,
                  setEndLoadingTime,
                  'e.g. 09:15 AM',
                  'Triggers: LOADING COMPLETED'
                )}

                {renderTimeInput(
                  'Actual Departure',
                  actualDeparture,
                  setActualDeparture,
                  'e.g. 09:30 AM',
                  'Triggers: DEPARTED'
                )}
              </div>
            </div>

            {/* SECTION 3: FLEET & CREW ASSIGNMENT (Requirement 3) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <Truck className="w-4 h-4 text-blue-600" />
                2. FLEET & CREW DETAILS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Truck Name / Fleet</label>
                  <input
                    type="text"
                    value={truckName}
                    onChange={(e) => setTruckName(e.target.value)}
                    placeholder="e.g. OFII Dedicated 6-Wheeler"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plate Number</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="e.g. NDB-4921"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trucker's Contact Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={truckerContact}
                      onChange={(e) => setTruckerContact(e.target.value)}
                      placeholder="e.g. +63 917 842 1190"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Driver</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      placeholder="e.g. Danilo P. Hernandez"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Helper</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={helper}
                      onChange={(e) => setHelper(e.target.value)}
                      placeholder="e.g. Jojo D. Ramirez"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transport Dispatcher</label>
                  <input
                    type="text"
                    value={transportDispatcher}
                    onChange={(e) => setTransportDispatcher(e.target.value)}
                    placeholder="e.g. Eduardo G. Ramos"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: MASTER TRUCK / DISPATCH POD & REMARKS (Requirement 3 & 4) */}
            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SEPARATE TRUCK / DISPATCH POD FIELD */}
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                  <label className="block text-xs font-extrabold text-indigo-900 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                    TRUCK / DISPATCH POD
                  </label>
                  <input
                    type="text"
                    value={truckDispatchPod}
                    onChange={(e) => setTruckDispatchPod(e.target.value)}
                    placeholder="e.g. TRK-2026-001 or #TR-001"
                    className="w-full px-3 py-2 text-xs font-mono font-extrabold border border-indigo-300 rounded-lg text-indigo-950 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-indigo-700 mt-1">
                    Master Truck/Dispatch POD. <strong>Never overwrites #{delivery.individualDeliveryPod}.</strong>
                  </p>
                </div>

                {/* REMARKS FIELD */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Cargo checked with seal #8812. Ready for delivery to store receiver."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Updating <span className="font-bold text-slate-800 font-mono">{delivery.deliveryId}</span> • POD <span className="font-bold text-emerald-700 font-mono">#{delivery.individualDeliveryPod}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || saveSuccess}
                  className={`px-6 py-2 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-slate-300 text-white'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>DISPATCH SAVED!</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin text-white" />
                      <span>SAVING DISPATCH...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE DISPATCH</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
