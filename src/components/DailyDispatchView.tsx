import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Clock, 
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Pencil,
  X,
  Save,
  Check,
  Trash2,
  Bell,
  FileSpreadsheet,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { DispatchRecord, DeliveryType, DispatchStatus, ForwardingDispatchNotification, ClientSummary, PhilippineArea } from '../types';
import { useData } from '../context/DataContext';
import { MilitaryTimeInput } from './MilitaryTimeInput';
import { formatTo12HourTime, formatTo24HourTime, formatDualTimeDisplay, parseAndConvertMilitaryTime } from '../utils/timeUtils';
import { ForwardingDispatchNotificationPanel } from './ForwardingDispatchNotificationPanel';
import { downloadDailyDispatchTemplate, exportDailyDispatchToExcel } from '../utils/excelParser';
import { getDeliveryStatusBadge } from '../utils/deliveryStatusFlow';
import { getRolePermissions } from '../utils/roleUtils';

interface DailyDispatchViewProps {
  dispatches: DispatchRecord[];
  onSelectDispatch: (dispatch: DispatchRecord) => void;
  onOpenAddModal: () => void;
  onOpenImportModal?: () => void;
  onUpdateDispatches: (updatedDispatches: DispatchRecord[]) => void;
  onRequestDeleteDispatch?: (dispatch: DispatchRecord) => void;
  onAssignDriver?: (dispatch: DispatchRecord) => void;
  dispatchNotifications?: ForwardingDispatchNotification[];
  onCompleteDispatchNotification?: (notification: ForwardingDispatchNotification) => void;
  onDismissDispatchNotification?: (notificationId: string) => void;
  clients?: ClientSummary[];
}

export const DailyDispatchView: React.FC<DailyDispatchViewProps> = ({
  dispatches,
  onSelectDispatch,
  onOpenAddModal,
  onOpenImportModal,
  onUpdateDispatches,
  onRequestDeleteDispatch,
  onAssignDriver,
  dispatchNotifications = [],
  onCompleteDispatchNotification,
  onDismissDispatchNotification,
  clients = [],
}) => {
  const { truckRuns, individualDeliveries, shipments, currentUserProfile } = useData();
  const permissions = getRolePermissions(currentUserProfile);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<Record<string, DispatchRecord>>({});
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedDate, setSelectedDate] = useState('2026-08-23');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Start Edit Mode
  const handleEnterEditMode = () => {
    if (permissions.isReadOnly || permissions.canDailyDispatch === 'Read-only') {
      return;
    }
    const draft: Record<string, DispatchRecord> = {};
    dispatches.forEach((d) => {
      draft[d.id] = { ...d };
    });
    setEditDraft(draft);
    setIsEditMode(true);
    setSaveSuccessMessage(false);
  };

  // Enforce read-only state if user is Viewer
  useEffect(() => {
    if (permissions.isReadOnly && isEditMode) {
      setIsEditMode(false);
      setEditDraft({});
    }
  }, [permissions.isReadOnly, isEditMode]);

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setEditDraft({});
    setIsEditMode(false);
  };

  // Save Changes
  const handleSaveChanges = () => {
    const updatedList = dispatches.map((d) => {
      return editDraft[d.id] ? editDraft[d.id] : d;
    });
    onUpdateDispatches(updatedList);
    setIsEditMode(false);
    setSaveSuccessMessage(true);
    setTimeout(() => {
      setSaveSuccessMessage(false);
    }, 4000);
  };

  const handleExportDispatch = (scope: 'all' | 'filtered') => {
    setShowExportMenu(false);
    const recordsToExport = scope === 'all'
      ? dispatches.filter((d) => !d.isDeleted)
      : filteredDispatches.filter((d) => !d.isDeleted);

    exportDailyDispatchToExcel(recordsToExport, {
      isFiltered: scope === 'filtered',
      label: scope === 'filtered' ? 'Filtered Dispatches' : 'All Dispatches',
    });

    setExportNotice(`Exported ${recordsToExport.length} daily dispatch records to Excel (.xlsx) successfully.`);
    setTimeout(() => setExportNotice(null), 4500);
  };

  // Update specific field in edit draft
  const handleFieldChange = (id: string, field: keyof DispatchRecord, value: any) => {
    setEditDraft((prev) => {
      const current = prev[id] || dispatches.find((d) => d.id === id);
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Filtered dispatches (using draft values when in edit mode)
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((originalItem) => {
      // Exclude deleted records
      if (originalItem.isDeleted) return false;

      const item = isEditMode && editDraft[originalItem.id] ? editDraft[originalItem.id] : originalItem;
      
      // Year check
      if (selectedYear && !item.deliveryDate.startsWith(selectedYear)) {
        return false;
      }
      // Delivery Type filter
      if (selectedDeliveryType !== 'ALL' && item.deliveryType !== selectedDeliveryType) {
        return false;
      }
      // Delivery Area filter
      if (selectedArea !== 'ALL') {
        const itemArea = item.deliveryArea || item.area || 'Luzon';
        if (itemArea !== selectedArea) {
          return false;
        }
      }
      // Status filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      // Search query (POD, Manifest, Consignee, Destination, Plate, Provider, Client, Area)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.podNumber.toLowerCase().includes(q) ||
          (item.drNumber && item.drNumber.toLowerCase().includes(q)) ||
          (item.sealNumber && item.sealNumber.toLowerCase().includes(q)) ||
          (item.itemDescription && item.itemDescription.toLowerCase().includes(q)) ||
          item.manifestNumber.toLowerCase().includes(q) ||
          item.consignee.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          (item.deliveryArea && item.deliveryArea.toLowerCase().includes(q)) ||
          (item.area && item.area.toLowerCase().includes(q)) ||
          item.plateNumber.toLowerCase().includes(q) ||
          item.truckProvider.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.remarks.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [dispatches, editDraft, isEditMode, selectedYear, selectedDeliveryType, selectedArea, selectedStatus, searchQuery]);

  const getAreaBadge = (area?: PhilippineArea) => {
    const a = area || 'Luzon';
    switch (a) {
      case 'Visayas':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">Visayas</span>;
      case 'Mindanao':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">Mindanao</span>;
      case 'NCR':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-800 border border-indigo-200">NCR</span>;
      case 'Luzon':
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-sky-50 text-sky-800 border border-sky-200">Luzon</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const badge = getDeliveryStatusBadge(status);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.badgeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dotColor}`} />
        {badge.label}
      </span>
    );
  };

  const getDeliveryTypeBadge = (type: DeliveryType) => {
    switch (type) {
      case 'GADC':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">GADC</span>;
      case 'ISCI':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-50 text-purple-700 border border-purple-200">ISCI</span>;
      case 'XSEED':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">XSEED</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">{type}</span>;
    }
  };

  const getLinkedInfo = (record: DispatchRecord) => {
    const linkedRun = (truckRuns || []).find(
      (run) =>
        (record.truckRunNumber && run.truckRunNumber === record.truckRunNumber) ||
        (record.truckRunId && run.id === record.truckRunId) ||
        (record.podNumber && (run.truckDispatchPod === record.podNumber || run.deliveryIds.includes(record.id) || (record.individualDeliveryId && run.deliveryIds.includes(record.individualDeliveryId)))) ||
        (record.plateNumber && run.plateNumber && record.plateNumber.replace(/\s+/g, '').toUpperCase() === run.plateNumber.replace(/\s+/g, '').toUpperCase())
    );

    const linkedDel = (individualDeliveries || []).find(
      (del) =>
        del.id === record.id ||
        (record.individualDeliveryId && del.id === record.individualDeliveryId) ||
        (record.podNumber && del.individualDeliveryPod === record.podNumber)
    );

    const truckRunNumber = record.truckRunNumber || linkedRun?.truckRunNumber || linkedDel?.truckRunNumber || '';
    const client = record.clientName || (record as any).client || linkedDel?.client || (linkedRun as any)?.client || 'General Client';
    const deliveryArea = record.deliveryArea || record.area || linkedDel?.area || linkedRun?.deliveryArea || 'Luzon';
    const truck = record.truckProvider || record.vehicle || linkedRun?.truckSource || linkedRun?.truckName || 'OFII Dedicated Fleet';
    const plateNumber = record.plateNumber || linkedRun?.plateNumber || '—';
    const driver = record.driverName || record.assignedDriver || linkedRun?.driver || linkedDel?.driver || '';
    const timeArrived = record.timeArrived || record.truckArrivalTime || linkedRun?.timeArrived || linkedDel?.timeArrived || '';
    const startLoading = record.startLoadingTime || record.loadingStartTime || linkedRun?.startLoadingTime || linkedDel?.startLoadingTime || '';
    const endLoading = record.endLoadingTime || record.loadingEndTime || linkedRun?.endLoadingTime || linkedDel?.endLoadingTime || '';
    const actualDeparture = record.actualDepartureTime || record.departureTime || linkedRun?.actualDeparture || linkedDel?.actualDeparture || '';
    const dispatchPod = record.truckDispatchPod || record.dispatchPod || linkedRun?.truckDispatchPod || record.podNumber;
    const operationalStatus = record.dispatchOperationalStatus || linkedRun?.dispatchOperationalStatus || record.status;

    return {
      linkedRun,
      linkedDel,
      truckRunNumber,
      client,
      deliveryArea,
      truck,
      plateNumber,
      driver,
      timeArrived,
      startLoading,
      endLoading,
      actualDeparture,
      dispatchPod,
      operationalStatus,
      isMissingLink: !linkedRun && !record.truckRunNumber,
    };
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Top Header & Action Controls */}
      <div className="bg-white p-3.5 sm:p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-700 shrink-0" />
              <span>Daily Dispatching Monitoring</span>
            </h1>

            {permissions.isReadOnly ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Read-Only Mode</span>
              </span>
            ) : isEditMode ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 animate-pulse shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Edit Mode Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Eye className="w-3 h-3 text-slate-500" />
                <span>View Mode</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time control log of terminal truck arrivals, bay loading cycles, and departing linehauls.
          </p>
        </div>

        {/* Action Controls: View Mode vs Edit Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {!isEditMode ? (
            <>
              {!permissions.isReadOnly && permissions.canDailyDispatch !== 'Read-only' && (
                <button
                  id="btn-dispatch-make-changes"
                  onClick={handleEnterEditMode}
                  className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 rounded shadow-xs border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>MAKE CHANGES</span>
                </button>
              )}

              {!permissions.isReadOnly && (permissions.canDailyDispatch === 'Full' || permissions.canDailyDispatch === 'Add/Edit/Import') && (
                <button
                  id="btn-dispatch-add"
                  onClick={onOpenAddModal}
                  className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ ADD DISPATCH</span>
                </button>
              )}

              {permissions.canImportExcel && (
                <button
                  id="btn-dispatch-download-template"
                  type="button"
                  onClick={() => downloadDailyDispatchTemplate(clients)}
                  className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded shadow-2xs border border-slate-300 transition-colors cursor-pointer hover:text-blue-700"
                  title="Download standardized Daily Dispatching Excel template (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                  <span>📥 Download Template</span>
                </button>
              )}

              {permissions.canExportExcel && (
                <div className="relative">
                  <button
                    id="btn-dispatch-export-excel"
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded shadow-2xs border border-slate-300 transition-colors cursor-pointer hover:text-emerald-700"
                    title="Export Daily Dispatching records to Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>📤 Export to Excel</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 mt-1 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleExportDispatch('filtered')}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between font-semibold text-slate-800 cursor-pointer min-h-[38px]"
                        >
                          <span>Export Filtered Records</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-600">
                            {filteredDispatches.filter(d => !d.isDeleted).length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportDispatch('all')}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center justify-between font-semibold text-slate-800 cursor-pointer border-t border-slate-100 min-h-[38px]"
                        >
                          <span>Export All Records</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-600">
                            {dispatches.filter(d => !d.isDeleted).length}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {permissions.canImportExcel && onOpenImportModal && (
                <button
                  id="btn-dispatch-import-excel"
                  type="button"
                  onClick={onOpenImportModal}
                  className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded shadow-xs transition-colors cursor-pointer border border-emerald-600/30"
                  title="Import dispatch records from completed Excel template"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>📥 IMPORT EXCEL</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-dispatch-cancel-changes"
                onClick={handleCancelEdit}
                className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer shadow-2xs"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>CANCEL</span>
              </button>

              <button
                id="btn-dispatch-save-changes"
                onClick={handleSaveChanges}
                className="min-h-[38px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE CHANGES</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Confirmation Banner */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Changes saved successfully.</span>
            <span className="text-emerald-700">Dispatch log records updated in monitoring system.</span>
          </div>
          <button 
            onClick={() => setSaveSuccessMessage(false)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer self-end sm:self-auto min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Export Notice Banner */}
      {exportNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{exportNotice}</span>
          </div>
          <button 
            onClick={() => setExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer self-end sm:self-auto min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit Mode Alert Banner */}
      {isEditMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Edit Mode active:</strong> You can edit any cell directly in the table below. When finished, click <strong>SAVE CHANGES</strong> above to commit your edits or <strong>CANCEL</strong> to discard.
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-800 font-semibold uppercase shrink-0">
            Interactive Form Table
          </span>
        </div>
      )}

      {/* Forwarding -> Dispatch Notification Workflow Panel */}
      {dispatchNotifications.length > 0 && onCompleteDispatchNotification && onDismissDispatchNotification && (
        <ForwardingDispatchNotificationPanel
          notifications={dispatchNotifications}
          dispatches={dispatches}
          onCompleteDispatch={onCompleteDispatchNotification}
          onDismissNotification={onDismissDispatchNotification}
          onViewExistingDispatch={onSelectDispatch}
        />
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
          
          {/* Year Selector */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full min-h-[38px] sm:min-h-[34px] text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 sm:py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="2026">2026 (Current Operational Year)</option>
              <option value="2025">2025 (Archive)</option>
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Dispatch Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full min-h-[38px] sm:min-h-[34px] text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 sm:py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Delivery Type Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Delivery Type
            </label>
            <select
              value={selectedDeliveryType}
              onChange={(e) => setSelectedDeliveryType(e.target.value)}
              className="w-full min-h-[38px] sm:min-h-[34px] text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 sm:py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Types (GADC / ISCI / XSEED)</option>
              <option value="GADC">GADC</option>
              <option value="ISCI">ISCI</option>
              <option value="XSEED">XSEED</option>
            </select>
          </div>

          {/* Delivery Area Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Delivery Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full min-h-[38px] sm:min-h-[34px] text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 sm:py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Areas</option>
              <option value="Luzon">Luzon</option>
              <option value="Visayas">Visayas</option>
              <option value="Mindanao">Mindanao</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Dispatch Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full min-h-[38px] sm:min-h-[34px] text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 sm:py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="In Loading">In Loading</option>
              <option value="Departed">Departed</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>

          {/* Search Field */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search Field
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 sm:top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="POD, Plate, Manifest, Area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[38px] sm:min-h-[34px] pl-8 pr-2.5 py-1.5 sm:py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary Tags & Results Count */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Showing <strong>{filteredDispatches.length}</strong> of {dispatches.length} dispatch logs</span>
            {(selectedDeliveryType !== 'ALL' || selectedArea !== 'ALL' || selectedStatus !== 'ALL' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setSelectedDeliveryType('ALL');
                  setSelectedArea('ALL');
                  setSelectedStatus('ALL');
                  setSearchQuery('');
                }}
                className="text-blue-700 hover:underline text-[11px] font-medium cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            {isEditMode 
              ? 'Edit Mode Active: Modify fields below and click SAVE CHANGES.' 
              : 'Tip: Click any dispatch row to view full timing breakdown & manifest details.'}
          </div>
        </div>
      </div>

      {/* Clean, Streamlined Operational Table */}
      <div className={`bg-white rounded-lg border shadow-xs overflow-hidden transition-all w-full min-w-0 ${
        isEditMode ? 'border-amber-400 ring-2 ring-amber-200/60' : 'border-slate-200'
      }`}>
        <div className="lg:hidden bg-blue-50/70 border-b border-blue-100 px-3.5 py-2 text-[11px] text-blue-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold">
            <Truck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>Daily Dispatch Table (22 Columns)</span>
          </div>
          <span className="text-blue-700 font-medium inline-flex items-center gap-1 shrink-0 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
            <span>Swipe ↔</span>
          </span>
        </div>
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[1750px]">
            <thead className="bg-slate-100/90 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 whitespace-nowrap">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50/80 text-blue-900 font-bold">
                  S.I / POD Number
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  DR Number
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Seal Number
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Client
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Item Description
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50/60 text-blue-950 font-bold">
                  Planned Delivery Date
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50/60 text-blue-950 font-bold">
                  Delivery Date
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">
                  Quantity
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center">
                  Delivery Type
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Place
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Consignee
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Truck
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Plate Number
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-slate-50 font-bold text-slate-800">
                  Truck Arrival Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-amber-50/70 font-bold text-amber-900">
                  Start Loading Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-indigo-50/70 font-bold text-indigo-900">
                  End Loading Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50/70 font-bold text-blue-900">
                  Actual Departure Time
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Dispatch Date
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Manifest Number
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center font-bold">
                  Status
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Remarks
                </th>
                <th className="py-2.5 px-3 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={22} className="text-center py-12 text-slate-500 bg-slate-50">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Truck className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No dispatch records matching your filter criteria</p>
                      <p className="text-xs text-slate-400">Try adjusting your date range, area, delivery type, or search keywords.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((record) => {
                  const currentRecord = isEditMode && editDraft[record.id] ? editDraft[record.id] : record;
                  const linkedRun = truckRuns.find(
                    (tr) =>
                      tr.id === record.truckRunId ||
                      (record.truckRunNumber && tr.truckRunNumber === record.truckRunNumber) ||
                      (record.podNumber && tr.truckDispatchPod === record.podNumber) ||
                      tr.deliveryIds.includes(record.id) ||
                      (record.individualDeliveryId && tr.deliveryIds.includes(record.individualDeliveryId))
                  );
                  const linkedDel = individualDeliveries.find(
                    (d) =>
                      d.id === record.id ||
                      d.deliveryId === record.deliveryId ||
                      d.individualDeliveryPod === record.podNumber ||
                      (record.individualDeliveryId && d.id === record.individualDeliveryId)
                  );
                  const linkedShip = (shipments || []).find(
                    (s) =>
                      s.id === record.id ||
                      s.podNumber === record.podNumber ||
                      (record.drNumber && s.drNumber === record.drNumber)
                  );
                  const effectiveClient = currentRecord.clientName || linkedDel?.client || linkedShip?.client || '—';
                  const effectiveArea = (currentRecord.deliveryArea || currentRecord.area || linkedDel?.area || linkedRun?.deliveryArea || 'Luzon') as PhilippineArea;
                  const effectiveTruck = currentRecord.truckProvider || currentRecord.truckName || linkedRun?.truckSource || linkedRun?.truckName || '—';
                  const effectivePlate = currentRecord.plateNumber || linkedRun?.plateNumber || '—';
                  const effectiveDriver = currentRecord.driverName || currentRecord.assignedDriver || linkedRun?.driver || '—';
                  const effectiveDispatchPod = currentRecord.podNumber || currentRecord.truckDispatchPod || linkedRun?.truckDispatchPod || '—';
                  const effectiveDr = currentRecord.drNumber || linkedDel?.drNumber || linkedShip?.drNumber || (currentRecord.manifestNumber ? `DR-${currentRecord.manifestNumber}` : '—');
                  const effectiveSeal = currentRecord.sealNumber || linkedDel?.sealNumber || linkedShip?.sealNumber || '—';
                  const effectiveItem = currentRecord.itemDescription || linkedDel?.itemDescription || linkedShip?.itemDescription || 'Commercial Cargo Consignment';
                  const effectiveDispatchDate = currentRecord.dispatchDate || currentRecord.departureTime?.split(' ')[0] || currentRecord.deliveryDate || '—';

                  if (isEditMode) {
                    // EDIT MODE ROW RENDERING (Interactive inputs)
                    return (
                      <tr
                        key={currentRecord.id}
                        className="bg-amber-50/20 hover:bg-amber-50/40 transition-colors whitespace-nowrap"
                      >
                        {/* 1. S.I / POD Number */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.podNumber || currentRecord.truckDispatchPod || ''}
                            onChange={(e) => {
                              handleFieldChange(currentRecord.id, 'podNumber', e.target.value);
                              handleFieldChange(currentRecord.id, 'truckDispatchPod', e.target.value);
                            }}
                            placeholder="POD Number"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-blue-700 text-xs w-32 shadow-2xs"
                          />
                        </td>

                        {/* 2. DR Number */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.drNumber || ''}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'drNumber', e.target.value)}
                            placeholder="e.g. DR-884102"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-xs text-slate-800 w-28 shadow-2xs"
                          />
                        </td>

                        {/* 3. Seal Number */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.sealNumber || ''}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'sealNumber', e.target.value)}
                            placeholder="e.g. SEAL-OFII-1029"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-xs text-slate-800 w-28 shadow-2xs"
                          />
                        </td>

                        {/* 4. Client */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.clientName || ''}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'clientName', e.target.value)}
                            placeholder="Client"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 text-xs w-36 shadow-2xs font-semibold"
                          />
                        </td>

                        {/* 5. Item Description */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.itemDescription || ''}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'itemDescription', e.target.value)}
                            placeholder="Item Description"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 text-xs text-slate-800 w-40 shadow-2xs"
                          />
                        </td>

                        {/* 6. Planned Delivery Date */}
                        <td className="py-2 px-2.5 border-r border-slate-200 bg-blue-50/20">
                          <input
                            type="date"
                            value={currentRecord.plannedDeliveryDate}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'plannedDeliveryDate', e.target.value)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-semibold text-xs text-blue-950 w-32 shadow-2xs"
                          />
                        </td>

                        {/* 7. Delivery Date */}
                        <td className="py-2 px-2.5 border-r border-slate-200 bg-blue-50/20">
                          <input
                            type="date"
                            value={currentRecord.deliveryDate}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'deliveryDate', e.target.value)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-semibold text-xs text-slate-900 w-32 shadow-2xs"
                          />
                        </td>

                        {/* 8. Quantity / Cases / Boxes */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={currentRecord.quantityCasesBoxes}
                              onChange={(e) => handleFieldChange(currentRecord.id, 'quantityCasesBoxes', parseInt(e.target.value, 10) || 0)}
                              className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-semibold text-xs text-slate-900 w-20 text-right shadow-2xs"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">{currentRecord.unit}</span>
                          </div>
                        </td>

                        {/* 9. Delivery Type */}
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                          <select
                            value={currentRecord.deliveryType}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'deliveryType', e.target.value as DeliveryType)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-xs text-slate-800 shadow-2xs"
                          >
                            <option value="GADC">GADC</option>
                            <option value="ISCI">ISCI</option>
                            <option value="XSEED">XSEED</option>
                            <option value="LTL">LTL</option>
                            <option value="FTL">FTL</option>
                            <option value="Inter-Island">Inter-Island</option>
                            <option value="Air Freight">Air Freight</option>
                          </select>
                        </td>

                        {/* 10. Place / Destination */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.destination}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'destination', e.target.value)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 text-xs text-slate-800 min-w-[170px] shadow-2xs"
                          />
                        </td>

                        {/* 11. Consignee */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.consignee}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'consignee', e.target.value)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 text-xs font-medium text-slate-900 min-w-[160px] shadow-2xs"
                          />
                        </td>

                        {/* 12. Truck */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.truckProvider}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'truckProvider', e.target.value)}
                            placeholder="Truck / Provider"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 text-xs text-slate-700 w-28 shadow-2xs"
                          />
                        </td>

                        {/* 13. Plate Number */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.plateNumber}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'plateNumber', e.target.value)}
                            placeholder="Plate #"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono font-bold text-xs text-slate-800 w-24 shadow-2xs"
                          />
                        </td>

                        {/* 14. Truck Arrival Time */}
                        <td className="py-2 px-2 border-r border-slate-200 bg-slate-50/50 min-w-[105px]">
                          <MilitaryTimeInput
                            value={currentRecord.timeArrived || currentRecord.truckArrivalTime || ''}
                            onChange={(val) => {
                              handleFieldChange(currentRecord.id, 'timeArrived', val);
                              handleFieldChange(currentRecord.id, 'truckArrivalTime', val);
                            }}
                            placeholder="e.g. 0730"
                          />
                        </td>

                        {/* 15. Start Loading Time */}
                        <td className="py-2 px-2 border-r border-slate-200 bg-amber-50/30 min-w-[105px]">
                          <MilitaryTimeInput
                            value={currentRecord.startLoadingTime || currentRecord.loadingStartTime || ''}
                            onChange={(val) => {
                              handleFieldChange(currentRecord.id, 'startLoadingTime', val);
                              handleFieldChange(currentRecord.id, 'loadingStartTime', val);
                            }}
                            placeholder="e.g. 0800"
                          />
                        </td>

                        {/* 16. End Loading Time */}
                        <td className="py-2 px-2 border-r border-slate-200 bg-indigo-50/30 min-w-[105px]">
                          <MilitaryTimeInput
                            value={currentRecord.endLoadingTime || currentRecord.loadingEndTime || ''}
                            onChange={(val) => {
                              handleFieldChange(currentRecord.id, 'endLoadingTime', val);
                              handleFieldChange(currentRecord.id, 'loadingEndTime', val);
                            }}
                            placeholder="e.g. 0915"
                          />
                        </td>

                        {/* 17. Actual Departure Time */}
                        <td className="py-2 px-2 border-r border-slate-200 bg-blue-50/30 min-w-[105px]">
                          <MilitaryTimeInput
                            value={currentRecord.actualDepartureTime || currentRecord.departureTime || ''}
                            onChange={(val) => {
                              handleFieldChange(currentRecord.id, 'actualDepartureTime', val);
                              handleFieldChange(currentRecord.id, 'departureTime', val);
                            }}
                            placeholder="e.g. 0945"
                          />
                        </td>

                        {/* 18. Dispatch Date */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="date"
                            value={currentRecord.dispatchDate || currentRecord.departureTime?.split(' ')[0] || ''}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'dispatchDate', e.target.value)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-xs text-slate-800 w-32 shadow-2xs"
                          />
                        </td>

                        {/* 19. Manifest Number */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.manifestNumber}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'manifestNumber', e.target.value)}
                            placeholder="Manifest #"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-mono text-xs text-slate-800 w-28 shadow-2xs"
                          />
                        </td>

                        {/* 20. Status */}
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                          <select
                            value={currentRecord.status}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'status', e.target.value as DispatchStatus)}
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 font-semibold text-xs text-slate-800 shadow-2xs"
                          >
                            <option value="Planned">Planned</option>
                            <option value="In Loading">In Loading</option>
                            <option value="Departed">Departed</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Delayed">Delayed</option>
                          </select>
                        </td>

                        {/* 21. Remarks */}
                        <td className="py-2 px-2.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={currentRecord.remarks}
                            onChange={(e) => handleFieldChange(currentRecord.id, 'remarks', e.target.value)}
                            placeholder="Remarks"
                            className="bg-white border border-amber-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded px-2 py-1 text-xs text-slate-800 w-36 shadow-2xs"
                          />
                        </td>

                        {/* 22. Action */}
                        <td className="py-2 px-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectDispatch(currentRecord)}
                              className="min-h-[32px] text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded hover:bg-blue-50 cursor-pointer"
                              title="View Timeline Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Timeline</span>
                            </button>
                            {!permissions.isReadOnly && permissions.canDeleteRecords !== 'No' && onRequestDeleteDispatch && (
                              <button
                                type="button"
                                onClick={() => onRequestDeleteDispatch(currentRecord)}
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // VIEW MODE ROW RENDERING (Read-only, high scannability)
                  return (
                    <tr
                      key={record.id}
                      onClick={() => onSelectDispatch(record)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group whitespace-nowrap"
                    >
                      {/* 1. S.I / POD Number */}
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 group-hover:underline border-r border-slate-200">
                        {effectiveDispatchPod}
                      </td>

                      {/* 2. DR Number */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-800 border-r border-slate-200">
                        {effectiveDr}
                      </td>

                      {/* 3. Seal Number */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600 border-r border-slate-200">
                        {effectiveSeal}
                      </td>

                      {/* 4. Client */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200 truncate max-w-[170px]" title={effectiveClient}>
                        {effectiveClient}
                      </td>

                      {/* 5. Item Description */}
                      <td className="py-2.5 px-3 text-xs text-slate-700 border-r border-slate-200 max-w-[180px] truncate" title={effectiveItem}>
                        {effectiveItem}
                      </td>

                      {/* 6. Planned Delivery Date */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-950 border-r border-slate-200 bg-blue-50/30">
                        {record.plannedDeliveryDate || '—'}
                      </td>

                      {/* 7. Delivery Date */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 bg-blue-50/30">
                        {record.deliveryDate || '—'}
                      </td>

                      {/* 8. Quantity */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right">
                        {record.quantityCasesBoxes.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">{record.unit}</span>
                      </td>

                      {/* 9. Delivery Type */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                        {getDeliveryTypeBadge(record.deliveryType)}
                      </td>

                      {/* 10. Place */}
                      <td className="py-2.5 px-3 max-w-[180px] truncate border-r border-slate-200" title={record.destination}>
                        {record.destination}
                      </td>

                      {/* 11. Consignee */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[170px] truncate border-r border-slate-200" title={record.consignee}>
                        {record.consignee}
                      </td>

                      {/* 12. Truck */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900 max-w-[140px] truncate" title={effectiveTruck}>
                        {effectiveTruck}
                      </td>

                      {/* 13. Plate Number */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-xs text-slate-700">
                        <div className="flex items-center gap-1">
                          <span>{effectivePlate}</span>
                          {effectiveDriver !== '—' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title={`Driver: ${effectiveDriver}`}></span>
                          )}
                        </div>
                      </td>

                      {/* 14. Truck Arrival Time */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-800 border-r border-slate-200">
                        {formatTo12HourTime(record.timeArrived || record.truckArrivalTime)}
                      </td>

                      {/* 15. Start Loading Time */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-800 border-r border-slate-200">
                        {formatTo12HourTime(record.startLoadingTime || record.loadingStartTime)}
                      </td>

                      {/* 16. End Loading Time */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-800 border-r border-slate-200">
                        {formatTo12HourTime(record.endLoadingTime || record.loadingEndTime)}
                      </td>

                      {/* 17. Actual Departure Time */}
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-blue-900 border-r border-slate-200">
                        {formatTo12HourTime(record.actualDepartureTime || record.departureTime)}
                      </td>

                      {/* 18. Dispatch Date */}
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-700 border-r border-slate-200">
                        {effectiveDispatchDate}
                      </td>

                      {/* 19. Manifest Number */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800 border-r border-slate-200">
                        {record.manifestNumber || '—'}
                      </td>

                      {/* 20. Status */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                        {getStatusBadge(record.status)}
                      </td>

                      {/* 21. Remarks */}
                      <td className="py-2.5 px-3 max-w-[160px] truncate border-r border-slate-200 text-slate-500 text-[11px]" title={record.remarks}>
                        {record.remarks || '—'}
                      </td>

                      {/* 22. Action */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="min-h-[30px] inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 group-hover:text-blue-900 bg-blue-50/80 group-hover:bg-blue-100 px-2.5 py-1 rounded transition-colors">
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </span>
                          {!permissions.isReadOnly && permissions.canDailyDispatch !== 'Read-only' && onAssignDriver && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignDriver(record);
                              }}
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Assign Delivery Driver"
                              aria-label="Assign Delivery Driver"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!permissions.isReadOnly && permissions.canDeleteRecords !== 'No' && onRequestDeleteDispatch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteDispatch(record);
                              }}
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Move to Trash"
                              aria-label="Move to Trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Summary */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Total Active Dispatches Shown: <strong className="text-slate-800 font-mono">{filteredDispatches.length} Records</strong>
          </span>
          <span className="text-[11px] text-slate-400">
            OFII Fleet Terminal Control • Paranaque Hub Station #01
          </span>
        </div>
      </div>
    </div>
  );
};

