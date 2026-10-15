import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Package, 
  Truck, 
  FileText, 
  Award, 
  Printer, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  ShieldCheck,
  AlertCircle,
  Pencil,
  X,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { ShipmentRecord, ShipmentStatus } from '../types';
import { MilitaryDateTimeInput } from './MilitaryDateTimeInput';
import { MilitaryTimeInput } from './MilitaryTimeInput';
import { formatTo12HourTime, formatTo24HourTime, formatDualTimeDisplay } from '../utils/timeUtils';
import { useData } from '../context/DataContext';
import { getRolePermissions } from '../utils/roleUtils';

interface ClientShipmentDetailViewProps {
  shipment: ShipmentRecord;
  onBack: () => void;
  onUpdateShipment?: (updatedShipment: ShipmentRecord) => void;
  onRequestDelete?: (shipment: ShipmentRecord) => void;
  onRequestDeleteShipment?: (shipment: ShipmentRecord) => void;
}

export const ClientShipmentDetailView: React.FC<ClientShipmentDetailViewProps> = ({
  shipment,
  onBack,
  onUpdateShipment,
  onRequestDelete,
  onRequestDeleteShipment,
}) => {
  const { currentUserProfile } = useData();
  const permissions = getRolePermissions(currentUserProfile);
  const handleDeleteAction = onRequestDeleteShipment || onRequestDelete;
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftShipment, setDraftShipment] = useState<ShipmentRecord>({ ...shipment });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  // Sync draft if underlying shipment prop changes
  useEffect(() => {
    setDraftShipment({ ...shipment });
    if (permissions.isReadOnly) {
      setIsEditMode(false);
    }
  }, [shipment, permissions.isReadOnly]);

  const handleEnterEditMode = () => {
    if (permissions.isReadOnly) return;
    setDraftShipment({ ...shipment });
    setIsEditMode(true);
    setSaveSuccessMessage(false);
  };

  const handleCancelEdit = () => {
    setDraftShipment({ ...shipment });
    setIsEditMode(false);
  };

  const handleSaveChanges = () => {
    if (permissions.isReadOnly) return;
    if (onUpdateShipment) {
      onUpdateShipment(draftShipment);
    }
    setIsEditMode(false);
    setSaveSuccessMessage(true);
    setTimeout(() => {
      setSaveSuccessMessage(false);
    }, 4000);
  };

  const handleFieldChange = (field: keyof ShipmentRecord, value: any) => {
    setDraftShipment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Delivered</span>;
      case 'In Transit':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">● In Transit</span>;
      case 'Delayed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">⚠ Delayed Exception</span>;
      case 'Booked':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">○ Booked</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case 'On-Time':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">On-Time Delivery</span>;
      case 'Within SLA':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">Within Customer SLA</span>;
      case 'Delayed':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">SLA Exceeded / Delayed</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{perf}</span>;
    }
  };

  const getScheduleComparison = (planned?: string, actual?: string) => {
    if (!planned || !actual) return null;
    const cleanPlanned = planned.split(' ')[0].trim();
    const cleanActual = actual.split(' ')[0].trim();
    const pDate = new Date(cleanPlanned);
    const aDate = new Date(cleanActual);
    
    if (isNaN(pDate.getTime()) || isNaN(aDate.getTime())) {
      return {
        status: 'Scheduled',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        label: 'Active Delivery Schedule'
      };
    }
    
    const diffTime = aDate.getTime() - pDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return {
        status: 'Exact On-Time',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        label: 'Delivered exactly on planned schedule (0 day variance)'
      };
    } else if (diffDays < 0) {
      return {
        status: 'Ahead of Schedule',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        label: `Fulfilled ${Math.abs(diffDays)} day(s) ahead of planned target`
      };
    } else {
      return {
        status: 'Delayed vs. Schedule',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
        label: `Variance of +${diffDays} day(s) past planned date`
      };
    }
  };

  // Determine current display data based on edit mode
  const current = isEditMode ? draftShipment : shipment;
  const plannedDateVal = current.plannedDeliveryDate || current.requestedDeliveryDate || '';
  const actualDateVal = current.actualDeliveryDate || current.deliveryDate || '';
  const scheduleComparison = getScheduleComparison(plannedDateVal, actualDateVal);

  return (
    <div className="space-y-5 pb-16">
      {/* Top Banner with Navigation & Reference Highlights */}
      <div className={`bg-white p-5 rounded-lg border shadow-xs transition-all ${
        isEditMode ? 'border-amber-400 ring-2 ring-amber-200/60' : 'border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Back to Shipments"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
                  POD: {current.podNumber}
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  AWB: {current.awbNumber}
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  DR: {current.drNumber}
                </span>
                {permissions.isReadOnly ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                    <span>Read-Only Mode</span>
                  </span>
                ) : isEditMode ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 animate-pulse shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Edit Mode Active</span>
                  </span>
                ) : null}
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-1">
                {current.client} — {current.itemDescription}
              </h1>
            </div>
          </div>

          {/* Action Controls: View Mode vs Edit Mode */}
          <div className="flex items-center gap-2">
            {!isEditMode ? (
              <>
                {!permissions.isReadOnly && permissions.canDeleteRecords !== 'No' && handleDeleteAction && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAction(shipment)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                    title="Move this shipment record to Recently Deleted"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Move to Trash</span>
                  </button>
                )}

                {!permissions.isReadOnly && (
                  <button
                    id="btn-shipment-make-changes"
                    onClick={handleEnterEditMode}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 rounded shadow-xs border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>MAKE CHANGES</span>
                  </button>
                )}

                <button
                  onClick={() => copyToClipboard(`${shipment.podNumber} | ${shipment.awbNumber} | ${shipment.drNumber}`, 'all-refs')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  {copiedField === 'all-refs' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedField === 'all-refs' ? 'Copied' : 'Copy Refs'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-shipment-cancel-changes"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer shadow-2xs"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>CANCEL</span>
                </button>

                <button
                  id="btn-shipment-save-changes"
                  onClick={handleSaveChanges}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE CHANGES</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Strip with Adjacent Dates */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Status</span>
            <div className="mt-0.5">{getStatusBadge(current.status)}</div>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Consignee</span>
            <span className="font-semibold text-slate-900 mt-0.5 block truncate">{current.consignee}</span>
          </div>
          <div className="bg-blue-50/60 p-2 rounded border border-blue-100">
            <span className="text-blue-900 font-bold uppercase text-[10px] block">Planned Delivery Date</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">{plannedDateVal || '—'}</span>
          </div>
          <div className="bg-emerald-50/60 p-2 rounded border border-emerald-100">
            <span className="text-emerald-900 font-bold uppercase text-[10px] block">Actual Delivery Date</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">{actualDateVal || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Turn Around Time (TAT)</span>
            <span className="font-mono font-bold text-blue-700 mt-0.5 block">{current.tatNumber} ({current.leadTime})</span>
          </div>
        </div>
      </div>

      {/* Save Confirmation Banner */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Changes saved successfully.</span>
            <span className="text-emerald-700">Client shipment schedule and waybill records have been updated.</span>
          </div>
          <button 
            onClick={() => setSaveSuccessMessage(false)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit Mode Alert Banner */}
      {isEditMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Edit Mode active:</strong> Modify shipment parameters across the structured categories below including the <strong>Delivery Schedule</strong> date pickers. Click <strong>SAVE CHANGES</strong> above to commit or <strong>CANCEL</strong> to revert.
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-800 font-semibold uppercase">
            Interactive Form View
          </span>
        </div>
      )}

      {/* DELIVERY SCHEDULE SECTION (Planned Delivery Date | Actual Delivery Date Grouped Side-by-Side) */}
      <div 
        id="section-delivery-schedule" 
        className={`bg-white rounded-lg border shadow-xs overflow-hidden transition-all ${
          isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
        }`}
      >
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-blue-100 text-blue-800">
              <Calendar className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Delivery Schedule
              </h2>
              <p className="text-[11px] text-slate-500">
                Direct comparison between scheduled target and actual delivery fulfillment
              </p>
            </div>
          </div>
          {scheduleComparison && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${scheduleComparison.badgeClass}`}>
                {scheduleComparison.status}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Planned Delivery Date */}
            <div className="p-4 rounded-lg bg-blue-50/40 border border-blue-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    Planned Delivery Date
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Target Schedule
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Committed scheduled date agreed upon for cargo arrival and handover.
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-blue-100">
                {!isEditMode ? (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {plannedDateVal || '—'}
                    </span>
                    <span className="text-xs text-blue-700 font-medium">(Target Date)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 block">
                      Planned Delivery Date (Date Picker)
                    </label>
                    <input
                      type="date"
                      value={draftShipment.plannedDeliveryDate || draftShipment.requestedDeliveryDate || ''}
                      onChange={(e) => {
                        handleFieldChange('plannedDeliveryDate', e.target.value);
                        handleFieldChange('requestedDeliveryDate', e.target.value);
                      }}
                      className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-3 py-2 font-mono font-bold text-sm sm:text-base text-slate-900 shadow-2xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actual Delivery Date */}
            <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    Actual Delivery Date
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Fulfilled Date
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Recorded timestamp when the cargo was officially accepted by the consignee.
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-emerald-100">
                {!isEditMode ? (
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {actualDateVal || '—'}
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">(Actual Fulfillment)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 block">
                      Actual Delivery Date (Date Picker)
                    </label>
                    <input
                      type="date"
                      value={draftShipment.actualDeliveryDate || draftShipment.deliveryDate || ''}
                      onChange={(e) => {
                        handleFieldChange('actualDeliveryDate', e.target.value);
                        handleFieldChange('deliveryDate', e.target.value);
                      }}
                      className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-3 py-2 font-mono font-bold text-sm sm:text-base text-slate-900 shadow-2xs"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Schedule Comparison Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-700">Schedule Performance:</span>
              <span>{scheduleComparison?.label || 'Monitoring scheduled delivery timeline.'}</span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              {current.status === 'Delivered' ? 'Delivery Completed' : `Current Stage: ${current.status}`}
            </div>
          </div>
        </div>
      </div>

      {/* Structured Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* SECTION 1: Booking / Client Information */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>1. Booking & Client Information</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Section 1 of 6</span>
          </div>

          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Client Account:</span>
              {!isEditMode ? (
                <span className="font-bold text-slate-900">{shipment.client}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.client}
                  onChange={(e) => handleFieldChange('client', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-bold text-slate-900 text-xs w-full max-w-[240px] text-right"
                />
              )}
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Month Started:</span>
              {!isEditMode ? (
                <span className="font-medium text-slate-800">{shipment.monthStarted}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.monthStarted}
                  onChange={(e) => handleFieldChange('monthStarted', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 text-slate-800 text-xs w-full max-w-[240px] text-right"
                />
              )}
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Booked Date:</span>
              {!isEditMode ? (
                <span className="font-mono font-medium text-slate-800">{shipment.bookedDate}</span>
              ) : (
                <input
                  type="date"
                  value={draftShipment.bookedDate}
                  onChange={(e) => handleFieldChange('bookedDate', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono text-slate-800 text-xs w-full max-w-[240px]"
                />
              )}
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Pick-up Date:</span>
              {!isEditMode ? (
                <span className="font-mono font-medium text-slate-800">{shipment.pickupDate}</span>
              ) : (
                <input
                  type="date"
                  value={draftShipment.pickupDate}
                  onChange={(e) => handleFieldChange('pickupDate', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono text-slate-800 text-xs w-full max-w-[240px]"
                />
              )}
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Consignee:</span>
              {!isEditMode ? (
                <span className="font-semibold text-slate-900 text-right">{shipment.consignee}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.consignee}
                  onChange={(e) => handleFieldChange('consignee', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-semibold text-slate-900 text-xs w-full max-w-[240px] text-right"
                />
              )}
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Contact Number:</span>
              {!isEditMode ? (
                <span className="font-mono text-slate-800">{shipment.contactNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.contactNumber}
                  onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono text-slate-800 text-xs w-full max-w-[240px] text-right"
                />
              )}
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Mode of Shipment:</span>
              {!isEditMode ? (
                <span className="font-semibold px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 text-[11px]">
                  {shipment.modeOfShipment}
                </span>
              ) : (
                <select
                  value={draftShipment.modeOfShipment}
                  onChange={(e) => handleFieldChange('modeOfShipment', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-semibold text-blue-900 text-xs"
                >
                  <option value="Land Freight">Land Freight</option>
                  <option value="Sea Freight">Sea Freight</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Multimodal">Multimodal</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Origin and Destination */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <span>2. Origin & Destination</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Section 2 of 6</span>
          </div>

          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2">
              <span className="text-slate-500 block text-[11px] mb-0.5">Origin / Pick-up Point:</span>
              {!isEditMode ? (
                <span className="font-medium text-slate-900">{shipment.originPickupPoint}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.originPickupPoint}
                  onChange={(e) => handleFieldChange('originPickupPoint', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 text-slate-900 text-xs"
                />
              )}
            </div>

            <div className="py-2">
              <span className="text-slate-500 block text-[11px] mb-0.5">Destination:</span>
              {!isEditMode ? (
                <span className="font-semibold text-slate-900">{shipment.destination}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.destination}
                  onChange={(e) => handleFieldChange('destination', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-semibold text-slate-900 text-xs"
                />
              )}
            </div>

            <div className="py-2 flex justify-between items-center gap-3">
              <span className="text-slate-500 shrink-0">Geographic Area:</span>
              {!isEditMode ? (
                <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                  {shipment.area} Region
                </span>
              ) : (
                <select
                  value={draftShipment.area}
                  onChange={(e) => handleFieldChange('area', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-bold text-slate-800 text-xs"
                >
                  <option value="Luzon">Luzon Region</option>
                  <option value="Visayas">Visayas Region</option>
                  <option value="Mindanao">Mindanao Region</option>
                  <option value="NCR">NCR Region</option>
                </select>
              )}
            </div>

            <div className="py-2 flex justify-between items-center gap-3">
              <span className="text-slate-500 shrink-0">Requested Delivery Date (RDD):</span>
              {!isEditMode ? (
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {shipment.requestedDeliveryDate}
                </span>
              ) : (
                <input
                  type="date"
                  value={draftShipment.requestedDeliveryDate}
                  onChange={(e) => handleFieldChange('requestedDeliveryDate', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono font-bold text-blue-700 text-xs"
                />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Cargo Information */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-700" />
              <span>3. Cargo Information</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Section 3 of 6</span>
          </div>

          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2">
              <span className="text-slate-500 block text-[11px] mb-0.5">Item Description:</span>
              {!isEditMode ? (
                <span className="font-semibold text-slate-900">{shipment.itemDescription}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.itemDescription}
                  onChange={(e) => handleFieldChange('itemDescription', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-semibold text-slate-900 text-xs"
                />
              )}
            </div>

            <div className="py-2 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Quantity / Boxes:</span>
                {!isEditMode ? (
                  <span className="font-mono font-bold text-slate-900">{shipment.quantityBoxes} Boxes</span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={draftShipment.quantityBoxes}
                    onChange={(e) => handleFieldChange('quantityBoxes', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-slate-900 text-xs"
                  />
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Declared Cargo Amount:</span>
                {!isEditMode ? (
                  <span className="font-mono font-bold text-slate-900">{shipment.amount}</span>
                ) : (
                  <input
                    type="text"
                    value={draftShipment.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-slate-900 text-xs"
                  />
                )}
              </div>
            </div>

            <div className="py-2 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Actual CBM:</span>
                {!isEditMode ? (
                  <span className="font-mono text-slate-800">{shipment.actualCbm} CBM</span>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    value={draftShipment.actualCbm}
                    onChange={(e) => handleFieldChange('actualCbm', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-slate-800 text-xs"
                  />
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Volume Weight:</span>
                {!isEditMode ? (
                  <span className="font-mono text-slate-800">{shipment.volumeWeight} kg</span>
                ) : (
                  <input
                    type="number"
                    step="0.1"
                    value={draftShipment.volumeWeight}
                    onChange={(e) => handleFieldChange('volumeWeight', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-slate-800 text-xs"
                  />
                )}
              </div>
            </div>

            <div className="py-2 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Actual Weight:</span>
                {!isEditMode ? (
                  <span className="font-mono font-bold text-slate-900">{shipment.actualWeightKg} kg</span>
                ) : (
                  <input
                    type="number"
                    step="0.1"
                    value={draftShipment.actualWeightKg}
                    onChange={(e) => handleFieldChange('actualWeightKg', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-slate-900 text-xs"
                  />
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Charge per Weight:</span>
                {!isEditMode ? (
                  <span className="font-mono text-blue-700 font-semibold">{shipment.chargePerWeight}</span>
                ) : (
                  <input
                    type="text"
                    value={draftShipment.chargePerWeight}
                    onChange={(e) => handleFieldChange('chargePerWeight', e.target.value)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-blue-700 font-semibold text-xs"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Transport Information */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-700" />
              <span>4. Transport & Hauler Equipment</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Equipment</span>
          </div>

          <div className="p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Van / Container Number:</span>
              {!isEditMode ? (
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {shipment.vanNumber}
                </span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.vanNumber}
                  onChange={(e) => handleFieldChange('vanNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono font-bold text-slate-900 text-xs w-full max-w-[200px]"
                />
              )}
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Hauler Plate Number:</span>
              {!isEditMode ? (
                <span className="font-mono text-slate-800">{shipment.truckPlate || '—'}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.truckPlate || ''}
                  onChange={(e) => handleFieldChange('truckPlate', e.target.value)}
                  placeholder="e.g. NBD-8842"
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono text-slate-800 text-xs w-full max-w-[200px]"
                />
              )}
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0">Vessel / Flight Reference:</span>
              {!isEditMode ? (
                <span className="font-mono text-blue-800 font-semibold">{shipment.vesselFlightNo || '—'}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.vesselFlightNo || ''}
                  onChange={(e) => handleFieldChange('vesselFlightNo', e.target.value)}
                  placeholder="e.g. MV-SEAWAY-09"
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2.5 py-1 font-mono text-blue-800 font-semibold text-xs w-full max-w-[200px]"
                />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: Dedicated Shipment Movement Timeline */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>5. Shipment Timeline (Departure & Arrival)</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Timings</span>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Departure Column */}
            <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Departure</span>
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Origin Gate</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  {!isEditMode ? (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200/80">
                      <span className="text-slate-500 text-[11px]">Estimated:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatTo12HourTime(shipment.estimatedDeparture)}
                      </span>
                    </div>
                  ) : (
                    <MilitaryDateTimeInput
                      label="Estimated Departure"
                      value={draftShipment.estimatedDeparture}
                      onChange={(val) => handleFieldChange('estimatedDeparture', val)}
                    />
                  )}
                </div>

                <div>
                  {!isEditMode ? (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-blue-200">
                      <span className="text-blue-900 font-medium text-[11px]">Actual:</span>
                      <span className="font-mono font-bold text-blue-950">
                        {formatTo12HourTime(shipment.actualDeparture)}
                      </span>
                    </div>
                  ) : (
                    <MilitaryDateTimeInput
                      label="Actual Departure"
                      value={draftShipment.actualDeparture}
                      onChange={(val) => handleFieldChange('actualDeparture', val)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Arrival Column */}
            <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Arrival</span>
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Destination</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  {!isEditMode ? (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200/80">
                      <span className="text-slate-500 text-[11px]">Estimated:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatTo12HourTime(shipment.estimatedArrival)}
                      </span>
                    </div>
                  ) : (
                    <MilitaryDateTimeInput
                      label="Estimated Arrival"
                      value={draftShipment.estimatedArrival}
                      onChange={(val) => handleFieldChange('estimatedArrival', val)}
                    />
                  )}
                </div>

                <div>
                  {!isEditMode ? (
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-emerald-200">
                      <span className="text-emerald-900 font-medium text-[11px]">Actual:</span>
                      <span className="font-mono font-bold text-emerald-950">
                        {formatTo12HourTime(shipment.actualArrival)}
                      </span>
                    </div>
                  ) : (
                    <MilitaryDateTimeInput
                      label="Actual Arrival"
                      value={draftShipment.actualArrival}
                      onChange={(val) => handleFieldChange('actualArrival', val)}
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 6: Delivery and Documentation */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden lg:col-span-2 ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" />
              <span>6. Delivery & Documentation Reference Numbers</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Documentation</span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            
            {/* Reference Badge 1: POD */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>POD Number</span>
                {!isEditMode && (
                  <button
                    onClick={() => copyToClipboard(shipment.podNumber, 'pod')}
                    className="text-slate-400 hover:text-blue-700 cursor-pointer"
                    title="Copy"
                  >
                    {copiedField === 'pod' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
              </div>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-blue-700">{shipment.podNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.podNumber}
                  onChange={(e) => handleFieldChange('podNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-sm text-blue-700 w-full"
                />
              )}
            </div>

            {/* Reference Badge 2: AWB */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>AWB Number</span>
                {!isEditMode && (
                  <button
                    onClick={() => copyToClipboard(shipment.awbNumber, 'awb')}
                    className="text-slate-400 hover:text-blue-700 cursor-pointer"
                    title="Copy"
                  >
                    {copiedField === 'awb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
              </div>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.awbNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.awbNumber}
                  onChange={(e) => handleFieldChange('awbNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-sm text-slate-900 w-full"
                />
              )}
            </div>

            {/* Reference Badge 3: DR Number */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>Delivery Receipt (DR) #</span>
                {!isEditMode && (
                  <button
                    onClick={() => copyToClipboard(shipment.drNumber, 'dr')}
                    className="text-slate-400 hover:text-blue-700 cursor-pointer"
                    title="Copy"
                  >
                    {copiedField === 'dr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
              </div>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.drNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.drNumber}
                  onChange={(e) => handleFieldChange('drNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-sm text-slate-900 w-full"
                />
              )}
            </div>

            {/* Reference Badge 4: Seal Number */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>Security Seal #</span>
                {!isEditMode && (
                  <button
                    onClick={() => copyToClipboard(shipment.sealNumber, 'seal')}
                    className="text-slate-400 hover:text-blue-700 cursor-pointer"
                    title="Copy"
                  >
                    {copiedField === 'seal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
              </div>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.sealNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.sealNumber}
                  onChange={(e) => handleFieldChange('sealNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-sm text-slate-900 w-full"
                />
              )}
            </div>

            {/* Reference Badge 5: Bill/Landing */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>Bill of Lading (B/L) #</span>
                {!isEditMode && (
                  <button
                    onClick={() => copyToClipboard(shipment.billOfLandingNumber, 'bl')}
                    className="text-slate-400 hover:text-blue-700 cursor-pointer"
                    title="Copy"
                  >
                    {copiedField === 'bl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
              </div>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.billOfLandingNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.billOfLandingNumber}
                  onChange={(e) => handleFieldChange('billOfLandingNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-sm text-slate-900 w-full"
                />
              )}
            </div>

            {/* Reference Badge 6: Manifest */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-[11px] mb-1">
                <span>Manifest Number</span>
                {!isEditMode && (
                  <button
                    onClick={() => copyToClipboard(shipment.manifestNumber, 'mnf')}
                    className="text-slate-400 hover:text-blue-700 cursor-pointer"
                    title="Copy"
                  >
                    {copiedField === 'mnf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
              </div>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.manifestNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.manifestNumber}
                  onChange={(e) => handleFieldChange('manifestNumber', e.target.value)}
                  className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-sm text-slate-900 w-full"
                />
              )}
            </div>

          </div>

          {/* Delivery Receipts Sub-Grid */}
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Delivery Date:</span>
              {!isEditMode ? (
                <span className="font-mono font-semibold text-slate-900">{shipment.deliveryDate}</span>
              ) : (
                <input
                  type="date"
                  value={draftShipment.deliveryDate}
                  onChange={(e) => handleFieldChange('deliveryDate', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-semibold text-slate-900 text-xs"
                />
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Receiver&apos;s Name:</span>
              {!isEditMode ? (
                <span className="font-semibold text-slate-900">{shipment.receiversName}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.receiversName}
                  onChange={(e) => handleFieldChange('receiversName', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-semibold text-slate-900 text-xs"
                />
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Date POD Received:</span>
              {!isEditMode ? (
                <span className="font-mono text-slate-800">{shipment.datePodReceived}</span>
              ) : (
                <input
                  type="date"
                  value={draftShipment.datePodReceived}
                  onChange={(e) => handleFieldChange('datePodReceived', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-slate-800 text-xs"
                />
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Date Transmitted:</span>
              {!isEditMode ? (
                <span className="font-mono text-slate-800">{shipment.dateTransmitted}</span>
              ) : (
                <input
                  type="date"
                  value={draftShipment.dateTransmitted}
                  onChange={(e) => handleFieldChange('dateTransmitted', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-slate-800 text-xs"
                />
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border-t border-slate-200 text-xs">
            <span className="text-slate-500 block text-[11px] font-semibold mb-1">Delivery Remarks & Special Instructions:</span>
            {!isEditMode ? (
              <p className="text-slate-800 italic bg-white p-2.5 rounded border border-slate-200">
                &ldquo;{shipment.deliveryRemarks}&rdquo;
              </p>
            ) : (
              <textarea
                value={draftShipment.deliveryRemarks}
                onChange={(e) => handleFieldChange('deliveryRemarks', e.target.value)}
                rows={2}
                className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded p-2 text-xs text-slate-900"
              />
            )}
          </div>
        </div>

        {/* SECTION 6: Performance */}
        <div className={`bg-white rounded-lg border shadow-xs overflow-hidden lg:col-span-2 ${isEditMode ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-700" />
              <span>6. SLA & Delivery Performance Tracking</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Section 6 of 6</span>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Shipment Status</span>
              {!isEditMode ? (
                <div>{getStatusBadge(shipment.status)}</div>
              ) : (
                <select
                  value={draftShipment.status}
                  onChange={(e) => handleFieldChange('status', e.target.value as ShipmentStatus)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-semibold text-xs text-slate-900"
                >
                  <option value="Booked">Booked</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Under Customs/Documentation">Under Customs/Documentation</option>
                </select>
              )}
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Contract Lead Time</span>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.leadTime}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.leadTime}
                  onChange={(e) => handleFieldChange('leadTime', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-xs text-slate-900 text-center"
                />
              )}
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">TAT Code</span>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-blue-700">{shipment.tatNumber}</span>
              ) : (
                <input
                  type="text"
                  value={draftShipment.tatNumber}
                  onChange={(e) => handleFieldChange('tatNumber', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-xs text-blue-700 text-center"
                />
              )}
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Delivery Performance</span>
              {!isEditMode ? (
                <div>{getPerformanceBadge(shipment.deliveryPerformance)}</div>
              ) : (
                <select
                  value={draftShipment.deliveryPerformance}
                  onChange={(e) => handleFieldChange('deliveryPerformance', e.target.value)}
                  className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-bold text-xs text-slate-900"
                >
                  <option value="On-Time">On-Time</option>
                  <option value="Within SLA">Within SLA</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Pending Delivery">Pending Delivery</option>
                </select>
              )}
            </div>

            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Number of Elapsed Days</span>
              {!isEditMode ? (
                <span className="font-mono font-bold text-sm text-slate-900">{shipment.numberOfDays} Days</span>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={draftShipment.numberOfDays}
                    onChange={(e) => handleFieldChange('numberOfDays', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-xs text-slate-900 text-center"
                  />
                  <span className="text-xs text-slate-500">Days</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Navigation Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-700 font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {shipment.client} Shipments</span>
        </button>

        <span className="font-mono text-slate-400">OFII Master Tracking ID: {shipment.id}</span>
      </div>
    </div>
  );
};

