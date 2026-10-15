import React, { useState, useMemo, useEffect } from 'react';
import { 
  Boxes, 
  Truck, 
  MapPin, 
  Calendar, 
  CheckSquare, 
  Square, 
  Filter, 
  Search, 
  Plus, 
  ArrowRight, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  FileText, 
  Trash2, 
  CornerDownRight, 
  ShieldCheck, 
  Sparkles, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { IndividualDelivery, TruckRun, TruckRunStatus } from '../types';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { OFII_HELPERS_ROSTER } from '../data/userAccounts';
import { normalizeUserRole } from '../utils/roleUtils';

type PlannerViewTab = 'available' | 'runs' | 'corridors';

interface TruckPlannerViewProps {
  initialBatchFilter?: string;
  onClearInitialBatchFilter?: () => void;
}

export const TruckPlannerView: React.FC<TruckPlannerViewProps> = ({
  initialBatchFilter,
  onClearInitialBatchFilter,
}) => {
  const { 
    individualDeliveries, 
    truckRuns, 
    deliveryBatches,
    createTruckRun, 
    updateTruckRunStatus, 
    removeDeliveryFromTruckRun,
    addDeliveriesToTruckRun,
    cancelTruckRun,
    deleteTruckRun,
    currentUserProfile 
  } = useData();

  // Primary active tab inside Truck Planner
  const [activeTab, setActiveTab] = useState<PlannerViewTab>('available');

  // Multi-select state for available deliveries
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);

  // Search & Filter state for Available Deliveries
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');

  // Synchronize initial batch filter when routed from Notification [ View Deliveries ]
  useEffect(() => {
    if (initialBatchFilter) {
      setBatchFilter(initialBatchFilter);
      setActiveTab('available');
      setCurrentPage(1);
    }
  }, [initialBatchFilter]);

  // Pagination for Available Deliveries
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter for Existing Truck Runs
  const [runStatusFilter, setRunStatusFilter] = useState<string>('ALL');
  const [runSearchQuery, setRunSearchQuery] = useState('');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Modal State for Create Truck Run
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTruckRunNumber, setFormTruckRunNumber] = useState('');
  const [formTruckDispatchPod, setFormTruckDispatchPod] = useState('');
  const [formPlannedDate, setFormPlannedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [formArea, setFormArea] = useState('Luzon');
  const [formRouteLocation, setFormRouteLocation] = useState('');
  const [formTruckSource, setFormTruckSource] = useState('OFII Dedicated Fleet');
  const [formPlateNumber, setFormPlateNumber] = useState('NCV-8921');
  const [formDriver, setFormDriver] = useState('Danilo P. Hernandez');
  const [formHelper, setFormHelper] = useState('Ramil Cruz');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State for Adding Deliveries to an Existing Truck Run
  const [addingToRunId, setAddingToRunId] = useState<string | null>(null);
  const [addDeliveriesSelectedIds, setAddDeliveriesSelectedIds] = useState<string[]>([]);

  // Phase 3A.1: Temporary delivery additions inside suggested groups (additive)
  const [customGroupAdditions, setCustomGroupAdditions] = useState<Record<string, string[]>>({});
  const [addingToClusterId, setAddingToClusterId] = useState<string | null>(null);
  const [selectedAdditionsForCluster, setSelectedAdditionsForCluster] = useState<string[]>([]);
  const [clusterAddSearch, setClusterAddSearch] = useState('');

  // ---------------------------------------------------------------------------
  // 1. DATA COMPUTATIONS: UNASSIGNED DELIVERIES
  // ---------------------------------------------------------------------------
  // Available deliveries: must NOT be assigned to a Truck Run
  const availableDeliveries = useMemo(() => {
    return individualDeliveries.filter((d) => !d.truckRunId);
  }, [individualDeliveries]);

  // Unique lists for filter dropdowns
  const availableBatches = useMemo(() => {
    const fromDeliveries = availableDeliveries.map((d) => d.batchName).filter(Boolean);
    const fromBatches = deliveryBatches.map((b) => b.name).filter(Boolean);
    const list = Array.from(new Set([...fromDeliveries, ...fromBatches]));
    return list.sort();
  }, [availableDeliveries, deliveryBatches]);

  const availableAreas = useMemo(() => {
    const list = Array.from(new Set(availableDeliveries.map((d) => d.area).filter(Boolean)));
    return list.sort();
  }, [availableDeliveries]);

  const availableLocations = useMemo(() => {
    const list = Array.from(
      new Set(
        availableDeliveries
          .map((d) => {
            if (!d.destination) return '';
            // Extract primary city/municipality (e.g. "Antipolo" from "Antipolo, Rizal")
            const parts = d.destination.split(',');
            return parts[0].trim();
          })
          .filter(Boolean)
      )
    );
    return list.sort();
  }, [availableDeliveries]);

  const availableClients = useMemo(() => {
    const list = Array.from(new Set(availableDeliveries.map((d) => d.client).filter(Boolean)));
    return list.sort();
  }, [availableDeliveries]);

  // Filtered available deliveries
  const filteredDeliveries = useMemo(() => {
    return availableDeliveries.filter((del) => {
      // Search query (consignee, POD, destination, deliveryId, referenceNumber)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          (del.consignee && del.consignee.toLowerCase().includes(q)) ||
          (del.individualDeliveryPod && String(del.individualDeliveryPod).toLowerCase().includes(q)) ||
          (del.deliveryId && del.deliveryId.toLowerCase().includes(q)) ||
          (del.destination && del.destination.toLowerCase().includes(q)) ||
          (del.destinationCode && del.destinationCode.toLowerCase().includes(q)) ||
          (del.batchName && del.batchName.toLowerCase().includes(q)) ||
          (del.client && del.client.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Batch filter
      if (batchFilter !== 'ALL' && del.batchName !== batchFilter) {
        return false;
      }

      // Area filter
      if (areaFilter !== 'ALL' && del.area !== areaFilter) {
        return false;
      }

      // Location / City filter
      if (locationFilter !== 'ALL') {
        const dest = (del.destination || '').toLowerCase();
        if (!dest.includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      // Client filter
      if (clientFilter !== 'ALL' && del.client !== clientFilter) {
        return false;
      }

      return true;
    });
  }, [availableDeliveries, searchQuery, batchFilter, areaFilter, locationFilter, clientFilter]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / pageSize));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, currentPage, pageSize]);

  // Selected items calculation
  const selectedDeliveries = useMemo(() => {
    return availableDeliveries.filter((d) => selectedDeliveryIds.includes(d.id));
  }, [availableDeliveries, selectedDeliveryIds]);

  const selectedTotalQty = useMemo(() => {
    return selectedDeliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  }, [selectedDeliveries]);

  // Distinct locations represented in selection
  const selectedLocationsSummary = useMemo(() => {
    const locMap = new Map<string, number>();
    selectedDeliveries.forEach((d) => {
      const city = d.destination ? d.destination.split(',')[0].trim() : 'Unspecified';
      locMap.set(city, (locMap.get(city) || 0) + 1);
    });
    return Array.from(locMap.entries()).map(([city, count]) => `${city} (${count})`);
  }, [selectedDeliveries]);

  // ---------------------------------------------------------------------------
  // 2. LOCATION-BASED GROUPING CLUSTERS ASSISTANT
  // ---------------------------------------------------------------------------
  interface LocationCorridorCluster {
    id: string;
    title: string;
    description: string;
    corridorName: string;
    deliveryIds: string[];
    stores: string[];
    totalQuantity: number;
    recommendedTruckPod: string;
  }

  const corridorClusters = useMemo((): LocationCorridorCluster[] => {
    const clusters: LocationCorridorCluster[] = [];

    // Check for Antipolo + Cainta corridor (Rizal East)
    const rizalEastDeliveries = availableDeliveries.filter((d) => {
      const dest = (d.destination || '').toLowerCase();
      const code = (d.destinationCode || '').toLowerCase();
      return dest.includes('antipolo') || dest.includes('cainta') || code.startsWith('ant') || code.startsWith('cai');
    });

    if (rizalEastDeliveries.length > 0) {
      const antipoloCount = rizalEastDeliveries.filter((d) => (d.destination || '').toLowerCase().includes('antipolo')).length;
      const caintaCount = rizalEastDeliveries.filter((d) => (d.destination || '').toLowerCase().includes('cainta')).length;

      clusters.push({
        id: 'corridor-rizal-east',
        title: 'Antipolo - Cainta Corridor (Rizal East)',
        description: `Nearby delivery route bundling Antipolo (${antipoloCount}) and Cainta (${caintaCount}) into one efficient truck run.`,
        corridorName: 'Antipolo - Cainta Corridor',
        deliveryIds: rizalEastDeliveries.map((d) => d.id),
        stores: rizalEastDeliveries.map((d) => `${d.consignee} (POD: ${d.individualDeliveryPod})`),
        totalQuantity: rizalEastDeliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
        recommendedTruckPod: `TRK-${String(truckRuns.length + 1).padStart(3, '0')}`,
      });
    }

    // Check for Antipolo only
    const antipoloOnly = availableDeliveries.filter((d) => (d.destination || '').toLowerCase().includes('antipolo'));
    if (antipoloOnly.length > 0 && antipoloOnly.length !== rizalEastDeliveries.length) {
      clusters.push({
        id: 'cluster-antipolo',
        title: 'Antipolo Local Cluster',
        description: `Dedicated route covering ${antipoloOnly.length} delivery stores within Antipolo City.`,
        corridorName: 'Antipolo City Route',
        deliveryIds: antipoloOnly.map((d) => d.id),
        stores: antipoloOnly.map((d) => `${d.consignee} (POD: ${d.individualDeliveryPod})`),
        totalQuantity: antipoloOnly.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
        recommendedTruckPod: `TRK-${String(truckRuns.length + 1).padStart(3, '0')}`,
      });
    }

    // Check for Cainta only
    const caintaOnly = availableDeliveries.filter((d) => (d.destination || '').toLowerCase().includes('cainta'));
    if (caintaOnly.length > 0 && caintaOnly.length !== rizalEastDeliveries.length) {
      clusters.push({
        id: 'cluster-cainta',
        title: 'Cainta Local Cluster',
        description: `Dedicated route covering ${caintaOnly.length} delivery stores within Cainta, Rizal.`,
        corridorName: 'Cainta Local Route',
        deliveryIds: caintaOnly.map((d) => d.id),
        stores: caintaOnly.map((d) => `${d.consignee} (POD: ${d.individualDeliveryPod})`),
        totalQuantity: caintaOnly.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
        recommendedTruckPod: `TRK-${String(truckRuns.length + 1).padStart(3, '0')}`,
      });
    }

    // Check for Makati
    const makatiDeliveries = availableDeliveries.filter((d) => (d.destination || '').toLowerCase().includes('makati'));
    if (makatiDeliveries.length > 0) {
      clusters.push({
        id: 'cluster-makati',
        title: 'Makati CBD & Commercial Cluster',
        description: `Separate urban run serving ${makatiDeliveries.length} stores in Makati, Metro Manila.`,
        corridorName: 'Makati Commercial Route',
        deliveryIds: makatiDeliveries.map((d) => d.id),
        stores: makatiDeliveries.map((d) => `${d.consignee} (POD: ${d.individualDeliveryPod})`),
        totalQuantity: makatiDeliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
        recommendedTruckPod: `TRK-${String(truckRuns.length + 2).padStart(3, '0')}`,
      });
    }

    // Check for Taguig / BGC
    const taguigDeliveries = availableDeliveries.filter((d) => (d.destination || '').toLowerCase().includes('taguig'));
    if (taguigDeliveries.length > 0) {
      clusters.push({
        id: 'cluster-taguig',
        title: 'Taguig & BGC Hub Route',
        description: `Dedicated urban route serving ${taguigDeliveries.length} stores in Taguig City.`,
        corridorName: 'Taguig & BGC Route',
        deliveryIds: taguigDeliveries.map((d) => d.id),
        stores: taguigDeliveries.map((d) => `${d.consignee} (POD: ${d.individualDeliveryPod})`),
        totalQuantity: taguigDeliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
        recommendedTruckPod: `TRK-${String(truckRuns.length + 3).padStart(3, '0')}`,
      });
    }

    // Merge temporary user additions into suggested groups (Phase 3A.1)
    return clusters.map((cluster) => {
      const addedIds = customGroupAdditions[cluster.id] || [];
      const validAddedIds = addedIds.filter(
        (id) => !cluster.deliveryIds.includes(id) && availableDeliveries.some((d) => d.id === id)
      );
      if (validAddedIds.length === 0) return cluster;

      const combinedIds = [...cluster.deliveryIds, ...validAddedIds];
      const combinedDels = combinedIds
        .map((id) => availableDeliveries.find((d) => d.id === id))
        .filter(Boolean) as IndividualDelivery[];

      return {
        ...cluster,
        deliveryIds: combinedIds,
        stores: combinedDels.map(
          (d) => `${d.consignee} (POD: ${d.individualDeliveryPod})${validAddedIds.includes(d.id) ? ' • [Manually Added]' : ''}`
        ),
        totalQuantity: combinedDels.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
      };
    });
  }, [availableDeliveries, truckRuns.length, customGroupAdditions]);

  // ---------------------------------------------------------------------------
  // 3. ACTIONS & MODAL HANDLERS
  // ---------------------------------------------------------------------------
  // Toggle selection for a single delivery
  const toggleDeliverySelection = (id: string) => {
    setSelectedDeliveryIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all on the current page or filtered view
  const toggleSelectAllFiltered = () => {
    const allFilteredIds = filteredDeliveries.map((d) => d.id);
    const areAllSelected = allFilteredIds.every((id) => selectedDeliveryIds.includes(id));
    if (areAllSelected) {
      setSelectedDeliveryIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedDeliveryIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Open Create Truck Run modal with prefilled data
  const handleOpenCreateModal = (presetDeliveryIds?: string[], presetRouteName?: string) => {
    setFormError(null);
    const targetIds = presetDeliveryIds || selectedDeliveryIds;
    if (targetIds.length === 0) {
      alert('Please select at least one delivery to create a Truck Run.');
      return;
    }

    const targetDeliveries = individualDeliveries.filter((d) => targetIds.includes(d.id));

    // Next truck run number and POD
    const runNum = `TRUCK RUN #${String(truckRuns.length + 1).padStart(3, '0')}`;
    const podNum = `TRK-${String(truckRuns.length + 1).padStart(3, '0')}`;

    // Compute automatic route summary if not preset
    let routeSummary = presetRouteName || '';
    if (!routeSummary) {
      const distinctCities = Array.from(
        new Set(
          targetDeliveries
            .map((d) => d.destination?.split(',')[0].trim())
            .filter(Boolean)
        )
      );
      if (distinctCities.length === 1) {
        routeSummary = `${distinctCities[0]} Local Route`;
      } else if (distinctCities.length > 1) {
        routeSummary = `${distinctCities.slice(0, 3).join(' - ')} Corridor`;
      } else {
        routeSummary = 'Metro Freight Route';
      }
    }

    const primaryArea = targetDeliveries[0]?.area || 'Luzon';

    setFormTruckRunNumber(runNum);
    setFormTruckDispatchPod(podNum);
    setFormRouteLocation(routeSummary);
    setFormArea(primaryArea);
    setFormTruckSource('OFII Dedicated Fleet');
    setFormPlateNumber('NCV-8921');
    setFormDriver('Danilo P. Hernandez');
    setFormHelper('Ramil Cruz');
    setFormRemarks('');

    // If opening with preset IDs, update selected delivery IDs
    if (presetDeliveryIds) {
      setSelectedDeliveryIds(presetDeliveryIds);
    }

    setIsCreateModalOpen(true);
  };

  // Quick select a corridor from the assistant
  const handleApplyCorridor = (cluster: LocationCorridorCluster) => {
    setSelectedDeliveryIds(cluster.deliveryIds);
    handleOpenCreateModal(cluster.deliveryIds, cluster.corridorName);
  };

  // Submit create truck run
  const handleConfirmCreateTruckRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedDeliveryIds.length === 0) {
      setFormError('Please select at least one delivery to create a Truck Run.');
      return;
    }

    if (!formTruckDispatchPod.trim()) {
      setFormError('Truck / Dispatch POD is required (e.g. TRK-001).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTruckRun({
        truckRunNumber: formTruckRunNumber.trim(),
        truckDispatchPod: formTruckDispatchPod.trim(),
        plannedDispatchDate: formPlannedDate,
        deliveryArea: formArea,
        routeLocation: formRouteLocation.trim() || 'Standard Route',
        truckSource: formTruckSource,
        plateNumber: formPlateNumber.trim(),
        driver: formDriver.trim(),
        helper: formHelper.trim(),
        remarks: formRemarks.trim(),
        deliveryIds: selectedDeliveryIds,
        status: 'Planned',
      });

      if (result.success && result.truckRun) {
        setIsCreateModalOpen(false);
        setSelectedDeliveryIds([]);
        // Switch to Existing Truck Runs tab to view the created run
        setActiveTab('runs');
        setExpandedRunId(result.truckRun.id);
      } else {
        setFormError(result.error || 'Failed to create Truck Run.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status update
  const handleStatusChange = async (runId: string, status: TruckRunStatus) => {
    await updateTruckRunStatus(runId, status);
  };

  // Remove delivery from run
  const handleRemoveDeliveryFromRun = async (truckRunId: string, deliveryId: string) => {
    if (confirm('Are you sure you want to remove this delivery from the Truck Run? It will be safely returned to the Available Deliveries pool.')) {
      await removeDeliveryFromTruckRun(truckRunId, deliveryId);
    }
  };

  // Cancel truck run
  const handleCancelRun = async (truckRunId: string) => {
    if (confirm('Cancel this Truck Run? All assigned store deliveries will be released safely back to the Available Deliveries pool.')) {
      await cancelTruckRun(truckRunId);
    }
  };

  // Delete truck run
  const handleDeleteRun = async (truckRunId: string) => {
    if (confirm('Permanently delete this Truck Run? All assigned store deliveries will be released safely back to the Available Deliveries pool.')) {
      await deleteTruckRun(truckRunId);
    }
  };

  // Filtered Existing Truck Runs
  const filteredTruckRuns = useMemo(() => {
    return truckRuns.filter((run) => {
      if (runStatusFilter !== 'ALL' && run.status !== runStatusFilter) {
        return false;
      }
      if (runSearchQuery.trim()) {
        const q = runSearchQuery.toLowerCase().trim();
        const matches =
          run.truckRunNumber.toLowerCase().includes(q) ||
          run.truckDispatchPod.toLowerCase().includes(q) ||
          run.routeLocation.toLowerCase().includes(q) ||
          run.driver.toLowerCase().includes(q) ||
          run.plateNumber.toLowerCase().includes(q) ||
          run.clients.some((c) => c.toLowerCase().includes(q)) ||
          run.deliveryBatchNames.some((b) => b.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [truckRuns, runStatusFilter, runSearchQuery]);

  // Add deliveries to existing truck run handler
  const handleConfirmAddDeliveriesToRun = async () => {
    if (!addingToRunId || addDeliveriesSelectedIds.length === 0) {
      alert('Please select at least one delivery to add.');
      return;
    }
    const res = await addDeliveriesToTruckRun(addingToRunId, addDeliveriesSelectedIds);
    if (res.success) {
      setAddingToRunId(null);
      setAddDeliveriesSelectedIds([]);
    } else {
      alert(res.error || 'Failed to add deliveries.');
    }
  };

  // Defense-in-Depth RBAC Permission Guard
  const canonicalRole = normalizeUserRole(currentUserProfile?.userRole || currentUserProfile?.role);
  const isAuthorizedPlanner = 
    canonicalRole === 'TRUCK_PLANNER' || 
    canonicalRole === 'ADMIN' || 
    currentUserProfile?.userRole === 'truck_planner' || 
    (currentUserProfile?.userRole as string) === 'driver_head' ||
    currentUserProfile?.userRole === 'office_head';

  if (currentUserProfile && !isAuthorizedPlanner) {
    return (
      <div id="truck-planner-access-denied" className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The <strong>Truck Planner / Driver's Head</strong> portal is restricted to authorized Truck Planners. Coordinators and other roles are strictly restricted from accessing this interface.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* ---------------------------------------------------------------------- */}
      {/* HEADER SECTION                                                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              Operations • Truck Planning
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Coordinator Batches → <strong>Truck Planner / Driver's Head</strong> → Truck Runs & Fleet Dispatch
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-600" />
            <span>Truck Planner / Driver's Head Portal</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Consolidate individual store deliveries from Delivery Batches into active <strong>Truck Runs</strong>.
            Assign dedicated drivers, helpers, and <strong>Truck/Dispatch PODs</strong> while preserving each store's Individual Delivery POD.
          </p>
        </div>

        {/* Action button & stats */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {selectedDeliveryIds.length > 0 && (
            <button
              id="create-truck-run-btn"
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>[ Create Truck Run ({selectedDeliveryIds.length}) ]</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            <button
              id="tab-available-deliveries"
              type="button"
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Available Deliveries</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                {availableDeliveries.length}
              </span>
            </button>

            <button
              id="tab-existing-truck-runs"
              type="button"
              onClick={() => setActiveTab('runs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'runs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Existing Truck Runs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                {truckRuns.length}
              </span>
            </button>

            <button
              id="tab-corridors-assistant"
              type="button"
              onClick={() => setActiveTab('corridors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'corridors'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Route Clusters</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                {corridorClusters.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 13: TRUCK PLANNER SUMMARY (NEW / UNPLANNED DELIVERIES)          */}
      {/* ---------------------------------------------------------------------- */}
      <div id="truck-planner-unplanned-summary" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">
              Phase 2.5 Planning Metric
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              NEW / UNPLANNED DELIVERIES
            </h2>
            <p className="text-[11px] text-slate-500">
              Counts of Individual Deliveries only. Truck Runs are consolidated groups and are not counted as additional deliveries.
            </p>
          </div>
          {batchFilter !== 'ALL' && (
            <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-950">
                Filtered: <span className="underline">{batchFilter}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setBatchFilter('ALL');
                  onClearInitialBatchFilter?.();
                }}
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 hover:underline cursor-pointer ml-1"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* New Deliveries */}
          <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              New Deliveries
            </div>
            <div className="text-3xl font-black text-amber-950 font-mono">
              {individualDeliveries.filter((d) => !d.truckRunId).length.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-800 mt-1 font-medium">
              Individual consignments awaiting Truck Run assignment
            </div>
          </div>

          {/* Assigned to Truck Run */}
          <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200">
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
              Assigned to Truck Run
            </div>
            <div className="text-3xl font-black text-blue-950 font-mono">
              {individualDeliveries.filter((d) => !!d.truckRunId).length.toLocaleString()}
            </div>
            <div className="text-[11px] text-blue-800 mt-1 font-medium">
              Individual consignments assigned to planned Truck Runs
            </div>
          </div>

          {/* Total Individual Deliveries */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Total Individual Deliveries
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono">
              {individualDeliveries.length.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Total Individual Consignments across all Delivery Batches
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: AVAILABLE DELIVERIES PANEL                                      */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          
          {/* Corridor Recommendation Banner (Quick Helper) */}
          {corridorClusters.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-slate-50 to-emerald-50 rounded-2xl p-4 border border-amber-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Location-Based Grouping Assistant
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Detected nearby consignee clusters in your pending delivery batches:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('corridors')}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <span>View All Route Clusters</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Corridor Chips */}
              <div className="flex flex-wrap gap-2">
                {corridorClusters.map((cluster) => (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => handleApplyCorridor(cluster)}
                    className="group bg-white hover:bg-amber-600 hover:text-white border border-amber-200 hover:border-amber-600 px-3 py-1.5 rounded-xl text-left transition-all shadow-2xs flex items-center gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600 group-hover:text-white shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-white">
                        {cluster.title}
                      </div>
                      <div className="text-[10px] text-slate-500 group-hover:text-amber-100">
                        {cluster.deliveryIds.length} stores • {cluster.totalQuantity} cases
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 group-hover:bg-amber-800 group-hover:text-white px-2 py-0.5 rounded-md shrink-0">
                      1-Click Group
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              
              {/* Search Bar */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-available-deliveries"
                  type="text"
                  placeholder="Search store, POD, location, code, batch..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Batch Filter */}
              <div>
                <select
                  id="filter-batch"
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Delivery Batches ({availableBatches.length})</option>
                  {availableBatches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Area Filter */}
              <div>
                <select
                  id="filter-area"
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Delivery Areas</option>
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Location / City Filter */}
              <div>
                <select
                  id="filter-location"
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Locations / Cities ({availableLocations.length})</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Batch Filter Banner (e.g. from Notification View Deliveries) */}
            {batchFilter !== 'ALL' && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  <span>Filtered by Delivery Batch: <strong>{batchFilter}</strong> ({filteredDeliveries.length} available)</span>
                </div>
                <button
                  type="button"
                  id="btn-clear-batch-filter"
                  onClick={() => {
                    setBatchFilter('ALL');
                    if (onClearInitialBatchFilter) onClearInitialBatchFilter();
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300 transition-colors cursor-pointer"
                >
                  Show All Batches
                </button>
              </div>
            )}

            {/* Selection Bar & Active Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-amber-700 cursor-pointer"
                >
                  {filteredDeliveries.length > 0 && filteredDeliveries.every((d) => selectedDeliveryIds.includes(d.id)) ? (
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({filteredDeliveries.length})</span>
                </button>

                {selectedDeliveryIds.length > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {selectedDeliveryIds.length} selected ({selectedTotalQty} cases)
                    </span>
                    {selectedLocationsSummary.length > 0 && (
                      <span className="text-slate-500 text-[11px] hidden md:inline">
                        Locations: {selectedLocationsSummary.slice(0, 3).join(', ')}
                        {selectedLocationsSummary.length > 3 && ` +${selectedLocationsSummary.length - 3} more`}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedDeliveryIds([])}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </>
                )}
              </div>

              {selectedDeliveryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Truck Run ({selectedDeliveryIds.length} Deliveries)</span>
                </button>
              )}
            </div>
          </div>

          {/* Available Deliveries Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Available Deliveries Pool</span>
              <span className="text-amber-700 font-medium">Swipe to view all columns →</span>
            </div>
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllFiltered}
                        title="Toggle Select All"
                        className="cursor-pointer"
                      >
                        {filteredDeliveries.length > 0 && filteredDeliveries.every((d) => selectedDeliveryIds.includes(d.id)) ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3.5">Store / Consignee</th>
                    <th className="py-3 px-3.5">Individual POD</th>
                    <th className="py-3 px-3.5">Destination / Location</th>
                    <th className="py-3 px-3.5">Code</th>
                    <th className="py-3 px-3.5">Delivery Batch</th>
                    <th className="py-3 px-3.5">Qty / Mode</th>
                    <th className="py-3 px-3.5">RDD</th>
                    <th className="py-3 px-3.5">Client</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          {batchFilter !== 'ALL' ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-1">
                                <Boxes className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-slate-900 text-sm">
                                Project: <span className="text-blue-700 font-mono">{batchFilter}</span>
                              </p>
                              <p className="text-xs text-slate-500 max-w-md">
                                The project is ready for delivery processing. No unassigned individual deliveries are currently loaded for this project.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchFilter('ALL');
                                  if (onClearInitialBatchFilter) onClearInitialBatchFilter();
                                }}
                                className="mt-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                              >
                                View All Batches
                              </button>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                              <p className="font-semibold text-slate-700">No unassigned deliveries found.</p>
                              <p className="text-xs text-slate-400 max-w-sm">
                                All individual store deliveries are currently assigned to Truck Runs, or no deliveries match your filter criteria.
                              </p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDeliveries.map((del) => {
                      const isSelected = selectedDeliveryIds.includes(del.id);
                      return (
                        <tr 
                          key={del.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isSelected ? 'bg-amber-50/80 font-medium' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDeliverySelection(del.id)}
                              className="cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900">{del.consignee}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{del.deliveryId || del.id}</div>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200">
                              {del.individualDeliveryPod}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5 text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium">{del.destination || '—'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 ml-5">{del.area}</div>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                              {del.destinationCode || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-700 max-w-[160px] truncate" title={del.batchName}>
                            {del.batchName}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-slate-900">{del.quantity}</span>{' '}
                            <span className="text-slate-500 text-[11px]">({del.modeOfShipment})</span>
                          </td>
                          <td className="py-3 px-3.5 font-medium text-slate-700">
                            {del.rdd || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 max-w-[140px] truncate" title={del.client}>
                            {del.client}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Unplanned
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenCreateModal([del.id]);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 cursor-pointer transition-colors"
                            >
                              + Run
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400">|</span>
                <span>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                  <strong>{Math.min(currentPage * pageSize, filteredDeliveries.length)}</strong> of{' '}
                  <strong>{filteredDeliveries.length}</strong> available deliveries
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: EXISTING TRUCK RUNS TABLE & CARDS                              */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          
          {/* Controls & Filter */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-truck-runs"
                type="text"
                placeholder="Search Truck Run #, Truck POD, Driver, Route, Plate..."
                value={runSearchQuery}
                onChange={(e) => setRunSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status:</span>
              <select
                id="filter-run-status"
                value={runStatusFilter}
                onChange={(e) => setRunStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses ({truckRuns.length})</option>
                <option value="Planned">Planned</option>
                <option value="Ready for Dispatch">Ready for Dispatch</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* List of Truck Runs */}
          {filteredTruckRuns.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <div className="flex flex-col items-center justify-center gap-2">
                <Truck className="w-10 h-10 text-slate-300" />
                <h3 className="font-bold text-slate-800 text-sm">No Truck Runs Found</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  There are no created Truck Runs matching your filter. Switch to the <strong>Available Deliveries</strong> tab to select store deliveries and create a new Truck Run.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('available')}
                  className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Go to Available Deliveries
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTruckRuns.map((run) => {
                const isExpanded = expandedRunId === run.id;
                // Look up actual deliveries currently assigned to this run
                const assignedDeliveries = individualDeliveries.filter((d) => run.deliveryIds.includes(d.id));

                return (
                  <div
                    key={run.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:border-slate-300 transition-all"
                  >
                    {/* Top Run Header Banner */}
                    <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black tracking-tight text-white">
                              {run.truckRunNumber}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-400 text-slate-950 shadow-xs border border-amber-300">
                              POD: {run.truckDispatchPod}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            <span>{run.routeLocation}</span>
                            <span className="text-slate-500">•</span>
                            <span>{run.deliveryArea}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={run.status}
                          onChange={(e) => handleStatusChange(run.id, e.target.value as TruckRunStatus)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer border ${
                            run.status === 'Completed'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : run.status === 'Ready for Dispatch'
                              ? 'bg-blue-600 text-white border-blue-500'
                              : run.status === 'Dispatched'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : run.status === 'Cancelled'
                              ? 'bg-red-800 text-white border-red-700'
                              : 'bg-amber-600 text-white border-amber-500'
                          }`}
                        >
                          <option value="Planned">Planned</option>
                          <option value="Ready for Dispatch">Ready for Dispatch</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Stores'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelRun(run.id)}
                          className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors border border-red-800/60"
                          title="Cancel Truck Run and release store deliveries"
                        >
                          Cancel Run
                        </button>
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Planned Date</div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{run.plannedDispatchDate}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Driver & Helper</div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{run.driver}</span>
                        </div>
                        {run.helper && <div className="text-[10px] text-slate-500">H: {run.helper}</div>}
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Plate / Fleet</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {run.plateNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{run.truckSource}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Total Stops</div>
                        <div className="font-black text-slate-900 text-sm mt-0.5">
                          {assignedDeliveries.length} Stores
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Cargo Quantity</div>
                        <div className="font-black text-amber-700 text-sm mt-0.5">
                          {assignedDeliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0)} Cases
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Batch Projects</div>
                        <div className="font-medium text-slate-700 mt-0.5 truncate" title={run.deliveryBatchNames.join(', ')}>
                          {run.deliveryBatchNames.join(', ') || 'Standard Batch'}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Deliveries Sub-table */}
                    {isExpanded && (
                      <div className="p-5 space-y-3 bg-white animate-in fade-in duration-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Boxes className="w-3.5 h-3.5 text-amber-600" />
                              <span>Assigned Store Deliveries for this Run ({assignedDeliveries.length})</span>
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Each store retains its unique, immutable Individual POD. The Truck/Dispatch POD is <strong>{run.truckDispatchPod}</strong>.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAddingToRunId(run.id);
                                setAddDeliveriesSelectedIds([]);
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Deliveries to this Run</span>
                            </button>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Stop #</th>
                                <th className="py-2.5 px-3">Store / Consignee</th>
                                <th className="py-2.5 px-3">
                                  <span className="text-blue-700">Individual POD</span>
                                </th>
                                <th className="py-2.5 px-3">
                                  <span className="text-amber-700">Truck POD</span>
                                </th>
                                <th className="py-2.5 px-3">Destination</th>
                                <th className="py-2.5 px-3">Quantity</th>
                                <th className="py-2.5 px-3">RDD</th>
                                <th className="py-2.5 px-3 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {assignedDeliveries.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-6 text-center text-slate-400">
                                    No deliveries currently assigned. Click "+ Add Deliveries to this Run".
                                  </td>
                                </tr>
                              ) : (
                                assignedDeliveries.map((del, index) => (
                                  <tr key={del.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2.5 px-3 font-bold text-slate-500">
                                      #{index + 1}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-bold text-slate-900">{del.consignee}</div>
                                      <div className="text-[10px] text-slate-400">{del.batchName}</div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200">
                                        {del.individualDeliveryPod}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-mono font-bold text-xs border border-amber-200">
                                        {run.truckDispatchPod}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-700">
                                      {del.destination || '—'}
                                      <span className="text-[10px] text-slate-400 block">{del.destinationCode}</span>
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                                      {del.quantity} {del.unit || 'cases'}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      {del.rdd || '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDeliveryFromRun(run.id, del.id)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer"
                                        title="Release back to Available Deliveries pool"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {run.remarks && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <strong>Dispatch Remarks:</strong> {run.remarks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: ROUTE CORRIDORS / CLUSTER ASSISTANT VIEW                         */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'corridors' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Geographic Route Grouping Assistant</span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                The OFII dispatch rules recommend bundling store deliveries along natural transit corridors to optimize vehicle capacity and turnaround times. Below are the automatically detected destination corridors from your available delivery batches:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {corridorClusters.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400">
                  No corridor recommendations found for the current available deliveries.
                </div>
              ) : (
                corridorClusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Recommended Grouping
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-1.5">
                            {cluster.title}
                          </h3>
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-mono border border-amber-200">
                          {cluster.recommendedTruckPod}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {cluster.description}
                      </p>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Included Deliveries ({cluster.deliveryIds.length}):
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingToClusterId(cluster.id);
                              setSelectedAdditionsForCluster([]);
                              setClusterAddSearch('');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Add other unplanned deliveries to this suggested group"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Add Deliveries</span>
                          </button>
                        </div>
                        <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {cluster.deliveryIds.map((delId) => {
                            const del = availableDeliveries.find((d) => d.id === delId);
                            if (!del) return null;
                            const isAdded = (customGroupAdditions[cluster.id] || []).includes(delId);
                            return (
                              <li key={delId} className="text-xs text-slate-700 flex items-center justify-between gap-1.5 py-1 px-2 rounded-lg bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isAdded ? 'bg-blue-600' : 'bg-amber-500'} shrink-0`}></span>
                                  <span className="font-bold text-slate-900 truncate">{del.consignee}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">({del.individualDeliveryPod})</span>
                                  {isAdded && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                      Added
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-slate-800">{del.quantity} cs</span>
                                  {isAdded && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCustomGroupAdditions((prev) => ({
                                          ...prev,
                                          [cluster.id]: (prev[cluster.id] || []).filter((id) => id !== delId),
                                        }));
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer rounded transition-colors"
                                      title="Remove from this suggested group selection"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800">
                        Total: <span className="text-amber-700 font-black">{cluster.totalQuantity} Cases</span> ({cluster.deliveryIds.length} stops)
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyCorridor(cluster)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create This Truck Run</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: CREATE TRUCK RUN                                                */}
      {/* ---------------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Create Truck Run / Dispatch Group
                  </h3>
                  <p className="text-xs text-amber-200/90 font-medium">
                    Consolidating {selectedDeliveryIds.length} individual deliveries
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanatory Callout */}
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-200/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Data Integrity Rule:</strong> The <strong>Truck / Dispatch POD</strong> assigned here applies to this vehicle journey. Every store consignment retains its own <strong>Individual Delivery POD</strong> intact and visible on all dispatch and billing reports.
              </p>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConfirmCreateTruckRun} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Truck Run Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Truck Run Number:
                  </label>
                  <input
                    id="input-truck-run-number"
                    type="text"
                    required
                    value={formTruckRunNumber}
                    onChange={(e) => setFormTruckRunNumber(e.target.value)}
                    placeholder="e.g. TRUCK RUN #001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                {/* Truck / Dispatch POD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Truck / Dispatch POD Number: <span className="text-red-500">*</span></span>
                    <span className="text-[10px] text-amber-700 font-medium">Distinct from Store PODs</span>
                  </label>
                  <input
                    id="input-truck-dispatch-pod"
                    type="text"
                    required
                    value={formTruckDispatchPod}
                    onChange={(e) => setFormTruckDispatchPod(e.target.value)}
                    placeholder="e.g. TRK-001"
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-lg text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                {/* Planned Dispatch Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Planned Dispatch Date:
                  </label>
                  <input
                    id="input-planned-dispatch-date"
                    type="date"
                    required
                    value={formPlannedDate}
                    onChange={(e) => setFormPlannedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Delivery Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Area:
                  </label>
                  <select
                    id="input-delivery-area"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Luzon">Luzon</option>
                    <option value="NCR">NCR (Metro Manila)</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                  </select>
                </div>

                {/* Route Location Corridor */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Route / Destination Summary:
                  </label>
                  <input
                    id="input-route-location"
                    type="text"
                    required
                    value={formRouteLocation}
                    onChange={(e) => setFormRouteLocation(e.target.value)}
                    placeholder="e.g. Antipolo - Cainta Corridor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                {/* Truck Source */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Truck / Vehicle Source:
                  </label>
                  <select
                    id="input-truck-source"
                    value={formTruckSource}
                    onChange={(e) => setFormTruckSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="OFII Dedicated Fleet">OFII Dedicated Fleet</option>
                    <option value="AB Braza Trucking (3PL Partner)">AB Braza Trucking (3PL Partner)</option>
                    <option value="3PL Freight Partner">3PL Freight Partner</option>
                    <option value="Customer Provided">Customer Provided</option>
                  </select>
                </div>

                {/* Assigned Plate Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Plate Number:
                  </label>
                  <input
                    id="input-plate-number"
                    type="text"
                    value={formPlateNumber}
                    onChange={(e) => setFormPlateNumber(e.target.value)}
                    placeholder="e.g. NCV-8921"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Driver */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Driver:
                  </label>
                  <select
                    id="input-assigned-driver"
                    value={formDriver}
                    onChange={(e) => {
                      setFormDriver(e.target.value);
                      const matched = OFII_DRIVERS_ROSTER.find((d) => d.name === e.target.value);
                      if (matched?.defaultPlate) {
                        setFormPlateNumber(matched.defaultPlate);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {OFII_DRIVERS_ROSTER.map((drv) => (
                      <option key={drv.id} value={drv.name}>
                        {drv.name} ({drv.defaultPlate})
                      </option>
                    ))}
                    <option value="Unassigned / TBD">Unassigned / TBD</option>
                  </select>
                </div>

                {/* Helper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Helper:
                  </label>
                  <select
                    id="input-assigned-helper"
                    value={formHelper}
                    onChange={(e) => setFormHelper(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    {OFII_HELPERS_ROSTER.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                    <option value="None / Driver Only">None / Driver Only</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Dispatch Instructions / Remarks:
                </label>
                <textarea
                  id="input-remarks"
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Call store manager 30 minutes prior to arrival; morning delivery priority..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Selected Deliveries Summary Preview */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Included Stores & Individual PODs ({selectedDeliveries.length})
                  </span>
                  <span className="font-black text-amber-800">
                    Total Cargo: {selectedTotalQty} Cases
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-200">
                  {selectedDeliveries.map((del, idx) => (
                    <div key={del.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {idx + 1}. {del.consignee}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          ({del.destination || del.area})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          POD: {del.individualDeliveryPod}
                        </span>
                        <span className="font-bold text-slate-800">
                          {del.quantity} cases
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-create-truck-run-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Confirm & Create Truck Run'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: ADD DELIVERIES TO EXISTING RUN                                 */}
      {/* ---------------------------------------------------------------------- */}
      {addingToRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Add Deliveries to Truck Run
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddingToRunId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Select from available unassigned store deliveries to bundle into this Truck Run:
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {availableDeliveries.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No unassigned deliveries available.
                  </div>
                ) : (
                  availableDeliveries.map((del) => {
                    const isChecked = addDeliveriesSelectedIds.includes(del.id);
                    return (
                      <div
                        key={del.id}
                        onClick={() => {
                          setAddDeliveriesSelectedIds((prev) =>
                            prev.includes(del.id) ? prev.filter((id) => id !== del.id) : [...prev, del.id]
                          );
                        }}
                        className={`p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 ${
                          isChecked ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{del.consignee}</div>
                            <div className="text-[10px] text-slate-500">{del.destination || del.area}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                            POD: {del.individualDeliveryPod}
                          </span>
                          <span className="font-bold text-slate-800">{del.quantity} cases</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingToRunId(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddDeliveriesToRun}
                  disabled={addDeliveriesSelectedIds.length === 0}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  Add Selected ({addDeliveriesSelectedIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: ADD DELIVERIES TO SUGGESTED GROUP (Phase 3A.1)                 */}
      {/* ---------------------------------------------------------------------- */}
      {addingToClusterId && (() => {
        const targetCluster = corridorClusters.find((c) => c.id === addingToClusterId);
        const alreadyInGroupIds = targetCluster?.deliveryIds || [];
        const eligibleDeliveries = availableDeliveries.filter((d) => !alreadyInGroupIds.includes(d.id));
        const filteredEligible = eligibleDeliveries.filter((d) => {
          if (!clusterAddSearch.trim()) return true;
          const q = clusterAddSearch.toLowerCase();
          return (
            (d.consignee || '').toLowerCase().includes(q) ||
            (d.individualDeliveryPod || '').toLowerCase().includes(q) ||
            (d.destination || '').toLowerCase().includes(q) ||
            (d.batchName || '').toLowerCase().includes(q) ||
            (d.deliveryId || d.id || '').toLowerCase().includes(q)
          );
        });

        const handleConfirmAdd = () => {
          if (selectedAdditionsForCluster.length === 0) return;
          setCustomGroupAdditions((prev) => ({
            ...prev,
            [addingToClusterId]: [
              ...(prev[addingToClusterId] || []),
              ...selectedAdditionsForCluster,
            ],
          }));
          setAddingToClusterId(null);
          setSelectedAdditionsForCluster([]);
          setClusterAddSearch('');
        };

        const toggleSelectAllEligible = () => {
          const currentFilteredIds = filteredEligible.map((d) => d.id);
          const allSelected = currentFilteredIds.every((id) => selectedAdditionsForCluster.includes(id));
          if (allSelected) {
            setSelectedAdditionsForCluster((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
          } else {
            setSelectedAdditionsForCluster((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold shadow-xs">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      ADD DELIVERIES TO THIS SUGGESTED GROUP
                    </h3>
                    <p className="text-xs text-amber-300 font-medium">
                      {targetCluster?.title} ({targetCluster?.deliveryIds.length || 0} existing stops)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddingToClusterId(null);
                    setSelectedAdditionsForCluster([]);
                    setClusterAddSearch('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informational Callout */}
              <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-950 leading-relaxed">
                  <strong>Temporary Planning Selection:</strong> Add other unplanned deliveries into this group for trip bundling (e.g. <em>"Isabay na lang tong delivery na ito"</em>). This does not lock the delivery or modify original project data.
                </p>
              </div>

              <div className="p-5 space-y-3">
                {/* Search and Selection Counter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search store, POD, destination, batch..."
                      value={clusterAddSearch}
                      onChange={(e) => setClusterAddSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                    <button
                      type="button"
                      onClick={toggleSelectAllEligible}
                      disabled={filteredEligible.length === 0}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-40"
                    >
                      {filteredEligible.length > 0 && filteredEligible.every((d) => selectedAdditionsForCluster.includes(d.id))
                        ? 'Deselect All'
                        : 'Select All Filtered'}
                    </button>
                    <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                      {selectedAdditionsForCluster.length} Selected
                    </span>
                  </div>
                </div>

                {/* Deliveries Table */}
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                        <th className="py-2.5 px-3">Delivery ID / POD</th>
                        <th className="py-2.5 px-3">Consignee</th>
                        <th className="py-2.5 px-3">Destination / Place</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">Batch / Project</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEligible.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No other eligible unplanned deliveries found matching search.
                          </td>
                        </tr>
                      ) : (
                        filteredEligible.map((del) => {
                          const isSelected = selectedAdditionsForCluster.includes(del.id);
                          return (
                            <tr
                              key={del.id}
                              onClick={() => {
                                setSelectedAdditionsForCluster((prev) =>
                                  prev.includes(del.id)
                                    ? prev.filter((id) => id !== del.id)
                                    : [...prev, del.id]
                                );
                              }}
                              className={`cursor-pointer hover:bg-amber-50/50 transition-colors ${
                                isSelected ? 'bg-amber-50/80 font-medium' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedAdditionsForCluster((prev) =>
                                      prev.includes(del.id)
                                        ? prev.filter((id) => id !== del.id)
                                        : [...prev, del.id]
                                    );
                                  }}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-blue-700">
                                  {del.individualDeliveryPod}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {del.deliveryId || del.id}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {del.consignee}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{del.destination || '—'}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 ml-4">{del.area}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                {del.quantity}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">cs</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate" title={del.batchName}>
                                {del.batchName || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {eligibleDeliveries.length} unplanned deliveries available outside this group
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingToClusterId(null);
                        setSelectedAdditionsForCluster([]);
                        setClusterAddSearch('');
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAdd}
                      disabled={selectedAdditionsForCluster.length === 0}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Selected Deliveries ({selectedAdditionsForCluster.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
