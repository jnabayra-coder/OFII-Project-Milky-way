import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Edit3, 
  Save, 
  RotateCcw, 
  Building2, 
  Calendar, 
  Clock, 
  Truck, 
  Ship, 
  Plane, 
  Anchor, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  FileSpreadsheet, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Info,
  MapPin,
  Box,
  Hash,
  Trash2
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
import { 
  getAutoDeliveryLeadTime, 
  computeDeliveryPerformance, 
  computePodPerformance,
  calculateDaysBetween,
  calculateExpectedDeliveryDate,
  getDeliveryPerformanceTarget,
  determineAutomaticDeliveryStatus,
  calculatePodReturnDueDate,
  getPodLeadtimeRuleDescription,
  determineAutomaticPodStatus,
} from '../utils/forwardingCalculations';
import { getClientAssignedCoordinator } from '../utils/dataSync';
import { useData } from '../context/DataContext';
import { getRolePermissions } from '../utils/roleUtils';

interface ForwardingDetailModalProps {
  record: ForwardingProgressiveRecord;
  clients?: ClientSummary[];
  isOpen: boolean;
  onClose: () => void;
  onSaveRecord?: (updated: ForwardingProgressiveRecord) => void;
  onSave?: (updated: ForwardingProgressiveRecord) => void;
  onRequestDelete?: (record: ForwardingProgressiveRecord) => void;
  initialEditMode?: boolean;
}

export const ForwardingDetailModal: React.FC<ForwardingDetailModalProps> = ({
  record,
  clients = [],
  isOpen,
  onClose,
  onSaveRecord,
  onSave,
  onRequestDelete,
  initialEditMode = false,
}) => {
  const { currentUserProfile } = useData();
  const permissions = getRolePermissions(currentUserProfile);
  const [isEditing, setIsEditing] = useState(permissions.isReadOnly ? false : initialEditMode);
  const [formData, setFormData] = useState<ForwardingProgressiveRecord>({ ...record });
  const [saveToast, setSaveToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state when record prop changes
  useEffect(() => {
    setFormData({ ...record });
    setIsEditing(permissions.isReadOnly ? false : initialEditMode);
    setSaveError(null);
  }, [record, initialEditMode, isOpen, permissions.isReadOnly]);

  if (!isOpen) return null;

  // Real-time calculation helpers for current form data
  const handleInputChange = (field: keyof ForwardingProgressiveRecord, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Apply Smart Business Rules and calculations on the fly
      if (field === 'client' || field === 'modeOfShipment' || field === 'area') {
        const selectedClient = field === 'client' ? value : updated.client;
        const autoLeadTime = getAutoDeliveryLeadTime(
          selectedClient,
          field === 'modeOfShipment' ? value : updated.modeOfShipment,
          field === 'area' ? value : updated.area
        );
        updated.deliveryLeadTimeDays = autoLeadTime;

        if (field === 'client') {
          const clientList = clients || [];
          const matchedClient = clientList.find(
            c => c.name.trim().toLowerCase() === String(value).trim().toLowerCase() || c.id === value
          );
          if (matchedClient?.assignedCoordinator || matchedClient?.accountManager) {
            updated.coordinator = matchedClient.assignedCoordinator || matchedClient.accountManager || 'Alodia Manalansan';
          } else {
            updated.coordinator = getClientAssignedCoordinator(clientList, String(value));
          }
        }

        // Recalculate delivery performance with the new lead time
        if (updated.actualDispatchDate && updated.actualDeliveryDate) {
          const { tatDays, performance } = computeDeliveryPerformance(
            updated.actualDispatchDate,
            updated.actualDeliveryDate,
            autoLeadTime,
            undefined,
            updated.requestDeliveryDate
          );
          updated.deliveryTatDays = tatDays;
          updated.deliveryPerformance = performance;
        }
      }

      // Auto-recalculate Delivery TAT & Performance
      if (field === 'actualDispatchDate' || field === 'actualDeliveryDate' || field === 'deliveryLeadTimeDays' || field === 'requestDeliveryDate') {
        const dispatchDate = field === 'actualDispatchDate' ? value : updated.actualDispatchDate;
        const deliveryDate = field === 'actualDeliveryDate' ? value : updated.actualDeliveryDate;
        const leadTime = field === 'deliveryLeadTimeDays' ? (value !== null && value !== undefined ? Number(value) : null) : updated.deliveryLeadTimeDays;
        const rdd = field === 'requestDeliveryDate' ? value : updated.requestDeliveryDate;
        
        const { tatDays, performance } = computeDeliveryPerformance(dispatchDate, deliveryDate, leadTime, undefined, rdd);
        updated.deliveryTatDays = tatDays;
        updated.deliveryPerformance = performance;
        if (deliveryDate && !updated.deliveryStatus) {
          updated.deliveryStatus = 'Delivered';
        }
      }

      // Auto-recalculate POD TAT & Performance
      if (field === 'actualDeliveryDate' || field === 'dateOfPodReturn' || field === 'podLeadTimeDays') {
        const deliveryDate = field === 'actualDeliveryDate' ? value : updated.actualDeliveryDate;
        const podReturnDate = field === 'dateOfPodReturn' ? value : updated.dateOfPodReturn;
        const podLeadTime = field === 'podLeadTimeDays' ? Number(value) : updated.podLeadTimeDays;

        const { podTatDays, podPerformance } = computePodPerformance(deliveryDate, podReturnDate, podLeadTime);
        updated.podTatDays = podTatDays;
        updated.podPerformance = podPerformance;
      }

      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (permissions.isReadOnly || permissions.canForwarding === 'Read-only') {
      setSaveError('You do not have permission to modify this information.');
      return;
    }

    // Prompt 2E-4 Validation: If Delay Reason is 'Other', Delay Reason Details is mandatory.
    if (autoStatus.status === 'Delayed' && formData.delayReason === 'Other' && !formData.delayReasonDetails?.trim()) {
      setSaveError('Please provide a written explanation in "Delay Reason Details" when "Other" is selected.');
      return;
    }

    try {
      const payload: ForwardingProgressiveRecord = {
        ...formData,
        deliveryStatus: autoStatus.status,
        delayReason: autoStatus.status === 'Delayed' ? (formData.delayReason || formData.reasonForDelay) : formData.delayReason,
        delayReasonDetails: autoStatus.status === 'Delayed' ? formData.delayReasonDetails : formData.delayReasonDetails,
        reasonForDelay: autoStatus.status === 'Delayed' ? (formData.delayReason || formData.reasonForDelay) : formData.reasonForDelay,
        expectedDeliveryDate: leadtimeResult.expectedDeliveryDate || formData.expectedDeliveryDate,
        expectedDeliveryDateFormatted: leadtimeResult.expectedDeliveryDateFormatted || formData.expectedDeliveryDateFormatted,
        leadtimeStatus: leadtimeResult.status,
        leadtimeMessage: leadtimeResult.message,
        podStatus: autoPodResult.status,
        podLeadTimeDays: podResult.podLeadTimeDays,
        podReturnDueDate: podResult.podReturnDueDate || undefined,
        podReturnDueDateFormatted: podResult.podReturnDueDateFormatted || undefined,
        podTatDays: autoPodResult.podTatDays,
        podPerformance: autoPodResult.podPerformance,
      };

      const saveHandler = onSaveRecord || onSave;
      if (saveHandler) {
        await saveHandler(payload);
      }
      setIsEditing(false);
      setSaveToast(true);
      setTimeout(() => {
        setSaveToast(false);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving forwarding record:', err);
      setSaveError(err?.message || 'Unable to save record changes. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setFormData({ ...record });
    setIsEditing(false);
    setSaveError(null);
  };

  // Centralized Leadtime Calculation Engine (Prompt 2E-1)
  const leadtimeResult = useMemo(() => {
    return calculateExpectedDeliveryDate(
      formData.actualDispatchDate,
      formData.modeOfShipment,
      formData.area
    );
  }, [formData.actualDispatchDate, formData.modeOfShipment, formData.area]);

  // Centralized Delivery Performance Target (RDD override when present, else Standard Expected Date)
  const targetInfo = useMemo(() => {
    return getDeliveryPerformanceTarget(
      leadtimeResult.expectedDeliveryDate || formData.expectedDeliveryDate,
      formData.requestDeliveryDate
    );
  }, [leadtimeResult.expectedDeliveryDate, formData.expectedDeliveryDate, formData.requestDeliveryDate]);

  // Centralized Automatic Delivery Status & Delay Detection Engine
  const autoStatus = useMemo(() => {
    return determineAutomaticDeliveryStatus({
      actualDispatchDate: formData.actualDispatchDate,
      actualDeliveryDate: formData.actualDeliveryDate,
      expectedDeliveryDate: leadtimeResult.expectedDeliveryDate || formData.expectedDeliveryDate,
      requestDeliveryDate: formData.requestDeliveryDate,
      leadTimeDaysOrConfig: formData.deliveryLeadTimeDays || getAutoDeliveryLeadTime(formData.client, formData.modeOfShipment, formData.area),
    });
  }, [
    formData.actualDispatchDate,
    formData.actualDeliveryDate,
    leadtimeResult.expectedDeliveryDate,
    formData.expectedDeliveryDate,
    formData.requestDeliveryDate,
    formData.deliveryLeadTimeDays,
    formData.client,
    formData.modeOfShipment,
    formData.area,
  ]);

  // Centralized POD Leadtime & POD Return Due Date Engine (Prompt 2F-1)
  const podResult = useMemo(() => {
    return calculatePodReturnDueDate(
      formData.actualDeliveryDate,
      formData.client,
      formData.area
    );
  }, [formData.actualDeliveryDate, formData.client, formData.area]);

  // Centralized Automatic POD Status & Delay Detection Engine (Prompt 2F-2)
  const autoPodResult = useMemo(() => {
    return determineAutomaticPodStatus({
      actualDeliveryDate: formData.actualDeliveryDate,
      podReturnDueDate: podResult.podReturnDueDate,
      actualPodReturnDate: formData.dateOfPodReturn,
      clientName: formData.client,
      deliveryArea: formData.area,
    });
  }, [formData.actualDeliveryDate, podResult.podReturnDueDate, formData.dateOfPodReturn, formData.client, formData.area]);

  const getPerformanceBadge = (perf: PerformanceResult) => {
    switch (perf) {
      case 'HIT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
            HIT (Within SLA)
          </span>
        );
      case 'MISSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-700" />
            MISSED (SLA Breach)
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white font-bold border border-blue-400/40">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Forwarding Record Details
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700">
                  {formData.referenceNumber || formData.id}
                </span>
                {permissions.isReadOnly ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    READ-ONLY MODE
                  </span>
                ) : isEditing ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                    EDIT MODE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    VIEW MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Client: <strong className="text-slate-200">{formData.client}</strong> • Destination: <strong className="text-slate-200">{formData.destinationCode} ({formData.area})</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!permissions.isReadOnly && permissions.canForwarding !== 'Read-only' ? (
              !isEditing ? (
                <>
                  {permissions.canDeleteRecords !== 'No' && onRequestDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onRequestDelete(record);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Move record to Recently Deleted"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Move to Trash</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                    <span>MAKE CHANGES</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-3.5 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE CHANGES</span>
                  </button>
                </div>
              )
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Confirmation Toast Banner */}
        {saveToast && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Changes saved successfully. All SLA calculations and forwarding indicators have been updated.</span>
            </div>
            <button onClick={() => setSaveToast(false)} className="text-emerald-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {saveError && (
          <div className="bg-rose-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-200" />
              <span>{saveError}</span>
            </div>
            <button onClick={() => setSaveError(null)} className="text-rose-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}


        {/* Scrollable Form / Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* OPERATIONAL DISPATCH BANNER (Phase 3B.6 & Phase 3B.7) */}
          {(formData.deliveryId || formData.timeArrived || formData.actualDepartureTime || formData.dispatchOperationalStatus) && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-blue-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                        Operational Dispatch Information
                      </span>
                      {formData.deliveryId && (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-black/40 border border-white/10 text-white">
                          {formData.deliveryId}
                        </span>
                      )}
                      {formData.individualDeliveryPod && (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-500 text-white">
                          POD #{formData.individualDeliveryPod}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Operational data encoded by Dispatcher ready for forwarder processing & billing.
                    </p>
                  </div>
                </div>

                {formData.dispatchOperationalStatus && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border shadow-xs ${
                    formData.dispatchOperationalStatus === 'DEPARTED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : formData.dispatchOperationalStatus === 'LOADING COMPLETED'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : formData.dispatchOperationalStatus === 'LOADING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : formData.dispatchOperationalStatus === 'ARRIVED'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}>
                    {formData.dispatchOperationalStatus}
                  </span>
                )}
              </div>

              {/* Grid of Dispatch Timestamps & Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11px]">
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">Time Arrived</span>
                  <strong className="text-white font-mono">{formData.timeArrived || '—'}</strong>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">Loading Window</span>
                  <strong className="text-white font-mono truncate block">
                    {formData.startLoadingTime || '—'} &rarr; {formData.endLoadingTime || '—'}
                  </strong>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">Actual Departure</span>
                  <strong className="text-emerald-300 font-mono">{formData.actualDepartureTime || '—'}</strong>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">Transport Dispatcher</span>
                  <strong className="text-white truncate block">{formData.transportDispatcher || '—'}</strong>
                </div>
                {formData.truckDispatchPod && (
                  <div className="bg-white/5 p-2 rounded border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Truck Dispatch POD</span>
                    <strong className="text-blue-300 font-mono truncate block">{formData.truckDispatchPod}</strong>
                  </div>
                )}
                {formData.truckRunNumber && (
                  <div className="bg-white/5 p-2 rounded border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Truck Run #</span>
                    <strong className="text-amber-300 font-mono truncate block">{formData.truckRunNumber}</strong>
                  </div>
                )}
                {formData.driverName && (
                  <div className="bg-white/5 p-2 rounded border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Assigned Driver</span>
                    <strong className="text-white truncate block">{formData.driverName} {formData.helperName ? `& ${formData.helperName}` : ''}</strong>
                  </div>
                )}
                {formData.plateNumber && (
                  <div className="bg-white/5 p-2 rounded border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Vehicle Plate</span>
                    <strong className="text-white font-mono truncate block">{formData.plateNumber}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

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
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Client Name</label>
                {isEditing ? (
                  <select
                    value={formData.client}
                    onChange={(e) => handleInputChange('client', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                ) : (
                  <div className="font-bold text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 flex items-center justify-between">
                    <span>{formData.client}</span>
                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-600">Coordinator</label>
                  {isEditing && (
                    <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      Auto-Assigned
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={formData.coordinator}
                    title="Assigned Coordinator is automatically derived from the selected Client."
                    className="w-full px-2.5 py-1.5 bg-slate-100/90 border border-slate-300 rounded font-bold text-slate-900 focus:outline-none cursor-not-allowed select-none"
                    placeholder="Auto-assigned coordinator"
                  />
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.coordinator || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Month</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.month}
                    onChange={(e) => handleInputChange('month', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. August 2026"
                  />
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.month || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mode of Shipment</label>
                {isEditing ? (
                  <select
                    value={formData.modeOfShipment}
                    onChange={(e) => handleInputChange('modeOfShipment', e.target.value as ForwardingMode)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Sea Freight">Sea Freight</option>
                    <option value="Air Freight">Air Freight</option>
                    <option value="RORO">RORO (Roll-On / Roll-Off)</option>
                    <option value="Land Freight">Land Freight</option>
                  </select>
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.modeOfShipment}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destination Area</label>
                {isEditing ? (
                  <select
                    value={formData.area}
                    onChange={(e) => handleInputChange('area', e.target.value as PhilippineArea)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Visayas">Visayas</option>
                    <option value="Luzon">Luzon</option>
                    <option value="Mindanao">Mindanao</option>
                    <option value="NCR">NCR / Metro Manila</option>
                  </select>
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.area}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reference Number / Project Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. PRJ-ISCI-049"
                  />
                ) : (
                  <div className="font-mono font-bold text-blue-700 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.referenceNumber}
                  </div>
                )}
              </div>

              {/* Delivery Leadtime Rule Display */}
              <div className="sm:col-span-2 lg:col-span-4 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Official Delivery Leadtime:</span>
                  {formData.deliveryLeadTimeDays !== null && formData.deliveryLeadTimeDays !== undefined && formData.deliveryLeadTimeDays > 0 ? (
                    <span className="font-mono font-bold text-xs text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-300">
                      {formData.deliveryLeadTimeDays} Days
                    </span>
                  ) : (
                    <span className="font-bold text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      N/A (Not Applicable)
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    (Matrix: {formData.modeOfShipment || '—'} &bull; {formData.area || '—'})
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 font-medium">
                  {formData.deliveryLeadTimeDays && formData.deliveryLeadTimeDays > 0 ? 'Single source of truth applied across system' : 'No delivery leadtime configured for this mode & area'}
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
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Actual Dispatch Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.actualDispatchDate}
                    onChange={(e) => handleInputChange('actualDispatchDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                ) : (
                  <div className="font-mono text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.actualDispatchDate || '—'}
                  </div>
                )}
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
                  {isEditing && formData.requestDeliveryDate && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('requestDeliveryDate', '')}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 underline transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Clear RDD (Set to None)
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <input
                        type="date"
                        value={formData.requestDeliveryDate || ''}
                        onChange={(e) => handleInputChange('requestDeliveryDate', e.target.value)}
                        placeholder="Select client requested delivery date..."
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded font-mono font-bold text-purple-900 focus:ring-1 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>
                    <div className="text-[11px] text-purple-900/90 leading-tight">
                      {formData.requestDeliveryDate ? (
                        <span>
                          Client specifically requested delivery by <strong>{formData.requestDeliveryDate}</strong>. Standard Delivery Leadtime ({formData.deliveryLeadTimeDays} days) and Standard Expected Delivery Date remain preserved independently.
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">
                          No client-specific RDD requested (None). Shipment will follow standard leadtime SLA.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      {formData.requestDeliveryDate ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-purple-900 bg-purple-100/80 px-2.5 py-1 rounded border border-purple-300 inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-700" />
                            {formData.requestDeliveryDate}
                          </span>
                          <span className="text-xs text-purple-800 font-medium">
                            Client-Specific Delivery Requirement
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block">
                          None / Not Set (Standard SLA Applies)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Standard Leadtime: {formData.deliveryLeadTimeDays} Working Days
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destination Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.destinationCode}
                    onChange={(e) => handleInputChange('destinationCode', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. CEB-01"
                  />
                ) : (
                  <div className="font-mono font-bold text-blue-700 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.destinationCode}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Consignee</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.consignee}
                    onChange={(e) => handleInputChange('consignee', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="Consignee company or receiver hub"
                  />
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 truncate" title={formData.consignee}>
                    {formData.consignee}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity & Unit</label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
                      className="w-2/3 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.unit || 'Boxes'}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      className="w-1/3 px-2 py-1.5 bg-white border border-slate-300 rounded text-center text-xs"
                      placeholder="Boxes"
                    />
                  </div>
                ) : (
                  <div className="font-mono font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.quantity.toLocaleString()} {formData.unit || 'Boxes'}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Courier / Carrier</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.courier}
                    onChange={(e) => handleInputChange('courier', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. OFII Inter-Island Fleet / 2GO / LBC"
                  />
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.courier}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: CARGO INFORMATION (SMART CONDITIONAL FIELDS) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">3</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Cargo Information
                </h3>
              </div>
              <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                Showing fields applicable for <strong>{formData.modeOfShipment}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Conditional: CBM (Sea Freight & RORO) */}
              {(formData.modeOfShipment === 'Sea Freight' || formData.modeOfShipment === 'RORO') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    CBM (Cubic Meters) <span className="text-[10px] text-cyan-700 font-normal">Sea / RORO</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cbm || ''}
                      onChange={(e) => handleInputChange('cbm', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      placeholder="e.g. 14.5"
                    />
                  ) : (
                    <div className="font-mono text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                      {formData.cbm ? `${formData.cbm} CBM` : '—'}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional: Volume Weight (Air Freight) */}
              {formData.modeOfShipment === 'Air Freight' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Volume Weight (kg) <span className="text-[10px] text-indigo-700 font-normal">Air Freight</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.volumeWeightKg || ''}
                      onChange={(e) => handleInputChange('volumeWeightKg', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      placeholder="e.g. 240.0"
                    />
                  ) : (
                    <div className="font-mono text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                      {formData.volumeWeightKg ? `${formData.volumeWeightKg} kg` : '—'}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional: Actual Weight (Air Freight & Land Freight) */}
              {(formData.modeOfShipment === 'Air Freight' || formData.modeOfShipment === 'Land Freight') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Actual Weight (kg)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      value={formData.actualWeightKg || ''}
                      onChange={(e) => handleInputChange('actualWeightKg', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      placeholder="e.g. 185.0"
                    />
                  ) : (
                    <div className="font-mono text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                      {formData.actualWeightKg ? `${formData.actualWeightKg} kg` : '—'}
                    </div>
                  )}
                </div>
              )}

              {/* Fees / Chargeable Weight */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fees / Chargeable Weight</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.chargeableWeightFees}
                    onChange={(e) => handleInputChange('chargeableWeightFees', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. PHP 42,500.00"
                  />
                ) : (
                  <div className="font-mono font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.chargeableWeightFees || '—'}
                  </div>
                )}
              </div>

              {/* Declared Value */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Declared Value</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.declaredValue}
                    onChange={(e) => handleInputChange('declaredValue', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. PHP 1,850,000.00"
                  />
                ) : (
                  <div className="font-mono font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.declaredValue || '—'}
                  </div>
                )}
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
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">POD Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.podNumber}
                    onChange={(e) => handleInputChange('podNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. POD-774012"
                  />
                ) : (
                  <div className="font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.podNumber}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Air Waybill / Courier Reference Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.awbCourierRefNumber}
                    onChange={(e) => handleInputChange('awbCourierRefNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="e.g. AWB-RORO-CEB-8821"
                  />
                ) : (
                  <div className="font-mono font-bold text-blue-700 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.awbCourierRefNumber}
                  </div>
                )}
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
                <div className="flex items-center gap-2">
                  <div className={`font-bold px-2.5 py-1.5 rounded border text-xs flex-1 flex items-center justify-between ${
                    autoStatus.status === 'On Time' 
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                      : autoStatus.status === 'Delayed'
                        ? 'bg-rose-50 text-rose-900 border-rose-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        autoStatus.status === 'On Time' ? 'bg-emerald-600' : autoStatus.status === 'Delayed' ? 'bg-rose-600' : 'bg-amber-500 animate-pulse'
                      }`}></span>
                      {autoStatus.status}
                    </span>
                    <span className="text-[10px] font-normal text-slate-600">
                      {autoStatus.isDelivered ? 'Delivered' : 'In Transit'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Target: <strong className="font-mono text-slate-700">{autoStatus.activeTargetDate || '—'}</strong> ({autoStatus.isRddOverride ? 'RDD Override' : 'Standard Expected'})
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Receiver&apos;s Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.receiversName}
                    onChange={(e) => handleInputChange('receiversName', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="Authorized signatory / receiver"
                  />
                ) : (
                  <div className="font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.receiversName || 'Pending Receiver'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Actual Delivery Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.actualDeliveryDate}
                    onChange={(e) => handleInputChange('actualDeliveryDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                ) : (
                  <div className="font-mono text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.actualDeliveryDate || <span className="text-slate-400 italic">Pending Delivery</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Driver Live Transit & Receiver Verification Status */}
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Driver Reported Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <span className="text-blue-600">📍</span>
                  {formData.currentLocation || <span className="text-slate-400 font-normal italic">Hub / Not reported</span>}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Driver Progress Status</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase border border-blue-200">
                    {formData.driverProgressStatus || formData.deliveryStatus || 'In Transit'}
                  </span>
                  {formData.progressUpdatedAt && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(formData.progressUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Physical Date Received</span>
                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                  {formData.dateReceived || formData.actualDeliveryDate || <span className="text-slate-400 font-normal italic">Pending</span>}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Receiver Acknowledgment</span>
                <span className="font-mono text-slate-700 text-[11px] block mt-0.5 truncate" title={formData.receiverSignature || 'Standard Consignee Stamp'}>
                  {formData.receiverSignature || (formData.actualDeliveryDate ? 'Physical POD Stamped' : 'Pending Acceptance')}
                </span>
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
                <span className="text-[11px] text-slate-500">Delivery SLA Evaluation:</span>
                {getPerformanceBadge(formData.deliveryPerformance)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Lead Time (Days)
                </label>
                <div className="font-mono font-bold text-base text-slate-900">
                  {formData.deliveryLeadTimeDays !== null && formData.deliveryLeadTimeDays !== undefined && formData.deliveryLeadTimeDays > 0 ? (
                    `${formData.deliveryLeadTimeDays} Days`
                  ) : (
                    <span className="text-amber-800 text-xs font-bold">N/A (Not Applicable)</span>
                  )}
                </div>
                {formData.deliveryLeadTimeDays && formData.deliveryLeadTimeDays > 0 ? (
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
                  Delivery TAT (Turnaround Days)
                </label>
                <div className="font-mono font-bold text-base text-blue-800">
                  {formData.actualDeliveryDate && formData.actualDispatchDate ? (
                    `${formData.deliveryTatDays} Days`
                  ) : (
                    <span className="text-slate-400 text-xs font-normal">Calculating when delivered...</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Working Days (Excl. Sundays & Regular Holidays)
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery SLA Performance
                </label>
                <div className="mt-1">
                  {getPerformanceBadge(formData.deliveryPerformance)}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Target: <strong className="font-mono text-slate-700">{targetInfo.targetDate || '—'}</strong> ({targetInfo.isRddOverride ? 'Client RDD Target' : `Standard Leadtime ${formData.deliveryLeadTimeDays || 0}d`})
                </p>
              </div>

              {/* DELAY REASONS & EXCEPTION MANAGEMENT (PROMPT 2E-4) */}
              <div className="sm:col-span-3">
                {autoStatus.status === 'Delayed' ? (
                  <div className="bg-rose-50/60 rounded-lg border border-rose-200 p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-rose-200/80">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                            Delay Reason & Exception Management
                          </h4>
                          <p className="text-[10px] text-rose-700">
                            Shipment exceeded Active Delivery Target ({autoStatus.activeTargetDate || '—'}). Official Delivery Status: <strong className="font-semibold text-rose-900">DELAYED</strong>.
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
                        {isEditing ? (
                          <select
                            value={formData.delayReason || formData.reasonForDelay || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleInputChange('delayReason', val as DelayReason);
                              handleInputChange('reasonForDelay', val);
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
                        ) : (
                          <div className="flex items-center justify-between font-bold text-xs bg-white px-3 py-2 rounded border border-rose-200 text-slate-900 shadow-2xs">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              {formData.delayReason || formData.reasonForDelay || (
                                <span className="text-amber-700 font-semibold italic">Not Specified</span>
                              )}
                            </span>
                            {formData.delayReason === 'Client Reschedule' && (
                              <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                Client Request
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formData.delayReason === 'Client Reschedule' 
                            ? 'Client requested reschedule. Official status remains DELAYED to preserve SLA audit history.'
                            : 'Valid operational exceptions explain root cause but do NOT convert status to On Time.'}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Delay Reason Details
                          </label>
                          {(formData.delayReason === 'Other' || formData.reasonForDelay === 'Other') && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                              * Mandatory for &quot;Other&quot;
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={formData.delayReasonDetails || ''}
                            onChange={(e) => handleInputChange('delayReasonDetails', e.target.value)}
                            className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-medium focus:ring-1 focus:outline-none ${
                              (formData.delayReason === 'Other' || formData.reasonForDelay === 'Other') && !formData.delayReasonDetails?.trim()
                                ? 'border-rose-400 focus:ring-rose-500'
                                : 'border-slate-300 focus:ring-blue-600'
                            }`}
                            placeholder={
                              formData.delayReason === 'Other' || formData.reasonForDelay === 'Other'
                                ? 'Please provide detailed explanation of the delay cause (required)...'
                                : 'Optional specific operational notes, weather advisory, incident details...'
                            }
                          />
                        ) : (
                          <div className="text-xs font-medium text-slate-800 bg-white px-3 py-2 rounded border border-rose-200 min-h-[42px] shadow-2xs">
                            {formData.delayReasonDetails || (
                              <span className="text-slate-400 italic">No additional delay details provided.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg border border-slate-200 px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${autoStatus.status === 'On Time' ? 'text-emerald-600' : 'text-amber-500'}`} />
                      <div>
                        <span className="font-semibold text-slate-800">
                          {autoStatus.status === 'On Time' ? 'Shipment Delivered On Time' : 'Shipment In Transit'}
                        </span>
                        <span className="text-slate-500 ml-1.5 text-[11px]">
                          — Operating within active target ({autoStatus.activeTargetDate || '—'}). Delay Reason not required.
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      autoStatus.status === 'On Time' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {autoStatus.status === 'On Time' ? '🟢 On Time' : '🟡 In Transit'}
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
                <span className="text-[11px] text-slate-500">POD Performance:</span>
                {getPerformanceBadge(autoPodResult.podPerformance)}
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
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dateOfPodReturn}
                    onChange={(e) => handleInputChange('dateOfPodReturn', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                ) : (
                  <div className="font-mono text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                    {formData.dateOfPodReturn || <span className="text-slate-400 italic">Pending POD Return</span>}
                  </div>
                )}
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
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.podReasonForDelay || ''}
                    onChange={(e) => handleInputChange('podReasonForDelay', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    placeholder="Enter reason if POD document return exceeded SLA threshold..."
                  />
                ) : (
                  <div className="font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                    {formData.podReasonForDelay || <span className="text-slate-400 italic">No POD delay. Document transmitted in order.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons in Edit Mode */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE CHANGES</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
