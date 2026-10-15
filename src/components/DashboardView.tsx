import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  ChevronRight, 
  Activity, 
  Layers, 
  TrendingUp, 
  FileCheck, 
  BellRing, 
  AlertCircle, 
  Eye, 
  Calendar, 
  Building2, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  Plus, 
  FileSpreadsheet, 
  Download,
  Filter, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Search, 
  RotateCcw, 
  Boxes,
  FileText,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  ForwardingDispatchNotification,
  PODNotification,
  NavigationTab,
  IndividualDelivery,
  TruckRun,
  UserProfile,
  PodReturningNotification,
  CanonicalDeliveryStatus,
  PhilippineArea
} from '../types';
import { currentUser } from '../data/mockData';
import { downloadDailyDispatchTemplate, downloadForwardingTemplate } from '../utils/excelParser';
import { 
  calculateDaysBetween, 
  getAutoDeliveryLeadTime, 
  getSystemTodayDateStr,
  calculatePodReturnDueDate,
  calculateExpectedDeliveryDate
} from '../utils/forwardingCalculations';
import { getClientAssignedCoordinator } from '../utils/dataSync';
import { 
  evaluateDeliveryPerformance,
  DEFAULT_REGULAR_HOLIDAYS 
} from '../utils/leadtimeEngine';
import { normalizeUserRole, getUserRoleDisplayLabel, getRolePermissions } from '../utils/roleUtils';
import { isClientAssignedToUser, isUserAuthorizedDriverForDelivery } from '../data/userAccounts';
import { useData } from '../context/DataContext';

export type DashboardPeriodFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export interface DashboardViewProps {
  dispatches: DispatchRecord[];
  shipments: ShipmentRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  clients: ClientSummary[];
  dispatchNotifications?: ForwardingDispatchNotification[];
  podNotifications?: PODNotification[];
  individualDeliveries?: IndividualDelivery[];
  truckRuns?: TruckRun[];
  podReturningNotifications?: PodReturningNotification[];
  currentUserProfile?: UserProfile | null;
  onSelectDispatch: (dispatch: DispatchRecord) => void;
  onSelectShipment: (shipment: ShipmentRecord) => void;
  onSelectForwardingRecord?: (record: ForwardingProgressiveRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
  onSelectClientFromDashboard: (clientName: string) => void;
  onOpenAddDispatchModal?: () => void;
  onOpenAddClientModal?: () => void;
  onOpenImportModal?: (target?: 'forwarding' | 'dispatch') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  const {
    dispatches: propDispatches,
    shipments: propShipments,
    forwardingRecords: propForwardingRecords,
    clients: propClients,
    dispatchNotifications = [],
    podNotifications = [],
    onSelectDispatch,
    onSelectShipment,
    onSelectForwardingRecord,
    onNavigate,
    onSelectClientFromDashboard,
    onOpenAddDispatchModal,
    onOpenAddClientModal,
    onOpenImportModal,
  } = props;

  // Access central data context for real-time dynamic synchronization
  const contextData = useData();
  const allDeliveries = props.individualDeliveries ?? contextData.individualDeliveries ?? [];
  const allTruckRuns = props.truckRuns ?? contextData.truckRuns ?? [];
  const allDispatches = propDispatches ?? contextData.dispatches ?? [];
  const allForwarding = propForwardingRecords ?? contextData.forwardingRecords ?? [];
  const allShipments = propShipments ?? contextData.shipments ?? [];
  const allClients = propClients ?? contextData.clients ?? [];
  const allPodReturningNotifs = props.podReturningNotifications ?? contextData.podReturningNotifications ?? [];
  const activeUserProfile = props.currentUserProfile ?? contextData.currentUserProfile ?? null;

  // ---------------------------------------------------------------------------
  // 1. FILTER CONTROLS STATE (Date, Client, Coordinator, Area, Status, Driver)
  // ---------------------------------------------------------------------------
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodFilter>('ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [selectedCoordinatorFilter, setSelectedCoordinatorFilter] = useState<string>('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-08-31');

  // Role permissions extraction
  const canonicalRole = normalizeUserRole(activeUserProfile?.userRole || activeUserProfile?.role);
  const isHeadStaff = canonicalRole === 'HEAD_STAFF';
  const isCoordinator = canonicalRole === 'COORDINATOR';
  const isTruckPlanner = canonicalRole === 'TRUCK_PLANNER';
  const isDispatcher = canonicalRole === 'DISPATCHER';
  const isDriverHelper = canonicalRole === 'DRIVER_HELPER';
  const isEncoder = canonicalRole === 'ENCODER';
  const rolePermissions = getRolePermissions(activeUserProfile);
  const isReadOnly = rolePermissions.isReadOnly || canonicalRole === 'VIEWER';
  const roleDisplay = getUserRoleDisplayLabel(activeUserProfile);

  // Helper to test if a record's date string falls into the selected period
  const isDateInPeriod = (dateStr?: string | null): boolean => {
    if (selectedPeriod === 'ALL') return true;
    if (!dateStr || dateStr.trim() === '') return false;

    const cleanDate = dateStr.slice(0, 10);
    const systemToday = getSystemTodayDateStr();
    const nowIso = new Date().toISOString().slice(0, 10);
    const todayRef = '2026-08-25'; // Reference operational anchor for August 2026 dataset

    if (selectedPeriod === 'TODAY') {
      return cleanDate === systemToday || cleanDate === todayRef || cleanDate === nowIso;
    }

    if (selectedPeriod === 'WEEK') {
      const weekStart = '2026-08-18';
      const weekEnd = '2026-08-25';
      const rollingStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      return (cleanDate >= weekStart && cleanDate <= weekEnd) || (cleanDate >= rollingStart && cleanDate <= nowIso);
    }

    if (selectedPeriod === 'MONTH') {
      const monthPrefix = '2026-08';
      const currentMonthPrefix = nowIso.slice(0, 7);
      return cleanDate.startsWith(monthPrefix) || cleanDate.startsWith(currentMonthPrefix);
    }

    if (selectedPeriod === 'CUSTOM') {
      if (customStartDate && cleanDate < customStartDate) return false;
      if (customEndDate && cleanDate > customEndDate) return false;
      return true;
    }

    return true;
  };

  // Helper to test if a record belongs to the selected client
  const isRecordForSelectedClient = (clientNameOrId?: string | null, clientObjId?: string | null): boolean => {
    if (selectedClientFilter === 'ALL') return true;
    if (!clientNameOrId && !clientObjId) return false;

    const targetLower = selectedClientFilter.toLowerCase();
    const nameLower = (clientNameOrId || '').toLowerCase();
    const idVal = clientObjId || '';

    return nameLower === targetLower || idVal === selectedClientFilter || nameLower.includes(targetLower);
  };

  // ---------------------------------------------------------------------------
  // 2. CENTRALIZED DELIVERY ENRICHMENT & DEDUPLICATION (Primary Data Source)
  // Maps every Individual Delivery record to its linked Truck Run, Dispatch, and POD Returning
  // ---------------------------------------------------------------------------
  const activeClients = useMemo(() => allClients.filter(c => !c.isDeleted && !c.isDeactivated), [allClients]);
  const activeDispatches = useMemo(() => allDispatches.filter(d => !d.isDeleted), [allDispatches]);
  const activeForwarding = useMemo(() => allForwarding.filter(f => !f.isDeleted), [allForwarding]);
  const activeTruckRuns = useMemo(() => allTruckRuns.filter(t => (t as any).isDeleted !== true), [allTruckRuns]);

  // Master enriched individual deliveries list with exact cross-module relationship linkages
  // SINGLE SOURCE OF TRUTH: Unifies active Individual Deliveries, Daily Dispatch records, and Forwarding records without duplication
  const enrichedDeliveries = useMemo(() => {
    const list: Array<any> = [];
    const matchedDispatchIds = new Set<string>();
    const matchedForwardingIds = new Set<string>();
    const matchedPods = new Set<string>();
    const matchedRefs = new Set<string>();

    const normalizeKey = (k?: string | null) => (k || '').trim().toLowerCase();

    const enrichSingle = (params: {
      rawDel?: IndividualDelivery;
      linkedDisp?: DispatchRecord;
      linkedFwd?: ForwardingProgressiveRecord;
      linkedRun?: TruckRun;
      linkedPodNotif?: PodReturningNotification;
    }) => {
      const { rawDel, linkedDisp, linkedFwd, linkedRun, linkedPodNotif } = params;

      const id = rawDel?.id || linkedDisp?.id || linkedFwd?.id || `DEL-${Math.random().toString().slice(2, 8)}`;
      const deliveryId = rawDel?.deliveryId || linkedDisp?.deliveryId || (linkedDisp as any)?.individualDeliveryId || linkedFwd?.deliveryId || id;
      const clientName = rawDel?.client || linkedFwd?.client || linkedDisp?.clientName || 'General Client';
      const clientId = rawDel?.clientId || linkedFwd?.clientId;
      const area = (rawDel?.area || linkedFwd?.area || linkedDisp?.deliveryArea || linkedDisp?.area || 'Luzon') as PhilippineArea;
      const coordinator = rawDel?.coordinator || linkedFwd?.coordinator || getClientAssignedCoordinator(activeClients, clientName, 'Alodia Manalansan');
      const consignee = rawDel?.consignee || linkedFwd?.consignee || linkedDisp?.consignee || 'Consignee Enterprise';
      const destination = rawDel?.destination || rawDel?.destinationCode || linkedFwd?.destinationCode || linkedDisp?.destination || `${area} Outlet`;
      const podNumber = rawDel?.individualDeliveryPod || (rawDel as any)?.podNumber || linkedDisp?.podNumber || linkedFwd?.podNumber || deliveryId;
      const referenceNumber = rawDel?.referenceNumber || linkedDisp?.manifestNumber || linkedFwd?.referenceNumber || 'REF-2026';
      const quantity = rawDel?.quantity || linkedDisp?.quantityCasesBoxes || linkedFwd?.quantity || 1;
      const unit = rawDel?.unit || linkedDisp?.unit || linkedFwd?.unit || 'cases';
      const modeOfShipment = rawDel?.modeOfShipment || linkedFwd?.modeOfShipment || 'Land Freight';
      const driver = rawDel?.driver || rawDel?.assignedDriverId || linkedRun?.driver || linkedDisp?.driverName || linkedFwd?.driverName || '';
      const plateNumber = rawDel?.plateNumber || linkedRun?.plateNumber || linkedDisp?.plateNumber || linkedFwd?.plateNumber || '';
      const truckName = rawDel?.truckName || linkedRun?.truckName || linkedRun?.truckSource || linkedDisp?.truckProvider || linkedFwd?.truckProvider || '';
      const rdd = rawDel?.rdd || linkedFwd?.requestDeliveryDate || linkedDisp?.requestDeliveryDate || (linkedDisp as any)?.rdd || '';
      
      const plannedDate = linkedRun?.plannedDispatchDate || linkedDisp?.plannedDeliveryDate || linkedFwd?.plannedDeliveryDate || rdd || rawDel?.createdAt?.slice(0, 10) || '2026-08-25';
      const actualDispatchDate = rawDel?.actualDispatchDate || linkedRun?.plannedDispatchDate || linkedFwd?.actualDispatchDate || linkedDisp?.deliveryDate || plannedDate;
      
      const actualDeliveryDate = rawDel?.actualDeliveryDate || rawDel?.dateReceived || linkedFwd?.actualDeliveryDate || (linkedDisp?.status === 'Delivered' ? (linkedDisp.deliveryDate || (linkedDisp as any).actualDeliveryDate || actualDispatchDate) : '') || '';
      const podReturnDate = rawDel?.podReturnDate || (rawDel as any)?.dateOfPodReturn || linkedFwd?.dateOfPodReturn || (linkedDisp as any)?.podReturnDate || (linkedDisp as any)?.dateOfPodReturn || '';
      const primaryDeliveryDate = rdd || actualDeliveryDate || plannedDate;

      // Canonical Delivery Status derivation (Mutually Exclusive 8 Status Lifecycle)
      let canonicalStatus: CanonicalDeliveryStatus;

      const isCompleted = Boolean(
        rawDel?.status === 'COMPLETED' || 
        rawDel?.deliveryStatus === 'COMPLETED' || 
        linkedFwd?.deliveryStatus === 'COMPLETED' ||
        (linkedDisp?.status as string) === 'Completed'
      );

      const isPodReturned = Boolean(
        !isCompleted && (
          Boolean(podReturnDate && podReturnDate.trim() !== '') ||
          rawDel?.podStatus === 'POD RETURNED' ||
          rawDel?.podStatus === 'RETURNED' ||
          rawDel?.status === 'POD RETURNED' ||
          rawDel?.deliveryStatus === 'POD RETURNED' ||
          linkedFwd?.podStatus === 'Returned' ||
          (linkedFwd?.podStatus as any) === 'POD RETURNED' ||
          (linkedDisp as any)?.podStatus === 'Returned'
        )
      );

      const isPodPending = Boolean(
        !isCompleted && 
        !isPodReturned && (
          rawDel?.status === 'POD PENDING' ||
          rawDel?.deliveryStatus === 'POD PENDING' ||
          linkedFwd?.deliveryStatus === 'POD PENDING' ||
          (actualDeliveryDate && (rawDel?.podStatus === 'POD PENDING' || (rawDel?.podStatus as string) === 'PENDING' || linkedFwd?.podStatus === 'Pending Return' || (linkedFwd?.podStatus as string) === 'Pending'))
        )
      );

      const isDelivered = Boolean(
        !isCompleted && 
        !isPodReturned && 
        !isPodPending && (
          Boolean(actualDeliveryDate && actualDeliveryDate.trim() !== '') ||
          rawDel?.status === 'DELIVERED' ||
          rawDel?.status === 'Delivered' ||
          rawDel?.deliveryStatus === 'DELIVERED' ||
          rawDel?.deliveryStatus === 'Delivered' ||
          rawDel?.driverProgressStatus === 'Delivered' ||
          linkedFwd?.deliveryStatus === 'Delivered' ||
          linkedDisp?.status === 'Delivered'
        )
      );

      const isInTransit = Boolean(
        !isCompleted && 
        !isPodReturned && 
        !isPodPending && 
        !isDelivered && (
          linkedDisp?.status === 'Departed' ||
          linkedDisp?.status === 'In Transit' ||
          linkedFwd?.deliveryStatus === 'In Transit' ||
          rawDel?.dispatchOperationalStatus === 'DEPARTED' ||
          linkedRun?.dispatchOperationalStatus === 'DEPARTED' ||
          Boolean(rawDel?.actualDeparture && rawDel.actualDeparture.trim() !== '') ||
          Boolean(linkedRun?.actualDeparture && linkedRun.actualDeparture.trim() !== '') ||
          Boolean(linkedDisp?.actualDepartureTime && linkedDisp.actualDepartureTime.trim() !== '') ||
          rawDel?.status === 'DEPARTED' ||
          rawDel?.status === 'IN TRANSIT' ||
          rawDel?.deliveryStatus === 'DEPARTED' ||
          rawDel?.deliveryStatus === 'IN TRANSIT' ||
          rawDel?.driverProgressStatus === 'In Transit' ||
          rawDel?.driverProgressStatus === 'Out for Delivery' ||
          linkedRun?.status === 'Dispatched'
        )
      );

      const isAssigned = Boolean(
        !isCompleted && 
        !isPodReturned && 
        !isPodPending && 
        !isDelivered && 
        !isInTransit && (
          (Boolean(driver && driver.trim() !== '' && driver !== 'Unassigned')) ||
          rawDel?.status === 'ASSIGNED' ||
          rawDel?.deliveryStatus === 'ASSIGNED' ||
          rawDel?.status === 'READY FOR DISPATCH' ||
          rawDel?.deliveryStatus === 'READY FOR DISPATCH' ||
          linkedRun?.status === 'Ready for Dispatch' ||
          linkedDisp?.status === 'In Loading' ||
          (linkedDisp?.status as string) === 'Scheduled' ||
          rawDel?.dispatchOperationalStatus === 'READY FOR DISPATCH' ||
          rawDel?.dispatchOperationalStatus === 'ARRIVED' ||
          rawDel?.dispatchOperationalStatus === 'LOADING' ||
          rawDel?.dispatchOperationalStatus === 'LOADING COMPLETED' ||
          linkedRun?.dispatchOperationalStatus === 'READY FOR DISPATCH' ||
          linkedRun?.dispatchOperationalStatus === 'ARRIVED' ||
          linkedRun?.dispatchOperationalStatus === 'LOADING' ||
          linkedRun?.dispatchOperationalStatus === 'LOADING COMPLETED'
        )
      );

      const isPlanned = Boolean(
        !isCompleted && 
        !isPodReturned && 
        !isPodPending && 
        !isDelivered && 
        !isInTransit && 
        !isAssigned && (
          Boolean(rawDel?.truckRunId || rawDel?.truckRunNumber || linkedRun?.id) ||
          rawDel?.status === 'PLANNED' ||
          rawDel?.deliveryStatus === 'PLANNED' ||
          (linkedDisp?.status as string) === 'Scheduled' ||
          linkedDisp?.status === 'Pending Pickup'
        )
      );

      if (isCompleted) {
        canonicalStatus = 'COMPLETED';
      } else if (isPodReturned) {
        canonicalStatus = 'POD RETURNED';
      } else if (isPodPending) {
        canonicalStatus = 'POD PENDING';
      } else if (isDelivered) {
        canonicalStatus = 'DELIVERED';
      } else if (isInTransit) {
        canonicalStatus = 'IN TRANSIT';
      } else if (isAssigned) {
        canonicalStatus = 'ASSIGNED';
      } else if (isPlanned) {
        canonicalStatus = 'PLANNED';
      } else {
        canonicalStatus = 'CREATED';
      }

      // Delivery Performance Evaluation (Section 3: RDD & Lead Time SLA)
      const leadTime = getAutoDeliveryLeadTime(clientName, modeOfShipment, area) || linkedFwd?.deliveryLeadTimeDays || 3;
      const hasDeliveryHappened = isDelivered || isPodPending || isPodReturned || isCompleted;
      
      let deliveryPerfResult: 'HIT' | 'MISSED' | 'PENDING' | 'INSUFFICIENT_DATA' = 'PENDING';
      let activeTargetDate: string | null = null;
      let isRddTarget = false;

      if (hasDeliveryHappened && actualDeliveryDate) {
        const perfEval = evaluateDeliveryPerformance(
          actualDispatchDate,
          actualDeliveryDate,
          leadTime,
          DEFAULT_REGULAR_HOLIDAYS,
          rdd || undefined
        );
        deliveryPerfResult = perfEval.performance;
        activeTargetDate = perfEval.activeTargetDate;
        isRddTarget = perfEval.isRddOverride;
      } else if (hasDeliveryHappened) {
        if (linkedDisp?.status === 'Delayed' || linkedFwd?.deliveryStatus === 'Delayed') {
          deliveryPerfResult = 'MISSED';
        } else {
          deliveryPerfResult = 'HIT';
        }
      }

      // Check if pending delivery is delayed (overdue)
      let isPendingDelayed = false;
      if (!hasDeliveryHappened) {
        if (linkedDisp?.status === 'Delayed' || linkedFwd?.deliveryStatus === 'Delayed') {
          isPendingDelayed = true;
        } else {
          const expRes = calculateExpectedDeliveryDate(actualDispatchDate, modeOfShipment, area);
          const targetDate = rdd || expRes.expectedDeliveryDate;
          if (targetDate) {
            const sysToday = getSystemTodayDateStr();
            if (sysToday > targetDate) {
              isPendingDelayed = true;
            }
          }
        }
      }

      // POD SLA Evaluation (Section 5: Working Days & Lead Time)
      const podDueRes = calculatePodReturnDueDate(actualDeliveryDate || actualDispatchDate, clientName, area);
      const podDueDate = podDueRes.podReturnDueDate;
      const isPodDone = Boolean(podReturnDate && podReturnDate.trim() !== '');
      let podSla: 'HIT' | 'MISSED' | 'PENDING' = 'PENDING';
      let isPodOverdue = false;

      if (hasDeliveryHappened) {
        if (isPodDone && podDueDate) {
          podSla = podReturnDate <= podDueDate ? 'HIT' : 'MISSED';
        } else if (isPodDone) {
          podSla = 'HIT';
        } else if (podDueDate) {
          const sysToday = getSystemTodayDateStr();
          if (sysToday > podDueDate) {
            isPodOverdue = true;
            podSla = 'MISSED';
          }
        }
      }

      return {
        raw: rawDel || linkedDisp || linkedFwd,
        id,
        deliveryId,
        batchName: rawDel?.batchName || (linkedDisp ? 'Daily Dispatch' : 'Forwarding Consignment'),
        client: clientName,
        clientId,
        coordinator,
        consignee,
        podNumber,
        destination,
        area,
        quantity,
        unit,
        modeOfShipment,
        rdd,
        referenceNumber,
        driver,
        plateNumber,
        truckName,
        truckRunId: rawDel?.truckRunId || linkedRun?.id,
        truckRunNumber: rawDel?.truckRunNumber || linkedRun?.truckRunNumber || '',
        truckDispatchPod: rawDel?.truckDispatchPod || linkedRun?.truckDispatchPod || '',
        timeArrived: rawDel?.timeArrived || linkedRun?.timeArrived || linkedDisp?.timeArrived || '',
        startLoadingTime: rawDel?.startLoadingTime || linkedRun?.startLoadingTime || linkedDisp?.startLoadingTime || '',
        endLoadingTime: rawDel?.endLoadingTime || linkedRun?.endLoadingTime || linkedDisp?.endLoadingTime || '',
        actualDeparture: rawDel?.actualDeparture || linkedRun?.actualDeparture || linkedDisp?.actualDepartureTime || '',
        actualDeliveryDate,
        dateReceived: rawDel?.dateReceived || actualDeliveryDate,
        recipientName: rawDel?.recipientName || rawDel?.receiversName || linkedFwd?.receiversName || linkedPodNotif?.recipientName || '',
        podReturnDate,
        podStatus: rawDel?.podStatus || linkedFwd?.podStatus,
        canonicalStatus,
        primaryDeliveryDate,
        actualDispatchDate,
        plannedDate,
        deliveryPerfResult,
        isPendingDelayed,
        activeTargetDate,
        isRddTarget,
        hasDeliveryHappened,
        podDueDate,
        podDueDateFormatted: podDueRes.podReturnDueDateFormatted,
        isPodDone,
        podSla,
        isPodOverdue,
      };
    };

    // 1. Process all active individual deliveries
    allDeliveries.forEach((del) => {
      if ((del as any).isDeleted) return;

      const delPod = normalizeKey(del.individualDeliveryPod || (del as any).podNumber);
      const delRef = normalizeKey(del.referenceNumber);

      const linkedRun = activeTruckRuns.find(
        (r) => r.id === del.truckRunId || r.truckRunNumber === del.truckRunNumber || r.deliveryIds?.includes(del.id)
      );

      const linkedDisp = activeDispatches.find(
        (d) =>
          d.id === del.id ||
          d.deliveryId === del.id ||
          d.deliveryId === del.deliveryId ||
          (d as any).individualDeliveryId === del.id ||
          (delPod && normalizeKey(d.podNumber) === delPod) ||
          (delRef && normalizeKey(d.manifestNumber) === delRef)
      );

      const linkedFwd = activeForwarding.find(
        (f) =>
          f.id === del.id ||
          f.deliveryId === del.id ||
          f.deliveryId === del.deliveryId ||
          (f as any).individualDeliveryId === del.id ||
          (delPod && (normalizeKey(f.individualDeliveryPod) === delPod || normalizeKey(f.podNumber) === delPod)) ||
          (delRef && normalizeKey(f.referenceNumber) === delRef)
      );

      const linkedPodNotif = allPodReturningNotifs.find(
        (p) =>
          p.deliveryId === del.id ||
          p.deliveryId === del.deliveryId ||
          p.recordId === del.id ||
          (delPod && normalizeKey(p.individualDeliveryPod) === delPod)
      );

      if (linkedDisp) matchedDispatchIds.add(linkedDisp.id);
      if (linkedFwd) matchedForwardingIds.add(linkedFwd.id);
      if (delPod) matchedPods.add(delPod);
      if (linkedDisp?.podNumber) matchedPods.add(normalizeKey(linkedDisp.podNumber));
      if (linkedFwd?.podNumber) matchedPods.add(normalizeKey(linkedFwd.podNumber));
      if (delRef) matchedRefs.add(delRef);
      if (linkedDisp?.manifestNumber) matchedRefs.add(normalizeKey(linkedDisp.manifestNumber));
      if (linkedFwd?.referenceNumber) matchedRefs.add(normalizeKey(linkedFwd.referenceNumber));

      list.push(enrichSingle({
        rawDel: del,
        linkedRun,
        linkedDisp,
        linkedFwd,
        linkedPodNotif,
      }));
    });

    // 2. Process all Daily Dispatching records that are not yet part of an individual delivery
    activeDispatches.forEach((disp) => {
      const dispPod = normalizeKey(disp.podNumber);
      const dispRef = normalizeKey(disp.manifestNumber);

      if (matchedDispatchIds.has(disp.id)) return;
      if (dispPod && matchedPods.has(dispPod)) return;
      if (dispRef && matchedRefs.has(dispRef)) return;

      const linkedFwd = activeForwarding.find(
        (f) =>
          !matchedForwardingIds.has(f.id) && (
            f.id === disp.id ||
            f.deliveryId === disp.id ||
            (dispPod && (normalizeKey(f.podNumber) === dispPod || normalizeKey(f.individualDeliveryPod) === dispPod)) ||
            (dispRef && normalizeKey(f.referenceNumber) === dispRef)
          )
      );

      const linkedRun = activeTruckRuns.find(
        (r) => (disp.plateNumber && r.plateNumber === disp.plateNumber) ||
               (disp.driverName && r.driver === disp.driverName)
      );

      const linkedPodNotif = allPodReturningNotifs.find(
        (p) => p.deliveryId === disp.id || p.recordId === disp.id || (dispPod && normalizeKey(p.individualDeliveryPod) === dispPod)
      );

      matchedDispatchIds.add(disp.id);
      if (dispPod) matchedPods.add(dispPod);
      if (dispRef) matchedRefs.add(dispRef);
      if (linkedFwd) {
        matchedForwardingIds.add(linkedFwd.id);
        if (linkedFwd.podNumber) matchedPods.add(normalizeKey(linkedFwd.podNumber));
        if (linkedFwd.referenceNumber) matchedRefs.add(normalizeKey(linkedFwd.referenceNumber));
      }

      list.push(enrichSingle({
        linkedDisp: disp,
        linkedFwd,
        linkedRun,
        linkedPodNotif,
      }));
    });

    // 3. Process all Forwarding Progressive records that are not yet matched
    activeForwarding.forEach((fwd) => {
      const fwdPod = normalizeKey(fwd.podNumber || fwd.individualDeliveryPod);
      const fwdRef = normalizeKey(fwd.referenceNumber);

      if (matchedForwardingIds.has(fwd.id)) return;
      if (fwdPod && matchedPods.has(fwdPod)) return;
      if (fwdRef && matchedRefs.has(fwdRef)) return;

      const linkedPodNotif = allPodReturningNotifs.find(
        (p) => p.deliveryId === fwd.id || p.recordId === fwd.id || (fwdPod && normalizeKey(p.individualDeliveryPod) === fwdPod)
      );

      matchedForwardingIds.add(fwd.id);
      if (fwdPod) matchedPods.add(fwdPod);
      if (fwdRef) matchedRefs.add(fwdRef);

      list.push(enrichSingle({
        linkedFwd: fwd,
        linkedPodNotif,
      }));
    });

    return list;
  }, [allDeliveries, activeTruckRuns, activeDispatches, activeForwarding, allPodReturningNotifs, activeClients]);

  // Extract unique filter dropdown values
  const availableCoordinators = useMemo(() => {
    const set = new Set<string>();
    enrichedDeliveries.forEach(d => { if (d.coordinator) set.add(d.coordinator); });
    activeClients.forEach(c => { if (c.assignedCoordinator) set.add(c.assignedCoordinator); });
    return Array.from(set).sort();
  }, [enrichedDeliveries, activeClients]);

  const availableDrivers = useMemo(() => {
    const set = new Set<string>();
    enrichedDeliveries.forEach(d => { if (d.driver && d.driver !== 'Unassigned') set.add(d.driver); });
    activeTruckRuns.forEach(r => { if (r.driver && r.driver !== 'Unassigned') set.add(r.driver); });
    return Array.from(set).sort();
  }, [enrichedDeliveries, activeTruckRuns]);

  // ---------------------------------------------------------------------------
  // 3. APPLY ROLE-BASED ACCESS GUARDS & ACTIVE FILTERS
  // ---------------------------------------------------------------------------
  const roleFilteredDeliveries = useMemo(() => {
    return enrichedDeliveries.filter(del => {
      // Role scoping guards
      if (isCoordinator) {
        const matchesClient = isClientAssignedToUser(activeUserProfile, del.client);
        const matchesCoordinator = del.coordinator.toLowerCase() === (activeUserProfile?.name || '').toLowerCase();
        if (!matchesClient && !matchesCoordinator) return false;
      }
      if (isDriverHelper) {
        const isAuthDriver = isUserAuthorizedDriverForDelivery(activeUserProfile, undefined, del.driver);
        const driverNameMatch = del.driver.toLowerCase() === (activeUserProfile?.name || '').toLowerCase();
        if (!isAuthDriver && !driverNameMatch) return false;
      }
      return true;
    });
  }, [enrichedDeliveries, isCoordinator, isDriverHelper, activeUserProfile]);

  const filteredDeliveries = useMemo(() => {
    return roleFilteredDeliveries.filter(del => {
      // Client filter
      if (!isRecordForSelectedClient(del.client, del.clientId)) return false;

      // Coordinator filter
      if (selectedCoordinatorFilter !== 'ALL') {
        if (!del.coordinator || del.coordinator.toLowerCase() !== selectedCoordinatorFilter.toLowerCase()) {
          return false;
        }
      }

      // Area filter
      if (selectedAreaFilter !== 'ALL') {
        if (!del.area || del.area.toLowerCase() !== selectedAreaFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (del.canonicalStatus !== selectedStatusFilter) {
          return false;
        }
      }

      // Driver filter
      if (selectedDriverFilter !== 'ALL') {
        if (!del.driver || del.driver.toLowerCase() !== selectedDriverFilter.toLowerCase()) {
          return false;
        }
      }

      // Date Range filter (using primary delivery date: RDD / Delivery Date / Planned Date)
      if (!isDateInPeriod(del.primaryDeliveryDate)) return false;

      return true;
    });
  }, [
    roleFilteredDeliveries, 
    selectedClientFilter, 
    selectedCoordinatorFilter, 
    selectedAreaFilter, 
    selectedStatusFilter, 
    selectedDriverFilter, 
    selectedPeriod, 
    customStartDate, 
    customEndDate
  ]);

  // ---------------------------------------------------------------------------
  // 4. DELIVERY SUMMARY COUNTERS (Requirement 2 - Connected & Mutually Exclusive)
  // ---------------------------------------------------------------------------
  const deliverySummaryCounters = useMemo(() => {
    const total = filteredDeliveries.length;
    let created = 0;
    let planned = 0;
    let assigned = 0;
    let inTransit = 0;
    let delivered = 0;
    let podPending = 0;
    let podReturned = 0;
    let completed = 0;

    filteredDeliveries.forEach(del => {
      switch (del.canonicalStatus) {
        case 'CREATED':
          created++;
          break;
        case 'PLANNED':
          planned++;
          break;
        case 'ASSIGNED':
          assigned++;
          break;
        case 'IN TRANSIT':
          inTransit++;
          break;
        case 'DELIVERED':
          delivered++;
          break;
        case 'POD PENDING':
          podPending++;
          break;
        case 'POD RETURNED':
          podReturned++;
          break;
        case 'COMPLETED':
          completed++;
          break;
      }
    });

    const base = total > 0 ? total : 1;
    return {
      total,
      created,
      planned,
      assigned,
      inTransit,
      delivered,
      podPending,
      podReturned,
      completed,
      createdPct: Math.round((created / base) * 100),
      plannedPct: Math.round((planned / base) * 100),
      assignedPct: Math.round((assigned / base) * 100),
      inTransitPct: Math.round((inTransit / base) * 100),
      deliveredPct: Math.round((delivered / base) * 100),
      podPendingPct: Math.round((podPending / base) * 100),
      podReturnedPct: Math.round((podReturned / base) * 100),
      completedPct: Math.round((completed / base) * 100),
    };
  }, [filteredDeliveries]);

  // ---------------------------------------------------------------------------
  // 5. DELIVERY PERFORMANCE OVERVIEW (Requirement 3 - On-Time, Delayed, Pending, SLA %)
  // ---------------------------------------------------------------------------
  const deliveryPerformanceOverview = useMemo(() => {
    let onTimeCount = 0;
    let delayedCount = 0;
    let pendingCount = 0;
    let rddRespectedCount = 0;

    filteredDeliveries.forEach(del => {
      if (del.rdd) {
        rddRespectedCount++;
      }

      if (del.hasDeliveryHappened) {
        if (del.deliveryPerfResult === 'HIT') {
          onTimeCount++;
        } else if (del.deliveryPerfResult === 'MISSED') {
          delayedCount++;
        } else {
          onTimeCount++;
        }
      } else {
        if (del.isPendingDelayed) {
          delayedCount++;
        } else {
          pendingCount++;
        }
      }
    });

    const totalEvaluated = onTimeCount + delayedCount;
    const performancePercentage = totalEvaluated > 0 
      ? ((onTimeCount / totalEvaluated) * 100).toFixed(1)
      : '0.0';

    return {
      onTimeCount,
      delayedCount,
      pendingCount,
      totalEvaluated,
      performancePercentage,
      rddRespectedCount,
    };
  }, [filteredDeliveries]);

  // ---------------------------------------------------------------------------
  // 6. DISPATCH OPERATIONS OVERVIEW (Requirement 4 - Separate Truck Run Summary)
  // ---------------------------------------------------------------------------
  const dispatchOperationsOverview = useMemo(() => {
    // Role filter for Truck Runs
    const roleScopedRuns = activeTruckRuns.filter(run => {
      if (isCoordinator) {
        const matchesClient = run.clients?.some(c => isClientAssignedToUser(activeUserProfile, c)) || 
          isClientAssignedToUser(activeUserProfile, run.client);
        if (!matchesClient) return false;
      }
      if (isDriverHelper) {
        const isAuth = isUserAuthorizedDriverForDelivery(activeUserProfile, undefined, run.driver);
        const nameMatch = (run.driver || '').toLowerCase() === (activeUserProfile?.name || '').toLowerCase();
        if (!isAuth && !nameMatch) return false;
      }
      return true;
    });

    // Apply dashboard filters
    const filteredRuns = roleScopedRuns.filter(run => {
      // Client filter
      if (selectedClientFilter !== 'ALL') {
        const clientMatch = run.clients?.some(c => c.toLowerCase() === selectedClientFilter.toLowerCase()) ||
          (run.client && run.client.toLowerCase() === selectedClientFilter.toLowerCase());
        if (!clientMatch) return false;
      }

      // Area filter
      if (selectedAreaFilter !== 'ALL') {
        if (!run.deliveryArea || run.deliveryArea.toLowerCase() !== selectedAreaFilter.toLowerCase()) {
          return false;
        }
      }

      // Driver filter
      if (selectedDriverFilter !== 'ALL') {
        if (!run.driver || run.driver.toLowerCase() !== selectedDriverFilter.toLowerCase()) {
          return false;
        }
      }

      // Date Range filter (using Planned Dispatch Date or Departure Date)
      const runDate = run.plannedDispatchDate || (run.actualDeparture ? run.actualDeparture.slice(0, 10) : '') || run.createdAt?.slice(0, 10);
      if (!isDateInPeriod(runDate)) return false;

      return true;
    });

    const totalTruckRuns = filteredRuns.length;
    let readyForDispatch = 0;
    let arrived = 0;
    let loading = 0;
    let loadingCompleted = 0;
    let departed = 0;
    let completedDispatches = 0;

    filteredRuns.forEach(run => {
      const opStatus = run.dispatchOperationalStatus;
      const isDeparted = Boolean(run.actualDeparture && run.actualDeparture.trim() !== '') || 
        opStatus === 'DEPARTED' || run.status === 'Dispatched';
      const isLoadDone = Boolean(run.endLoadingTime && run.endLoadingTime.trim() !== '') || 
        opStatus === 'LOADING COMPLETED';
      const isLoadActive = Boolean(run.startLoadingTime && run.startLoadingTime.trim() !== '') || 
        opStatus === 'LOADING';
      const isArrivedAtDock = Boolean(run.timeArrived && run.timeArrived.trim() !== '') || 
        opStatus === 'ARRIVED';

      if (run.status === 'Completed') {
        completedDispatches++;
        departed++;
      } else if (isDeparted) {
        departed++;
      } else if (isLoadDone) {
        loadingCompleted++;
      } else if (isLoadActive) {
        loading++;
      } else if (isArrivedAtDock) {
        arrived++;
      } else {
        readyForDispatch++;
      }
    });

    const activeOperations = readyForDispatch + arrived + loading + loadingCompleted;
    const completionRate = totalTruckRuns > 0 ? ((departed / totalTruckRuns) * 100).toFixed(1) : '0.0';

    return {
      totalTruckRuns,
      readyForDispatch,
      arrived,
      loading,
      loadingCompleted,
      departed,
      completedDispatches,
      activeOperations,
      completionRate,
      filteredRuns,
    };
  }, [
    activeTruckRuns, 
    isCoordinator, 
    isDriverHelper, 
    activeUserProfile, 
    selectedClientFilter, 
    selectedAreaFilter, 
    selectedDriverFilter, 
    selectedPeriod, 
    customStartDate, 
    customEndDate
  ]);

  // ---------------------------------------------------------------------------
  // 7. POD RETURNING OVERVIEW (Requirement 5 - Delivered Requiring POD, SLA, Overdue)
  // ---------------------------------------------------------------------------
  const podReturningOverview = useMemo(() => {
    // Only deliveries that have physically reached destination require POD
    const deliveredPool = filteredDeliveries.filter(del => del.hasDeliveryHappened);
    const totalDeliveredRequiringPod = deliveredPool.length;

    let podPending = 0;
    let podReturned = 0;
    let slaHit = 0;
    let slaMissed = 0;
    let overduePodRecords = 0;

    deliveredPool.forEach(del => {
      if (del.isPodDone) {
        podReturned++;
        if (del.podSla === 'HIT') {
          slaHit++;
        } else if (del.podSla === 'MISSED') {
          slaMissed++;
        } else {
          slaHit++;
        }
      } else {
        podPending++;
        if (del.isPodOverdue) {
          overduePodRecords++;
        }
      }
    });

    const totalEvaluatedSla = slaHit + slaMissed;
    const podSlaPercentage = totalEvaluatedSla > 0 
      ? ((slaHit / totalEvaluatedSla) * 100).toFixed(1)
      : '0.0';

    const fulfillmentPercentage = totalDeliveredRequiringPod > 0 
      ? Math.round((podReturned / totalDeliveredRequiringPod) * 100)
      : 0;

    return {
      totalDeliveredRequiringPod,
      podPending,
      podReturned,
      slaHit,
      slaMissed,
      overduePodRecords,
      totalEvaluatedSla,
      podSlaPercentage,
      fulfillmentPercentage,
    };
  }, [filteredDeliveries]);

  // ---------------------------------------------------------------------------
  // 8. CLIENT-LEVEL OPERATIONAL BREAKDOWN TABLE (Permitted & Scoped)
  // ---------------------------------------------------------------------------
  const clientSummariesList = useMemo(() => {
    const totalSystemDeliveries = filteredDeliveries.length || 1;

    return activeClients.map(client => {
      const clientNameLower = client.name.toLowerCase();

      // Filter deliveries for this client
      const matchingDeliveries = filteredDeliveries.filter(
        d => d.client.toLowerCase() === clientNameLower || d.clientId === client.id
      );

      const totalDeliveries = matchingDeliveries.length;
      let deliveredCount = 0;
      let delayedCount = 0;
      let onTimeCount = 0;
      let podPendingCount = 0;
      let podReturnedCount = 0;
      let podHitCount = 0;
      let podMissedCount = 0;

      matchingDeliveries.forEach(del => {
        if (del.hasDeliveryHappened) {
          deliveredCount++;
          if (del.deliveryPerfResult === 'HIT') {
            onTimeCount++;
          } else if (del.deliveryPerfResult === 'MISSED') {
            delayedCount++;
          }
        }

        if (del.isPodDone) {
          podReturnedCount++;
          if (del.podSla === 'HIT') podHitCount++;
          if (del.podSla === 'MISSED') podMissedCount++;
        } else if (del.hasDeliveryHappened) {
          podPendingCount++;
        }
      });

      const totalDeliverySlaEval = onTimeCount + delayedCount;
      const deliverySlaRate = totalDeliverySlaEval > 0
        ? `${((onTimeCount / totalDeliverySlaEval) * 100).toFixed(1)}%`
        : 'N/A';

      const totalPodSlaEval = podHitCount + podMissedCount;
      const podSlaRate = totalPodSlaEval > 0
        ? `${((podHitCount / totalPodSlaEval) * 100).toFixed(1)}%`
        : 'N/A';

      const sharePercentage = Math.round((totalDeliveries / totalSystemDeliveries) * 100);

      return {
        id: client.id,
        name: client.name,
        code: client.code,
        assignedCoordinator: client.assignedCoordinator || client.accountManager || 'Operations Hub',
        totalDeliveries,
        deliveredCount,
        delayedCount,
        deliverySlaRate,
        podPendingCount,
        podReturnedCount,
        podSlaRate,
        sharePercentage,
      };
    })
    .filter(c => c.totalDeliveries > 0 || selectedClientFilter === 'ALL')
    .sort((a, b) => b.totalDeliveries - a.totalDeliveries);
  }, [activeClients, filteredDeliveries, selectedClientFilter]);

  // ---------------------------------------------------------------------------
  // 9. OPERATIONAL ALERTS SUMMARY (Action Required Notifications)
  // ---------------------------------------------------------------------------
  const actionRequiredAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: 'POD Overdue' | 'POD Pending' | 'Delivery Delayed' | 'Ready for Dispatch';
      severity: 'high' | 'medium' | 'low';
      badgeText: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    // Overdue PODs
    const overdueDeliveries = filteredDeliveries.filter(d => d.isPodOverdue);
    overdueDeliveries.slice(0, 3).forEach(d => {
      alerts.push({
        id: `alert-pod-overdue-${d.id}`,
        title: `Overdue POD: ${d.client}`,
        subtitle: `POD #${d.podNumber} • Consignee: ${d.consignee} • Target: ${d.podDueDateFormatted || d.podDueDate}`,
        category: 'POD Overdue',
        severity: 'high',
        badgeText: 'POD OVERDUE',
        actionLabel: 'OPEN POD',
        onAction: () => onNavigate('pod_returning'),
      });
    });

    // Delayed deliveries
    const delayedDels = filteredDeliveries.filter(d => d.deliveryPerfResult === 'MISSED');
    delayedDels.slice(0, 3).forEach(d => {
      alerts.push({
        id: `alert-del-delayed-${d.id}`,
        title: `Delivery Delayed: ${d.client}`,
        subtitle: `Consignee: ${d.consignee} • RDD/Target: ${d.activeTargetDate || d.rdd || 'Overdue'}`,
        category: 'Delivery Delayed',
        severity: 'high',
        badgeText: 'DELIVERY DELAYED',
        actionLabel: 'VIEW RECORD',
        onAction: () => onNavigate('forwarding_report'),
      });
    });

    // Unassigned or Ready for Dispatch Truck Runs
    const readyRuns = dispatchOperationsOverview.filteredRuns.filter(r => r.status === 'Ready for Dispatch');
    readyRuns.slice(0, 2).forEach(r => {
      alerts.push({
        id: `alert-run-ready-${r.id}`,
        title: `Ready for Dispatch: ${r.truckRunNumber}`,
        subtitle: `${r.routeLocation} • ${r.plateNumber || 'No Plate'} • Driver: ${r.driver || 'Unassigned'}`,
        category: 'Ready for Dispatch',
        severity: 'medium',
        badgeText: 'DISPATCH READY',
        actionLabel: 'DISPATCH BAY',
        onAction: () => onNavigate('dispatch'),
      });
    });

    return alerts;
  }, [filteredDeliveries, dispatchOperationsOverview.filteredRuns, onNavigate]);

  // Active filter state check
  const isAnyFilterActive = 
    selectedPeriod !== 'ALL' ||
    selectedClientFilter !== 'ALL' ||
    selectedCoordinatorFilter !== 'ALL' ||
    selectedAreaFilter !== 'ALL' ||
    selectedStatusFilter !== 'ALL' ||
    selectedDriverFilter !== 'ALL';

  const handleResetAllFilters = () => {
    setSelectedPeriod('ALL');
    setSelectedClientFilter('ALL');
    setSelectedCoordinatorFilter('ALL');
    setSelectedAreaFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSelectedDriverFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* --------------------------------------------------------------------- */}
      {/* 1. HEADER & QUICK OPERATIONAL ACTIONS */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white p-3.5 sm:p-6 rounded-lg border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <span>Good day, {activeUserProfile?.name || currentUser.name}!</span>
              <span role="img" aria-label="wave">👋</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {roleDisplay.fullBadge} • Central Operational Summary
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Dynamic real-time summarization across Individual Deliveries, Truck Runs, Dispatch Operations, and POD Returning.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isReadOnly && (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-2xs min-h-[36px]">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Read-Only Portal</span>
            </div>
          )}

          {!isReadOnly && onOpenAddDispatchModal && (rolePermissions.canDailyDispatch === 'Full' || rolePermissions.canDailyDispatch === 'Add/Edit/Import') && (
            <button
              id="dashboard-btn-add-dispatch"
              onClick={onOpenAddDispatchModal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs transition-colors cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD DISPATCH</span>
            </button>
          )}

          {!isReadOnly && onOpenAddClientModal && (rolePermissions.canManageClients === 'Full' || rolePermissions.canManageClients === 'Operational') && (
            <button
              id="dashboard-btn-add-client"
              onClick={onOpenAddClientModal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD CLIENT</span>
            </button>
          )}

          <button
            id="dashboard-btn-view-forwarding"
            onClick={() => onNavigate('forwarding_report')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer min-h-[36px]"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>FORWARDING REPORT</span>
          </button>

          {!isReadOnly && rolePermissions.canImportExcel && (
            <div className="relative group">
              <button
                id="dashboard-btn-download-template"
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer hover:text-blue-700 min-h-[36px]"
                title="Download module-specific Excel template for bulk encoding"
              >
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>Download Template ▾</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 w-56 max-w-[calc(100vw-32px)]">
                <button
                  type="button"
                  onClick={() => downloadDailyDispatchTemplate(activeClients)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium min-h-[36px]"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Daily Dispatch Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadForwardingTemplate(activeClients)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium min-h-[36px]"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Forwarding Report Template</span>
                </button>
              </div>
            </div>
          )}

          {!isReadOnly && rolePermissions.canImportExcel && onOpenImportModal && (
            <div className="relative group">
              <button
                id="dashboard-btn-import-excel"
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer min-h-[36px]"
                title="Bulk Import Excel Records into Daily Dispatching or Forwarding"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>IMPORT EXCEL ▾</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 w-56 max-w-[calc(100vw-32px)]">
                <button
                  type="button"
                  onClick={() => onOpenImportModal('dispatch')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium min-h-[36px]"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Import Daily Dispatching</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenImportModal('forwarding')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-medium min-h-[36px]"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Import Forwarding Report</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role-specific Notice Banner if viewing scoped data */}
      {isCoordinator && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              <strong>Coordinator Scope:</strong> Dashboard counters and summaries are restricted to your assigned accounts and coordinated delivery projects.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-purple-200">
            {filteredDeliveries.length} Coordinated Deliveries
          </span>
        </div>
      )}

      {isDriverHelper && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Driver Scope:</strong> Dashboard is scoped strictly to deliveries assigned to your driver roster profile ({activeUserProfile?.name || 'Driver'}).
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
            {filteredDeliveries.length} Assigned Deliveries
          </span>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. DASHBOARD FILTERS TOOLBAR (Requirement 6)                          */}
      {/* Date Range, Client, Coordinator, Delivery Area, Status, Driver        */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Date Filter:</span>
            </div>

            <div className="inline-flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 max-w-full">
              {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DashboardPeriodFilter[]).map((period) => (
                <button
                  key={period}
                  id={`period-filter-${period.toLowerCase()}`}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors cursor-pointer min-h-[30px] flex items-center ${
                    selectedPeriod === period
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {period === 'ALL' && 'All Time'}
                  {period === 'TODAY' && 'Today'}
                  {period === 'WEEK' && 'This Week'}
                  {period === 'MONTH' && 'This Month'}
                  {period === 'CUSTOM' && 'Custom Range'}
                </button>
              ))}
            </div>

            {selectedPeriod === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-md border border-slate-300 text-xs flex-wrap max-w-full">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs font-mono min-h-[30px]"
                />
                <span className="text-slate-400 text-xs font-medium">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs font-mono min-h-[30px]"
                />
              </div>
            )}
          </div>

          {/* Quick Filter Reset */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer ml-auto min-h-[32px]"
              title="Reset all filters to All Time / All Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Granular Secondary Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          
          {/* Client Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Client
            </label>
            <select
              id="dashboard-filter-client"
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Clients ({activeClients.length})</option>
              {activeClients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinator Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Coordinator
            </label>
            <select
              id="dashboard-filter-coordinator"
              value={selectedCoordinatorFilter}
              onChange={(e) => setSelectedCoordinatorFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Coordinators ({availableCoordinators.length})</option>
              {availableCoordinators.map((coord) => (
                <option key={coord} value={coord}>
                  {coord}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Area Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Delivery Area
            </label>
            <select
              id="dashboard-filter-area"
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Areas</option>
              <option value="Luzon">Luzon</option>
              <option value="Visayas">Visayas</option>
              <option value="Mindanao">Mindanao</option>
              <option value="NCR">NCR</option>
            </select>
          </div>

          {/* Delivery Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Delivery Status
            </label>
            <select
              id="dashboard-filter-status"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="PLANNED">Planned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="POD PENDING">POD Pending</option>
              <option value="POD RETURNED">POD Returned</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Driver Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Driver
            </label>
            <select
              id="dashboard-filter-driver"
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Drivers ({availableDrivers.length})</option>
              {availableDrivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Date Field Transparency Bar (Requirement 6 - Clearly indicate which date field is being used) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Date References:</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium">
              Delivery Summary & SLA: <strong>RDD / Delivery Date / Planned Date</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">
              Dispatch Operations: <strong>Planned Dispatch / Departure Time</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-medium">
              POD Returning: <strong>Actual Delivery / POD Return Date</strong>
            </span>
          </div>

          <div className="font-mono text-slate-600 font-semibold">
            <span>{filteredDeliveries.length} Individual Deliveries</span>
            <span className="mx-1.5">•</span>
            <span>{dispatchOperationsOverview.totalTruckRuns} Truck Runs</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. EMPTY STATE (Requirement 8 - Clean feedback when filters return 0) */}
      {/* --------------------------------------------------------------------- */}
      {filteredDeliveries.length === 0 && (
        <div className="bg-white p-8 rounded-lg border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No matching deliveries found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are no individual deliveries matching the selected date range, client, coordinator, or operational status filters.
            </p>
          </div>
          <button
            onClick={handleResetAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 4. DELIVERY SUMMARY COUNTERS (Requirement 2 - Connected Single Source)*/}
      {/* Total Individual Deliveries, Created, Planned, Assigned, In Transit,  */}
      {/* Delivered, POD Pending, POD Returned, Completed                       */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="w-4 h-4 text-blue-700 shrink-0" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Delivery Summary
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Single Source of Truth
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Each Individual Delivery is counted exactly once per active status
          </span>
        </div>

        {/* 9 Connected Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-2 sm:gap-2.5">
          
          {/* Card 1: Total Individual Deliveries */}
          <div 
            id="summary-card-total-deliveries"
            onClick={() => onNavigate('forwarding_report')}
            className="bg-white p-3 sm:p-3.5 rounded-lg border-2 border-slate-300 shadow-xs hover:border-blue-500 transition-all flex flex-col justify-between cursor-pointer group col-span-2 sm:col-span-1 lg:col-span-1 min-h-[104px]"
            title="Total monitored Individual Deliveries in active scope"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 group-hover:text-blue-700 transition-colors leading-tight min-h-[22px]">
                Total Deliveries
              </span>
              <div className="p-1 rounded bg-blue-50 text-blue-700 shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                {deliverySummaryCounters.total}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500 truncate flex items-center justify-between">
              <span>All active records</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </div>
          </div>

          {/* Card 2: Created */}
          <div 
            id="summary-card-created"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'CREATED' ? 'ALL' : 'CREATED')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'CREATED' ? 'ring-2 ring-slate-600 border-slate-600 bg-slate-50/50' : 'border-slate-200'
            }`}
            title="Newly entered deliveries not yet assigned to a Truck Run"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors leading-tight min-h-[22px]">
                Created
              </span>
              <div className="p-1 rounded bg-slate-100 text-slate-600 shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-slate-800 font-mono">
                {deliverySummaryCounters.created}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-500 truncate">
              {deliverySummaryCounters.createdPct}% of total
            </div>
          </div>

          {/* Card 3: Planned */}
          <div 
            id="summary-card-planned"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'PLANNED' ? 'ALL' : 'PLANNED')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'PLANNED' ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/40' : 'border-slate-200'
            }`}
            title="Consolidated into a Truck Run, awaiting driver assignment"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors leading-tight min-h-[22px]">
                Planned
              </span>
              <div className="p-1 rounded bg-blue-50 text-blue-700 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-blue-800 font-mono">
                {deliverySummaryCounters.planned}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-blue-600 truncate">
              {deliverySummaryCounters.plannedPct}% of total
            </div>
          </div>

          {/* Card 4: Assigned */}
          <div 
            id="summary-card-assigned"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'ASSIGNED' ? 'ALL' : 'ASSIGNED')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'ASSIGNED' ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/40' : 'border-slate-200'
            }`}
            title="Driver and vehicle assigned, staged for hub departure"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-700 transition-colors leading-tight min-h-[22px]">
                Assigned
              </span>
              <div className="p-1 rounded bg-indigo-50 text-indigo-700 shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-indigo-800 font-mono">
                {deliverySummaryCounters.assigned}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-indigo-600 truncate">
              {deliverySummaryCounters.assignedPct}% of total
            </div>
          </div>

          {/* Card 5: In Transit */}
          <div 
            id="summary-card-in-transit"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'IN TRANSIT' ? 'ALL' : 'IN TRANSIT')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-cyan-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'IN TRANSIT' ? 'ring-2 ring-cyan-600 border-cyan-600 bg-cyan-50/40' : 'border-slate-200'
            }`}
            title="Truck departed hub / active linehaul transit"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-cyan-700 transition-colors leading-tight min-h-[22px]">
                In Transit
              </span>
              <div className="p-1 rounded bg-cyan-50 text-cyan-700 shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-cyan-800 font-mono">
                {deliverySummaryCounters.inTransit}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-cyan-600 truncate">
              {deliverySummaryCounters.inTransitPct}% of total
            </div>
          </div>

          {/* Card 6: Delivered */}
          <div 
            id="summary-card-delivered"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'DELIVERED' ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/40' : 'border-slate-200'
            }`}
            title="Consignment arrived and confirmed by driver at consignee"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors leading-tight min-h-[22px]">
                Delivered
              </span>
              <div className="p-1 rounded bg-emerald-50 text-emerald-700 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-emerald-700 font-mono">
                {deliverySummaryCounters.delivered}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-600 truncate">
              {deliverySummaryCounters.deliveredPct}% of total
            </div>
          </div>

          {/* Card 7: POD Pending */}
          <div 
            id="summary-card-pod-pending"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'POD PENDING' ? 'ALL' : 'POD PENDING')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'POD PENDING' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40' : 'border-slate-200'
            }`}
            title="Delivered consignments awaiting physical POD hardcopy return"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors leading-tight min-h-[22px]">
                POD Pending
              </span>
              <div className="p-1 rounded bg-amber-50 text-amber-700 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-amber-700 font-mono">
                {deliverySummaryCounters.podPending}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-amber-600 truncate">
              {deliverySummaryCounters.podPendingPct}% of total
            </div>
          </div>

          {/* Card 8: POD Returned */}
          <div 
            id="summary-card-pod-returned"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'POD RETURNED' ? 'ALL' : 'POD RETURNED')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'POD RETURNED' ? 'ring-2 ring-teal-600 border-teal-600 bg-teal-50/40' : 'border-slate-200'
            }`}
            title="Physical POD hardcopy received & verified by Encoder"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-teal-700 transition-colors leading-tight min-h-[22px]">
                POD Returned
              </span>
              <div className="p-1 rounded bg-teal-50 text-teal-700 shrink-0">
                <FileCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-teal-800 font-mono">
                {deliverySummaryCounters.podReturned}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-teal-600 truncate">
              {deliverySummaryCounters.podReturnedPct}% of total
            </div>
          </div>

          {/* Card 9: Completed */}
          <div 
            id="summary-card-completed"
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`bg-white p-3 sm:p-3.5 rounded-lg border shadow-xs hover:border-emerald-500 transition-all flex flex-col justify-between cursor-pointer group min-h-[104px] ${
              selectedStatusFilter === 'COMPLETED' ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/40' : 'border-slate-200'
            }`}
            title="Entire delivery and documentation workflow finalized"
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors leading-tight min-h-[22px]">
                Completed
              </span>
              <div className="p-1 rounded bg-emerald-100 text-emerald-800 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <span className="text-lg sm:text-xl font-bold text-emerald-800 font-mono">
                {deliverySummaryCounters.completed}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-700 truncate">
              {deliverySummaryCounters.completedPct}% of total
            </div>
          </div>

        </div>

        {/* Visual Multi-Segment Status Distribution Bar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1.5">
            <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
              Delivery Pipeline Progression
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed">
              Created ({deliverySummaryCounters.created}) → Planned ({deliverySummaryCounters.planned}) → Assigned ({deliverySummaryCounters.assigned}) → In Transit ({deliverySummaryCounters.inTransit}) → Delivered ({deliverySummaryCounters.delivered}) → POD Returned ({deliverySummaryCounters.podReturned + deliverySummaryCounters.completed})
            </span>
          </div>

          <div className="w-full h-3 sm:h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
            {deliverySummaryCounters.total > 0 ? (
              <>
                <div 
                  style={{ width: `${deliverySummaryCounters.completedPct}%` }} 
                  className="bg-emerald-600 h-full transition-all duration-300" 
                  title={`Completed: ${deliverySummaryCounters.completed}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.podReturnedPct}%` }} 
                  className="bg-teal-500 h-full transition-all duration-300" 
                  title={`POD Returned: ${deliverySummaryCounters.podReturned}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.podPendingPct}%` }} 
                  className="bg-amber-400 h-full transition-all duration-300" 
                  title={`POD Pending: ${deliverySummaryCounters.podPending}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.deliveredPct}%` }} 
                  className="bg-emerald-400 h-full transition-all duration-300" 
                  title={`Delivered: ${deliverySummaryCounters.delivered}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.inTransitPct}%` }} 
                  className="bg-cyan-500 h-full transition-all duration-300" 
                  title={`In Transit: ${deliverySummaryCounters.inTransit}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.assignedPct}%` }} 
                  className="bg-indigo-400 h-full transition-all duration-300" 
                  title={`Assigned: ${deliverySummaryCounters.assigned}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.plannedPct}%` }} 
                  className="bg-blue-400 h-full transition-all duration-300" 
                  title={`Planned: ${deliverySummaryCounters.planned}`} 
                />
                <div 
                  style={{ width: `${deliverySummaryCounters.createdPct}%` }} 
                  className="bg-slate-300 h-full transition-all duration-300" 
                  title={`Created: ${deliverySummaryCounters.created}`} 
                />
              </>
            ) : (
              <div className="bg-slate-200 w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-medium">
                No individual delivery records match filters
              </div>
            )}
          </div>

          {/* Responsive Touch-Friendly Pipeline Legend */}
          <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap pt-1 text-[10px] text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>Completed ({deliverySummaryCounters.completed})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
              <span>POD Returned ({deliverySummaryCounters.podReturned})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>POD Pending ({deliverySummaryCounters.podPending})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Delivered ({deliverySummaryCounters.delivered})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
              <span>In Transit ({deliverySummaryCounters.inTransit})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
              <span>Assigned ({deliverySummaryCounters.assigned})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span>Planned ({deliverySummaryCounters.planned})</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
              <span>Created ({deliverySummaryCounters.created})</span>
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 5. DELIVERY PERFORMANCE OVERVIEW (Requirement 3 - On-Time, Delayed)    */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-2 rounded bg-blue-50 text-blue-700 shrink-0 mt-0.5 sm:mt-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  DELIVERY PERFORMANCE OVERVIEW
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Standard SLA & RDD Rules
                </span>
                {deliveryPerformanceOverview.rddRespectedCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    RDD Active ({deliveryPerformanceOverview.rddRespectedCount})
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                Evaluates completed consignments against Client Requested Delivery Date (RDD) when available, or working-day lead time rules (Sundays & regular Philippine holidays excluded).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-mono">
              <span className="text-slate-500 text-[11px]">Evaluated:</span>
              <span className="font-bold text-slate-900">{deliveryPerformanceOverview.totalEvaluated}</span>
            </div>
          </div>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          
          {/* 1. On-Time Deliveries */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between text-xs font-bold text-emerald-900 uppercase tracking-wider gap-1">
              <span className="leading-tight">On-Time Deliveries</span>
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-emerald-800">
                {deliveryPerformanceOverview.onTimeCount}
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 mt-1 leading-snug">
              Delivered on or before Target / RDD
            </span>
          </div>

          {/* 2. Delayed Deliveries */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-rose-50/70 border border-rose-200 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between text-xs font-bold text-rose-900 uppercase tracking-wider gap-1">
              <span className="leading-tight">Delayed Deliveries</span>
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-rose-800">
                {deliveryPerformanceOverview.delayedCount}
              </span>
            </div>
            <span className="text-[11px] text-rose-700 mt-1 leading-snug">
              Delivered past Target / RDD date
            </span>
          </div>

          {/* 3. Pending Deliveries */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between text-xs font-bold text-amber-900 uppercase tracking-wider gap-1">
              <span className="leading-tight">Pending Deliveries</span>
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-amber-800">
                {deliveryPerformanceOverview.pendingCount}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 mt-1 leading-snug">
              Consignments currently in progress / transit
            </span>
          </div>

          {/* 4. Delivery Performance Percentage */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-blue-50/80 border border-blue-200 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between text-xs font-bold text-blue-900 uppercase tracking-wider gap-1">
              <span className="leading-tight">Delivery Performance</span>
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-blue-800">
                {deliveryPerformanceOverview.performancePercentage}%
              </span>
            </div>
            <div className="mt-1 space-y-1">
              <div className="w-full h-1.5 bg-blue-200/70 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(deliveryPerformanceOverview.performancePercentage) || 0))}%` }} 
                  className="bg-blue-600 h-full transition-all duration-500" 
                  title={`Performance: ${deliveryPerformanceOverview.performancePercentage}%`}
                />
              </div>
              <span className="text-[10px] text-blue-700 font-mono block">
                On-Time ({deliveryPerformanceOverview.onTimeCount}) ÷ Total ({deliveryPerformanceOverview.totalEvaluated})
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 6. DISPATCH OPERATIONS & POD RETURNING OVERVIEWS (Requirement 4 & 5)   */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        
        {/* SECTION 4: DISPATCH OPERATIONS (Dedicated Truck Run Summary) */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">
                    DISPATCH OPERATIONS
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
                    Truck Runs, dock staging, loading bays, and fleet departures
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono shrink-0">
                <span>{dispatchOperationsOverview.completionRate}% Departed</span>
              </div>
            </div>

            {/* 7 Separate Operational Counters for Truck Runs */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 text-center text-xs">
              
              {/* 1. Total Truck Runs */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Total Runs</div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {dispatchOperationsOverview.totalTruckRuns}
                </div>
                <div className="text-[10px] text-slate-400">Scheduled runs</div>
              </div>

              {/* 2. Ready for Dispatch */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Ready for Dispatch</div>
                <div className="text-xl font-bold font-mono text-teal-800 my-1">
                  {dispatchOperationsOverview.readyForDispatch}
                </div>
                <div className="text-[10px] text-teal-600">Awaiting dock</div>
              </div>

              {/* 3. Arrived */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Arrived</div>
                <div className="text-xl font-bold font-mono text-sky-800 my-1">
                  {dispatchOperationsOverview.arrived}
                </div>
                <div className="text-[10px] text-sky-600">At dispatch dock</div>
              </div>

              {/* 4. Loading */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Loading</div>
                <div className="text-xl font-bold font-mono text-amber-800 my-1">
                  {dispatchOperationsOverview.loading}
                </div>
                <div className="text-[10px] text-amber-600">Active cargo loading</div>
              </div>

              {/* 5. Loading Completed */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Loading Done</div>
                <div className="text-xl font-bold font-mono text-purple-800 my-1">
                  {dispatchOperationsOverview.loadingCompleted}
                </div>
                <div className="text-[10px] text-purple-600">Staged for exit</div>
              </div>

              {/* 6. Departed */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-cyan-50/70 border border-cyan-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Departed</div>
                <div className="text-xl font-bold font-mono text-cyan-800 my-1">
                  {dispatchOperationsOverview.departed}
                </div>
                <div className="text-[10px] text-cyan-600">En route / linehaul</div>
              </div>

              {/* 7. Completed Dispatches */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between col-span-2 sm:col-span-2 min-h-[88px]">
                <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Completed Dispatches</div>
                <div className="text-xl font-bold font-mono text-emerald-800 my-1">
                  {dispatchOperationsOverview.completedDispatches}
                </div>
                <div className="text-[10px] text-emerald-600">All run deliveries finalized</div>
              </div>

            </div>

            {/* Visual Fleet Departure Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium text-[11px]">Fleet Departure Rate</span>
                <span className="font-bold font-mono text-slate-900 text-[11px]">
                  {dispatchOperationsOverview.completionRate}% Departed
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(dispatchOperationsOverview.completionRate) || 0))}%` }} 
                  className="bg-cyan-500 h-full transition-all duration-500" 
                  title={`Departed / Completed: ${dispatchOperationsOverview.departed + dispatchOperationsOverview.completedDispatches}`} 
                />
                <div 
                  style={{ width: `${Math.max(0, 100 - (parseFloat(dispatchOperationsOverview.completionRate) || 0))}%` }} 
                  className="bg-slate-200 h-full transition-all duration-500" 
                  title={`Dock / Loading: ${dispatchOperationsOverview.readyForDispatch + dispatchOperationsOverview.arrived + dispatchOperationsOverview.loading + dispatchOperationsOverview.loadingCompleted}`} 
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Truck Run operations separated from delivery counts</span>
            <button
              onClick={() => onNavigate('dispatch')}
              className="text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1 cursor-pointer min-h-[30px]"
            >
              <span>Daily Dispatch View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SECTION 5: POD RETURNING OVERVIEW (Dedicated Proof of Delivery Summary) */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck className="w-4 h-4 text-purple-700 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">
                    POD RETURNING OVERVIEW
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
                    Hardcopy return tracking, turnaround verification, and POD SLA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono shrink-0">
                <span>{podReturningOverview.podSlaPercentage}% SLA HIT</span>
              </div>
            </div>

            {/* 6 POD Operational Metrics */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 text-center text-xs">
              
              {/* 1. Total Delivered Requiring POD */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Requiring POD</div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {podReturningOverview.totalDeliveredRequiringPod}
                </div>
                <div className="text-[10px] text-slate-400">Total delivered</div>
              </div>

              {/* 2. POD Pending */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">POD Pending</div>
                <div className="text-xl font-bold font-mono text-amber-700 my-1">
                  {podReturningOverview.podPending}
                </div>
                <div className="text-[10px] text-amber-600">Awaiting hardcopy</div>
              </div>

              {/* 3. POD Returned */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">POD Returned</div>
                <div className="text-xl font-bold font-mono text-teal-800 my-1">
                  {podReturningOverview.podReturned}
                </div>
                <div className="text-[10px] text-teal-600">Verified & encoded</div>
              </div>

              {/* 4. SLA HIT */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">SLA HIT</div>
                <div className="text-xl font-bold font-mono text-emerald-800 my-1">
                  {podReturningOverview.slaHit}
                </div>
                <div className="text-[10px] text-emerald-600">Within turnaround</div>
              </div>

              {/* 5. SLA MISSED */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-rose-900 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">SLA MISSED</div>
                <div className="text-xl font-bold font-mono text-rose-800 my-1">
                  {podReturningOverview.slaMissed}
                </div>
                <div className="text-[10px] text-rose-600">Past target SLA</div>
              </div>

              {/* 6. Overdue POD Records */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-rose-100/70 border border-rose-300 flex flex-col justify-between min-h-[88px]">
                <div className="text-[10px] font-bold text-rose-900 uppercase tracking-wider leading-tight min-h-[22px] flex items-center justify-center">Overdue Records</div>
                <div className="text-xl font-bold font-mono text-rose-900 my-1">
                  {podReturningOverview.overduePodRecords}
                </div>
                <div className="text-[10px] text-rose-700">Past due date</div>
              </div>

            </div>

            {/* Visual Fulfillment Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium text-[11px]">POD Retrieval Rate</span>
                <span className="font-bold font-mono text-slate-900 text-[11px]">
                  {podReturningOverview.fulfillmentPercentage}% Returned
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${podReturningOverview.fulfillmentPercentage}%` }} 
                  className="bg-teal-500 h-full transition-all duration-500" 
                  title={`Returned: ${podReturningOverview.podReturned}`} 
                />
                <div 
                  style={{ width: `${100 - podReturningOverview.fulfillmentPercentage}%` }} 
                  className="bg-amber-300 h-full transition-all duration-500" 
                  title={`Pending: ${podReturningOverview.podPending}`} 
                />
              </div>

              {/* Responsive Legend */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  <span>Returned: {podReturningOverview.podReturned}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>Pending: {podReturningOverview.podPending}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Lead Time: <strong>3-5 Days</strong> • No double-counting</span>
            <button
              onClick={() => onNavigate('pod_returning')}
              className="text-purple-700 hover:text-purple-900 font-semibold inline-flex items-center gap-1 cursor-pointer min-h-[30px]"
            >
              <span>POD Returning Portal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 7. CLIENT-LEVEL OPERATIONAL SUMMARY TABLE                             */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">Client-Level Operational Summary</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                Delivery volumes, on-time SLA percentages, and POD retrieval rates by client
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[10px] text-slate-500 sm:hidden flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Swipe table ↔
            </span>
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              {clientSummariesList.length} Accounts Monitored
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
            <thead className="bg-slate-100/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Client Name</th>
                <th className="py-2.5 px-4">Coordinator</th>
                <th className="py-2.5 px-4 text-center">Total Deliveries</th>
                <th className="py-2.5 px-4 text-center">Delivered</th>
                <th className="py-2.5 px-4 text-center">Delayed Deliveries</th>
                <th className="py-2.5 px-4 text-center">Delivery SLA</th>
                <th className="py-2.5 px-4 text-center">POD Pending</th>
                <th className="py-2.5 px-4 text-center">POD Returned</th>
                <th className="py-2.5 px-4 text-center">POD SLA</th>
                <th className="py-2.5 px-4 text-right">Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clientSummariesList.length > 0 ? (
                clientSummariesList.map((c) => {
                  const isSelected = selectedClientFilter.toLowerCase() === c.name.toLowerCase();

                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-blue-50/50 font-medium' : ''}`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectClientFromDashboard(c.name)}
                            className="hover:underline text-left text-slate-900 hover:text-blue-700 font-semibold cursor-pointer"
                          >
                            {c.name}
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                            {c.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {c.assignedCoordinator}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-center">
                        {c.totalDeliveries}
                      </td>

                      <td className="py-3 px-4 font-mono text-emerald-800 font-semibold text-center">
                        {c.deliveredCount}
                      </td>

                      <td className="py-3 px-4 font-mono text-center">
                        <span className={`font-semibold ${c.delayedCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}`}>
                          {c.delayedCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-center">
                        <span className={c.deliverySlaRate !== 'N/A' && parseFloat(c.deliverySlaRate) < 90 ? 'text-rose-700' : 'text-emerald-700'}>
                          {c.deliverySlaRate}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-amber-700 font-semibold text-center">
                        {c.podPendingCount}
                      </td>

                      <td className="py-3 px-4 font-mono text-teal-800 font-semibold text-center">
                        {c.podReturnedCount}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-center">
                        <span className={c.podSlaRate !== 'N/A' && parseFloat(c.podSlaRate) < 90 ? 'text-rose-700' : 'text-purple-700'}>
                          {c.podSlaRate}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClientFilter('ALL');
                            } else {
                              setSelectedClientFilter(c.name);
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[30px] ${
                            isSelected 
                              ? 'bg-blue-700 text-white border-blue-700' 
                              : 'text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-300'
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          <span>{isSelected ? 'Filtered' : 'Filter'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-500 bg-slate-50/50">
                    No client records available for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 8. OPERATIONAL ALERTS & ACTION REQUIRED                               */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-rose-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900">Operational Attention & Alerts</h2>
          </div>
          {actionRequiredAlerts.length > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
              {actionRequiredAlerts.length} Action Items
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
              All Clear
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actionRequiredAlerts.length > 0 ? (
            actionRequiredAlerts.map(alert => (
              <div 
                key={alert.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      alert.category === 'POD Overdue' || alert.category === 'Delivery Delayed'
                        ? 'bg-rose-100 text-rose-900 border border-rose-200'
                        : alert.category === 'Ready for Dispatch'
                        ? 'bg-teal-100 text-teal-900 border border-teal-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {alert.badgeText}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {alert.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {alert.subtitle}
                  </p>
                </div>

                <button
                  onClick={alert.onAction}
                  className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded shrink-0 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1 self-start sm:self-auto min-h-[32px]"
                >
                  <span>{alert.actionLabel}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50 col-span-full">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">All Operations Flowing Normally</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                No overdue PODs, dispatch bottlenecks, or unresolved delays reported.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 9. RECENT DISPATCHES & DELIVERIES PREVIEW TABLES                       */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Table 1: Recent Dispatch Operations */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Truck className="w-4 h-4 text-blue-700 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
                  Recent Dispatch Activity
                </h3>
              </div>
              <button
                onClick={() => onNavigate('dispatch')}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 min-h-[30px]"
              >
                <span>VIEW ALL ({activeDispatches.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                <thead className="bg-slate-100/80 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Truck / Plate</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchOperationsOverview.filteredRuns.slice(0, 5).map(run => (
                    <tr 
                      key={run.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('dispatch')}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                        {run.plannedDispatchDate}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[140px]" title={run.client || run.clients?.join(', ')}>
                        {run.client || run.clients?.[0] || 'General'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                        {run.plateNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]">
                        {run.driver || 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dispatchOperationsOverview.filteredRuns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-500">
                        No dispatch operations match active filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table 2: Recent Individual Deliveries */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-blue-700 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
                  Individual Deliveries Monitored
                </h3>
              </div>
              <button
                onClick={() => onNavigate('forwarding_report')}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 min-h-[30px]"
              >
                <span>VIEW ALL ({filteredDeliveries.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[500px]">
                <thead className="bg-slate-100/80 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">POD #</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Consignee</th>
                    <th className="py-2 px-3">Area</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliveries.slice(0, 5).map(del => (
                    <tr 
                      key={del.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('forwarding_report')}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-[11px]">
                        {del.podNumber}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[130px]" title={del.client}>
                        {del.client}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[140px]" title={del.consignee}>
                        {del.consignee}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {del.area}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          del.canonicalStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : del.canonicalStatus === 'POD RETURNED'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : del.canonicalStatus === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : del.canonicalStatus === 'IN TRANSIT'
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                            : del.canonicalStatus === 'ASSIGNED'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : del.canonicalStatus === 'PLANNED'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {del.canonicalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-500">
                        No deliveries match active filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
