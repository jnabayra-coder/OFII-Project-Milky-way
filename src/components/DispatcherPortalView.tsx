import React, { useState, useMemo, useEffect } from 'react';
import { 
  TruckRun, 
  IndividualDelivery, 
  DispatchOperationalStatus,
  UserProfile,
  DeliveryDispatchData
} from '../types';
import { useData } from '../context/DataContext';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { OFII_HELPERS_ROSTER } from '../data/userAccounts';
import { parseAndConvertMilitaryTime } from '../utils/timeUtils';
import { 
  isDeliveryDispatched, 
  deriveDeliveryOperationalStatus 
} from '../utils/dispatchUtils';
export { isDeliveryDispatched } from '../utils/dispatchUtils';
import { DispatchEncodingModal } from './DispatchEncodingModal';
import { DispatchStatusBadge } from './DispatchStatusBadge';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Users, 
  Phone, 
  ArrowLeft, 
  Save, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Package, 
  Hash, 
  Boxes,
  ShieldCheck,
  Check,
  Eye
} from 'lucide-react';

interface DispatcherPortalViewProps {
  currentUserProfile: UserProfile | null;
}

/**
 * Derives the operational dispatch status based strictly on operational timestamps:
 * No Time Arrived          -> READY FOR DISPATCH
 * Time Arrived entered     -> ARRIVED
 * Start Loading entered    -> LOADING
 * End Loading entered      -> LOADING COMPLETED
 * Actual Departure entered -> DEPARTED
 */
export function deriveOperationalStatus(
  timeArrived?: string,
  startLoadingTime?: string,
  endLoadingTime?: string,
  actualDeparture?: string
): DispatchOperationalStatus {
  if (actualDeparture && actualDeparture.trim()) {
    return 'DEPARTED';
  }
  if (endLoadingTime && endLoadingTime.trim()) {
    return 'LOADING COMPLETED';
  }
  if (startLoadingTime && startLoadingTime.trim()) {
    return 'LOADING';
  }
  if (timeArrived && timeArrived.trim()) {
    return 'ARRIVED';
  }
  return 'READY FOR DISPATCH';
}

/**
 * Formats a clean, readable Place / Area banner from a Truck Run and its assigned deliveries.
 * e.g., "📍 ANTIPOLO / NEARBY", "📍 CAINTA / TAYTAY", "📍 DASMARIÑAS / NEARBY"
 */
export function formatPlaceAreaBanner(run: TruckRun, deliveries: IndividualDelivery[]): string {
  // If routeLocation was provided by Truck Planner and looks like a specific corridor
  if (run.routeLocation && run.routeLocation.trim() && run.routeLocation !== 'Standard Delivery Route' && run.routeLocation !== 'Standard Route') {
    return run.routeLocation.toUpperCase();
  }

  // Extract localities from assigned deliveries
  const localities = Array.from(
    new Set(
      deliveries
        .map((d) => {
          if (!d.destination) return '';
          const parts = d.destination.split(',');
          return parts[0].trim();
        })
        .filter(Boolean)
    )
  );

  if (localities.length === 1) {
    return `${localities[0].toUpperCase()} / NEARBY`;
  } else if (localities.length > 1) {
    return `${localities.slice(0, 2).map((l) => l.toUpperCase()).join(' / ')}${localities.length > 2 ? ' / REGIONAL' : ''}`;
  }

  // Fallback to delivery area
  if (run.deliveryArea) {
    return `${run.deliveryArea.toUpperCase()} CORRIDOR`;
  }

  return 'LOCAL DISPATCH';
}

export const DispatcherPortalView: React.FC<DispatcherPortalViewProps> = ({
  currentUserProfile,
}) => {
  const {
    truckRuns,
    individualDeliveries,
    updateTruckRun,
    createTruckRun,
    saveDeliveryDispatch,
  } = useData();

  // Selected Truck Run for detail/encoding view (null = card view)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Delivery currently selected for Dispatch Encoding modal
  const [encodingDelivery, setEncodingDelivery] = useState<IndividualDelivery | null>(null);

  // Main portal view mode: 'deliveries' table or 'runs' cards
  const [portalViewMode, setPortalViewMode] = useState<'deliveries' | 'runs'>('deliveries');

  // Search & Filter state for cards
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DispatchOperationalStatus>('ALL');
  // Visual grouping: Delivery Area / Place, Planned Date, or Flat Grid
  const [groupBy, setGroupBy] = useState<'area' | 'date' | 'none'>('area');

  // Form states for the opened dispatch
  const [formPodNumber, setFormPodNumber] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(0);
  const [formTruckName, setFormTruckName] = useState('');
  const [formPlateNumber, setFormPlateNumber] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [formHelper, setFormHelper] = useState('');
  const [formTruckerContact, setFormTruckerContact] = useState('');
  const [formTimeArrived, setFormTimeArrived] = useState('');
  const [formStartLoadingTime, setFormStartLoadingTime] = useState('');
  const [formEndLoadingTime, setFormEndLoadingTime] = useState('');
  const [formActualDeparture, setFormActualDeparture] = useState('');
  const [formTransportDispatcher, setFormTransportDispatcher] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Identify currently opened Truck Run
  const activeRun = useMemo(() => {
    if (!selectedRunId) return null;
    return truckRuns.find((r) => r.id === selectedRunId) || null;
  }, [selectedRunId, truckRuns]);

  // Deliveries in currently opened Truck Run
  const activeRunDeliveries = useMemo(() => {
    if (!activeRun) return [];
    return individualDeliveries.filter(
      (d) => d.truckRunId === activeRun.id || activeRun.deliveryIds.includes(d.id)
    );
  }, [activeRun, individualDeliveries]);

  // Sync form values when opening a Truck Run
  useEffect(() => {
    if (activeRun) {
      setFormPodNumber(activeRun.truckDispatchPod || '');
      setFormQuantity(activeRun.totalQuantity || 0);
      setFormTruckName(activeRun.truckName || activeRun.truckSource || '');
      setFormPlateNumber(activeRun.plateNumber || '');
      setFormDriver(activeRun.driver || '');
      setFormHelper(activeRun.helper || '');
      setFormTruckerContact(activeRun.truckerContact || activeRun.driverContact || '');
      setFormTimeArrived(activeRun.timeArrived || '');
      setFormStartLoadingTime(activeRun.startLoadingTime || '');
      setFormEndLoadingTime(activeRun.endLoadingTime || '');
      setFormActualDeparture(activeRun.actualDeparture || '');
      setFormTransportDispatcher(
        activeRun.transportDispatcher || currentUserProfile?.name || 'Eduardo G. Ramos'
      );
      setSaveSuccessMessage(null);
      setSaveErrorMessage(null);
    }
  }, [activeRun, currentUserProfile?.name]);

  // Helper to get formatted current time (e.g. "08:15 AM")
  const getCurrentFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Live operational status derived from the form fields
  const liveOperationalStatus = useMemo(() => {
    return deriveOperationalStatus(
      formTimeArrived,
      formStartLoadingTime,
      formEndLoadingTime,
      formActualDeparture
    );
  }, [formTimeArrived, formStartLoadingTime, formEndLoadingTime, formActualDeparture]);

  // Save handler for the Dispatch Encoding Form
  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRun) return;

    if (activeRunDeliveries.length === 0) {
      setSaveErrorMessage('Cannot save dispatch: This Truck Run has no assigned deliveries.');
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const operationalStatus = deriveOperationalStatus(
        formTimeArrived,
        formStartLoadingTime,
        formEndLoadingTime,
        formActualDeparture
      );

      // Save updates to TruckRun
      await updateTruckRun(activeRun.id, {
        truckDispatchPod: formPodNumber.trim() || activeRun.truckDispatchPod,
        totalQuantity: Number(formQuantity) || activeRun.totalQuantity,
        truckName: formTruckName.trim(),
        truckSource: formTruckName.trim() || activeRun.truckSource,
        plateNumber: formPlateNumber.trim(),
        driver: formDriver.trim(),
        helper: formHelper.trim(),
        truckerContact: formTruckerContact.trim(),
        driverContact: formTruckerContact.trim() || activeRun.driverContact,
        timeArrived: formTimeArrived.trim(),
        startLoadingTime: formStartLoadingTime.trim(),
        endLoadingTime: formEndLoadingTime.trim(),
        actualDeparture: formActualDeparture.trim(),
        transportDispatcher: formTransportDispatcher.trim() || currentUserProfile?.name || 'Eduardo G. Ramos',
        dispatchOperationalStatus: operationalStatus,
        status: operationalStatus === 'DEPARTED' ? 'Dispatched' : 'Ready for Dispatch',
      });

      setSaveSuccessMessage(`Dispatch successfully saved! Operational Status: ${operationalStatus}`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[handleSaveDispatch] Error:', err);
      setSaveErrorMessage(err?.message || 'Failed to save dispatch information.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to quickly seed sample dispatch run if user tests fresh
  const handleCreateSampleDispatch = async () => {
    const unassignedAntipolo = individualDeliveries.filter(
      (d) => !d.truckRunId && (d.destination?.toLowerCase().includes('antipolo') || d.id === 'DEL-GADC-114' || d.id === 'DEL-GADC-115')
    );
    const targetDels = unassignedAntipolo.length > 0 ? unassignedAntipolo : individualDeliveries.slice(0, 2);
    if (targetDels.length === 0) {
      alert('No available deliveries found to seed dispatch run.');
      return;
    }

    await createTruckRun({
      truckRunNumber: 'TR-00125',
      truckDispatchPod: 'TRK-2026-001',
      plannedDispatchDate: new Date().toISOString().split('T')[0],
      deliveryArea: 'Luzon',
      routeLocation: 'Antipolo / Nearby',
      truckSource: 'AB Braza Logistics',
      plateNumber: 'ABC-1234',
      driver: 'Juan Dela Cruz',
      driverContact: '+63 917 842 1190',
      helper: 'Pedro Santos',
      helperContact: '+63 915 221 4401',
      remarks: 'Morning store delivery run',
      deliveryIds: targetDels.map((d) => d.id),
      status: 'Ready for Dispatch',
    });
  };

  // Filtered truck runs for the card list
  const filteredRuns = useMemo(() => {
    return truckRuns.filter((run) => {
      const runDeliveries = individualDeliveries.filter(
        (d) => d.truckRunId === run.id || run.deliveryIds.includes(d.id)
      );
      const placeArea = formatPlaceAreaBanner(run, runDeliveries);
      const opStatus = run.dispatchOperationalStatus || deriveOperationalStatus(
        run.timeArrived,
        run.startLoadingTime,
        run.endLoadingTime,
        run.actualDeparture
      );

      // Status filter
      if (statusFilter !== 'ALL' && opStatus !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRun = (
          run.truckRunNumber.toLowerCase().includes(query) ||
          run.truckDispatchPod.toLowerCase().includes(query) ||
          (run.driver && run.driver.toLowerCase().includes(query)) ||
          (run.plateNumber && run.plateNumber.toLowerCase().includes(query)) ||
          placeArea.toLowerCase().includes(query) ||
          run.clients.some((c) => c.toLowerCase().includes(query))
        );
        const matchesDelivery = runDeliveries.some(
          (d) =>
            d.consignee.toLowerCase().includes(query) ||
            d.individualDeliveryPod.toLowerCase().includes(query) ||
            d.deliveryId.toLowerCase().includes(query)
        );
        return matchesRun || matchesDelivery;
      }

      return true;
    });
  }, [truckRuns, individualDeliveries, statusFilter, searchQuery]);

  // Filtered individual deliveries for the direct Individual Deliveries table view
  const filteredDeliveries = useMemo(() => {
    return individualDeliveries.filter((del) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          del.deliveryId.toLowerCase().includes(query) ||
          (del.batchName && del.batchName.toLowerCase().includes(query)) ||
          del.client.toLowerCase().includes(query) ||
          del.consignee.toLowerCase().includes(query) ||
          (del.destination && del.destination.toLowerCase().includes(query)) ||
          (del.area && del.area.toLowerCase().includes(query)) ||
          (del.individualDeliveryPod && del.individualDeliveryPod.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (statusFilter !== 'ALL') {
        const opStatus =
          del.dispatchOperationalStatus ||
          deriveDeliveryOperationalStatus(
            del.timeArrived,
            del.startLoadingTime,
            del.endLoadingTime,
            del.actualDeparture
          );
        if (opStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [individualDeliveries, searchQuery, statusFilter]);

  // Visual grouping of runs: Place/Area, Planned Date, or Flat
  const groupedRuns = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'ALL', label: 'All Dispatches', runs: filteredRuns }];
    }

    if (groupBy === 'date') {
      const map = new Map<string, TruckRun[]>();
      filteredRuns.forEach((run) => {
        const dateKey = run.plannedDispatchDate || 'Unscheduled';
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(run);
      });
      return Array.from(map.entries()).map(([dateKey, runs]) => ({
        key: dateKey,
        label: dateKey === 'Unscheduled' ? 'UNSCHEDULED DISPATCHES' : `DISPATCH DATE: ${dateKey}`,
        runs,
      }));
    }

    // Default: Group by Area / Locality
    const map = new Map<string, TruckRun[]>();
    filteredRuns.forEach((run) => {
      const runDels = individualDeliveries.filter(
        (d) => d.truckRunId === run.id || run.deliveryIds.includes(d.id)
      );
      const banner = formatPlaceAreaBanner(run, runDels);
      let areaKey = banner.replace(' / NEARBY', '').replace(' / REGIONAL', '').replace(' CORRIDOR', '').trim();
      if (!areaKey.toUpperCase().includes('AREA')) {
        areaKey = `${areaKey.toUpperCase()} AREA`;
      } else {
        areaKey = areaKey.toUpperCase();
      }
      if (!map.has(areaKey)) map.set(areaKey, []);
      map.get(areaKey)!.push(run);
    });

    return Array.from(map.entries()).map(([areaKey, runs]) => ({
      key: areaKey,
      label: areaKey,
      runs,
    }));
  }, [filteredRuns, groupBy, individualDeliveries]);

  // Operational status badge styling helper
  const renderStatusBadge = (status: DispatchOperationalStatus) => {
    switch (status) {
      case 'READY FOR DISPATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Ready for Dispatch
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Arrived
          </span>
        );
      case 'LOADING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Loading
          </span>
        );
      case 'LOADING COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Loading Completed
          </span>
        );
      case 'DEPARTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white border border-emerald-700">
            <Check className="w-3.5 h-3.5" />
            Departed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  // Helper to render an operational time input with live conversion & + Now button
  const renderOperationalTimeField = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    triggerStatus: string,
    triggerColorClass: string,
    placeholder: string
  ) => {
    const parsed = parseAndConvertMilitaryTime(value);
    return (
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800">
            {label}
          </label>
          <button
            type="button"
            onClick={() => onChange(getCurrentFormattedTime())}
            className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 rounded cursor-pointer transition-colors"
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
            if (value.trim() && parsed.isValid && parsed.combinedDisplay && parsed.combinedDisplay !== '—') {
              if (!value.includes(':') && parsed.military24 && parsed.military24 !== '—') {
                onChange(parsed.combinedDisplay);
              }
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="mt-1.5 flex items-center justify-between text-[10px]">
          <div>
            {value.trim() ? (
              parsed.isValid && parsed.time12 !== '—' ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {parsed.combinedDisplay || parsed.time12}
                </span>
              ) : (
                <span className="text-slate-500 font-mono">{value}</span>
              )
            ) : (
              <span className="text-slate-400">Not recorded</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Triggers: <strong className={triggerColorClass}>{triggerStatus}</strong>
          </p>
        </div>
      </div>
    );
  };

  // Render a single Dispatch Card (representing an actual Truck Run record)
  const renderDispatchCard = (run: TruckRun) => {
    const runDeliveries = individualDeliveries.filter(
      (d) => d.truckRunId === run.id || run.deliveryIds.includes(d.id)
    );
    const placeBanner = formatPlaceAreaBanner(run, runDeliveries);
    const opStatus = run.dispatchOperationalStatus || deriveOperationalStatus(
      run.timeArrived,
      run.startLoadingTime,
      run.endLoadingTime,
      run.actualDeparture
    );

    return (
      <div
        key={run.id}
        className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
      >
        {/* Card Header: DISPATCH Number & Place Banner */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 font-mono">
                DISPATCH {run.truckRunNumber}
              </h3>
              <p className="text-xs font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                {placeBanner}
              </p>
            </div>
            {renderStatusBadge(opStatus)}
          </div>
        </div>

        {/* Card Body: Deliveries, Assignments, and Metrics */}
        <div className="p-4 space-y-2.5 flex-1 text-xs">
          {/* Deliveries & Planned Date */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              {runDeliveries.length} Individual Deliveries
            </span>
            <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Planned: {run.plannedDispatchDate || 'Not yet scheduled'}
            </span>
          </div>

          {/* Master Truck / Dispatch POD if assigned */}
          {run.truckDispatchPod && (
            <div className="flex items-center justify-between bg-indigo-50/70 px-2.5 py-1 rounded border border-indigo-100 text-[11px]">
              <span className="font-semibold text-indigo-800">Truck / Dispatch POD:</span>
              <span className="font-mono font-bold text-indigo-900">{run.truckDispatchPod}</span>
            </div>
          )}

          {/* Vehicle & Plate */}
          <div className="flex items-center justify-between text-slate-600 pt-0.5">
            <span className="text-slate-500">Truck:</span>
            <span className="font-medium text-slate-800 truncate max-w-[160px]" title={run.truckName || run.truckSource}>
              {run.truckName || run.truckSource || <span className="text-slate-400 italic">Not yet assigned</span>}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-500">Plate:</span>
            <span className="font-mono font-bold text-slate-900">
              {run.plateNumber ? (
                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{run.plateNumber}</span>
              ) : (
                <span className="text-slate-400 font-sans italic font-normal">Not yet assigned</span>
              )}
            </span>
          </div>

          {/* Driver & Helper */}
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-500">Driver:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[160px]" title={run.driver}>
              {run.driver || <span className="text-slate-400 italic font-normal">Not yet assigned</span>}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="text-slate-500">Helper:</span>
            <span className="text-slate-700 truncate max-w-[160px]" title={run.helper}>
              {run.helper || <span className="text-slate-400 italic font-normal">Not yet assigned</span>}
            </span>
          </div>

          {/* Status Display */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
            <span className="font-bold">{renderStatusBadge(opStatus)}</span>
          </div>
        </div>

        {/* Card Action: Open Dispatch */}
        <div className="p-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedRunId(run.id)}
            className="w-full py-2.5 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <span>OPEN DISPATCH</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </div>
    );
  };

  // Safe Guard: Selected Run not found in state
  if (selectedRunId && !activeRun) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-10 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Truck Run Not Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested dispatch record could not be loaded or may have been updated.
        </p>
        <button
          type="button"
          onClick={() => setSelectedRunId(null)}
          className="px-4 py-2 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
        >
          Return to Dispatch Cards
        </button>
      </div>
    );
  }

  // ===========================================================================
  // VIEW 2: DETAILED DISPATCH VIEW & ENCODING FORM
  // ===========================================================================
  if (activeRun) {
    const placeBanner = formatPlaceAreaBanner(activeRun, activeRunDeliveries);

    return (
      <div className="space-y-6 pb-16">
        {/* Navigation & Header Banner */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedRunId(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dispatch Cards</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    DISPATCH {activeRun.truckRunNumber}
                  </span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    {placeBanner}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mt-1">
                  DISPATCH {activeRun.truckRunNumber}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Planned Dispatch Date</p>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {activeRun.plannedDispatchDate || 'Today'}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Operational Status</p>
                {renderStatusBadge(liveOperationalStatus)}
              </div>
            </div>
          </div>

          {/* Context Details Grid */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">TRUCK RUN / DISPATCH NUMBER</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {activeRun.truckRunNumber}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Assigned by Truck Planner</p>
            </div>
            <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">TRUCK / DISPATCH POD</span>
              <span className="font-mono font-extrabold text-indigo-900 text-sm">
                {activeRun.truckDispatchPod || 'Not yet assigned'}
              </span>
              <p className="text-[10px] text-indigo-600 mt-0.5">Master Dispatch POD</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">PLACE / DELIVERY AREA</span>
              <span className="font-bold text-slate-900 text-sm truncate block">
                {placeBanner}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeRun.deliveryArea || 'Standard Corridor'}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">PLANNED DISPATCH DATE</span>
              <span className="font-bold text-slate-900 text-sm">
                {activeRun.plannedDispatchDate || 'Today'}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeRunDeliveries.length} Consignments • {activeRun.totalQuantity} Cases</p>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {saveSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
        )}
        {saveErrorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{saveErrorMessage}</span>
          </div>
        )}

        {/* SECTION 1: DELIVERIES INCLUDED IN THIS DISPATCH */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                DELIVERIES INCLUDED IN THIS DISPATCH
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every Individual Delivery belonging to this Truck Run. Individual Delivery POD and Truck / Dispatch POD are DIFFERENT. Never merge them.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                {activeRunDeliveries.length} Deliveries
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-bold text-blue-800">
                {activeRunDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0)} Total Cases
              </span>
            </div>
          </div>

          {/* Master Truck POD Indicator */}
          {activeRun.truckDispatchPod && (
            <div className="bg-indigo-50/60 border-b border-indigo-100 px-5 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-900">Truck / Dispatch POD:</span>
                <span className="font-mono font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {activeRun.truckDispatchPod}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Master Truck POD does not replace individual delivery PODs below
              </span>
            </div>
          )}

          {activeRunDeliveries.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Individual Deliveries Assigned</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                This Truck Run currently contains no individual deliveries. Deliveries must be added in the Truck Planner Portal before dispatching.
              </p>
            </div>
          ) : (
            <div className="w-full min-w-0">
              <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Run Deliveries</span>
                <span className="text-cyan-700 font-medium">Swipe to view all columns →</span>
              </div>
              <div className="overflow-x-auto w-full min-w-0">
                <table className="w-full text-left text-xs text-slate-700 min-w-[950px]">
                <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">#</th>
                    <th className="py-2.5 px-3.5">Delivery ID</th>
                    <th className="py-2.5 px-3.5 text-center">Dispatch Status</th>
                    <th className="py-2.5 px-3.5">Delivery Name / Batch</th>
                    <th className="py-2.5 px-3.5">Client</th>
                    <th className="py-2.5 px-3.5">Consignee</th>
                    <th className="py-2.5 px-3.5">Place</th>
                    <th className="py-2.5 px-3.5 text-right">Quantity</th>
                    <th className="py-2.5 px-3.5 text-center">Individual Delivery POD / POD Delivery Number</th>
                    <th className="py-2.5 px-3.5 text-center sticky right-0 bg-slate-100/95 z-10 font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRunDeliveries.map((del, idx) => {
                    const dispatched = isDeliveryDispatched(del);
                    const currentStatus =
                      del.dispatchOperationalStatus ||
                      deriveDeliveryOperationalStatus(
                        del.timeArrived,
                        del.startLoadingTime,
                        del.endLoadingTime,
                        del.actualDeparture
                      );
                    return (
                      <tr key={del.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-3.5 font-medium text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-800 font-bold whitespace-nowrap">
                          {del.deliveryId}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <DispatchStatusBadge status={currentStatus} />
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-medium">
                          {del.batchName || 'General Delivery'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-slate-900 block truncate max-w-[170px]" title={del.client}>
                            {del.client}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-medium text-slate-800 block truncate max-w-[200px]" title={del.consignee}>
                            {del.consignee}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {del.destination || del.area || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                          {del.quantity} <span className="text-[10px] font-normal text-slate-500">{del.unit || 'cases'}</span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold" title="Individual Consignment POD">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {del.individualDeliveryPod ? `#${del.individualDeliveryPod}` : 'Not Assigned'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200 whitespace-nowrap">
                          <button
                            type="button"
                            id={`dispatch-btn-${del.deliveryId || del.id}`}
                            onClick={() => setEncodingDelivery(del)}
                            className={
                              dispatched
                                ? "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                                : "inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                            }
                          >
                            {dispatched ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>VIEW / EDIT DISPATCH</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3.5 h-3.5" />
                                <span>DISPATCH</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

        {/* SECTION 2: DISPATCH OPERATIONS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4.5 h-4.5 text-blue-400" />
                DISPATCH OPERATIONS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Record vehicle bay arrival, loading intervals, driver credentials, and gate departure.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Derived Status:</span>
              {renderStatusBadge(liveOperationalStatus)}
            </div>
          </div>

          <form onSubmit={handleSaveDispatch} className="p-5 space-y-6">
            {/* Group 1: Manifest & Cargo */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Package className="w-4 h-4 text-slate-500" />
                1. Manifest & Cargo Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    POD Delivery Number <span className="text-indigo-600 font-normal">(Truck / Dispatch POD)</span>
                  </label>
                  <input
                    type="text"
                    value={formPodNumber}
                    onChange={(e) => setFormPodNumber(e.target.value)}
                    placeholder="e.g. TRK-2026-001"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Master Dispatch POD Number for the Truck Run</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantity <span className="text-slate-500 font-normal">(Total Cases/Boxes)</span>
                  </label>
                  <input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    min="0"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Total consolidated cargo pieces loaded</p>
                </div>
              </div>
            </div>

            {/* Group 2: Vehicle & Crew */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Truck className="w-4 h-4 text-slate-500" />
                2. Vehicle & Crew
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Truck Name
                  </label>
                  <input
                    type="text"
                    value={formTruckName}
                    onChange={(e) => setFormTruckName(e.target.value)}
                    placeholder="e.g. AB Braza"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Vehicle model / trucker</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={formPlateNumber}
                    onChange={(e) => setFormPlateNumber(e.target.value)}
                    placeholder="e.g. ABC-1234"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">License plate registration</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="dispatcher-driver-roster"
                      value={formDriver}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormDriver(val);
                        const match = OFII_DRIVERS_ROSTER.find((d) => d.name.toLowerCase() === val.toLowerCase());
                        if (match) {
                          if (match.defaultPlate) setFormPlateNumber(match.defaultPlate);
                          if (match.contactNumber) setFormTruckerContact(match.contactNumber);
                          if (match.vehicleType) setFormTruckName(match.vehicleType);
                        }
                      }}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <datalist id="dispatcher-driver-roster">
                      {OFII_DRIVERS_ROSTER.map((drv) => (
                        <option key={drv.id} value={drv.name}>
                          {drv.vehicleType} ({drv.defaultPlate})
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Primary vehicle driver</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Helper
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="dispatcher-helper-roster"
                      value={formHelper}
                      onChange={(e) => setFormHelper(e.target.value)}
                      placeholder="e.g. Pedro Santos"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <datalist id="dispatcher-helper-roster">
                      {OFII_HELPERS_ROSTER.map((hlp) => (
                        <option key={hlp.id} value={hlp.name} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Dispatch cargo helper</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trucker&apos;s Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formTruckerContact}
                      onChange={(e) => setFormTruckerContact(e.target.value)}
                      placeholder="e.g. +63 917 842 1190"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Mobile contact in transit</p>
                </div>
              </div>
            </div>

            {/* Group 3: Core Operational Dispatch Timestamps */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  3. Operational Timestamps (Gate & Bay)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Accepts military (e.g. 1430) or 12H time (e.g. 2:30 PM)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderOperationalTimeField(
                  'Time Arrived',
                  formTimeArrived,
                  setFormTimeArrived,
                  'ARRIVED',
                  'text-amber-700',
                  'e.g. 07:30 AM or 0730'
                )}

                {renderOperationalTimeField(
                  'Start Loading Time',
                  formStartLoadingTime,
                  setFormStartLoadingTime,
                  'LOADING',
                  'text-indigo-700',
                  'e.g. 08:00 AM or 0800'
                )}

                {renderOperationalTimeField(
                  'End Loading Time',
                  formEndLoadingTime,
                  setFormEndLoadingTime,
                  'LOADING COMPLETED',
                  'text-teal-700',
                  'e.g. 09:15 AM or 0915'
                )}

                {renderOperationalTimeField(
                  'Actual Departure',
                  formActualDeparture,
                  setFormActualDeparture,
                  'DEPARTED',
                  'text-emerald-700',
                  'e.g. 09:30 AM or 0930'
                )}
              </div>
            </div>

            {/* Group 4: Transport Dispatcher & Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="max-w-md">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Transport Dispatcher
                </label>
                <input
                  type="text"
                  value={formTransportDispatcher}
                  onChange={(e) => setFormTransportDispatcher(e.target.value)}
                  placeholder="e.g. Eduardo G. Ramos"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Operational dispatcher responsible for validating and gate-releasing this dispatch
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedRunId(null)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || activeRunDeliveries.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-sm cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Dispatch...' : 'SAVE DISPATCH'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Modal for Per-Delivery Quick Dispatch Encoding */}
        <DispatchEncodingModal
          isOpen={!!encodingDelivery}
          delivery={encodingDelivery}
          truckRun={
            encodingDelivery
              ? truckRuns.find((r) => r.id === encodingDelivery.truckRunId) || activeRun
              : activeRun
          }
          onClose={() => setEncodingDelivery(null)}
          onSave={async (deliveryId, data) => {
            await saveDeliveryDispatch(deliveryId, data);
          }}
          currentUserDispatcherName={currentUserProfile?.name || 'Eduardo G. Ramos'}
        />
      </div>
    );
  }

  // ===========================================================================
  // VIEW 1: DISPATCHER PORTAL — CARD-BASED VIEW
  // ===========================================================================
  return (
    <div className="space-y-6 pb-16">
      {/* Suggested Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                OFII Monitoring System
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">
                <Truck className="w-3 h-3 text-indigo-600" />
                Dispatcher Portal
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {currentUserProfile?.name || 'Eduardo G. Ramos'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              Dispatcher Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Process actual Truck Run and dispatch records created by the Truck Planner. Encode operational bay arrivals, cargo loading milestones, and gate departures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {truckRuns.length === 0 && (
              <button
                type="button"
                onClick={handleCreateSampleDispatch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Seed Sample Dispatch Run</span>
              </button>
            )}
          </div>
        </div>

        {/* Operational Filter & Visual Organization Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by area, run #, driver, plate..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                Status:
              </span>
              {(['ALL', 'READY FOR DISPATCH', 'ARRIVED', 'LOADING', 'LOADING COMPLETED', 'DEPARTED'] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status}
                  </button>
                )
              )}
            </div>

            {/* Visual Organization Switcher */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden xl:inline">
                Organize:
              </span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setGroupBy('area')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    groupBy === 'area'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Group dispatches by primary delivery area"
                >
                  Area / Place
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('date')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    groupBy === 'date'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Group dispatches by planned date"
                >
                  Planned Date
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('none')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    groupBy === 'none'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show all dispatch cards in a flat grid"
                >
                  Flat Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary View Switcher: Individual Deliveries Table vs. Truck Run Dispatch Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="view-mode-deliveries-btn"
            onClick={() => setPortalViewMode('deliveries')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              portalViewMode === 'deliveries'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>INDIVIDUAL DELIVERIES TABLE</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                portalViewMode === 'deliveries'
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {filteredDeliveries.length}
            </span>
          </button>

          <button
            type="button"
            id="view-mode-runs-btn"
            onClick={() => setPortalViewMode('runs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              portalViewMode === 'runs'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>TRUCK RUN DISPATCH CARDS</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                portalViewMode === 'runs'
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {filteredRuns.length}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 italic hidden md:block">
          {portalViewMode === 'deliveries'
            ? 'Individual Delivery POD & Dispatch ACTION buttons visible per row'
            : 'Operational dispatch cards by consolidated Truck Run'}
        </p>
      </div>

      {portalViewMode === 'deliveries' ? (
        /* INDIVIDUAL DELIVERIES TABLE VIEW WITH DIRECT DISPATCH ACTION IN EVERY ROW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                INDIVIDUAL DELIVERIES & DISPATCH ACTION
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct per-delivery dispatch encoding. Individual Delivery POD and Truck / Dispatch POD are strictly separate.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-md">
              Showing {filteredDeliveries.length} Deliveries
            </span>
          </div>

          <div className="w-full min-w-0">
            <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Direct Deliveries List</span>
              <span className="text-cyan-700 font-medium">Swipe to view all columns →</span>
            </div>
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left text-xs text-slate-700 min-w-[950px]">
              <thead className="bg-slate-100/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">#</th>
                  <th className="py-2.5 px-3.5">Delivery ID</th>
                  <th className="py-2.5 px-3.5 text-center">Dispatch Status</th>
                  <th className="py-2.5 px-3.5">Delivery Name / Batch</th>
                  <th className="py-2.5 px-3.5">Client</th>
                  <th className="py-2.5 px-3.5">Consignee</th>
                  <th className="py-2.5 px-3.5">Place</th>
                  <th className="py-2.5 px-3.5 text-right">Quantity</th>
                  <th className="py-2.5 px-3.5 text-center">Individual Delivery POD / POD Delivery Number</th>
                  <th className="py-2.5 px-3.5 text-center sticky right-0 bg-slate-100/95 z-10 font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 px-4 text-center text-slate-500">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 text-sm">No Deliveries Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try changing or clearing your search / filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del, idx) => {
                    const dispatched = isDeliveryDispatched(del);
                    const currentStatus =
                      del.dispatchOperationalStatus ||
                      deriveDeliveryOperationalStatus(
                        del.timeArrived,
                        del.startLoadingTime,
                        del.endLoadingTime,
                        del.actualDeparture
                      );
                    return (
                      <tr key={del.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-3.5 font-medium text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-800 font-bold whitespace-nowrap">
                          {del.deliveryId}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <DispatchStatusBadge status={currentStatus} />
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-medium">
                          {del.batchName || 'General Delivery'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-slate-900 block truncate max-w-[170px]" title={del.client}>
                            {del.client}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-medium text-slate-800 block truncate max-w-[200px]" title={del.consignee}>
                            {del.consignee}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {del.destination || del.area || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                          {del.quantity} <span className="text-[10px] font-normal text-slate-500">{del.unit || 'cases'}</span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold" title="Individual Consignment POD">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {del.individualDeliveryPod ? `#${del.individualDeliveryPod}` : 'Not Assigned'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200 whitespace-nowrap">
                          <button
                            type="button"
                            id={`dispatch-btn-${del.deliveryId || del.id}`}
                            onClick={() => setEncodingDelivery(del)}
                            className={
                              dispatched
                                ? "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                                : "inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                            }
                          >
                            {dispatched ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>VIEW / EDIT DISPATCH</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3.5 h-3.5" />
                                <span>DISPATCH</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        /* TRUCK RUN DISPATCH CARDS VIEW */
        <>
          {/* Main Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                DISPATCHES READY FOR PROCESSING
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displaying actual Truck Runs prepared by Truck Planner. Click any card to open the dispatch detail and encode operational timestamps.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredRuns.length} {filteredRuns.length === 1 ? 'Dispatch Run' : 'Dispatch Runs'} Available
            </span>
          </div>

          {/* DISPATCH CARDS DISPLAY */}
          {filteredRuns.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {truckRuns.length === 0
                  ? 'No Dispatches Prepared for Today'
                  : 'No Dispatches Match Selected Filters'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
                {truckRuns.length === 0
                  ? 'Truck Runs planned and consolidated by the Truck Planner will automatically appear here as Dispatch Cards for bay arrival and gate departure encoding.'
                  : 'Try clearing your search query or selecting "All" above to view active dispatch runs.'}
              </p>
              {truckRuns.length === 0 && (
                <button
                  type="button"
                  onClick={handleCreateSampleDispatch}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <Boxes className="w-4 h-4" />
                  <span>Create Sample Antipolo Dispatch Run</span>
                </button>
              )}
            </div>
          ) : groupBy === 'none' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRuns.map(renderDispatchCard)}
            </div>
          ) : (
            <div className="space-y-8">
              {groupedRuns.map((group) => (
                <div key={group.key} className="space-y-3.5">
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      {group.label}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {group.runs.length} {group.runs.length === 1 ? 'Dispatch' : 'Dispatches'} • {group.runs.reduce((s, r) => s + (r.deliveryIds?.length || 0), 0)} Deliveries
                    </span>
                  </div>

                  {/* Cards Grid for this Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.runs.map(renderDispatchCard)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal for Per-Delivery Quick Dispatch Encoding on Main Portal */}
      <DispatchEncodingModal
        isOpen={!!encodingDelivery}
        delivery={encodingDelivery}
        truckRun={
          encodingDelivery
            ? truckRuns.find((r) => r.id === encodingDelivery.truckRunId) || null
            : null
        }
        onClose={() => setEncodingDelivery(null)}
        onSave={async (deliveryId, data) => {
          await saveDeliveryDispatch(deliveryId, data);
        }}
        currentUserDispatcherName={currentUserProfile?.name || 'Eduardo G. Ramos'}
      />
    </div>
  );
};
