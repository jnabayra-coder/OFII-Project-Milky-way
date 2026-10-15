import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  FileSpreadsheet, 
  Building2, 
  Calendar, 
  Clock, 
  Truck, 
  Ship, 
  Plane, 
  Anchor, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Layers,
  Save,
  Check
} from 'lucide-react';
import { 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  ForwardingMode, 
  PhilippineArea, 
  ForwardingDeliveryStatus, 
  PODStatus, 
  PerformanceResult,
  DelayReason,
  DELAY_REASON_OPTIONS
} from '../types';
import { SearchableClientSelect } from './SearchableClientSelect';
import { 
  getAutoDeliveryLeadTime, 
  computeDeliveryPerformance, 
  computePodPerformance,
  calculateExpectedDeliveryDate,
  determineAutomaticDeliveryStatus,
  calculatePodReturnDueDate,
  getPodLeadtimeRuleDescription,
  determineAutomaticPodStatus,
} from '../utils/forwardingCalculations';
import { getClientAssignedCoordinator } from '../utils/dataSync';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { DispatchRecord } from '../types';

interface AddForwardingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientSummary[];
  onAdd?: (newRecord: ForwardingProgressiveRecord, clientName: string) => void;
  onAddRecord?: (newRecord: ForwardingProgressiveRecord, clientName: string) => void;
  onOpenAddClientModal?: (initialName?: string) => void;
  existingRecords?: ForwardingProgressiveRecord[];
  existingDispatches?: DispatchRecord[];
}

export const AddForwardingRecordModal: React.FC<AddForwardingRecordModalProps> = ({
  isOpen,
  onClose,
  clients,
  onAdd,
  onAddRecord,
  onOpenAddClientModal,
  existingRecords = [],
  existingDispatches = [],
}) => {
  // Form State with intelligent defaults
  const [month, setMonth] = useState('August 2026');
  const [clientName, setClientName] = useState('Intelligent Skin Care Inc.');
  const [coordinator, setCoordinator] = useState(() => getClientAssignedCoordinator(clients, 'Intelligent Skin Care Inc.', 'Rojaylene Baldesancho'));
  const [modeOfShipment, setModeOfShipment] = useState<ForwardingMode>('RORO');
  const [area, setArea] = useState<PhilippineArea>('Visayas');
  const [referenceNumber, setReferenceNumber] = useState(`PRJ-ISCI-${Math.floor(100 + Math.random() * 900)}`);
  
  // Section 2: Dispatch & Destination
  const [actualDispatchDate, setActualDispatchDate] = useState('2026-08-23');
  const [requestDeliveryDate, setRequestDeliveryDate] = useState('');
  const [consignee, setConsignee] = useState('Belo Medical Hub - Visayas Central');
  const [destinationCode, setDestinationCode] = useState('CEB-01');
  const [quantity, setQuantity] = useState<number>(350);
  const [unit, setUnit] = useState('Boxes');
  const [courier, setCourier] = useState('OFII Fleet Inter-Island Transport');

  // Section 3: Cargo Information
  const [cbm, setCbm] = useState<number | undefined>(12.0);
  const [volumeWeightKg, setVolumeWeightKg] = useState<number | undefined>(undefined);
  const [actualWeightKg, setActualWeightKg] = useState<number | undefined>(undefined);
  const [chargeableWeightFees, setChargeableWeightFees] = useState('PHP 38,500.00');
  const [declaredValue, setDeclaredValue] = useState('PHP 1,450,000.00');

  // Section 4: Shipment References
  const [podNumber, setPodNumber] = useState(`POD-${Math.floor(700000 + Math.random() * 200000)}`);
  const [awbCourierRefNumber, setAwbCourierRefNumber] = useState(`AWB-RORO-CEB-${Math.floor(1000 + Math.random() * 9000)}`);

  // Section 5: Delivery Information
  const [deliveryStatus, setDeliveryStatus] = useState<ForwardingDeliveryStatus>('In Transit');
  const [receiversName, setReceiversName] = useState('');
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');

  // Section 6: Delivery Performance & Delay Reasons (Prompt 2E-4)
  const [deliveryLeadTimeDays, setDeliveryLeadTimeDays] = useState<number>(13);
  const [delayReason, setDelayReason] = useState<DelayReason | ''>('');
  const [delayReasonDetails, setDelayReasonDetails] = useState('');
  const [reasonForDelay, setReasonForDelay] = useState('');

  // Section 7: POD Monitoring
  const [podStatus, setPodStatus] = useState<PODStatus>('Pending Return');
  const [dateOfPodReturn, setDateOfPodReturn] = useState('');
  const [podLeadTimeDays, setPodLeadTimeDays] = useState<number>(3);
  const [podReasonForDelay, setPodReasonForDelay] = useState('');

  // System States
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setIsDirty(false);
      setShowUnsavedPrompt(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // DUPLICATE CHECK
  const matchingDuplicate = React.useMemo(() => {
    const cleanPod = podNumber.trim().toLowerCase();
    const cleanRef = referenceNumber.trim().toLowerCase();

    if (cleanPod) {
      const matchInForwarding = existingRecords.find(r => !r.isDeleted && r.podNumber?.trim().toLowerCase() === cleanPod);
      if (matchInForwarding) return { type: 'POD', val: matchInForwarding.podNumber };
      const matchInDispatch = existingDispatches.find(d => !d.isDeleted && d.podNumber.trim().toLowerCase() === cleanPod);
      if (matchInDispatch) return { type: 'POD', val: matchInDispatch.podNumber };
    }

    if (cleanRef) {
      const matchInForwardingRef = existingRecords.find(r => !r.isDeleted && r.referenceNumber?.trim().toLowerCase() === cleanRef);
      if (matchInForwardingRef) return { type: 'Reference', val: matchInForwardingRef.referenceNumber };
    }

    return null;
  }, [podNumber, referenceNumber, existingRecords, existingDispatches]);

  // Auto retrieve Coordinator whenever Client changes
  useEffect(() => {
    if (clientName) {
      const assigned = getClientAssignedCoordinator(clients, clientName);
      setCoordinator(assigned);
    }
  }, [clientName, clients]);

  // Auto calculate Lead Time whenever Client, Mode, or Area changes
  useEffect(() => {
    const calculatedLeadTime = getAutoDeliveryLeadTime(clientName, modeOfShipment, area);
    setDeliveryLeadTimeDays(calculatedLeadTime);

    // Auto adapt destination code suggestion if not customized
    if (area === 'Visayas' && destinationCode.startsWith('DVO')) setDestinationCode('CEB-01');
    if (area === 'Mindanao' && destinationCode.startsWith('CEB')) setDestinationCode('DVO-01');
    if (area === 'Luzon' && !destinationCode.startsWith('LGN') && !destinationCode.startsWith('PMP')) setDestinationCode('LGN-01');
    if (area === 'NCR') setDestinationCode('NCR-01');
  }, [clientName, modeOfShipment, area]);

  // Centralized Leadtime Calculation Engine (Prompt 2E-1)
  const leadtimeResult = useMemo(() => {
    return calculateExpectedDeliveryDate(
      actualDispatchDate,
      modeOfShipment,
      area
    );
  }, [actualDispatchDate, modeOfShipment, area]);

  // Real-time Delivery Performance calculation
  const {
    tatDays: deliveryTatDays,
    performance: deliveryPerformance,
    targetSource: deliveryTargetSource,
    activeTargetDate: deliveryActiveTargetDate,
    isRddOverride: isDeliveryRddOverride,
  } = computeDeliveryPerformance(
    actualDispatchDate,
    actualDeliveryDate,
    deliveryLeadTimeDays,
    undefined,
    requestDeliveryDate
  );

  // Centralized Automatic Delivery Status Engine (Prompt 2E-3 & 2E-4)
  const autoDeliveryStatus = useMemo(() => {
    return determineAutomaticDeliveryStatus({
      actualDispatchDate,
      actualDeliveryDate,
      expectedDeliveryDate: leadtimeResult.expectedDeliveryDate,
      requestDeliveryDate,
      leadTimeDaysOrConfig: Number(deliveryLeadTimeDays),
    });
  }, [actualDispatchDate, actualDeliveryDate, leadtimeResult.expectedDeliveryDate, requestDeliveryDate, deliveryLeadTimeDays]);

  // Centralized POD Leadtime & POD Return Due Date Engine (Prompt 2F-1)
  const podResult = useMemo(() => {
    return calculatePodReturnDueDate(
      actualDeliveryDate,
      clientName,
      area
    );
  }, [actualDeliveryDate, clientName, area]);

  // Centralized Automatic POD Status & Delay Detection Engine (Prompt 2F-2 & Unified POD Engine)
  const autoPodResult = useMemo(() => {
    return determineAutomaticPodStatus({
      actualDeliveryDate,
      podReturnDueDate: podResult.podReturnDueDate,
      actualPodReturnDate: dateOfPodReturn,
      clientName,
      deliveryArea: area,
    });
  }, [actualDeliveryDate, podResult.podReturnDueDate, dateOfPodReturn, clientName, area]);

  const podTatDays = autoPodResult.podTatDays;
  const podPerformance = autoPodResult.podPerformance;

  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientName.trim() || !referenceNumber.trim()) {
      setErrorMessage('Unable to save record. Please try again.');
      return;
    }

    if (matchingDuplicate) {
      setErrorMessage('A record with this POD or Reference Number already exists.');
      return;
    }

    // Prompt 2E-4 Validation: If Delay Reason is 'Other', Delay Reason Details is mandatory.
    if (autoDeliveryStatus.status === 'Delayed' && delayReason === 'Other' && !delayReasonDetails.trim()) {
      setErrorMessage('Please provide a written explanation in "Delay Reason Details" when "Other" is selected.');
      return;
    }

    const newRecord: ForwardingProgressiveRecord = {
      id: `FPR-2026-${Math.floor(100 + Math.random() * 900)}`,
      month,
      coordinator,
      client: clientName.trim(),
      modeOfShipment,
      area,
      referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      actualDispatchDate,
      expectedDeliveryDate: leadtimeResult.expectedDeliveryDate || undefined,
      expectedDeliveryDateFormatted: leadtimeResult.expectedDeliveryDateFormatted || undefined,
      requestDeliveryDate: requestDeliveryDate ? requestDeliveryDate.trim() : undefined,
      leadtimeStatus: leadtimeResult.status,
      leadtimeMessage: leadtimeResult.message,
      consignee: consignee.trim(),
      destinationCode: destinationCode.trim(),
      quantity: Number(quantity) || 1,
      unit: unit || 'Boxes',
      courier: courier.trim(),
      cbm: (modeOfShipment === 'Sea Freight' || modeOfShipment === 'RORO') ? Number(cbm) : undefined,
      volumeWeightKg: modeOfShipment === 'Air Freight' ? Number(volumeWeightKg) : undefined,
      actualWeightKg: (modeOfShipment === 'Air Freight' || modeOfShipment === 'Land Freight') ? Number(actualWeightKg) : undefined,
      chargeableWeightFees,
      declaredValue,
      podNumber,
      awbCourierRefNumber,
      deliveryStatus: autoDeliveryStatus.status,
      delayReason: autoDeliveryStatus.status === 'Delayed' ? (delayReason || undefined) : undefined,
      delayReasonDetails: autoDeliveryStatus.status === 'Delayed' ? (delayReasonDetails || undefined) : undefined,
      receiversName,
      actualDeliveryDate,
      deliveryLeadTimeDays: Number(deliveryLeadTimeDays),
      deliveryTatDays,
      deliveryPerformance,
      reasonForDelay: autoDeliveryStatus.status === 'Delayed' ? (delayReason || reasonForDelay || undefined) : undefined,
      podStatus: autoPodResult.status,
      dateOfPodReturn,
      podLeadTimeDays: podResult.podLeadTimeDays,
      podReturnDueDate: podResult.podReturnDueDate || undefined,
      podReturnDueDateFormatted: podResult.podReturnDueDateFormatted || undefined,
      podTatDays,
      podPerformance,
      podReasonForDelay: (podPerformance === 'MISSED') ? podReasonForDelay : undefined,
    };

    const saveHandler = onAddRecord || onAdd;
    if (saveHandler) {
      saveHandler(newRecord, clientName.trim());
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="bg-blue-800 text-white px-6 py-4 border-b border-blue-900 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center text-white font-bold border border-white/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Add Forwarding Progressive Record
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-200 border border-blue-600">
                    Automated SLA Calculation
                  </span>
                </div>
                <p className="text-xs text-blue-100">
                  Log a new shipment with smart field inheritance and auto-calculated TAT & Performance.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-1.5 text-blue-200 hover:text-white rounded hover:bg-blue-700/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>


          {/* Duplicate Alert Banner */}
          {matchingDuplicate && (
            <div className="bg-amber-50 border-b border-amber-300 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-950 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>A record with this POD or Reference Number already exists.</strong> (Duplicate {matchingDuplicate.type}: <em>{matchingDuplicate.val}</em>). Please verify the details before saving.
              </span>
            </div>
          )}

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border-b border-rose-300 px-6 py-2.5 flex items-center gap-2.5 text-xs text-rose-900 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Scrollable Form Body */}
          <form 
            onSubmit={handleSubmit} 
            onChange={() => setIsDirty(true)}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
          >
          
          {/* SECTION 1: PROJECT / CLIENT INFORMATION */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">1</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Project / Client Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <SearchableClientSelect
                  clients={clients}
                  value={clientName}
                  onChange={(val, clientObj) => {
                    setClientName(val);
                    if (clientObj?.assignedCoordinator || clientObj?.accountManager) {
                      setCoordinator(clientObj.assignedCoordinator || clientObj.accountManager || 'Alodia Manalansan');
                    } else {
                      setCoordinator(getClientAssignedCoordinator(clients, val));
                    }
                  }}
                  onOpenAddClientModal={onOpenAddClientModal}
                  placeholder="Select or enter client name..."
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Coordinator <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    Auto-Assigned
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={coordinator}
                  title="Assigned Coordinator is automatically retrieved from Client Management based on the selected Client."
                  placeholder="Auto-assigned coordinator"
                  className="w-full px-2.5 py-1.5 bg-slate-100/90 border border-slate-300 rounded font-bold text-slate-900 focus:outline-none cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Month <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="e.g. August 2026"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mode of Shipment <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modeOfShipment}
                  onChange={(e) => setModeOfShipment(e.target.value as ForwardingMode)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="RORO">RORO (Roll-On / Roll-Off)</option>
                  <option value="Sea Freight">Sea Freight</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Land Freight">Land Freight</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Destination Area <span className="text-rose-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as PhilippineArea)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="Visayas">Visayas</option>
                  <option value="Luzon">Luzon</option>
                  <option value="Mindanao">Mindanao</option>
                  <option value="NCR">NCR / Metro Manila</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Reference Number / Project Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. PRJ-ISCI-049"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Delivery Leadtime Rule Display */}
              <div className="sm:col-span-2 lg:col-span-4 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Official Delivery Leadtime:</span>
                  {deliveryLeadTimeDays !== null && deliveryLeadTimeDays !== undefined && deliveryLeadTimeDays > 0 ? (
                    <span className="font-mono font-bold text-xs text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-300">
                      {deliveryLeadTimeDays} Days
                    </span>
                  ) : (
                    <span className="font-bold text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      N/A (Not Applicable)
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    (Matrix: {modeOfShipment} &bull; {area})
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 font-medium">
                  {deliveryLeadTimeDays && deliveryLeadTimeDays > 0 ? 'Single source of truth applied across system' : 'No delivery leadtime configured for this mode & area'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DISPATCH & DESTINATION */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">2</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dispatch & Destination
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Actual Dispatch Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={actualDispatchDate}
                  onChange={(e) => setActualDispatchDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Expected Delivery Date (Calculated via Centralized Engine) */}
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Standard Expected Delivery Date
                  </label>
                  <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    Auto-Calculated Engine
                  </span>
                </div>
                {leadtimeResult.status === 'SUCCESS' ? (
                  <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-sm text-blue-900 flex items-center gap-2">
                        <span>{leadtimeResult.expectedDeliveryDate}</span>
                        <span className="text-xs font-sans font-semibold text-blue-700">
                          ({leadtimeResult.expectedDeliveryDateFormatted})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Starts day after dispatch ({leadtimeResult.leadTimeDays} working days &bull; Mon–Sat, excludes Sundays & regular holidays)
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {leadtimeResult.skippedSundaysCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/80 text-slate-700 font-semibold" title="Sundays excluded from leadtime">
                          +{leadtimeResult.skippedSundaysCount} Sun skipped
                        </span>
                      )}
                      {leadtimeResult.skippedHolidaysCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-semibold" title="Regular holidays excluded">
                          +{leadtimeResult.skippedHolidaysCount} Holiday skipped
                        </span>
                      )}
                    </div>
                  </div>
                ) : leadtimeResult.status === 'NOT_APPLICABLE' ? (
                  <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>No standard leadtime is configured for this mode and destination.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs italic">
                    Expected delivery date cannot be calculated until departure date, delivery mode, and destination are provided.
                  </div>
                )}
              </div>

              {/* Request Delivery Date (RDD - Optional Client Requested Delivery Date) */}
              <div className="sm:col-span-2 lg:col-span-3 p-3 bg-purple-50/60 border border-purple-200 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-purple-950 uppercase tracking-wider">
                      Request Delivery Date (RDD)
                    </label>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-200/80 text-purple-900 border border-purple-300">
                      Optional &bull; Client Request
                    </span>
                  </div>
                  {requestDeliveryDate && (
                    <button
                      type="button"
                      onClick={() => setRequestDeliveryDate('')}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 underline transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Clear RDD (Set to None)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <input
                      type="date"
                      value={requestDeliveryDate}
                      onChange={(e) => setRequestDeliveryDate(e.target.value)}
                      placeholder="Select client requested delivery date..."
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded font-mono font-bold text-purple-900 focus:ring-1 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                  <div className="text-[11px] text-purple-900/90 leading-tight">
                    {requestDeliveryDate ? (
                      <span>
                        Client specifically requested delivery by <strong>{requestDeliveryDate}</strong>. Standard Delivery Leadtime ({deliveryLeadTimeDays} days) and Standard Expected Delivery Date remain preserved independently.
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        No client-specific RDD requested (None). Shipment will follow standard leadtime SLA.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Destination Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={destinationCode}
                  onChange={(e) => setDestinationCode(e.target.value)}
                  placeholder="e.g. CEB-01"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Consignee <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  placeholder="Receiving organization or facility"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Quantity & Unit <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-2/3 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-1/3 px-2 py-1.5 bg-white border border-slate-300 rounded text-center text-xs"
                    placeholder="Boxes"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Courier / Carrier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="e.g. OFII Inter-Island Fleet / 2GO / PAL Cargo"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CARGO INFORMATION (CONDITIONAL FIELDS) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">3</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Cargo Information
                </h3>
              </div>
              <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                Auto-adapted for <strong>{modeOfShipment}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Conditional: CBM (Sea Freight & RORO) */}
              {(modeOfShipment === 'Sea Freight' || modeOfShipment === 'RORO') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    CBM (Cubic Meters) <span className="text-[10px] text-cyan-700 font-normal">Sea / RORO</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cbm !== undefined ? cbm : ''}
                    onChange={(e) => setCbm(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 12.0"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Conditional: Volume Weight (Air Freight) */}
              {modeOfShipment === 'Air Freight' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Volume Weight (kg) <span className="text-[10px] text-indigo-700 font-normal">Air Freight</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={volumeWeightKg !== undefined ? volumeWeightKg : ''}
                    onChange={(e) => setVolumeWeightKg(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 240.0"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Conditional: Actual Weight (Air Freight & Land Freight) */}
              {(modeOfShipment === 'Air Freight' || modeOfShipment === 'Land Freight') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Actual Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={actualWeightKg !== undefined ? actualWeightKg : ''}
                    onChange={(e) => setActualWeightKg(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 185.0"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fees / Chargeable Weight</label>
                <input
                  type="text"
                  value={chargeableWeightFees}
                  onChange={(e) => setChargeableWeightFees(e.target.value)}
                  placeholder="e.g. PHP 38,500.00"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Declared Value</label>
                <input
                  type="text"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  placeholder="e.g. PHP 1,450,000.00"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: SHIPMENT REFERENCES */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">4</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Shipment References
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  POD Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={podNumber}
                  onChange={(e) => setPodNumber(e.target.value)}
                  placeholder="e.g. POD-774012"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Air Waybill / Courier Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={awbCourierRefNumber}
                  onChange={(e) => setAwbCourierRefNumber(e.target.value)}
                  placeholder="e.g. AWB-RORO-CEB-8821"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: DELIVERY INFORMATION */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">5</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Delivery Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">Delivery Status</label>
                  <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    Auto-Determined
                  </span>
                </div>
                <div className={`font-bold px-2.5 py-1.5 rounded border text-xs flex items-center justify-between ${
                  autoDeliveryStatus.status === 'On Time' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : autoDeliveryStatus.status === 'Delayed'
                      ? 'bg-rose-50 text-rose-900 border-rose-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      autoDeliveryStatus.status === 'On Time' ? 'bg-emerald-600' : autoDeliveryStatus.status === 'Delayed' ? 'bg-rose-600' : 'bg-amber-500 animate-pulse'
                    }`}></span>
                    {autoDeliveryStatus.status}
                  </span>
                  <span className="text-[10px] font-normal text-slate-600">
                    {autoDeliveryStatus.isDelivered ? 'Delivered' : 'In Transit'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Target: <strong className="font-mono text-slate-700">{autoDeliveryStatus.activeTargetDate || '—'}</strong> ({autoDeliveryStatus.isRddOverride ? 'RDD Override' : 'Standard Expected'})
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Receiver&apos;s Name</label>
                <input
                  type="text"
                  value={receiversName}
                  onChange={(e) => setReceiversName(e.target.value)}
                  placeholder="Name of receiver at destination"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Actual Delivery Date</label>
                <input
                  type="date"
                  value={actualDeliveryDate}
                  onChange={(e) => setActualDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: DELIVERY PERFORMANCE (AUTO-CALCULATED) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">6</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Delivery Performance (Auto-Calculated)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Real-Time SLA:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                  deliveryPerformance === 'HIT' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                  deliveryPerformance === 'MISSED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                  'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {deliveryPerformance}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Lead Time (Days)
                </label>
                <div className="font-mono font-bold text-base text-slate-900">
                  {deliveryLeadTimeDays !== null && deliveryLeadTimeDays !== undefined && deliveryLeadTimeDays > 0 ? (
                    `${deliveryLeadTimeDays} Days`
                  ) : (
                    <span className="text-amber-800 text-xs font-bold">N/A (Not Applicable)</span>
                  )}
                </div>
                {deliveryLeadTimeDays && deliveryLeadTimeDays > 0 ? (
                  <p className="text-[10px] text-blue-700 font-medium mt-1">
                    Auto-Determined via Delivery Leadtime Matrix
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-700 font-medium mt-1">
                    No SLA configured for this Mode + Area
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery TAT (Days)
                </label>
                <div className="font-mono font-bold text-base text-blue-800">
                  {actualDeliveryDate ? `${deliveryTatDays} Days` : <span className="text-slate-400 text-xs font-normal">Pending Delivery</span>}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Working Days (Excl. Sundays & Regular Holidays)
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Performance Result
                </label>
                <div className="mt-1 font-bold text-sm">
                  {deliveryPerformance === 'HIT' && <span className="text-emerald-700">HIT (Within SLA)</span>}
                  {deliveryPerformance === 'MISSED' && <span className="text-rose-700">MISSED (Exceeded Target)</span>}
                  {deliveryPerformance === 'PENDING' && <span className="text-slate-500">PENDING (In Transit)</span>}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Target: {deliveryActiveTargetDate || '—'} {isDeliveryRddOverride ? '(Client RDD Override)' : '(Standard SLA)'}
                </p>
              </div>

              {/* CONDITIONAL DELAY REASONS & EXCEPTION MANAGEMENT */}
              <div className="sm:col-span-3">
                {autoDeliveryStatus.status === 'Delayed' ? (
                  <div className="bg-rose-50/60 rounded-lg border border-rose-200 p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-rose-200/80">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                            Delay Reason & Exception Management
                          </h4>
                          <p className="text-[10px] text-rose-700">
                            Target exceeded ({autoDeliveryStatus.activeTargetDate || '—'}). Official Delivery Status remains <strong className="font-semibold text-rose-900">DELAYED</strong>.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                        🔴 Delayed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Delay Reason <span className="text-slate-400 font-normal">(Controlled Dropdown)</span>
                        </label>
                        <select
                          value={delayReason}
                          onChange={(e) => {
                            const val = e.target.value as DelayReason;
                            setDelayReason(val);
                            setReasonForDelay(val);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded font-bold text-xs text-slate-900 focus:ring-1 focus:ring-rose-500 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Select Delay Reason (Not Specified) --</option>
                          {DELAY_REASON_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {delayReason === 'Client Reschedule' 
                            ? 'Client requested reschedule. Official status remains DELAYED to preserve SLA audit history.'
                            : 'Valid operational exceptions explain root cause but do NOT convert status to On Time.'}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Delay Reason Details
                          </label>
                          {delayReason === 'Other' && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                              * Mandatory for &quot;Other&quot;
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={delayReasonDetails}
                          onChange={(e) => setDelayReasonDetails(e.target.value)}
                          className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-medium focus:ring-1 focus:outline-none ${
                            delayReason === 'Other' && !delayReasonDetails.trim()
                              ? 'border-rose-400 focus:ring-rose-500'
                              : 'border-slate-300 focus:ring-blue-600'
                          }`}
                          placeholder={
                            delayReason === 'Other'
                              ? 'Please provide detailed explanation of the delay cause (required)...'
                              : 'Optional specific operational notes, weather advisory, incident details...'
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg border border-slate-200 px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Check className={`w-4 h-4 ${autoDeliveryStatus.status === 'On Time' ? 'text-emerald-600' : 'text-amber-500'}`} />
                      <div>
                        <span className="font-semibold text-slate-800">
                          {autoDeliveryStatus.status === 'On Time' ? 'Shipment Delivered On Time' : 'Shipment In Transit'}
                        </span>
                        <span className="text-slate-500 ml-1.5 text-[11px]">
                          — Operating within active target ({autoDeliveryStatus.activeTargetDate || '—'}). Delay Reason not required.
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      autoDeliveryStatus.status === 'On Time' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {autoDeliveryStatus.status === 'On Time' ? '🟢 On Time' : '🟡 In Transit'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 7: POD MONITORING (AUTO-CALCULATED) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">7</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  POD Monitoring (Auto-Calculated Engine)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">POD SLA:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                  podPerformance === 'HIT' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                  podPerformance === 'MISSED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                  'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {podPerformance}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* POD Return Due Date (Auto Calculated) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    POD Return Due Date
                  </label>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    System Calculated
                  </span>
                </div>
                <div className={`px-2.5 py-1.5 rounded border font-mono font-bold text-xs flex items-center justify-between ${
                  podResult.podReturnDueDate 
                    ? 'bg-blue-50/80 border-blue-200 text-blue-950' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  <span>{podResult.podReturnDueDate || <span className="font-sans font-normal italic">Pending Delivery Date</span>}</span>
                  {podResult.podReturnDueDate && (
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  )}
                </div>
                {podResult.podReturnDueDateFormatted && (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium truncate" title={podResult.podReturnDueDateFormatted}>
                    {podResult.podReturnDueDateFormatted}
                  </p>
                )}
              </div>

              {/* POD Lead Time (Days - Fixed Company Rule, Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    POD Lead Time
                  </label>
                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    Company SLA Rule
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 flex items-center justify-between">
                  <span>{podResult.podLeadTimeDays} Working Days</span>
                  <span className="text-[10px] font-normal text-slate-500 font-sans">
                    {podResult.podLeadTimeDays === 5 ? 'ISCI Luzon' : 'Standard 7d'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {podResult.ruleApplied}
                </p>
              </div>

              {/* Date of POD Return (Actual POD Return Date - User Encoded) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Actual POD Return Date
                </label>
                <input
                  type="date"
                  value={dateOfPodReturn}
                  onChange={(e) => setDateOfPodReturn(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Office physical receipt date
                </p>
              </div>

              {/* POD Status (Auto Determined - Read Only) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    POD Status
                  </label>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    Auto Determined
                  </span>
                </div>
                <div className={`px-2.5 py-1.5 rounded border font-bold text-xs flex items-center justify-between ${
                  autoPodResult.status === 'POD On Time'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : autoPodResult.status === 'POD Delayed'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : autoPodResult.status === 'POD Pending'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      autoPodResult.status === 'POD On Time'
                        ? 'bg-emerald-500'
                        : autoPodResult.status === 'POD Delayed'
                        ? 'bg-rose-500'
                        : autoPodResult.status === 'POD Pending'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}></span>
                    {autoPodResult.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {autoPodResult.status === 'Not Applicable' && 'Shipment undelivered — POD monitoring inactive'}
                  {autoPodResult.status === 'POD Pending' && 'Awaiting physical POD return within deadline'}
                  {autoPodResult.status === 'POD On Time' && 'POD returned to office on or before due date'}
                  {autoPodResult.status === 'POD Delayed' && (autoPodResult.isReturned ? 'Returned late after deadline (No grace period)' : 'Overdue: document not returned to office')}
                </p>
              </div>

              {/* POD Engine Calculation Details Card */}
              <div className="sm:col-span-2 lg:col-span-4 bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span>POD Engine Status & Due Date Summary:</span>
                  <span className="text-[10px] text-slate-500">Excludes Sundays & Regular Holidays</span>
                </div>
                <p className="text-slate-700 font-mono text-[11px]">
                  {podResult.message}
                </p>
                <p className="text-slate-600 font-sans text-[11px] pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-700">Live Status Assessment: </span>
                  {autoPodResult.message}
                </p>
              </div>

              {/* POD Reason for Delay */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">POD Reason for Delay</label>
                <input
                  type="text"
                  value={podReasonForDelay}
                  onChange={(e) => setPodReasonForDelay(e.target.value)}
                  placeholder="Enter reason if POD document transmission exceeded SLA threshold..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 rounded text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE FORWARDING RECORD</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Unsaved Changes Confirmation Modal */}
    <UnsavedChangesModal
      isOpen={showUnsavedPrompt}
      onKeepEditing={() => setShowUnsavedPrompt(false)}
      onConfirmDiscard={() => {
        setShowUnsavedPrompt(false);
        setIsDirty(false);
        onClose();
      }}
      title="Unsaved Changes"
      message="You have unsaved changes. Are you sure you want to leave?"
    />
  </>
);
};
