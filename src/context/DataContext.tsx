import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ClientSummary, 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ForwardingDispatchNotification,
  PODNotification,
  DriverAssignmentNotification,
  BusinessRule,
  DatabaseSyncStatus,
  OperationalRecordType,
  UnifiedShipment,
  DashboardSummary,
  ImportHistoryRecord,
  UserProfile,
  UserRole,
  OFIIDriver,
  DeliveryAssignment,
  DeliveryBatch,
  DeliveryBatchStatus,
  IndividualDelivery,
  CanonicalDeliveryStatus,
  TruckRun,
  TruckRunStatus,
  TruckPlannerNotification,
  TruckPlannerNotificationType,
  EncoderDispatchNotification,
  PodReturningNotification,
  RecipientNameHistoryEntry,
  DeliveryDispatchData
} from '../types';
import { deriveDeliveryOperationalStatus } from '../utils/dispatchUtils';
import { deriveSynchronizedDeliveryStatus } from '../utils/deliveryStatusFlow';
import { 
  supabase, 
  isSupabaseConfigured 
} from '../lib/supabase';
import { 
  mapClientFromDb, 
  mapClientToDb, 
  mapDispatchFromDb, 
  mapDispatchToDb, 
  mapShipmentFromDb, 
  mapShipmentToDb, 
  mapForwardingFromDb, 
  mapForwardingToDb, 
  mapNotificationFromDb, 
  mapNotificationToDb,
  mapBusinessRuleFromDb,
  checkAndSeedInitialData,
  broadcastDataChange,
  subscribeToCrossTabChanges
} from '../services/dataService';
import { 
  initialClients, 
  initialDispatches, 
  initialShipments, 
  initialForwardingRecords, 
  initialDispatchNotifications,
  initialDriverNotifications,
  DEFAULT_ENCODER_USER,
  OFII_DRIVERS_ROSTER,
  initialDeliveryBatches,
  initialIndividualDeliveries,
  initialTruckRuns
} from '../data/mockData';
import { 
  getRegisteredUsers, 
  getStoredAuthSession, 
  OFII_HELPERS_ROSTER, 
  resolveDriverId, 
  resolveHelperId, 
  isUserAuthorizedDriverForDelivery 
} from '../data/userAccounts';
import { normalizeUserRole, getRolePermissions, isCoordinatorRole } from '../utils/roleUtils';
import { 
  computeDeliveryPerformance, 
  computePodPerformance,
  getAutoDeliveryLeadTime,
  calculatePodReturnDueDate,
  determineAutomaticPodStatus,
} from '../utils/forwardingCalculations';
import { syncPodNotifications } from '../utils/podNotificationEngine';

interface DataContextValue {
  clients: ClientSummary[];
  dispatches: DispatchRecord[];
  shipments: ShipmentRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  notifications: ForwardingDispatchNotification[];
  podNotifications: PODNotification[];
  businessRules: BusinessRule[];
  dashboardSummary: DashboardSummary;
  syncStatus: DatabaseSyncStatus;
  importHistory: ImportHistoryRecord[];
  currentUserProfile: UserProfile;
  driverNotifications: DriverAssignmentNotification[];
  deliveryAssignments: DeliveryAssignment[];
  deliveryBatches: DeliveryBatch[];
  individualDeliveries: IndividualDelivery[];
  truckRuns: TruckRun[];
  truckPlannerNotifications: TruckPlannerNotification[];
  encoderNotifications: EncoderDispatchNotification[];
  podReturningNotifications: PodReturningNotification[];
  isLoading: boolean;
  loadingMessage: string;
  errorMessage: string | null;
  toastMessage: { message: string; subtext?: string } | null;
  
  // Actions
  setCurrentUserProfile: (user: UserProfile) => void;
  createDeliveryBatch: (batchData: {
    name: string;
    client: string;
    clientId?: string;
    coordinator: string;
    createdDate?: string;
    status?: DeliveryBatchStatus;
    notes?: string;
    initialDeliveries?: (Omit<IndividualDelivery, 'id' | 'createdAt' | 'batchId' | 'batchName'>)[];
  }) => Promise<DeliveryBatch>;
  updateDeliveryBatch: (batch: DeliveryBatch) => Promise<DeliveryBatch>;
  deleteDeliveryBatch: (batchId: string) => Promise<void>;
  addIndividualDelivery: (deliveryData: Omit<IndividualDelivery, 'id' | 'createdAt'> & { id?: string }) => Promise<IndividualDelivery>;
  bulkImportIndividualDeliveries: (
    batchId: string,
    deliveries: (Omit<IndividualDelivery, 'id' | 'createdAt' | 'batchId' | 'batchName'>)[]
  ) => Promise<{ count: number; rejected: number }>;
  updateIndividualDelivery: (delivery: IndividualDelivery) => Promise<IndividualDelivery>;
  deleteIndividualDelivery: (deliveryId: string) => Promise<void>;
  saveDeliveryDispatch: (deliveryId: string, dispatchData: DeliveryDispatchData) => Promise<IndividualDelivery>;
  markEncoderNotificationAsRead: (notificationId: string) => void;
  markAllEncoderNotificationsAsRead: () => void;

  // Phase 2.5: Office-Side Truck Planner Notifications
  createTruckPlannerNotification: (notificationData: {
    type?: TruckPlannerNotificationType;
    title?: string;
    batchId: string;
    batchName: string;
    client: string;
    newDeliveriesCount: number;
    deliveryIds: string[];
    source?: 'PROJECT_CREATE' | 'MANUAL_CREATE' | 'MANUAL_ADD' | 'EXCEL_IMPORT';
    message?: string;
  }) => Promise<TruckPlannerNotification>;
  markTruckPlannerNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllTruckPlannerNotificationsAsRead: () => Promise<void>;
  deleteTruckPlannerNotification: (notificationId: string) => Promise<void>;

  // Phase 2: Truck Run / Dispatch Actions
  createTruckRun: (runData: {
    truckRunNumber?: string;
    truckDispatchPod: string;
    plannedDispatchDate: string;
    deliveryArea: string;
    routeLocation: string;
    truckSource: string;
    plateNumber: string;
    driver: string;
    driverContact?: string;
    helper?: string;
    helperContact?: string;
    remarks?: string;
    deliveryIds: string[];
    status?: TruckRunStatus;
  }) => Promise<{ success: boolean; truckRun?: TruckRun; error?: string }>;
  updateTruckRun: (runId: string, updates: Partial<TruckRun>) => Promise<void>;
  updateTruckRunStatus: (runId: string, status: TruckRunStatus) => Promise<void>;
  removeDeliveryFromTruckRun: (truckRunId: string, deliveryId: string) => Promise<{ success: boolean; error?: string }>;
  addDeliveriesToTruckRun: (truckRunId: string, deliveryIds: string[]) => Promise<{ success: boolean; error?: string }>;
  cancelTruckRun: (truckRunId: string) => Promise<{ success: boolean; error?: string }>;
  deleteTruckRun: (truckRunId: string) => Promise<void>;
  createDeliveryAssignment: (assignmentData: {
    originalDeliveryId: string;
    driver: string;
    driverId?: string;
    helper: string;
    helperId?: string;
    vehicle: string;
    plateNumber: string;
    assignmentDate?: string;
    assignmentTime?: string;
    assignmentStatus?: string;
    assignmentId?: string;
  }) => Promise<DeliveryAssignment>;
  getDeliveryAssignmentByOriginalDeliveryId: (originalDeliveryId: string) => DeliveryAssignment | undefined;
  assignDriverToDelivery: (
    recordId: string, 
    driverName: string, 
    plateNumber?: string, 
    vehicleType?: string, 
    helperName?: string,
    assignedDriverId?: string,
    assignedHelperId?: string
  ) => Promise<void>;
  markDriverNotificationAsRead: (id: string) => Promise<void>;
  markAllDriverNotificationsAsRead: (driverName?: string) => Promise<void>;
  addClient: (clientData: Partial<ClientSummary>) => Promise<ClientSummary>;
  updateClient: (client: ClientSummary) => Promise<void>;
  toggleClientStatus: (id: string, deactivationReason?: string) => Promise<void>;
  addDispatch: (dispatchData: Partial<DispatchRecord>) => Promise<DispatchRecord>;
  updateDispatch: (dispatch: DispatchRecord) => Promise<void>;
  addForwardingRecord: (recordData: Partial<ForwardingProgressiveRecord>) => Promise<ForwardingProgressiveRecord>;
  bulkImportForwardingRecords: (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ) => Promise<void>;
  bulkImportDispatches: (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ) => Promise<void>;
  updateForwardingRecord: (record: ForwardingProgressiveRecord) => Promise<void>;
  clearImportHistory: () => void;
  updateShipment: (shipment: ShipmentRecord) => Promise<void>;
  softDeleteRecord: (id: string, type: OperationalRecordType, reason?: string) => Promise<void>;
  restoreRecord: (id: string, type: OperationalRecordType) => Promise<void>;
  permanentDeleteRecord: (id: string, type: OperationalRecordType) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  completeNotification: (id: string, dispatchId: string) => Promise<void>;
  markPodNotificationAsRead: (id: string) => Promise<void>;
  markAllPodNotificationsAsRead: () => Promise<void>;
  updateDriverProgress: (
    recordId: string,
    currentLocation: string,
    progressStatus: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered'
  ) => Promise<void>;
  markDeliveryAsDelivered: (params: {
    recordId: string;
    recipientName?: string;
    receiverName?: string;
    dateReceived: string;
    signature?: string;
    remarks?: string;
  }) => Promise<void>;
  markPodReturningNotificationAsRead: (id: string) => void;
  markAllPodReturningNotificationsAsRead: () => void;
  encodePodReturn: (params: {
    recordId: string;
    dateReceived: string;
    podReturnDate: string;
    recipientName?: string;
    editReason?: string;
    podRemarks?: string;
  }) => Promise<{ slaStatus: 'HIT' | 'MISSED'; dueDate: string }>;
  refreshData: (showMessage?: boolean) => Promise<void>;
  dismissToast: () => void;
  showSuccessToast: (message: string, subtext?: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State variables for all core operational entities
  const [clients, setClients] = useState<ClientSummary[]>(initialClients);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>(initialDispatches);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(initialShipments);
  const [forwardingRecords, setForwardingRecords] = useState<ForwardingProgressiveRecord[]>(initialForwardingRecords);
  const [notifications, setNotifications] = useState<ForwardingDispatchNotification[]>(initialDispatchNotifications);
  const [podNotifications, setPodNotifications] = useState<PODNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_cache_v4_pod_notifications');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return syncPodNotifications(initialForwardingRecords, initialClients, []);
  });
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  
  const [currentUserProfile, setCurrentUserProfileState] = useState<UserProfile>(() => {
    // 1. Check active authenticated session first
    const session = getStoredAuthSession();
    if (session && session.isActive !== false) {
      return session;
    }
    // 2. Check cached profile
    try {
      const cached = localStorage.getItem('ofii_current_user_profile');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_ENCODER_USER;
  });

  const setCurrentUserProfile = useCallback((user: UserProfile) => {
    setCurrentUserProfileState(user);
    try {
      localStorage.setItem('ofii_current_user_profile', JSON.stringify(user));
    } catch (e) {
      // ignore
    }
  }, []);

  const [driverNotifications, setDriverNotifications] = useState<DriverAssignmentNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_cache_v4_driver_notifications');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return initialDriverNotifications;
  });

  // Phase 1: Delivery Assignments (Separate record linked to original master delivery)
  const [deliveryAssignments, setDeliveryAssignments] = useState<DeliveryAssignment[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_delivery_assignments_v1');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache Load] Delivery Assignments error:', e);
    }
    return [];
  });

  // Phase 1: Delivery Batches (Delivery Name / Project foundation)
  const [deliveryBatches, setDeliveryBatches] = useState<DeliveryBatch[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_delivery_batches_v1');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache Load] Delivery Batches error:', e);
    }
    return initialDeliveryBatches;
  });

  // Phase 1: Individual Deliveries belonging to Delivery Batches
  const [individualDeliveries, setIndividualDeliveries] = useState<IndividualDelivery[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_individual_deliveries_v1');
      if (cached) {
        const parsed: IndividualDelivery[] = JSON.parse(cached);
        // Ensure test deliveries (DEL-1001, DEL-1005, DEL-1009, DEL-1010, 87890-87894) are synchronized
        const existingMap = new Map(parsed.map(d => [d.id, d]));
        initialIndividualDeliveries.forEach(initDel => {
          if (!existingMap.has(initDel.id)) {
            parsed.push(initDel);
          } else {
            const existing = existingMap.get(initDel.id)!;
            // Synchronize essential metadata if present in initial specs
            if (initDel.destination && (!existing.destination || existing.destination.includes('Mandaluyong'))) {
              existing.destination = initDel.destination;
              existing.destinationCode = initDel.destinationCode;
              existing.consignee = initDel.consignee;
              existing.area = initDel.area;
            }
            if (initDel.batchName && (!existing.batchName || existing.batchName === 'General Delivery')) {
              existing.batchName = initDel.batchName;
            }
          }
        });
        return parsed;
      }
    } catch (e) {
      console.warn('[Cache Load] Individual Deliveries error:', e);
    }
    return initialIndividualDeliveries;
  });

  // Phase 2: Truck Runs / Dispatch Groups
  const [truckRuns, setTruckRuns] = useState<TruckRun[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_truck_runs_v1');
      if (cached) {
        const parsed: TruckRun[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure TRK-RUN-2026-001 has Project 1 deliveries
          const tr1 = parsed.find(r => r.id === 'TRK-RUN-2026-001');
          if (tr1) {
            const needed = ['DEL-1001', 'DEL-1005', 'DEL-1009', 'DEL-1010'];
            needed.forEach(nId => {
              if (!tr1.deliveryIds.includes(nId)) {
                tr1.deliveryIds.unshift(nId);
              }
            });
            tr1.batchName = 'Project 1';
            tr1.client = 'Philippine Charity Sweepstakes Office';
            tr1.totalDeliveries = tr1.deliveryIds.length;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Cache Load] Truck Runs error:', e);
    }
    return initialTruckRuns;
  });

  // Phase 2.5: Office-Side New Delivery Notifications for Truck Planner
  const [truckPlannerNotifications, setTruckPlannerNotifications] = useState<TruckPlannerNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_truck_planner_notifications_v1');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache Load] Truck Planner Notifications error:', e);
    }
    // Seed initial realistic notification for existing batch
    return [
      {
        id: 'TP-NOTIF-INIT-001',
        type: 'NEW_DELIVERIES_AVAILABLE',
        title: '🔔 New Deliveries Available',
        batchId: 'BATCH-001',
        batchName: 'GADC AUGUST 2026 BATCH A',
        client: 'Golden Arches Development Corp',
        newDeliveriesCount: 5,
        deliveryIds: ['DEL-INIT-001', 'DEL-INIT-002', 'DEL-INIT-003', 'DEL-INIT-004', 'DEL-INIT-005'],
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        isRead: false,
        source: 'EXCEL_IMPORT',
        message: '5 new individual deliveries are ready for Truck Planning.',
      },
    ];
  });

  // Phase 3B.8: Dispatcher to Encoder Notifications (Persisted and linked to Daily Dispatching Monitoring)
  const [encoderNotifications, setEncoderNotifications] = useState<EncoderDispatchNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_encoder_notifications_v1');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache Load] Encoder Notifications error:', e);
    }
    // Seed initial realistic notification for existing dispatched run
    return [
      {
        id: 'ENC-NOTIF-DEL-1005-001',
        title: 'Dispatch Ready for Daily Monitoring',
        message: 'Dispatch information for DEL-1005 is ready for Encoder review in Daily Dispatching Monitoring.',
        deliveryId: 'DEL-1005',
        individualDeliveryId: 'DEL-1005',
        batchId: 'BATCH-PCSO-01',
        batchName: 'Project 1',
        client: 'Philippine Charity Sweepstakes Office',
        consignee: 'Store 118 - SM Antipolo Downtown',
        place: 'Antipolo City, Rizal',
        deliveryArea: 'Luzon',
        quantity: 12,
        individualDeliveryPod: '87894',
        truckDispatchPod: 'POD-TRK-001',
        actualDeparture: '08:45 AM',
        truckDispatchNumber: 'TRUCK RUN #001 / TRK-2026-001',
        dispatchRecordId: 'DEL-1005',
        forwardingRecordId: 'DEL-1005',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
    ];
  });

  const markEncoderNotificationAsRead = useCallback((notificationId: string) => {
    setEncoderNotifications((prev) => {
      const next = prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      try {
        localStorage.setItem('ofii_encoder_notifications_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const markAllEncoderNotificationsAsRead = useCallback(() => {
    setEncoderNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }));
      try {
        localStorage.setItem('ofii_encoder_notifications_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Phase 5.1: Driver Delivery Confirmation Notification for Encoder (POD Returning Module)
  const [podReturningNotifications, setPodReturningNotifications] = useState<PodReturningNotification[]>(() => {
    try {
      const cached = localStorage.getItem('ofii_cache_v5_pod_returning_notifications');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache Load] POD Returning Notifications error:', e);
    }
    return [
      {
        id: 'POD-RET-NOTIF-DEL-1001-INIT',
        title: 'Delivery Completed — POD Return Pending',
        message: 'Driver has marked Delivery DEL-1001 as delivered. Please monitor and encode the POD return.',
        deliveryId: 'DEL-1001',
        recordId: 'DEL-1001',
        batchId: 'BATCH-PCSO-01',
        batchName: 'Project 1',
        client: 'Philippine Charity Sweepstakes Office',
        consignee: 'Store 114 - Robinson Antipolo',
        place: 'Antipolo City, Rizal',
        quantity: 150,
        unit: 'cases',
        individualDeliveryPod: '87890',
        truckRunNumber: 'TRUCK RUN #001',
        assignedDriver: 'Juan Dela Cruz',
        actualDeliveryDate: '2026-08-25',
        dateReceived: '2026-08-25',
        deliveryStatus: 'DELIVERED',
        podStatus: 'PENDING',
        podReturnDueDate: '2026-08-29',
        podReturnDueDateFormatted: 'Aug 29, 2026',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      }
    ];
  });

  const markPodReturningNotificationAsRead = useCallback((notificationId: string) => {
    setPodReturningNotifications((prev) => {
      const next = prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      try {
        localStorage.setItem('ofii_cache_v5_pod_returning_notifications', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const markAllPodReturningNotificationsAsRead = useCallback(() => {
    setPodReturningNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }));
      try {
        localStorage.setItem('ofii_cache_v5_pod_returning_notifications', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([
    {
      id: 'IMP-HIST-001',
      fileName: 'August_25_OFII_Forwarding_Report.xlsx',
      fileSize: '42.5 KB',
      importedAt: 'Aug 25, 2026, 09:30 AM',
      importedBy: 'Alodia Manalansan',
      totalRows: 24,
      successfullyImported: 22,
      warnings: 2,
      skipped: 2,
      status: 'Completed',
    },
  ]);
  
  // System Sync & UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Connecting to database...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; subtext?: string } | null>(null);
  
  const [syncStatus, setSyncStatus] = useState<DatabaseSyncStatus>({
    isConnected: isSupabaseConfigured(),
    isSyncing: false,
    lastSyncedAt: null,
    provider: isSupabaseConfigured() ? 'supabase' : 'shared-cloud-sync',
    errorMessage: null,
  });

  const showSuccessToast = useCallback((message: string, subtext?: string) => {
    setToastMessage({ message, subtext });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Central RBAC & Approval Guard (Denies mutations for Viewer role or unapproved accounts)
  const assertCanMutate = useCallback((actionDescription?: string) => {
    const roleFromProfile = currentUserProfile?.userRole || currentUserProfile?.role;
    const session = getStoredAuthSession();
    const roleFromSession = session?.userRole || session?.role;
    const effectiveRole = roleFromProfile || roleFromSession;
    const canonical = normalizeUserRole(effectiveRole);
    const perms = getRolePermissions(effectiveRole);

    // Account Approval Enforcement (Phase 6.7.2 - Requirement 4)
    const approvalStatus = currentUserProfile?.approvalStatus || session?.approvalStatus;
    if (approvalStatus === 'PENDING' || approvalStatus === 'REJECTED') {
      const errMsg = 'Access Denied: Unapproved accounts cannot perform operational modifications.';
      console.warn(`[Approval Blocked] Unapproved account (${approvalStatus}) attempted mutation: ${actionDescription || 'action'}`);
      setErrorMessage(errMsg);
      throw new Error(errMsg);
    }

    if (!canonical || canonical === 'VIEWER' || perms.isReadOnly) {
      const errMsg = 'You do not have permission to modify this information.';
      console.warn(`[RBAC Blocked] Viewer or unauthorized role attempted mutation: ${actionDescription || 'action'}`);
      setErrorMessage(errMsg);
      throw new Error(errMsg);
    }
  }, [currentUserProfile]);

  // ---------------------------------------------------------------------------
  // 1. DATA RE-FETCHING FROM SUPABASE (Single Source of Truth)
  // ---------------------------------------------------------------------------
  const fetchAllData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
      setLoadingMessage('Loading operational records from Supabase...');
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

    if (isSupabaseConfigured() && supabase) {
      try {
        await checkAndSeedInitialData();

        // 1. Fetch Clients
        const { data: clientRows, error: clientErr } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientErr) throw clientErr;
        if (clientRows && clientRows.length > 0) {
          setClients(clientRows.map(mapClientFromDb));
        }

        // 2. Fetch Dispatches
        const { data: dispatchRows, error: dispatchErr } = await supabase
          .from('dispatches')
          .select('*')
          .order('created_at', { ascending: false });

        if (dispatchErr) throw dispatchErr;
        if (dispatchRows && dispatchRows.length > 0) {
          setDispatches(dispatchRows.map(mapDispatchFromDb));
        }

        // 3. Fetch Shipments
        const { data: shipmentRows, error: shipmentErr } = await supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });

        if (shipmentErr) throw shipmentErr;
        if (shipmentRows && shipmentRows.length > 0) {
          setShipments(shipmentRows.map(mapShipmentFromDb));
        }

        // 4. Fetch Forwarding Records
        const { data: forwardingRows, error: forwardingErr } = await supabase
          .from('forwarding_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (forwardingErr) throw forwardingErr;
        if (forwardingRows && forwardingRows.length > 0) {
          setForwardingRecords(forwardingRows.map(mapForwardingFromDb));
        }

        // 5. Fetch Notifications
        const { data: notifRows, error: notifErr } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (notifErr) throw notifErr;
        if (notifRows && notifRows.length > 0) {
          setNotifications(notifRows.map(mapNotificationFromDb));
        }

        // 6. Fetch Business Rules
        const { data: ruleRows, error: ruleErr } = await supabase
          .from('business_rules')
          .select('*')
          .order('created_at', { ascending: true });

        if (ruleErr) throw ruleErr;
        if (ruleRows && ruleRows.length > 0) {
          setBusinessRules(ruleRows.map(mapBusinessRuleFromDb));
        }

        setSyncStatus({
          isConnected: true,
          isSyncing: false,
          lastSyncedAt: new Date().toLocaleTimeString(),
          provider: 'supabase',
          errorMessage: null,
        });
        setErrorMessage(null);
      } catch (err: any) {
        console.error('[Supabase Fetch] Error:', err);
        setSyncStatus((prev) => ({
          ...prev,
          isConnected: false,
          isSyncing: false,
          errorMessage: err?.message || 'Connection error',
        }));
        setErrorMessage('Unable to load data. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local fallback for offline mode / pre-setup
      // Try to load any previously saved state in localStorage cache to prevent data loss across refreshes
      try {
        const cachedClients = localStorage.getItem('ofii_cache_v4_clients');
        const cachedDispatches = localStorage.getItem('ofii_cache_v4_dispatches');
        const cachedShipments = localStorage.getItem('ofii_cache_v4_shipments');
        const cachedForwarding = localStorage.getItem('ofii_cache_v4_forwarding');
        const cachedNotifications = localStorage.getItem('ofii_cache_v4_notifications');

        if (cachedClients) setClients(JSON.parse(cachedClients));
        if (cachedDispatches) setDispatches(JSON.parse(cachedDispatches));
        if (cachedShipments) setShipments(JSON.parse(cachedShipments));
        if (cachedForwarding) setForwardingRecords(JSON.parse(cachedForwarding));
        if (cachedNotifications) setNotifications(JSON.parse(cachedNotifications));
      } catch (e) {
        console.warn('[Cache Load] Error:', e);
      }

      setSyncStatus({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString(),
        provider: 'shared-cloud-sync',
        errorMessage: null,
      });
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 2. REAL-TIME SUBSCRIPTION & MULTI-TAB BROADCAST SYNC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Initial fetch
    fetchAllData(true);

    // Setup Supabase Realtime channel if configured
    let supabaseChannel: any = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        supabaseChannel = supabase
          .channel('ofii-realtime-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
              console.log('[Supabase Realtime] Change detected:', payload);
              // Immediately fetch latest state
              fetchAllData(false);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[Supabase Realtime] Subscription error:', err);
      }
    }

    // Setup Cross-Tab BroadcastChannel listener for instant sync
    const unsubscribeBroadcast = subscribeToCrossTabChanges((event) => {
      console.log('[CrossTab Sync] Event received:', event.type);
      fetchAllData(false);
    });

    return () => {
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      unsubscribeBroadcast();
    };
  }, [fetchAllData]);

  // Persist backup cache when not using Supabase & sync POD Notifications
  useEffect(() => {
    setPodNotifications((prev) => {
      const updated = syncPodNotifications(forwardingRecords, clients, prev);
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    if (!isSupabaseConfigured()) {
      try {
        localStorage.setItem('ofii_cache_v4_clients', JSON.stringify(clients));
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(dispatches));
        localStorage.setItem('ofii_cache_v4_shipments', JSON.stringify(shipments));
        localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(forwardingRecords));
        localStorage.setItem('ofii_cache_v4_notifications', JSON.stringify(notifications));
      } catch (e) {
        // quota exceeded or private mode
      }
    }
  }, [clients, dispatches, shipments, forwardingRecords, notifications]);

  // ---------------------------------------------------------------------------
  // 3. COMPUTED DASHBOARD SUMMARY (Calculated Dynamically from Real Records)
  // ---------------------------------------------------------------------------
  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const activeDispatches = dispatches.filter((d) => !d.isDeleted);
    const activeForwarding = forwardingRecords.filter((f) => !f.isDeleted);
    const activeShipments = shipments.filter((s) => !s.isDeleted);

    // Total dispatches and shipments - SINGLE SOURCE OF TRUTH: FORWARDING PROGRESSIVE REPORT
    const totalCount = activeForwarding.length > 0 
      ? activeForwarding.length 
      : activeShipments.length;

    const deliveredCount = activeForwarding.length > 0
      ? activeForwarding.filter((f) => f.deliveryStatus === 'Delivered' || Boolean(f.actualDeliveryDate)).length
      : activeDispatches.filter((d) => d.status === 'Delivered').length;

    const delayedCount = activeForwarding.length > 0
      ? activeForwarding.filter((f) => f.deliveryStatus === 'Delayed' || f.deliveryPerformance === 'MISSED').length
      : activeDispatches.filter((d) => d.status === 'Delayed').length;

    const inTransitCount = activeForwarding.length > 0
      ? activeForwarding.filter((f) => f.deliveryStatus === 'In Transit').length
      : activeDispatches.filter((d) => d.status === 'In Transit').length;

    // On-Time Delivery %
    const forwardingDelivered = activeForwarding.filter((f) => f.deliveryStatus === 'Delivered' || Boolean(f.actualDeliveryDate));
    const forwardingHits = forwardingDelivered.filter((f) => f.deliveryPerformance === 'HIT');
    const onTimeRate = forwardingDelivered.length > 0 
      ? Math.round((forwardingHits.length / forwardingDelivered.length) * 1000) / 10
      : 0;

    // Active Trucks
    const uniquePlates = new Set(activeDispatches.filter(d => d.plateNumber && d.status !== 'Delivered').map(d => d.plateNumber));
    const activeTrucks = uniquePlates.size;

    // Total Cases/Boxes
    const totalBoxes = activeDispatches.reduce((sum, d) => sum + (Number(d.quantityCasesBoxes) || 0), 0);

    return {
      totalShipments: totalCount,
      inTransit: inTransitCount,
      delivered: deliveredCount,
      delayed: delayedCount,
      onTimePercentage: onTimeRate,
      activeTrucks: activeTrucks,
      totalBoxesToday: totalBoxes,
    };
  }, [dispatches, forwardingRecords, shipments]);

  // ---------------------------------------------------------------------------
  // 4. CLIENT CRUD OPERATIONS
  // ---------------------------------------------------------------------------
  const addClient = async (clientData: Partial<ClientSummary>): Promise<ClientSummary> => {
    assertCanMutate('add client');
    const cleanName = (clientData.name || 'New Client').trim();
    const acronym = cleanName.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase();
    const clientCode = clientData.code || `${acronym}-${Math.floor(100 + Math.random() * 900)}`;
    const newId = clientData.id || `client-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newClient: ClientSummary = {
      id: newId,
      name: cleanName,
      code: clientCode,
      accountManager: clientData.accountManager || 'Maria Santos (OFII Key Accounts)',
      industry: clientData.industry || 'Commercial Freight & Logistics Consignment',
      activeShipments: clientData.activeShipments ?? 0,
      deliveredThisMonth: clientData.deliveredThisMonth ?? 0,
      onTimeRate: clientData.onTimeRate ?? 98.0,
      primaryContact: clientData.primaryContact || 'Logistics Coordinator',
      email: clientData.email || `logistics@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com.ph`,
      phone: clientData.phone || '+63 (2) 8876-0000',
      address: clientData.address || 'Metro Manila Logistics Terminal',
      area: clientData.area || 'NCR / Metro Manila',
      remarks: clientData.remarks || '',
      notes: clientData.notes || '',
      tin: clientData.tin || '',
      isDeactivated: false,
      isDeleted: false,
      ...clientData,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapClientToDb(newClient);
      const { error } = await supabase.from('clients').insert(dbPayload);
      if (error) {
        console.error('[Supabase addClient] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
    broadcastDataChange('CLIENT_ADDED', newClient);
    showSuccessToast('Client saved successfully.', `${newClient.name} is now available across all modules.`);
    return newClient;
  };

  const updateClient = async (updated: ClientSummary): Promise<void> => {
    assertCanMutate('update client');
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapClientToDb(updated);
      const { error } = await supabase.from('clients').update(dbPayload).eq('id', updated.id);
      if (error) {
        console.error('[Supabase updateClient] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    broadcastDataChange('CLIENT_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Client ${updated.name} updated.`);
  };

  const toggleClientStatus = async (id: string, deactivationReason?: string): Promise<void> => {
    assertCanMutate('toggle client status');
    const target = clients.find((c) => c.id === id);
    if (!target) return;

    const willDeactivate = !target.isDeactivated;
    const updated: ClientSummary = {
      ...target,
      isDeactivated: willDeactivate,
      deactivatedAt: willDeactivate ? new Date().toISOString() : undefined,
      deactivatedBy: willDeactivate ? 'Operations Officer' : undefined,
      deactivationReason: willDeactivate ? deactivationReason : undefined,
    };

    await updateClient(updated);
  };

  // ---------------------------------------------------------------------------
  // 5. DISPATCH CRUD OPERATIONS
  // ---------------------------------------------------------------------------
  const addDispatch = async (dispatchData: Partial<DispatchRecord>): Promise<DispatchRecord> => {
    assertCanMutate('add dispatch');
    const newId = dispatchData.id || `DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const arrival = dispatchData.timeArrived || dispatchData.truckArrivalTime || '07:30 AM';
    const startLoad = dispatchData.startLoadingTime || dispatchData.loadingStartTime || '08:00 AM';
    const endLoad = dispatchData.endLoadingTime || dispatchData.loadingEndTime || '09:15 AM';
    const departure = dispatchData.actualDepartureTime || dispatchData.departureTime || '09:45 AM';

    const newDispatch: DispatchRecord = {
      id: newId,
      deliveryDate: dispatchData.deliveryDate || '2026-08-25',
      deliveryArea: dispatchData.deliveryArea || dispatchData.area || 'Luzon',
      area: dispatchData.deliveryArea || dispatchData.area || 'Luzon',
      podNumber: dispatchData.podNumber || `POD-${Math.floor(100000 + Math.random() * 900000)}`,
      quantityCasesBoxes: dispatchData.quantityCasesBoxes ?? 100,
      unit: dispatchData.unit || 'Boxes',
      deliveryType: dispatchData.deliveryType || 'GADC',
      destination: dispatchData.destination || 'Metro Manila Terminal',
      consignee: dispatchData.consignee || 'Consignee Enterprise',
      truckProvider: dispatchData.truckProvider || 'OFII Fleet Logistics',
      plateNumber: dispatchData.plateNumber || 'NDB-4921',
      truckArrivalTime: arrival,
      loadingStartTime: startLoad,
      loadingEndTime: endLoad,
      departureTime: departure,
      timeArrived: arrival,
      startLoadingTime: startLoad,
      endLoadingTime: endLoad,
      actualDepartureTime: departure,
      plannedDeliveryDate: dispatchData.plannedDeliveryDate || dispatchData.deliveryDate || '2026-08-26',
      manifestNumber: dispatchData.manifestNumber || `MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: dispatchData.remarks || 'Standard scheduled freight dispatch.',
      status: dispatchData.status || 'In Transit',
      driverName: dispatchData.driverName || 'Danilo P. Hernandez',
      driverContact: dispatchData.driverContact || '+63 917 842 1190',
      clientName: dispatchData.clientName || 'General Client',
      totalWeightKg: dispatchData.totalWeightKg ?? ((dispatchData.quantityCasesBoxes || 100) * 12),
      isDeleted: false,
      ...dispatchData,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapDispatchToDb(newDispatch);
      const { error } = await supabase.from('dispatches').insert(dbPayload);
      if (error) {
        console.error('[Supabase addDispatch] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setDispatches((prev) => {
      const next = [newDispatch, ...prev.filter((d) => d.id !== newDispatch.id)];
      try {
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Check if there is an associated notification to complete
    const matchingNotif = notifications.find(
      (n) => n.podNumber === newDispatch.podNumber || n.consignee === newDispatch.consignee
    );
    if (matchingNotif && matchingNotif.status !== 'COMPLETED') {
      completeNotification(matchingNotif.id, newDispatch.id);
    }

    // Synchronize operational fields to matching master Forwarding record without duplicating shipments
    setForwardingRecords((prev) =>
      prev.map((f) => {
        if (
          (newDispatch.podNumber && f.podNumber && f.podNumber.trim().toLowerCase() === newDispatch.podNumber.trim().toLowerCase()) ||
          (newDispatch.manifestNumber && f.referenceNumber && f.referenceNumber.trim().toLowerCase() === newDispatch.manifestNumber.trim().toLowerCase())
        ) {
          return {
            ...f,
            plateNumber: newDispatch.plateNumber || f.plateNumber,
            truckProvider: newDispatch.truckProvider || f.truckProvider,
            driverName: newDispatch.driverName || f.driverName,
            timeArrived: newDispatch.timeArrived || f.timeArrived,
            startLoadingTime: newDispatch.startLoadingTime || f.startLoadingTime,
            endLoadingTime: newDispatch.endLoadingTime || f.endLoadingTime,
            actualDepartureTime: newDispatch.actualDepartureTime || f.actualDepartureTime,
            truckArrivalTime: newDispatch.truckArrivalTime || f.truckArrivalTime,
            loadingStartTime: newDispatch.loadingStartTime || f.loadingStartTime,
            loadingEndTime: newDispatch.loadingEndTime || f.loadingEndTime,
            departureTime: newDispatch.departureTime || f.departureTime,
            deliveryStatus: newDispatch.status === 'Delivered'
              ? 'Delivered'
              : (newDispatch.status === 'Delayed' ? 'Delayed' : (newDispatch.status === 'Departed' || newDispatch.status === 'In Transit' ? 'In Transit' : f.deliveryStatus)),
          };
        }
        return f;
      })
    );

    broadcastDataChange('DISPATCH_ADDED', newDispatch);
    showSuccessToast('Dispatch saved successfully.', `POD: ${newDispatch.podNumber} for ${newDispatch.clientName}`);
    return newDispatch;
  };

  const updateDispatch = async (updated: DispatchRecord): Promise<void> => {
    assertCanMutate('update dispatch');
    const arrival = updated.timeArrived || updated.truckArrivalTime || '07:30 AM';
    const startLoad = updated.startLoadingTime || updated.loadingStartTime || '08:00 AM';
    const endLoad = updated.endLoadingTime || updated.loadingEndTime || '09:15 AM';
    const departure = updated.actualDepartureTime || updated.departureTime || '09:45 AM';

    const normalizedUpdated: DispatchRecord = {
      ...updated,
      timeArrived: arrival,
      startLoadingTime: startLoad,
      endLoadingTime: endLoad,
      actualDepartureTime: departure,
      truckArrivalTime: arrival,
      loadingStartTime: startLoad,
      loadingEndTime: endLoad,
      departureTime: departure,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapDispatchToDb(normalizedUpdated);
      const { error } = await supabase.from('dispatches').update(dbPayload).eq('id', normalizedUpdated.id);
      if (error) {
        console.error('[Supabase updateDispatch] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setDispatches((prev) => {
      const next = prev.map((d) => (d.id === normalizedUpdated.id ? normalizedUpdated : d));
      try {
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    
    // Also synchronize corresponding master Forwarding record if present
    setForwardingRecords((prev) =>
      prev.map((f) => {
        if (
          (normalizedUpdated.podNumber && f.podNumber && f.podNumber.trim().toLowerCase() === normalizedUpdated.podNumber.trim().toLowerCase()) ||
          (normalizedUpdated.manifestNumber && f.referenceNumber && f.referenceNumber.trim().toLowerCase() === normalizedUpdated.manifestNumber.trim().toLowerCase()) ||
          f.id === normalizedUpdated.id
        ) {
          return {
            ...f,
            plateNumber: normalizedUpdated.plateNumber || f.plateNumber,
            truckProvider: normalizedUpdated.truckProvider || f.truckProvider,
            driverName: normalizedUpdated.driverName || f.driverName,
            timeArrived: normalizedUpdated.timeArrived || f.timeArrived,
            startLoadingTime: normalizedUpdated.startLoadingTime || f.startLoadingTime,
            endLoadingTime: normalizedUpdated.endLoadingTime || f.endLoadingTime,
            actualDepartureTime: normalizedUpdated.actualDepartureTime || f.actualDepartureTime,
            truckArrivalTime: normalizedUpdated.timeArrived || f.truckArrivalTime,
            loadingStartTime: normalizedUpdated.startLoadingTime || f.loadingStartTime,
            loadingEndTime: normalizedUpdated.endLoadingTime || f.loadingEndTime,
            departureTime: normalizedUpdated.actualDepartureTime || f.departureTime,
            deliveryStatus: normalizedUpdated.status === 'Delivered'
              ? 'Delivered'
              : (normalizedUpdated.status === 'Delayed' ? 'Delayed' : (normalizedUpdated.status === 'Departed' || normalizedUpdated.status === 'In Transit' ? 'In Transit' : f.deliveryStatus)),
          };
        }
        return f;
      })
    );

    // Also synchronize corresponding shipment if present
    setShipments((prev) =>
      prev.map((s) => {
        if (s.podNumber === normalizedUpdated.podNumber || s.id === normalizedUpdated.id) {
          return {
            ...s,
            status: normalizedUpdated.status === 'Delivered' ? 'Delivered' : (normalizedUpdated.status === 'Delayed' ? 'Delayed' : 'In Transit'),
            plateNumber: normalizedUpdated.plateNumber,
            manifestNumber: normalizedUpdated.manifestNumber,
            timeArrived: normalizedUpdated.timeArrived,
            startLoadingTime: normalizedUpdated.startLoadingTime,
            endLoadingTime: normalizedUpdated.endLoadingTime,
            actualDepartureTime: normalizedUpdated.actualDepartureTime,
            truckArrivalTime: normalizedUpdated.timeArrived,
            loadingStartTime: normalizedUpdated.startLoadingTime,
            loadingEndTime: normalizedUpdated.endLoadingTime,
            departureTime: normalizedUpdated.actualDepartureTime,
          };
        }
        return s;
      })
    );

    // Also synchronize corresponding Individual Delivery if present
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        const matchesPod = Boolean(
          normalizedUpdated.podNumber && del.individualDeliveryPod &&
          del.individualDeliveryPod.trim().toLowerCase() === normalizedUpdated.podNumber.trim().toLowerCase()
        );
        const matchesId = del.id === normalizedUpdated.id || del.deliveryId === normalizedUpdated.id || (normalizedUpdated as any).deliveryId === del.id;
        if (matchesPod || matchesId) {
          const isDelivered = normalizedUpdated.status === 'Delivered';
          return {
            ...del,
            plateNumber: normalizedUpdated.plateNumber || del.plateNumber,
            driver: normalizedUpdated.driverName || del.driver,
            timeArrived: normalizedUpdated.timeArrived || del.timeArrived,
            startLoadingTime: normalizedUpdated.startLoadingTime || del.startLoadingTime,
            endLoadingTime: normalizedUpdated.endLoadingTime || del.endLoadingTime,
            actualDeparture: normalizedUpdated.actualDepartureTime || del.actualDeparture,
            status: isDelivered ? 'DELIVERED' : (normalizedUpdated.status === 'Departed' ? 'IN TRANSIT' : del.status),
            deliveryStatus: isDelivered ? 'DELIVERED' : (normalizedUpdated.status === 'Departed' ? 'IN TRANSIT' : del.deliveryStatus),
            actualDeliveryDate: isDelivered ? (normalizedUpdated.deliveryDate || del.actualDeliveryDate || new Date().toISOString().slice(0, 10)) : del.actualDeliveryDate,
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    broadcastDataChange('DISPATCH_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Dispatch POD: ${updated.podNumber} updated to ${updated.status}.`);
  };

  // ---------------------------------------------------------------------------
  // 6. FORWARDING RECORD CRUD OPERATIONS (With Automated SLA Rules & Notifications)
  // ---------------------------------------------------------------------------
  const addForwardingRecord = async (
    recordData: Partial<ForwardingProgressiveRecord>
  ): Promise<ForwardingProgressiveRecord> => {
    assertCanMutate('add forwarding record');
    const newId = recordData.id || `FPR-2026-${Math.floor(100 + Math.random() * 900)}`;
    const clientName = recordData.client || 'General Cargo';
    const mode = recordData.modeOfShipment || 'Land Freight';
    const area = recordData.area || 'Luzon';

    // Automated SLA Lead Time Lookup (evaluates business rules)
    const isISCI = clientName.toLowerCase().includes('intelligent skin care') || clientName.toLowerCase().includes('isci');
    const isRORO = mode === 'RORO';
    const isVisayas = area === 'Visayas';
    const calculatedLeadTime = (isISCI && isRORO && isVisayas) 
      ? 13 
      : (recordData.deliveryLeadTimeDays || getAutoDeliveryLeadTime(clientName, mode, area));

    const dispatchDate = recordData.actualDispatchDate || '2026-08-25';
    const actualDelivery = recordData.actualDeliveryDate || '';
    const podReturn = recordData.dateOfPodReturn || '';

    // Calculate TAT and Performance
    let deliveryTat = 0;
    let deliveryPerf = recordData.deliveryPerformance || 'PENDING';
    if (dispatchDate && actualDelivery) {
      const res = computeDeliveryPerformance(dispatchDate, actualDelivery, calculatedLeadTime);
      deliveryTat = res.tatDays;
      deliveryPerf = res.performance;
    }

    const podDueRes = calculatePodReturnDueDate(actualDelivery, clientName, area);
    const autoPod = determineAutomaticPodStatus({
      actualDeliveryDate: actualDelivery,
      podReturnDueDate: recordData.podReturnDueDate || podDueRes.podReturnDueDate,
      actualPodReturnDate: podReturn,
      clientName,
      deliveryArea: area,
    });

    const newRecord: ForwardingProgressiveRecord = {
      id: newId,
      month: recordData.month || 'August 2026',
      coordinator: recordData.coordinator || 'Maria Santos',
      client: clientName,
      clientId: recordData.clientId,
      modeOfShipment: mode,
      area: area,
      referenceNumber: recordData.referenceNumber || `PRJ-${clientName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      actualDispatchDate: dispatchDate,
      consignee: recordData.consignee || 'Consignee Facility',
      destinationCode: recordData.destinationCode || 'MNL-01',
      quantity: recordData.quantity ?? 100,
      unit: recordData.unit || 'Boxes',
      courier: recordData.courier || 'OFII Fleet Logistics',
      cbm: recordData.cbm,
      volumeWeightKg: recordData.volumeWeightKg,
      actualWeightKg: recordData.actualWeightKg ?? ((recordData.quantity ?? 100) * 12),
      chargeableWeightFees: recordData.chargeableWeightFees || 'PHP 25,000.00',
      declaredValue: recordData.declaredValue || 'PHP 1,000,000.00',
      podNumber: recordData.podNumber || `POD-${Math.floor(100000 + Math.random() * 900000)}`,
      awbCourierRefNumber: recordData.awbCourierRefNumber || `AWB-${Math.floor(10000 + Math.random() * 90000)}`,
      deliveryStatus: recordData.deliveryStatus || (actualDelivery ? 'Delivered' : 'In Transit'),
      receiversName: recordData.receiversName || '',
      actualDeliveryDate: actualDelivery,
      deliveryLeadTimeDays: calculatedLeadTime,
      deliveryTatDays: deliveryTat,
      deliveryPerformance: deliveryPerf,
      reasonForDelay: recordData.reasonForDelay,
      podStatus: autoPod.status,
      dateOfPodReturn: podReturn,
      podLeadTimeDays: podDueRes.podLeadTimeDays,
      podReturnDueDate: podDueRes.podReturnDueDate || undefined,
      podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || undefined,
      podTatDays: autoPod.podTatDays,
      podPerformance: autoPod.podPerformance,
      podReasonForDelay: recordData.podReasonForDelay,
      isDeleted: false,
      ...recordData,
    };

    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapForwardingToDb(newRecord);
      const { error } = await supabase.from('forwarding_records').insert(dbPayload);
      if (error) {
        console.error('[Supabase addForwardingRecord] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setForwardingRecords((prev) => [newRecord, ...prev.filter((f) => f.id !== newRecord.id)]);

    // Mirror to shipments with exact same ID & POD so system-wide shipment count is unified
    const newShipment: ShipmentRecord = {
      id: newRecord.id,
      client: newRecord.client,
      clientId: newRecord.clientId,
      monthStarted: new Date().toLocaleDateString('en-US', { month: 'long' }),
      bookedDate: newRecord.actualDispatchDate,
      pickupDate: newRecord.actualDispatchDate,
      deliveryDate: newRecord.actualDeliveryDate || newRecord.plannedDeliveryDate,
      consignee: newRecord.consignee,
      destination: `${newRecord.destinationCode || ''} - ${newRecord.consignee}`,
      modeOfShipment: newRecord.modeOfShipment,
      quantityBoxes: newRecord.quantity,
      actualWeightKg: newRecord.actualWeightKg,
      status: newRecord.deliveryStatus === 'Delivered' ? 'Delivered' : (newRecord.deliveryStatus === 'Delayed' ? 'Delayed' : (newRecord.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
      area: newRecord.area,
      podNumber: newRecord.podNumber,
      plateNumber: newRecord.plateNumber,
      manifestNumber: newRecord.referenceNumber,
      awbNumber: newRecord.referenceNumber,
      datePodReceived: newRecord.dateOfPodReturn,
      podStatus: newRecord.podStatus,
      isDeleted: false,
    };
    setShipments((prev) => [newShipment, ...prev.filter((s) => s.id !== newShipment.id && s.podNumber !== newShipment.podNumber)]);

    // 10. FORWARDING -> DISPATCH WORKFLOW: Create dispatch notification for required completion
    const newNotification: ForwardingDispatchNotification = {
      id: `FDN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      forwardingRecordId: newRecord.id,
      client: newRecord.client,
      clientId: newRecord.clientId,
      consignee: newRecord.consignee,
      podNumber: newRecord.podNumber,
      referenceNumber: newRecord.referenceNumber,
      deliveryDate: newRecord.actualDispatchDate,
      modeOfShipment: newRecord.modeOfShipment,
      area: newRecord.area,
      quantity: newRecord.quantity,
      unit: newRecord.unit,
      destination: `${newRecord.destinationCode} - ${newRecord.consignee}`,
      destinationCode: newRecord.destinationCode,
      source: 'Forwarding Progressive Report',
      message: 'New shipment added. Dispatch record requires completion.',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const notifDbPayload = mapNotificationToDb(newNotification);
      await supabase.from('notifications').insert(notifDbPayload);
    }
    setNotifications((prev) => [newNotification, ...prev]);

    broadcastDataChange('FORWARDING_ADDED', newRecord);
    showSuccessToast('Forwarding record saved successfully.', `POD: ${newRecord.podNumber} • Action item logged in Notifications.`);
    return newRecord;
  };

  const clearImportHistory = useCallback(() => {
    setImportHistory([]);
  }, []);

  const bulkImportForwardingRecords = async (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ): Promise<void> => {
    assertCanMutate('bulk import forwarding records');
    if (!records || records.length === 0) return;

    if (isSupabaseConfigured() && supabase) {
      try {
        const dbPayloads = records.map(mapForwardingToDb);
        const { error } = await supabase.from('forwarding_records').upsert(dbPayloads);
        if (error) {
          console.error('[Supabase bulkImportForwardingRecords] Error:', error);
        }
      } catch (err) {
        console.error('[Supabase bulkImportForwardingRecords] Exception:', err);
      }
    }

    // Append to existing prototype data - NEVER replace or lose existing records
    setForwardingRecords((prev) => {
      const newIds = new Set(records.map((r) => r.id));
      return [...records, ...prev.filter((p) => !newIds.has(p.id))];
    });

    // Also synchronize to shipments collection
    const syncedShipments: ShipmentRecord[] = records.map((rec) => ({
      id: rec.id,
      client: rec.client,
      clientId: rec.clientId,
      monthStarted: new Date().toLocaleDateString('en-US', { month: 'long' }),
      bookedDate: rec.actualDispatchDate,
      pickupDate: rec.actualDispatchDate,
      deliveryDate: rec.actualDeliveryDate || rec.plannedDeliveryDate,
      consignee: rec.consignee,
      destination: `${rec.destinationCode || ''} - ${rec.consignee}`,
      modeOfShipment: rec.modeOfShipment,
      quantityBoxes: rec.quantity,
      actualWeightKg: rec.actualWeightKg,
      status: rec.deliveryStatus === 'Delivered' ? 'Delivered' : (rec.deliveryStatus === 'Delayed' ? 'Delayed' : (rec.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
      area: rec.area,
      podNumber: rec.podNumber,
      plateNumber: rec.plateNumber,
      manifestNumber: rec.referenceNumber,
      awbNumber: rec.referenceNumber,
      datePodReceived: rec.dateOfPodReturn,
      podStatus: rec.podStatus,
      isDeleted: false,
    }));
    const newRecordIds = new Set(records.map((r) => r.id));
    setShipments((prev) => [...syncedShipments, ...prev.filter((p) => !newRecordIds.has(p.id))]);

    // Create notifications for Daily Dispatching for imported forwarding records
    const newNotifs: ForwardingDispatchNotification[] = records.map((rec, i) => ({
      id: `FDN-IMP-${Date.now().toString().slice(-6)}-${i + 1}`,
      forwardingRecordId: rec.id,
      client: rec.client,
      clientId: rec.clientId,
      consignee: rec.consignee,
      podNumber: rec.podNumber,
      referenceNumber: rec.referenceNumber,
      deliveryDate: rec.actualDispatchDate,
      modeOfShipment: rec.modeOfShipment,
      area: rec.area,
      quantity: rec.quantity,
      unit: rec.unit,
      destination: `${rec.destinationCode || ''} - ${rec.consignee}`,
      destinationCode: rec.destinationCode,
      source: 'Forwarding Progressive Report',
      message: 'Imported shipment requires dispatch completion.',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    }));
    setNotifications((prev) => [...newNotifs, ...prev]);

    // Track in Import History
    const historyEntry: ImportHistoryRecord = {
      id: `IMP-HIST-${Date.now()}`,
      fileName: meta?.fileName || 'Imported_Forwarding_Report.xlsx',
      fileSize: meta?.fileSize || '38.5 KB',
      importedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      importedBy: 'Alodia Manalansan',
      totalRows: meta?.totalRows || records.length,
      successfullyImported: meta?.importedCount || records.length,
      warnings: meta?.warningCount || 0,
      skipped: meta?.skippedCount || 0,
      status: (meta?.skippedCount || 0) > 0 && (meta?.importedCount || records.length) > 0 ? 'Partially Completed' : 'Completed',
    };
    setImportHistory((prev) => [historyEntry, ...prev]);

    broadcastDataChange('FORWARDING_BULK_IMPORTED', records);
    showSuccessToast(
      'Excel records imported successfully.',
      `${records.length} records added to Forwarding Progressive Report.`
    );
  };

  const bulkImportDispatches = async (
    records: ForwardingProgressiveRecord[],
    meta?: {
      fileName: string;
      fileSize?: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ): Promise<void> => {
    assertCanMutate('bulk import dispatches');
    if (!records || records.length === 0) return;

    const newDispatches: DispatchRecord[] = records.map((rec, i) => {
      const arr = rec.timeArrived || rec.truckArrivalTime || '07:30 AM';
      const startLoad = rec.startLoadingTime || rec.loadingStartTime || '08:00 AM';
      const endLoad = rec.endLoadingTime || rec.loadingEndTime || '09:15 AM';
      const dep = rec.actualDepartureTime || rec.departureTime || '09:45 AM';

      return {
        id: `DSP-IMP-${Date.now().toString().slice(-6)}-${i + 1}`,
        deliveryDate: rec.actualDispatchDate || '2026-08-25',
        plannedDeliveryDate: rec.plannedDeliveryDate || rec.actualDispatchDate || '2026-08-26',
        clientName: rec.client,
        consignee: rec.consignee,
        destination: rec.destination || `${rec.destinationCode || 'HUB'} - ${rec.consignee}`,
        truckProvider: rec.truckProvider || rec.courier || 'OFII Fleet Logistics',
        plateNumber: rec.plateNumber || 'NDB-4921',
        driverName: rec.driverName || 'Danilo P. Hernandez',
        driverContact: '0917-882-9912',
        truckArrivalTime: arr,
        loadingStartTime: startLoad,
        loadingEndTime: endLoad,
        departureTime: dep,
        timeArrived: arr,
        startLoadingTime: startLoad,
        endLoadingTime: endLoad,
        actualDepartureTime: dep,
        manifestNumber: rec.referenceNumber || `MNF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        podNumber: rec.podNumber,
        drNumber: rec.drNumber,
        sealNumber: rec.sealNumber,
        itemDescription: rec.itemDescription,
        dispatchDate: rec.actualDispatchDate,
        actualDeliveryDate: rec.actualDeliveryDate,
        deliveryType: (rec.deliveryType === 'GADC' || rec.deliveryType === 'ISCI' || rec.deliveryType === 'XSEED' || rec.deliveryType === 'LTL' || rec.deliveryType === 'FTL' || rec.deliveryType === 'Inter-Island' || rec.deliveryType === 'Air Freight') ? rec.deliveryType : 'FTL',
        quantityCasesBoxes: rec.quantity || 100,
        unit: rec.unit || 'Boxes',
        status: rec.deliveryStatus === 'Delivered' ? 'Delivered' : (rec.deliveryStatus === 'Delayed' ? 'Delayed' : 'In Transit'),
        totalWeightKg: rec.actualWeightKg || ((rec.quantity || 100) * 12),
        remarks: rec.reasonForDelay || 'Bulk imported via Daily Dispatch Excel',
        isDeleted: false,
        importSource: 'Excel Import',
        importedAt: new Date().toISOString(),
      };
    });

    if (isSupabaseConfigured() && supabase) {
      try {
        const dbPayloads = newDispatches.map(mapDispatchToDb);
        const { error } = await supabase.from('dispatches').upsert(dbPayloads);
        if (error) {
          console.error('[Supabase bulkImportDispatches] Error:', error);
        }
      } catch (err) {
        console.error('[Supabase bulkImportDispatches] Exception:', err);
      }
    }

    // Append to dispatches - NEVER replace or lose existing records
    setDispatches((prev) => {
      const newIds = new Set(newDispatches.map((d) => d.id));
      return [...newDispatches, ...prev.filter((p) => !newIds.has(p.id))];
    });

    // Track in Import History
    const historyEntry: ImportHistoryRecord = {
      id: `IMP-HIST-${Date.now()}`,
      fileName: meta?.fileName || 'Imported_Daily_Dispatch.xlsx',
      fileSize: meta?.fileSize || '35.0 KB',
      importedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      importedBy: 'Justine Ryan Paular',
      totalRows: meta?.totalRows || newDispatches.length,
      successfullyImported: meta?.importedCount || newDispatches.length,
      warnings: meta?.warningCount || 0,
      skipped: meta?.skippedCount || 0,
      status: (meta?.skippedCount || 0) > 0 && (meta?.importedCount || newDispatches.length) > 0 ? 'Partially Completed' : 'Completed',
    };
    setImportHistory((prev) => [historyEntry, ...prev]);

    // Synchronize operational fields to matching master Forwarding records without duplicating shipments
    setForwardingRecords((prev) =>
      prev.map((f) => {
        const matchingDispatch = newDispatches.find(
          (d) =>
            (d.podNumber && f.podNumber && d.podNumber.trim().toLowerCase() === f.podNumber.trim().toLowerCase()) ||
            (d.manifestNumber && f.referenceNumber && d.manifestNumber.trim().toLowerCase() === f.referenceNumber.trim().toLowerCase())
        );
        if (matchingDispatch) {
          return {
            ...f,
            plateNumber: matchingDispatch.plateNumber || f.plateNumber,
            truckProvider: matchingDispatch.truckProvider || f.truckProvider,
            driverName: matchingDispatch.driverName || f.driverName,
            timeArrived: matchingDispatch.timeArrived || f.timeArrived,
            startLoadingTime: matchingDispatch.startLoadingTime || f.startLoadingTime,
            endLoadingTime: matchingDispatch.endLoadingTime || f.endLoadingTime,
            actualDepartureTime: matchingDispatch.actualDepartureTime || f.actualDepartureTime,
            truckArrivalTime: matchingDispatch.truckArrivalTime || f.truckArrivalTime,
            loadingStartTime: matchingDispatch.loadingStartTime || f.loadingStartTime,
            loadingEndTime: matchingDispatch.loadingEndTime || f.loadingEndTime,
            departureTime: matchingDispatch.departureTime || f.departureTime,
            deliveryStatus: matchingDispatch.status === 'Delivered'
              ? 'Delivered'
              : (matchingDispatch.status === 'Delayed' ? 'Delayed' : (matchingDispatch.status === 'Departed' || matchingDispatch.status === 'In Transit' ? 'In Transit' : f.deliveryStatus)),
          };
        }
        return f;
      })
    );

    // Complete any matching pending notifications for dispatch
    newDispatches.forEach((d) => {
      const matchingNotif = notifications.find(
        (n) => n.podNumber === d.podNumber || (n.consignee === d.consignee && n.deliveryDate === d.deliveryDate)
      );
      if (matchingNotif && matchingNotif.status !== 'COMPLETED') {
        completeNotification(matchingNotif.id, d.id);
      }
    });

    broadcastDataChange('DISPATCH_BULK_IMPORTED', newDispatches);
    showSuccessToast(
      'Excel dispatches imported successfully.',
      `${newDispatches.length} dispatch records added to Daily Dispatching Monitoring.`
    );
  };

  const updateForwardingRecord = async (updated: ForwardingProgressiveRecord): Promise<void> => {
    assertCanMutate('update forwarding record');
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapForwardingToDb(updated);
      const { error } = await supabase.from('forwarding_records').update(dbPayload).eq('id', updated.id);
      if (error) {
        console.error('[Supabase updateForwardingRecord] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setForwardingRecords((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    
    // Sync with Individual Deliveries to maintain single source of truth without duplicates
    setIndividualDeliveries((prevDeliveries) =>
      prevDeliveries.map((d) => {
        if (
          d.id === updated.id ||
          d.deliveryId === updated.deliveryId ||
          (updated.individualDeliveryPod && d.individualDeliveryPod === updated.individualDeliveryPod) ||
          (updated.podNumber && d.individualDeliveryPod === updated.podNumber)
        ) {
          return {
            ...d,
            actualDeliveryDate: updated.actualDeliveryDate || d.actualDeliveryDate,
            podReturnDate: updated.dateOfPodReturn || d.podReturnDate,
            receiversName: updated.receiversName || d.receiversName,
            status: updated.actualDeliveryDate
              ? 'Delivered'
              : updated.deliveryStatus === 'Delivered'
              ? 'Delivered'
              : d.status,
          };
        }
        return d;
      })
    );

    setShipments((prev) =>
      prev.map((s) => {
        if (s.id === updated.id || (updated.podNumber && s.podNumber === updated.podNumber)) {
          return {
            ...s,
            client: updated.client || s.client,
            clientId: updated.clientId || s.clientId,
            consignee: updated.consignee || s.consignee,
            destination: `${updated.destinationCode || ''} - ${updated.consignee}`,
            modeOfShipment: updated.modeOfShipment || s.modeOfShipment,
            quantityBoxes: updated.quantity || s.quantityBoxes,
            actualWeightKg: updated.actualWeightKg || s.actualWeightKg,
            deliveryDate: updated.actualDeliveryDate || updated.plannedDeliveryDate || s.deliveryDate,
            status: updated.deliveryStatus === 'Delivered' ? 'Delivered' : (updated.deliveryStatus === 'Delayed' ? 'Delayed' : (updated.deliveryStatus === 'In Transit' ? 'In Transit' : 'Booked')),
            podNumber: updated.podNumber || s.podNumber,
            datePodReceived: updated.dateOfPodReturn || s.datePodReceived,
            podStatus: updated.podStatus || s.podStatus,
            plateNumber: updated.plateNumber || s.plateNumber,
            manifestNumber: updated.referenceNumber || s.manifestNumber,
          };
        }
        return s;
      })
    );

    // Also synchronize corresponding Dispatch record if present
    setDispatches((prev) => {
      const next = prev.map((d) => {
        const matchesPod = Boolean(
          updated.podNumber && d.podNumber &&
          d.podNumber.trim().toLowerCase() === updated.podNumber.trim().toLowerCase()
        );
        const matchesRef = Boolean(
          updated.referenceNumber && d.manifestNumber &&
          d.manifestNumber.trim().toLowerCase() === updated.referenceNumber.trim().toLowerCase()
        );
        const matchesId = d.id === updated.id || (updated as any).deliveryId === d.id;
        if (matchesPod || matchesRef || matchesId) {
          return {
            ...d,
            plateNumber: updated.plateNumber || d.plateNumber,
            truckProvider: updated.truckProvider || updated.courier || d.truckProvider,
            driverName: updated.driverName || d.driverName,
            status: updated.deliveryStatus === 'Delivered'
              ? 'Delivered'
              : (updated.deliveryStatus === 'Delayed' ? 'Delayed' : (updated.deliveryStatus === 'In Transit' ? 'In Transit' : d.status)),
            deliveryDate: updated.actualDeliveryDate || d.deliveryDate,
          };
        }
        return d;
      });
      try {
        localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    broadcastDataChange('FORWARDING_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Forwarding Record ${updated.podNumber} updated.`);
  };

  const updateShipment = async (updated: ShipmentRecord): Promise<void> => {
    assertCanMutate('update shipment');
    if (isSupabaseConfigured() && supabase) {
      const dbPayload = mapShipmentToDb(updated);
      const { error } = await supabase.from('shipments').update(dbPayload).eq('id', updated.id);
      if (error) {
        console.error('[Supabase updateShipment] Error:', error);
        throw new Error('Unable to save changes. Please try again.');
      }
    }

    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    broadcastDataChange('SHIPMENT_UPDATED', updated);
    showSuccessToast('Changes saved successfully.', `Shipment ${updated.id} updated.`);
  };

  // ---------------------------------------------------------------------------
  // 7. SOFT DELETE & RECOVERY (Trash)
  // ---------------------------------------------------------------------------
  const softDeleteRecord = async (
    id: string,
    type: OperationalRecordType,
    reason?: string
  ): Promise<void> => {
    assertCanMutate('soft delete record');
    const timestamp = new Date().toISOString();
    const user = 'Operations Officer';

    if (type === 'dispatch') {
      const target = dispatches.find((d) => d.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('dispatches').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setDispatches((prev) => {
          const next = prev.map((d) => (d.id === id ? updated : d));
          try {
            localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
          } catch (e) {}
          return next;
        });

        // Also soft-delete corresponding Individual Delivery if present
        setIndividualDeliveries((prev) => {
          const next = prev.map((del) => {
            if (del.id === id || del.deliveryId === id || (target.podNumber && del.individualDeliveryPod === target.podNumber)) {
              return { ...del, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
            }
            return del;
          });
          try {
            localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    } else if (type === 'forwarding_report') {
      const target = forwardingRecords.find((f) => f.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('forwarding_records').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setForwardingRecords((prev) => prev.map((f) => (f.id === id ? updated : f)));

        // Also soft-delete corresponding Individual Delivery if present
        setIndividualDeliveries((prev) => {
          const next = prev.map((del) => {
            if (del.id === id || del.deliveryId === id || (target.podNumber && del.individualDeliveryPod === target.podNumber)) {
              return { ...del, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
            }
            return del;
          });
          try {
            localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    } else if (type === 'shipment') {
      const target = shipments.find((s) => s.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('shipments').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setShipments((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } else if (type === 'client') {
      const target = clients.find((c) => c.id === id);
      if (target) {
        const updated = { ...target, isDeleted: true, deletedAt: timestamp, deletedBy: user, deleteReason: reason };
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('clients').update({ is_deleted: true, deleted_at: timestamp, deleted_by: user, delete_reason: reason }).eq('id', id);
        }
        setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    }

    broadcastDataChange('RECORD_SOFT_DELETED', { id, type });
    showSuccessToast('Record moved to Recently Deleted (Trash).', 'You can restore or permanently delete it at any time.');
  };

  const restoreRecord = async (id: string, type: OperationalRecordType): Promise<void> => {
    assertCanMutate('restore record');
    if (type === 'dispatch') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('dispatches').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setDispatches((prev) => {
        const next = prev.map((d) => (d.id === id ? { ...d, isDeleted: false, deletedAt: undefined } : d));
        try {
          localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      // Also restore corresponding Individual Delivery if present
      setIndividualDeliveries((prev) => {
        const next = prev.map((del) => {
          if (del.id === id || del.deliveryId === id) {
            return { ...del, isDeleted: false, deletedAt: undefined, deleteReason: undefined };
          }
          return del;
        });
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else if (type === 'forwarding_report') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('forwarding_records').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setForwardingRecords((prev) => prev.map((f) => (f.id === id ? { ...f, isDeleted: false, deletedAt: undefined } : f)));

      // Also restore corresponding Individual Delivery if present
      setIndividualDeliveries((prev) => {
        const next = prev.map((del) => {
          if (del.id === id || del.deliveryId === id) {
            return { ...del, isDeleted: false, deletedAt: undefined, deleteReason: undefined };
          }
          return del;
        });
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else if (type === 'shipment') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('shipments').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, isDeleted: false, deletedAt: undefined } : s)));
    } else if (type === 'client') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('clients').update({ is_deleted: false, deleted_at: null, deleted_by: null, delete_reason: null }).eq('id', id);
      }
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, isDeleted: false, deletedAt: undefined } : c)));
    }

    broadcastDataChange('RECORD_RESTORED', { id, type });
    showSuccessToast('Record restored successfully.', 'The record is now active and included in all operational calculations.');
  };

  const permanentDeleteRecord = async (id: string, type: OperationalRecordType): Promise<void> => {
    assertCanMutate('permanent delete record');
    if (type === 'dispatch') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('dispatches').delete().eq('id', id);
      }
      setDispatches((prev) => {
        const next = prev.filter((d) => d.id !== id);
        try {
          localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } else if (type === 'forwarding_report') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('forwarding_records').delete().eq('id', id);
      }
      setForwardingRecords((prev) => prev.filter((f) => f.id !== id));
    } else if (type === 'shipment') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('shipments').delete().eq('id', id);
      }
      setShipments((prev) => prev.filter((s) => s.id !== id));
    } else if (type === 'client') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('clients').delete().eq('id', id);
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
    }

    broadcastDataChange('RECORD_PERMANENT_DELETED', { id, type });
    showSuccessToast('Record permanently removed.', 'The record has been purged from the database.');
  };

  // ---------------------------------------------------------------------------
  // 8. NOTIFICATION ACTIONS
  // ---------------------------------------------------------------------------
  const dismissNotification = async (id: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('notifications').update({ is_dismissed: true }).eq('id', id);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isDismissed: true } : n)));
    broadcastDataChange('NOTIFICATION_DISMISSED', { id });
  };

  const completeNotification = async (id: string, dispatchId: string): Promise<void> => {
    const timestamp = new Date().toISOString();
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('notifications')
        .update({ status: 'COMPLETED', completed_at: timestamp, completed_dispatch_id: dispatchId })
        .eq('id', id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'COMPLETED', completedAt: timestamp, completedDispatchId: dispatchId } : n))
    );
    broadcastDataChange('NOTIFICATION_COMPLETED', { id, dispatchId });
  };

  const markPodNotificationAsRead = async (id: string): Promise<void> => {
    setPodNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      );
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const markAllPodNotificationsAsRead = async (): Promise<void> => {
    setPodNotifications((prev) => {
      const updated = prev.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      }));
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
    showSuccessToast('All POD notifications marked as read.');
  };

  const assignDriverToDelivery = async (
    recordId: string,
    driverName: string,
    plateNumber?: string,
    vehicleType?: string,
    helperName?: string,
    assignedDriverId?: string,
    assignedHelperId?: string
  ): Promise<void> => {
    assertCanMutate('assign driver to delivery');
    // 1. Locate the record across forwardingRecords, dispatches, or shipments
    const targetForwarding = forwardingRecords.find(r => r.id === recordId || r.podNumber === recordId);
    const targetDispatch = dispatches.find(d => d.id === recordId || d.podNumber === recordId);
    const targetShipment = shipments.find(s => s.id === recordId || s.podNumber === recordId);

    const podNumber = targetForwarding?.podNumber || targetDispatch?.podNumber || targetShipment?.podNumber || recordId;
    const client = targetForwarding?.client || targetDispatch?.clientName || targetShipment?.client || 'OFII Client';
    const consignee = targetForwarding?.consignee || targetDispatch?.consignee || targetShipment?.consignee || 'Consignee Facility';
    const area = targetForwarding?.area || targetDispatch?.area || targetShipment?.area || 'NCR';
    const destination = targetForwarding?.destination || targetDispatch?.destination || targetShipment?.destination || '';
    const deliveryDate = targetForwarding?.plannedDeliveryDate || targetDispatch?.plannedDeliveryDate || targetShipment?.pickupDate || new Date().toISOString().split('T')[0];
    const dispatchTime = targetForwarding?.departureTime || targetDispatch?.departureTime || targetForwarding?.actualDepartureTime || '08:00 AM';
    const vehicle = vehicleType || targetForwarding?.courier || targetDispatch?.truckProvider || 'OFII Fleet Logistics';
    const plate = plateNumber || targetForwarding?.plateNumber || targetDispatch?.plateNumber || targetShipment?.plateNumber || 'TBD';
    const quantity = targetForwarding?.quantity || targetDispatch?.quantityCasesBoxes || targetShipment?.quantityBoxes || 0;
    const unit = targetForwarding?.unit || targetDispatch?.unit || 'Boxes';
    const refNum = targetForwarding?.referenceNumber || targetDispatch?.manifestNumber || targetShipment?.drNumber || targetShipment?.podNumber;

    // Resolve Driver ID from registered users or roster
    const registeredUsers = getRegisteredUsers();
    const matchedUser = registeredUsers.find(u => 
      (assignedDriverId && (u.id === assignedDriverId || u.employeeId === assignedDriverId || u.driverId === assignedDriverId)) ||
      u.name.toLowerCase().trim() === driverName.toLowerCase().trim() ||
      (u.driverName && u.driverName.toLowerCase().trim() === driverName.toLowerCase().trim())
    );
    const matchedRosterDriver = OFII_DRIVERS_ROSTER.find(d => d.name.toLowerCase().trim() === driverName.toLowerCase().trim());
    const finalDriverId = assignedDriverId || matchedUser?.driverId || matchedUser?.employeeId || matchedUser?.id || matchedRosterDriver?.id || 'DRV-001';

    // Resolve Helper ID from helper roster
    const matchedHelper = OFII_HELPERS_ROSTER.find(h =>
      (assignedHelperId && h.id === assignedHelperId) ||
      (helperName && h.name.toLowerCase().trim() === helperName.toLowerCase().trim())
    );
    const finalHelperId = assignedHelperId || matchedHelper?.id || undefined;
    const nowIso = new Date().toISOString();

    // 2. Update Forwarding Records
    setForwardingRecords(prev => prev.map(rec => {
      if (rec.id === recordId || (podNumber && rec.podNumber === podNumber)) {
        const nextDeliveryStatus = (rec.deliveryStatus === 'Delivered' || rec.deliveryStatus === 'In Transit' || rec.deliveryStatus === 'Out for Delivery')
          ? rec.deliveryStatus
          : 'Assigned';

        return {
          ...rec,
          driverName,
          assignedDriver: driverName,
          assignedDriverId: finalDriverId,
          helperName: helperName || rec.helperName,
          assignedHelper: helperName || rec.assignedHelper,
          assignedHelperId: finalHelperId,
          assignmentStatus: 'Assigned',
          assignmentDate: nowIso,
          plateNumber: plate,
          courier: vehicle,
          truckProvider: vehicle,
          deliveryStatus: nextDeliveryStatus,
          driverProgressStatus: rec.driverProgressStatus || 'Assigned',
        };
      }
      return rec;
    }));

    // 3. Update Dispatches
    setDispatches(prev => prev.map(disp => {
      if (disp.id === recordId || (podNumber && disp.podNumber === podNumber)) {
        return {
          ...disp,
          driverName,
          assignedDriver: driverName,
          assignedDriverId: finalDriverId,
          helperName: helperName || disp.helperName,
          assignedHelper: helperName || disp.assignedHelper,
          assignedHelperId: finalHelperId,
          assignmentStatus: 'Assigned',
          assignmentDate: nowIso,
          plateNumber: plate,
          truckProvider: vehicle,
          driverProgressStatus: disp.driverProgressStatus || 'Assigned',
        };
      }
      return disp;
    }));

    // 4. Update Shipments
    setShipments(prev => prev.map(ship => {
      if (ship.id === recordId || (podNumber && ship.podNumber === podNumber)) {
        return {
          ...ship,
          driverName,
          assignedDriver: driverName,
          assignedDriverId: finalDriverId,
          helperName: helperName || ship.helperName,
          assignedHelper: helperName || ship.assignedHelper,
          assignedHelperId: finalHelperId,
          assignmentStatus: 'Assigned',
          assignmentDate: nowIso,
          plateNumber: plate,
          truckPlate: plate,
          driverProgressStatus: ship.driverProgressStatus || 'Assigned',
        };
      }
      return ship;
    }));

    // 5. Automatically create a real DriverAssignmentNotification (no duplicates)
    const assignedTruckRunNum = targetForwarding?.truckRunNumber || 'TR-0007';
    const newNotif: DriverAssignmentNotification = {
      id: `DAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverName,
      driverId: finalDriverId,
      assignedDriverId: finalDriverId,
      assignedHelperId: finalHelperId,
      helperName: helperName || undefined,
      assignedHelper: helperName || undefined,
      recordId: targetForwarding?.id || targetDispatch?.id || recordId,
      deliveryId: targetForwarding?.deliveryId || recordId,
      truckRunNumber: assignedTruckRunNum,
      batchName: (targetForwarding as any)?.deliveryBatchName || (targetForwarding as any)?.batchName || 'General Batch',
      plannedDispatchDate: targetForwarding?.actualDispatchDate || deliveryDate,
      truckName: vehicle || 'OFII Dedicated Fleet',
      assignedDriver: driverName,
      podNumber,
      referenceNumber: refNum,
      client,
      consignee,
      area,
      destination: destination || area,
      deliveryDate,
      dispatchTime,
      vehicle,
      plateNumber: plate,
      quantity,
      unit,
      title: 'New Delivery Assigned',
      message: `You have been assigned a new delivery under Truck Run ${assignedTruckRunNum}.`,
      createdAt: nowIso,
      isRead: false,
    };

    setDriverNotifications(prev => {
      // Prevent duplicate notification for exact same recordId & driverId
      const existing = prev.filter(n => !(n.recordId === (targetForwarding?.id || targetDispatch?.id || recordId) && (n.driverId === finalDriverId || n.assignedDriverId === finalDriverId)));
      const updated = [newNotif, ...existing];
      try {
        localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    broadcastDataChange('DRIVER_ASSIGNED', { recordId, driverName, driverId: finalDriverId, plateNumber: plate, podNumber });
    showSuccessToast('Driver Assigned Successfully', `${driverName} (${finalDriverId}) assigned to ${podNumber}. Driver notification sent.`);
  };

  const markDriverNotificationAsRead = async (id: string): Promise<void> => {
    setDriverNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n);
      try {
        localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const markAllDriverNotificationsAsRead = async (driverIdOrName?: string): Promise<void> => {
    setDriverNotifications(prev => {
      const updated = prev.map(n => {
        if (!driverIdOrName) return { ...n, isRead: true, readAt: new Date().toISOString() };
        const match = 
          n.driverId === driverIdOrName || 
          n.assignedDriverId === driverIdOrName ||
          n.driverName === driverIdOrName ||
          n.driverName.toLowerCase() === driverIdOrName.toLowerCase();
        return match ? { ...n, isRead: true, readAt: new Date().toISOString() } : n;
      });
      try {
        localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
    showSuccessToast('Driver notifications marked as read.');
  };

  const updateDriverProgress = async (
    recordId: string,
    currentLocation: string,
    progressStatus: 'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered'
  ): Promise<void> => {
    assertCanMutate('update driver progress');
    // Find target record in forwardingRecords or individualDeliveries
    const target = forwardingRecords.find((r) => r.id === recordId || r.podNumber === recordId) ||
                   individualDeliveries.find((d) => d.id === recordId || d.individualDeliveryPod === recordId);
    
    // Security Enforcement: Authorize access using driverId, not driverName
    const targetDriverId = target ? (target.assignedDriverId || ('driverId' in target ? target.driverId : undefined)) : undefined;
    const targetDriverName = target ? ('driverName' in target ? target.driverName : ('assignedDriver' in target ? target.assignedDriver : (target as any).driver)) : undefined;

    if (!isUserAuthorizedDriverForDelivery(currentUserProfile, targetDriverId, targetDriverName)) {
      const errorMsg = 'You are not authorized to edit this delivery.';
      console.warn('[Security Enforcement - Driver Only Access]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    // Guard: Do not allow reverting from Delivered back to earlier statuses
    if (target && ('deliveryStatus' in target ? target.deliveryStatus === 'Delivered' : target.status === 'Delivered') && progressStatus !== 'Delivered') {
      console.warn('Cannot revert a Delivered delivery back to an earlier status.');
      return;
    }

    const timestamp = new Date().toISOString();
    let targetPodNumber = '';

    // 1. Update Forwarding Records
    setForwardingRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId || (rec.podNumber && rec.podNumber === recordId)) {
          if ((rec.deliveryStatus === 'Delivered' || rec.driverProgressStatus === 'Delivered') && progressStatus !== 'Delivered') {
            return rec;
          }
          targetPodNumber = rec.podNumber;
          return {
            ...rec,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            deliveryStatus: progressStatus === 'Delivered'
              ? 'Delivered'
              : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? 'In Transit' : rec.deliveryStatus),
          };
        }
        return rec;
      })
    );

    // 2. Update Dispatches
    setDispatches((prev) =>
      prev.map((disp) => {
        if (disp.id === recordId || (targetPodNumber && disp.podNumber === targetPodNumber) || disp.podNumber === recordId) {
          if (disp.status === 'Delivered' && progressStatus !== 'Delivered') {
            return disp;
          }
          return {
            ...disp,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            status: progressStatus === 'Delivered'
              ? 'Delivered'
              : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? 'In Transit' : disp.status),
          };
        }
        return disp;
      })
    );

    // 3. Update Shipments
    setShipments((prev) =>
      prev.map((ship) => {
        if (ship.id === recordId || (targetPodNumber && ship.podNumber === targetPodNumber) || ship.podNumber === recordId) {
          if (ship.status === 'Delivered' && progressStatus !== 'Delivered') {
            return ship;
          }
          return {
            ...ship,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            status: progressStatus === 'Delivered'
              ? 'Delivered'
              : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? progressStatus : ship.status),
          };
        }
        return ship;
      })
    );

    // 4. Update Individual Deliveries
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (del.id === recordId || del.individualDeliveryPod === recordId || (targetPodNumber && del.individualDeliveryPod === targetPodNumber)) {
          if (del.status === 'Delivered' && progressStatus !== 'Delivered') {
            return del;
          }
          return {
            ...del,
            currentLocation: currentLocation.trim(),
            driverProgressStatus: progressStatus,
            progressUpdatedAt: timestamp,
            status: progressStatus === 'Delivered' ? 'Delivered' : (progressStatus === 'Out for Delivery' || progressStatus === 'In Transit' ? 'In Transit' : del.status),
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    broadcastDataChange('DRIVER_PROGRESS_UPDATED', { recordId, currentLocation, progressStatus, timestamp });
    showSuccessToast('Progress Updated', `Location: ${currentLocation} • Status: ${progressStatus}`);
  };

  const markDeliveryAsDelivered = async (params: {
    recordId: string;
    recipientName?: string;
    receiverName?: string;
    dateReceived: string;
    signature?: string;
    remarks?: string;
  }): Promise<void> => {
    assertCanMutate('mark delivery as delivered');
    const { recordId, recipientName, receiverName, dateReceived, signature, remarks } = params;
    const driverEnteredRecipientName = (recipientName || receiverName || '').trim();
    const nowIso = new Date().toISOString();
    const actualDeliveryDate = dateReceived || nowIso.split('T')[0];

    // Find the matching delivery record
    const targetForwarding = forwardingRecords.find((r) => r.id === recordId || r.podNumber === recordId || r.deliveryId === recordId);
    const targetIndividual = individualDeliveries.find((d) => d.id === recordId || d.deliveryId === recordId || d.individualDeliveryPod === recordId);
    const targetDispatch = dispatches.find((d) => d.id === recordId || d.podNumber === recordId);
    const targetShipment = shipments.find((s) => s.id === recordId || s.podNumber === recordId);

    // Security & Permission Enforcement:
    // Driver can enter initial Recipient Name, but CANNOT overwrite an Encoder-confirmed recipient name
    const hasEncoderConfirmedName = Boolean(
      (targetIndividual?.recipientNameHistory && targetIndividual.recipientNameHistory.length > 0) ||
      (targetForwarding?.recipientNameHistory && targetForwarding.recipientNameHistory.length > 0)
    );
    const existingConfirmedName = targetIndividual?.recipientName || targetForwarding?.recipientName;
    const finalRecipientName = (hasEncoderConfirmedName && existingConfirmedName) 
      ? existingConfirmedName 
      : (driverEnteredRecipientName || targetForwarding?.receiversName || targetIndividual?.receiversName || 'Consignee Receiver');
    const driverOriginalName = targetIndividual?.driverRecipientName || targetForwarding?.driverRecipientName || driverEnteredRecipientName || finalRecipientName;

    // Security Enforcement: Authorize access using driverId, not driverName
    const targetDriverId = targetForwarding?.assignedDriverId || targetIndividual?.assignedDriverId || targetIndividual?.driverId;
    const targetDriverName = targetForwarding?.driverName || targetForwarding?.assignedDriver || targetIndividual?.driver || targetDispatch?.driverName;

    if (!isUserAuthorizedDriverForDelivery(currentUserProfile, targetDriverId, targetDriverName)) {
      const errorMsg = 'You are not authorized to edit this delivery.';
      console.warn('[Security Enforcement - Confirm Delivery Access]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    const clientName = targetForwarding?.client || targetIndividual?.client || targetDispatch?.clientName || targetShipment?.client || 'General Client';
    const consignee = targetForwarding?.consignee || targetIndividual?.consignee || targetDispatch?.consignee || targetShipment?.consignee || 'Consignee Facility';
    const driverName = targetForwarding?.driverName || targetForwarding?.assignedDriver || targetIndividual?.driver || targetDispatch?.driverName || targetDispatch?.assignedDriver || targetShipment?.driverName || targetShipment?.assignedDriver || 'Assigned Driver';
    const area = targetForwarding?.area || targetIndividual?.area || (targetShipment?.area as any) || 'Luzon';
    const podNumber = targetForwarding?.podNumber || targetIndividual?.individualDeliveryPod || targetDispatch?.podNumber || targetShipment?.podNumber || `POD-${recordId.slice(-6)}`;
    const refNum = targetForwarding?.referenceNumber || targetIndividual?.referenceNumber || targetDispatch?.manifestNumber || targetShipment?.manifestNumber || '';
    const dispatchDate = targetForwarding?.actualDispatchDate || targetDispatch?.deliveryDate || targetShipment?.pickupDate || '2026-08-25';
    const vehicle = targetForwarding?.vehicle || targetDispatch?.vehicle || 'Delivery Truck';
    const plateNumber = targetForwarding?.plateNumber || targetDispatch?.plateNumber || '—';

    // Calculate TAT and Delivery Performance using centralized lead time & working days calculation
    const leadTime = targetForwarding?.deliveryLeadTimeDays || getAutoDeliveryLeadTime(clientName, targetForwarding?.modeOfShipment || 'Land Freight', area);
    const perfResult = computeDeliveryPerformance(dispatchDate, actualDeliveryDate, leadTime);

    // Calculate POD return due date and automatic POD status (DO NOT set dateOfPodReturn yet - POD document is pending return to office)
    const podDueRes = calculatePodReturnDueDate(actualDeliveryDate, clientName, area);
    const autoPod = determineAutomaticPodStatus({
      actualDeliveryDate: actualDeliveryDate,
      podReturnDueDate: podDueRes.podReturnDueDate,
      actualPodReturnDate: '',
      clientName,
      deliveryArea: area,
    });

    // 1. Update Forwarding Records (Single Source of Truth)
    setForwardingRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId || rec.podNumber === podNumber || (rec.deliveryId && rec.deliveryId === recordId)) {
          return {
            ...rec,
            deliveryStatus: 'Delivered',
            driverProgressStatus: 'Delivered',
            actualDeliveryDate,
            deliveryDate: actualDeliveryDate,
            receiversName: finalRecipientName,
            recipientName: finalRecipientName,
            driverRecipientName: rec.driverRecipientName || finalRecipientName,
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            deliveryLeadTimeDays: leadTime,
            deliveryTatDays: perfResult.tatDays,
            deliveryPerformance: perfResult.performance,
            podReturnDueDate: podDueRes.podReturnDueDate || rec.podReturnDueDate,
            podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || rec.podReturnDueDateFormatted,
            podLeadTimeDays: podDueRes.podLeadTimeDays,
            podStatus: autoPod.status,
            remarks: remarks || rec.remarks,
            deliveryRemarks: remarks || rec.deliveryRemarks,
          };
        }
        return rec;
      })
    );

    // 2. Update Dispatches
    setDispatches((prev) =>
      prev.map((disp) => {
        if (disp.id === recordId || disp.podNumber === podNumber) {
          return {
            ...disp,
            status: 'Delivered',
            driverProgressStatus: 'Delivered',
            receiversName: finalRecipientName,
            recipientName: finalRecipientName,
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            remarks: remarks || disp.remarks,
          };
        }
        return disp;
      })
    );

    // 3. Update Shipments
    setShipments((prev) =>
      prev.map((ship) => {
        if (ship.id === recordId || ship.podNumber === podNumber) {
          return {
            ...ship,
            status: 'Delivered',
            driverProgressStatus: 'Delivered',
            deliveryDate: actualDeliveryDate,
            actualDeliveryDate,
            receiversName: finalRecipientName,
            recipientName: finalRecipientName,
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            podReturnDueDate: podDueRes.podReturnDueDate || ship.podReturnDueDate,
            podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || ship.podReturnDueDateFormatted,
            podStatus: autoPod.status,
          };
        }
        return ship;
      })
    );

    // 4. Update Individual Deliveries - EXACT record linkage
    setIndividualDeliveries((prev) => {
      const next: IndividualDelivery[] = prev.map((del) => {
        const isTarget =
          del.id === recordId ||
          del.deliveryId === recordId ||
          del.individualDeliveryPod === podNumber ||
          (targetIndividual && del.id === targetIndividual.id) ||
          (targetForwarding?.individualDeliveryId && del.id === targetForwarding.individualDeliveryId) ||
          (targetForwarding?.deliveryId && del.deliveryId === targetForwarding.deliveryId);

        if (isTarget) {
          return {
            ...del,
            status: 'DELIVERED',
            deliveryStatus: 'DELIVERED',
            podStatus: 'POD PENDING',
            driverProgressStatus: 'Delivered' as const,
            actualDeliveryDate,
            recipientName: finalRecipientName,
            receiversName: finalRecipientName,
            driverRecipientName: del.driverRecipientName || finalRecipientName,
            dateReceived,
            receiverSignature: signature,
            currentLocation: 'Delivered to Consignee',
            progressUpdatedAt: nowIso,
            deliveryRemarks: remarks || del.deliveryRemarks,
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 4. Create Office / Encoder Notification: DELIVERY COMPLETED
    const coordinator = targetForwarding?.coordinator || targetIndividual?.coordinator || 'Alodia Manalansan';
    const completionNotif: PODNotification = {
      id: `NOTIF-COMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      dedupKey: `${recordId}_DELIVERY_COMPLETED_${Date.now()}`,
      type: 'DELIVERY_COMPLETED',
      title: 'Delivery Marked as Delivered',
      message: `Delivery for ${clientName} / ${consignee} has been marked as Delivered by ${driverName}.`,
      recordId: targetForwarding?.id || targetIndividual?.id || recordId,
      client: clientName,
      coordinator,
      referenceNumber: refNum,
      podNumber,
      consignee,
      destination: targetForwarding?.destinationCode || targetIndividual?.destination || `${area} - ${consignee}`,
      area,
      deliveryArea: area,
      actualDeliveryDate,
      podReturnDueDate: podDueRes.podReturnDueDate,
      podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted,
      podSla: 'PENDING',
      podStatus: autoPod.status,
      createdAt: nowIso,
      isRead: false,
      driverName,
      receiverName: finalRecipientName,
      dateReceived,
      vehicle,
      plateNumber,
    };

    setPodNotifications((prev) => {
      // Prevent duplicate notification if clicked or triggered multiple times
      const alreadyExists = prev.some(
        (n) => n.type === 'DELIVERY_COMPLETED' && (n.recordId === recordId || (n.podNumber && n.podNumber === podNumber))
      );
      if (alreadyExists) return prev;
      const updated = [completionNotif, ...prev];
      try {
        localStorage.setItem('ofii_cache_v4_pod_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 5. Phase 5.1: Create Dedicated Notification for ENCODER strictly placed inside POD RETURNING
    const finalDeliveryId = targetIndividual?.id || targetIndividual?.deliveryId || targetForwarding?.deliveryId || targetForwarding?.id || recordId;
    const finalBatchName = targetIndividual?.batchName || targetForwarding?.batchName || 'General Consignment';
    const finalBatchId = targetIndividual?.batchId || targetForwarding?.batchId;
    const finalConsignee = targetForwarding?.consignee || targetIndividual?.consignee || consignee;
    const finalPlace = targetIndividual?.destination || targetForwarding?.destination || targetForwarding?.destinationCode || area;
    const finalQty = targetIndividual?.quantity || targetForwarding?.quantity || 1;
    const finalUnit = targetIndividual?.unit || targetForwarding?.unit || 'cases';
    const finalIndPod = targetIndividual?.individualDeliveryPod || podNumber;
    const finalTruckRun = targetIndividual?.truckRunNumber || targetForwarding?.truckRunNumber || 'TRUCK RUN #001';

    const podReturningNotif: PodReturningNotification = {
      id: `POD-RET-NOTIF-${finalDeliveryId}-${Date.now()}`,
      title: 'Delivery Completed — POD Return Pending',
      message: `Driver has marked Delivery ${finalDeliveryId} as delivered. Recipient: ${finalRecipientName}. Please monitor and encode the POD return.`,
      deliveryId: finalDeliveryId,
      recordId: targetForwarding?.id || targetIndividual?.id || recordId,
      batchId: finalBatchId,
      batchName: finalBatchName,
      client: clientName,
      consignee: finalConsignee,
      place: finalPlace,
      quantity: finalQty,
      unit: finalUnit,
      recipientName: finalRecipientName,
      receiversName: finalRecipientName,
      driverRecipientName: finalRecipientName,
      individualDeliveryPod: finalIndPod,
      truckRunNumber: finalTruckRun,
      assignedDriver: driverName,
      actualDeliveryDate,
      dateReceived,
      deliveryStatus: 'DELIVERED',
      podStatus: 'PENDING',
      podReturnDueDate: podDueRes.podReturnDueDate || undefined,
      podReturnDueDateFormatted: podDueRes.podReturnDueDateFormatted || undefined,
      isRead: false,
      createdAt: nowIso,
    };

    setPodReturningNotifications((prev) => {
      // Prevent duplicate notifications when the delivery is merely viewed or edited
      const alreadyExists = prev.some(
        (n) => n.deliveryId === finalDeliveryId || n.recordId === recordId || (n.individualDeliveryPod && n.individualDeliveryPod === finalIndPod)
      );
      if (alreadyExists) return prev;
      const updated = [podReturningNotif, ...prev];
      try {
        localStorage.setItem('ofii_cache_v5_pod_returning_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    broadcastDataChange('DELIVERY_COMPLETED', {
      recordId,
      podNumber,
      client: clientName,
      consignee,
      driverName,
      actualDeliveryDate,
      receiverName: finalRecipientName,
      recipientName: finalRecipientName,
      dateReceived,
      vehicle,
      plateNumber,
      area,
    });

    showSuccessToast(
      'Delivery Completed Successfully!',
      `POD ${podNumber} marked as Delivered. Recipient: ${finalRecipientName}. Office / Encoder notified.`
    );
  };

  /**
   * Phase 1: Create a separate Delivery Assignment record linked to an existing Original Delivery.
   * - Does NOT modify or replace the original Delivery.
   * - Validates that no active assignment already exists for the same Original Delivery ID.
   * - Generates a unique Assignment ID.
   * - Persists as a separate record.
   */
  const createDeliveryAssignment = useCallback(async (assignmentData: {
    originalDeliveryId: string;
    driver: string;
    driverId?: string;
    helper: string;
    helperId?: string;
    vehicle: string;
    plateNumber: string;
    assignmentDate?: string;
    assignmentTime?: string;
    assignmentStatus?: string;
    assignmentId?: string;
  }): Promise<DeliveryAssignment> => {
    assertCanMutate('create delivery assignment');
    if (!assignmentData.originalDeliveryId || !assignmentData.originalDeliveryId.trim()) {
      throw new Error('Original Delivery ID is required.');
    }

    const cleanDeliveryId = assignmentData.originalDeliveryId.trim();

    // Safety: Prevent duplicate active assignment for the same delivery if an active assignment already exists
    const existingActive = deliveryAssignments.find(
      (a) => a.originalDeliveryId.toLowerCase() === cleanDeliveryId.toLowerCase() && 
             a.assignmentStatus === 'ASSIGNED'
    );
    if (existingActive) {
      throw new Error('This delivery already has an active assignment.');
    }

    // Generate unique Assignment ID
    const nextSeq = deliveryAssignments.length + 1;
    const generatedId = assignmentData.assignmentId?.trim() || `ASG-${String(nextSeq).padStart(4, '0')}`;

    const now = new Date();
    const dateStr = assignmentData.assignmentDate?.trim() || now.toISOString().split('T')[0];
    const timeStr = assignmentData.assignmentTime?.trim() || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newAssignment: DeliveryAssignment = {
      id: generatedId,
      assignmentId: generatedId,
      originalDeliveryId: cleanDeliveryId,
      driver: assignmentData.driver.trim(),
      driverId: assignmentData.driverId?.trim(),
      helper: assignmentData.helper.trim(),
      helperId: assignmentData.helperId?.trim(),
      vehicle: assignmentData.vehicle.trim(),
      plateNumber: assignmentData.plateNumber.trim(),
      assignmentDate: dateStr,
      assignmentTime: timeStr,
      assignmentStatus: 'ASSIGNED',
      createdAt: now.toISOString(),
      createdBy: 'Driver Head',
    };

    // Save assignment as a separate record
    // Do NOT create another original Delivery.
    // Do NOT duplicate the shipment/delivery in Forwarding.
    // Do NOT modify unrelated records.
    setDeliveryAssignments((prev) => {
      const updated = [newAssignment, ...prev];
      try {
        localStorage.setItem('ofii_delivery_assignments_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist delivery assignments:', e);
      }
      return updated;
    });

    showSuccessToast(
      `Delivery Assignment ${newAssignment.assignmentId} Created`,
      `Linked to Original Delivery ${newAssignment.originalDeliveryId}`
    );

    return newAssignment;
  }, [deliveryAssignments, showSuccessToast]);

  const getDeliveryAssignmentByOriginalDeliveryId = useCallback((originalDeliveryId: string) => {
    if (!originalDeliveryId) return undefined;
    const cleanId = originalDeliveryId.trim().toLowerCase();
    return deliveryAssignments.find(
      (a) => a.originalDeliveryId.toLowerCase() === cleanId && 
             a.assignmentStatus === 'ASSIGNED'
    );
  }, [deliveryAssignments]);

  // ---------------------------------------------------------------------------
  // Phase 2.5: Office-Side Truck Planner Notification Methods
  // ---------------------------------------------------------------------------
  const markTruckPlannerNotificationAsRead = useCallback(async (notificationId: string): Promise<void> => {
    setTruckPlannerNotifications((prev) => {
      const next = prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
      try {
        localStorage.setItem('ofii_truck_planner_notifications_v1', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist notification read status:', e);
      }
      return next;
    });
  }, []);

  const markAllTruckPlannerNotificationsAsRead = useCallback(async (): Promise<void> => {
    setTruckPlannerNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, isRead: true }));
      try {
        localStorage.setItem('ofii_truck_planner_notifications_v1', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist all notifications read status:', e);
      }
      return next;
    });
    showSuccessToast('All Notifications Marked as Read', 'All new delivery notifications marked as read.');
  }, [showSuccessToast]);

  const deleteTruckPlannerNotification = useCallback(async (notificationId: string): Promise<void> => {
    assertCanMutate('delete truck planner notification');
    setTruckPlannerNotifications((prev) => {
      const next = prev.filter((n) => n.id !== notificationId);
      try {
        localStorage.setItem('ofii_truck_planner_notifications_v1', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist notification deletion:', e);
      }
      return next;
    });
  }, []);

  const createTruckPlannerNotification = useCallback(async (notificationData: {
    type?: TruckPlannerNotificationType;
    title?: string;
    batchId: string;
    batchName: string;
    client: string;
    newDeliveriesCount: number;
    deliveryIds: string[];
    source?: 'PROJECT_CREATE' | 'MANUAL_CREATE' | 'MANUAL_ADD' | 'EXCEL_IMPORT';
    message?: string;
  }): Promise<TruckPlannerNotification> => {
    assertCanMutate('create truck planner notification');
    const nowIso = new Date().toISOString();
    const isNewProject = notificationData.type === 'NEW_PROJECT_CREATED' || notificationData.newDeliveriesCount === 0;
    const notifType: TruckPlannerNotificationType = isNewProject ? 'NEW_PROJECT_CREATED' : 'NEW_DELIVERIES_AVAILABLE';
    const notifTitle = notificationData.title || (isNewProject ? '🔔 New Project Created' : '🔔 New Deliveries Available');
    const defaultMsg = isNewProject
      ? 'The project is ready for delivery processing.'
      : `${notificationData.newDeliveriesCount} new individual ${notificationData.newDeliveriesCount === 1 ? 'delivery is' : 'deliveries are'} ready for Truck Planning.`;

    const newNotif: TruckPlannerNotification = {
      id: `TP-NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      type: notifType,
      title: notifTitle,
      batchId: notificationData.batchId,
      batchName: notificationData.batchName,
      client: notificationData.client,
      newDeliveriesCount: notificationData.newDeliveriesCount,
      deliveryIds: notificationData.deliveryIds,
      createdAt: nowIso,
      isRead: false,
      source: notificationData.source || (isNewProject ? 'PROJECT_CREATE' : 'MANUAL_ADD'),
      message: notificationData.message || defaultMsg,
    };

    setTruckPlannerNotifications((prev) => {
      // Check if there is already an UNREAD notification for the same batchId to consolidate
      const existingUnreadIdx = prev.findIndex((n) => n.batchId === notificationData.batchId && !n.isRead);
      let next: TruckPlannerNotification[];
      if (existingUnreadIdx >= 0) {
        const existing = prev[existingUnreadIdx];
        const mergedIds = Array.from(new Set([...existing.deliveryIds, ...notificationData.deliveryIds]));
        const count = mergedIds.length;
        const willBeDeliveries = count > 0 || notificationData.type === 'NEW_DELIVERIES_AVAILABLE';

        const updated: TruckPlannerNotification = {
          ...existing,
          type: willBeDeliveries ? 'NEW_DELIVERIES_AVAILABLE' : existing.type,
          title: willBeDeliveries ? '🔔 New Deliveries Available' : existing.title,
          newDeliveriesCount: count,
          deliveryIds: mergedIds,
          createdAt: nowIso,
          source: notificationData.source || existing.source,
          message: willBeDeliveries
            ? `${count} new individual ${count === 1 ? 'delivery is' : 'deliveries are'} ready for Truck Planning.`
            : (notificationData.message || existing.message || 'The project is ready for delivery processing.'),
        };
        next = [updated, ...prev.filter((_, idx) => idx !== existingUnreadIdx)];
      } else {
        next = [newNotif, ...prev];
      }
      try {
        localStorage.setItem('ofii_truck_planner_notifications_v1', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist truck planner notifications:', e);
      }
      return next;
    });

    return newNotif;
  }, []);

  // ---------------------------------------------------------------------------
  // 9. PHASE 1: DELIVERY BATCH & INDIVIDUAL DELIVERY OPERATIONS
  // ---------------------------------------------------------------------------

  // Centralized verification for Coordinator or Admin operations (Phase 1 Batches & Deliveries)
  // Cross-verifies active authenticated session with context user profile for robust authorization
  const isCoordinatorOrAdminAuthorized = useCallback((): { authorized: boolean; effectiveUser: UserProfile | null } => {
    const session = getStoredAuthSession();
    // Prioritize active authenticated session user, then currentUserProfile
    const effectiveUser = (session && session.isActive !== false) ? session : currentUserProfile;

    const isCoord = isCoordinatorRole(effectiveUser) || isCoordinatorRole(currentUserProfile);
    const isAdmin = normalizeUserRole(effectiveUser) === 'ADMIN' || normalizeUserRole(currentUserProfile) === 'ADMIN';

    // Account approval status check (must be APPROVED or unflagged legacy, never PENDING or REJECTED)
    const isApproved = (
      (!effectiveUser?.approvalStatus || effectiveUser.approvalStatus === 'APPROVED') &&
      (!currentUserProfile?.approvalStatus || currentUserProfile.approvalStatus === 'APPROVED')
    );

    return {
      authorized: (isCoord || isAdmin) && isApproved,
      effectiveUser: effectiveUser || currentUserProfile || null,
    };
  }, [currentUserProfile]);

  const createDeliveryBatch = useCallback(async (batchData: {
    name: string;
    client: string;
    clientId?: string;
    coordinator: string;
    createdDate?: string;
    status?: DeliveryBatchStatus;
    notes?: string;
    initialDeliveries?: (Omit<IndividualDelivery, 'id' | 'createdAt' | 'batchId' | 'batchName'>)[];
  }): Promise<DeliveryBatch> => {
    assertCanMutate('create delivery batch');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized, effectiveUser } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to create a New Project / Delivery Name.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    if (!batchData.name || !batchData.name.trim()) {
      throw new Error('Delivery Name / Project Name is required.');
    }
    if (!batchData.client || !batchData.client.trim()) {
      throw new Error('Client Name is required.');
    }

    const nextId = `BATCH-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const createdDate = batchData.createdDate || nowIso.split('T')[0];

    const newBatch: DeliveryBatch = {
      id: nextId,
      name: batchData.name.trim(),
      client: batchData.client.trim(),
      clientId: batchData.clientId,
      coordinator: batchData.coordinator?.trim() || effectiveUser?.name || currentUserProfile?.name || 'Alodia Manalansan',
      createdDate,
      status: batchData.status || 'Active',
      notes: batchData.notes?.trim() || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setDeliveryBatches((prev) => {
      const updated = [newBatch, ...prev];
      try {
        localStorage.setItem('ofii_delivery_batches_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist delivery batches:', e);
      }
      return updated;
    });

    // If initial deliveries were provided with batch creation, save and notify
    if (batchData.initialDeliveries && batchData.initialDeliveries.length > 0) {
      const initialDels: IndividualDelivery[] = batchData.initialDeliveries.map((d, idx) => ({
        ...d,
        id: `DEL-${Date.now().toString().slice(-5)}-${idx + 1}`,
        deliveryId: d.deliveryId || `DEL-${d.individualDeliveryPod || idx + 1001}`,
        batchId: newBatch.id,
        batchName: newBatch.name,
        client: d.client || newBatch.client,
        coordinator: d.coordinator || newBatch.coordinator,
        status: d.status || 'CREATED',
        deliveryStatus: d.deliveryStatus || 'CREATED',
        createdAt: nowIso,
      }));

      setIndividualDeliveries((prev) => {
        const next = [...initialDels, ...prev];
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      try {
        await createTruckPlannerNotification({
          type: 'NEW_DELIVERIES_AVAILABLE',
          title: '🔔 New Deliveries Available',
          batchId: newBatch.id,
          batchName: newBatch.name,
          client: newBatch.client,
          newDeliveriesCount: initialDels.length,
          deliveryIds: initialDels.map((d) => d.id),
          source: 'MANUAL_CREATE',
          message: `${initialDels.length} new individual ${initialDels.length === 1 ? 'delivery is' : 'deliveries are'} ready for Truck Planning.`,
        });
      } catch (notifErr) {
        console.warn('[Notification Engine] Failed to dispatch batch initial notification:', notifErr);
      }
    } else {
      // Zero initial deliveries: Dispatch NEW_PROJECT_CREATED notification for Truck Planner
      try {
        await createTruckPlannerNotification({
          type: 'NEW_PROJECT_CREATED',
          title: '🔔 New Project Created',
          batchId: newBatch.id,
          batchName: newBatch.name,
          client: newBatch.client,
          newDeliveriesCount: 0,
          deliveryIds: [],
          source: 'PROJECT_CREATE',
          message: 'The project is ready for delivery processing.',
        });
      } catch (notifErr) {
        console.warn('[Notification Engine] Failed to dispatch new project notification:', notifErr);
      }
    }

    showSuccessToast('Project / Delivery Batch Created', `${newBatch.name} successfully created.`);
    return newBatch;
  }, [createTruckPlannerNotification, showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const updateDeliveryBatch = useCallback(async (batch: DeliveryBatch): Promise<DeliveryBatch> => {
    assertCanMutate('update delivery batch');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to update Delivery Batches.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    const updatedBatch: DeliveryBatch = {
      ...batch,
      updatedAt: new Date().toISOString(),
    };
    setDeliveryBatches((prev) => {
      const next = prev.map((b) => (b.id === batch.id ? updatedBatch : b));
      try {
        localStorage.setItem('ofii_delivery_batches_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Also update batchName on linked deliveries if name changed
    setIndividualDeliveries((prev) => {
      const next = prev.map((d) => (d.batchId === batch.id ? { ...d, batchName: batch.name } : d));
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showSuccessToast('Batch Updated', `Delivery batch ${batch.name} updated.`);
    return updatedBatch;
  }, [showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const deleteDeliveryBatch = useCallback(async (batchId: string): Promise<void> => {
    assertCanMutate('delete delivery batch');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to delete Delivery Batches.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    setDeliveryBatches((prev) => {
      const next = prev.filter((b) => b.id !== batchId);
      try {
        localStorage.setItem('ofii_delivery_batches_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    // Remove individual deliveries belonging to this batch
    setIndividualDeliveries((prev) => {
      const next = prev.filter((d) => d.batchId !== batchId);
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showSuccessToast('Project Deleted', 'Delivery batch and its deliveries have been removed.');
  }, [showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const addIndividualDelivery = useCallback(async (deliveryData: Omit<IndividualDelivery, 'id' | 'createdAt'> & { id?: string }): Promise<IndividualDelivery> => {
    assertCanMutate('add individual delivery');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to add Individual Deliveries.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    if (!deliveryData.consignee || !deliveryData.consignee.trim()) {
      throw new Error('Consignee / Store is required.');
    }
    if (!deliveryData.individualDeliveryPod || !String(deliveryData.individualDeliveryPod).trim()) {
      throw new Error('Individual Delivery POD Number is required.');
    }
    if (!deliveryData.area || !deliveryData.area.trim()) {
      throw new Error('Delivery Area is required.');
    }

    const uniqueId = deliveryData.id || `DEL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const formattedDeliveryId = deliveryData.deliveryId || `DEL-${deliveryData.individualDeliveryPod || uniqueId.slice(-4)}`;
    const nowIso = new Date().toISOString();

    const newDelivery: IndividualDelivery = {
      ...deliveryData,
      id: uniqueId,
      deliveryId: formattedDeliveryId,
      status: deliveryData.status || 'CREATED',
      deliveryStatus: deliveryData.deliveryStatus || 'CREATED',
      createdAt: nowIso,
    };

    setIndividualDeliveries((prev) => {
      const next = [newDelivery, ...prev];
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Phase 2.5: Trigger or consolidate notification for Truck Planner safely
    try {
      setTruckPlannerNotifications((prev) => {
        const existingUnreadIdx = prev.findIndex((n) => n.batchId === newDelivery.batchId && !n.isRead);
        let next: TruckPlannerNotification[];
        if (existingUnreadIdx >= 0) {
          const existing = prev[existingUnreadIdx];
          const mergedIds = Array.from(new Set([...existing.deliveryIds, newDelivery.id]));
          const count = mergedIds.length;
          const updated: TruckPlannerNotification = {
            ...existing,
            type: 'NEW_DELIVERIES_AVAILABLE',
            title: '🔔 New Deliveries Available',
            newDeliveriesCount: count,
            deliveryIds: mergedIds,
            createdAt: nowIso,
            message: `${count} new individual ${count === 1 ? 'delivery is' : 'deliveries are'} ready for Truck Planning.`,
          };
          next = [updated, ...prev.filter((_, idx) => idx !== existingUnreadIdx)];
        } else {
          const newNotif: TruckPlannerNotification = {
            id: `TP-NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            type: 'NEW_DELIVERIES_AVAILABLE',
            title: '🔔 New Deliveries Available',
            batchId: newDelivery.batchId,
            batchName: newDelivery.batchName,
            client: newDelivery.client,
            newDeliveriesCount: 1,
            deliveryIds: [newDelivery.id],
            createdAt: nowIso,
            isRead: false,
            source: 'MANUAL_ADD',
            message: `1 new individual delivery is ready for Truck Planning.`,
          };
          next = [newNotif, ...prev];
        }
        try {
          localStorage.setItem('ofii_truck_planner_notifications_v1', JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist truck planner notifications:', e);
        }
        return next;
      });
    } catch (notifErr) {
      console.error('[Notification Engine] Failed to dispatch truck planner notification:', notifErr);
    }

    showSuccessToast('Individual Delivery Added', `${newDelivery.consignee} (POD: ${newDelivery.individualDeliveryPod}) added.`);
    return newDelivery;
  }, [showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const bulkImportIndividualDeliveries = useCallback(async (
    batchId: string,
    deliveries: (Omit<IndividualDelivery, 'id' | 'createdAt' | 'batchId' | 'batchName'>)[]
  ): Promise<{ count: number; rejected: number }> => {
    assertCanMutate('bulk import individual deliveries');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to import Individual Deliveries.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    const targetBatch = deliveryBatches.find((b) => b.id === batchId);
    const batchName = targetBatch?.name || 'Project Batch';
    const client = targetBatch?.client || 'Client';
    const coordinator = targetBatch?.coordinator || 'Coordinator';

    const nowIso = new Date().toISOString();
    let imported = 0;
    let rejected = 0;

    const validNewDeliveries: IndividualDelivery[] = [];

    deliveries.forEach((d, idx) => {
      // Validate minimum
      if (!d.consignee || !d.individualDeliveryPod || !d.area) {
        rejected++;
        return;
      }
      const uniqueId = `DEL-${Date.now().toString().slice(-5)}-${idx + 1}`;
      const formattedId = d.deliveryId || `DEL-${d.individualDeliveryPod || idx + 1001}`;

      validNewDeliveries.push({
        ...d,
        id: uniqueId,
        deliveryId: formattedId,
        batchId,
        batchName,
        client: d.client || client,
        coordinator: d.coordinator || coordinator,
        status: d.status || 'CREATED',
        deliveryStatus: d.deliveryStatus || 'CREATED',
        createdAt: nowIso,
      });
      imported++;
    });

    if (validNewDeliveries.length > 0) {
      setIndividualDeliveries((prev) => {
        const next = [...validNewDeliveries, ...prev];
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      // Phase 2.5: Create ONE summarized notification for the Excel Import
      try {
        const importedIds = validNewDeliveries.map((d) => d.id);
        const count = validNewDeliveries.length;
        const targetBatchId = targetBatch?.id || batchId;

        setTruckPlannerNotifications((prev) => {
          const existingUnreadIdx = prev.findIndex((n) => n.batchId === targetBatchId && !n.isRead);
          let next: TruckPlannerNotification[];
          if (existingUnreadIdx >= 0) {
            const existing = prev[existingUnreadIdx];
            const mergedIds = Array.from(new Set([...existing.deliveryIds, ...importedIds]));
            const totalCount = mergedIds.length;
            const updated: TruckPlannerNotification = {
              ...existing,
              type: 'NEW_DELIVERIES_AVAILABLE',
              title: '🔔 New Deliveries Available',
              newDeliveriesCount: totalCount,
              deliveryIds: mergedIds,
              createdAt: nowIso,
              source: 'EXCEL_IMPORT',
              message: `${totalCount} new individual ${totalCount === 1 ? 'delivery is' : 'deliveries are'} ready for Truck Planning.`,
            };
            next = [updated, ...prev.filter((_, idx) => idx !== existingUnreadIdx)];
          } else {
            const importNotif: TruckPlannerNotification = {
              id: `TP-NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
              type: 'NEW_DELIVERIES_AVAILABLE',
              title: '🔔 New Deliveries Available',
              batchId: targetBatchId,
              batchName,
              client,
              newDeliveriesCount: count,
              deliveryIds: importedIds,
              createdAt: nowIso,
              isRead: false,
              source: 'EXCEL_IMPORT',
              message: `${count} new individual ${count === 1 ? 'delivery is' : 'deliveries are'} ready for Truck Planning.`,
            };
            next = [importNotif, ...prev];
          }
          try {
            localStorage.setItem('ofii_truck_planner_notifications_v1', JSON.stringify(next));
          } catch (e) {
            console.warn('Failed to persist truck planner notifications:', e);
          }
          return next;
        });
      } catch (notifErr) {
        console.error('[Notification Engine] Failed to dispatch excel import notification:', notifErr);
      }

      showSuccessToast(
        'Excel Import Successful',
        `${imported} individual deliveries imported into ${batchName}.${rejected > 0 ? ` (${rejected} invalid rows skipped)` : ''}`
      );
    }
    // If validNewDeliveries.length === 0, NO notification is created (satisfies Test 7)

    return { count: imported, rejected };
  }, [deliveryBatches, showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const updateIndividualDelivery = useCallback(async (delivery: IndividualDelivery): Promise<IndividualDelivery> => {
    assertCanMutate('update individual delivery');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to edit Individual Deliveries.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    setIndividualDeliveries((prev) => {
      const next = prev.map((d) => (d.id === delivery.id ? delivery : d));
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showSuccessToast('Delivery Updated', `POD ${delivery.individualDeliveryPod} updated.`);
    return delivery;
  }, [showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const deleteIndividualDelivery = useCallback(async (deliveryId: string): Promise<void> => {
    assertCanMutate('delete individual delivery');
    // RBAC: Strict Coordinator only (or Admin) with approval check
    const { authorized } = isCoordinatorOrAdminAuthorized();
    if (!authorized) {
      const errorMsg = 'Access Denied: Only a Coordinator is authorized to delete Individual Deliveries.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    setIndividualDeliveries((prev) => {
      const next = prev.filter((d) => d.id !== deliveryId);
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showSuccessToast('Delivery Removed', 'Individual delivery removed from batch.');
  }, [showSuccessToast, currentUserProfile, isCoordinatorOrAdminAuthorized]);

  const saveDeliveryDispatch = useCallback(async (
    deliveryId: string,
    dispatchData: DeliveryDispatchData
  ): Promise<IndividualDelivery> => {
    // Look up existing delivery
    const existing = individualDeliveries.find(d => d.id === deliveryId || d.deliveryId === deliveryId);
    if (!existing) {
      const errorMsg = `Delivery record with ID "${deliveryId}" was not found.`;
      console.warn('[saveDeliveryDispatch Error]', errorMsg);
      throw new Error(errorMsg);
    }

    const derivedStatus = deriveDeliveryOperationalStatus(
      dispatchData.timeArrived,
      dispatchData.startLoadingTime,
      dispatchData.endLoadingTime,
      dispatchData.actualDeparture
    );

    const isExistingDone = Boolean(
      existing.actualDeliveryDate ||
      existing.dateReceived ||
      existing.podReturnDate ||
      existing.status === 'Delivered' ||
      existing.status === 'DELIVERED' ||
      existing.status === 'POD PENDING' ||
      existing.status === 'POD RETURNED' ||
      existing.status === 'COMPLETED' ||
      existing.deliveryStatus === 'DELIVERED' ||
      existing.deliveryStatus === 'POD PENDING' ||
      existing.deliveryStatus === 'POD RETURNED' ||
      existing.deliveryStatus === 'COMPLETED'
    );

    let nextCanonicalStatus: CanonicalDeliveryStatus;
    if (isExistingDone) {
      nextCanonicalStatus = (existing.deliveryStatus as CanonicalDeliveryStatus) || 'DELIVERED';
    } else if (derivedStatus === 'DEPARTED') {
      nextCanonicalStatus = 'DEPARTED';
    } else if (derivedStatus === 'LOADING COMPLETED') {
      nextCanonicalStatus = 'LOADING COMPLETED';
    } else if (derivedStatus === 'LOADING') {
      nextCanonicalStatus = 'LOADING';
    } else if (derivedStatus === 'ARRIVED') {
      nextCanonicalStatus = 'ARRIVED';
    } else {
      nextCanonicalStatus = (existing.deliveryStatus as CanonicalDeliveryStatus) || 'READY FOR DISPATCH';
    }

    const updatedDelivery: IndividualDelivery = {
      ...existing,
      // Operational dispatch fields (Additive ONLY - preserving all base delivery properties)
      timeArrived: dispatchData.timeArrived,
      truckName: dispatchData.truckName,
      plateNumber: dispatchData.plateNumber,
      driver: dispatchData.driver,
      helper: dispatchData.helper,
      truckerContact: dispatchData.truckerContact,
      startLoadingTime: dispatchData.startLoadingTime,
      endLoadingTime: dispatchData.endLoadingTime,
      actualDeparture: dispatchData.actualDeparture,
      transportDispatcher: dispatchData.transportDispatcher,
      truckDispatchPod: dispatchData.truckDispatchPod || existing.truckDispatchPod,
      remarks: dispatchData.remarks,
      dispatchOperationalStatus: derivedStatus,
      isDispatched: derivedStatus === 'DEPARTED' ? true : existing.isDispatched,
      dispatchedAt: existing.dispatchedAt || new Date().toISOString(),
      status: nextCanonicalStatus,
      deliveryStatus: nextCanonicalStatus,
      driverProgressStatus: derivedStatus === 'DEPARTED' ? (existing.driverProgressStatus || 'In Transit') : existing.driverProgressStatus,

      // CRITICAL DATA SAFETY: Do not modify core consignment fields (Requirement 5)
      id: existing.id,
      deliveryId: existing.deliveryId,
      batchId: existing.batchId,
      batchName: existing.batchName,
      client: existing.client,
      clientId: existing.clientId,
      coordinator: existing.coordinator,
      consignee: existing.consignee,
      destination: existing.destination,
      destinationCode: existing.destinationCode,
      area: existing.area,
      quantity: existing.quantity,
      unit: existing.unit,
      modeOfShipment: existing.modeOfShipment,
      rdd: existing.rdd,
      referenceNumber: existing.referenceNumber,
      individualDeliveryPod: existing.individualDeliveryPod, // Keep separate from truckDispatchPod
    };

    setIndividualDeliveries((prev) => {
      // Synchronize all individual deliveries linked to this truck run or this delivery
      const next = prev.map((d) => {
        const isThisDelivery = d.id === existing.id;
        const isRunSibling = Boolean(existing.truckRunId && d.truckRunId === existing.truckRunId);
        if (isThisDelivery) {
          return updatedDelivery;
        }
        if (isRunSibling) {
          const isDone = Boolean(
            d.actualDeliveryDate ||
            d.dateReceived ||
            d.podReturnDate ||
            d.status === 'Delivered' ||
            d.status === 'DELIVERED' ||
            d.status === 'POD PENDING' ||
            d.status === 'POD RETURNED' ||
            d.status === 'COMPLETED' ||
            d.deliveryStatus === 'DELIVERED' ||
            d.deliveryStatus === 'POD PENDING' ||
            d.deliveryStatus === 'POD RETURNED' ||
            d.deliveryStatus === 'COMPLETED'
          );

          const syncStatus: CanonicalDeliveryStatus = isDone 
            ? ((d.deliveryStatus as CanonicalDeliveryStatus) || 'DELIVERED')
            : nextCanonicalStatus;

          return {
            ...d,
            timeArrived: dispatchData.timeArrived !== undefined ? dispatchData.timeArrived : d.timeArrived,
            truckName: dispatchData.truckName || d.truckName,
            plateNumber: dispatchData.plateNumber || d.plateNumber,
            driver: dispatchData.driver || d.driver,
            helper: dispatchData.helper !== undefined ? dispatchData.helper : d.helper,
            truckerContact: dispatchData.truckerContact || d.truckerContact,
            startLoadingTime: dispatchData.startLoadingTime !== undefined ? dispatchData.startLoadingTime : d.startLoadingTime,
            endLoadingTime: dispatchData.endLoadingTime !== undefined ? dispatchData.endLoadingTime : d.endLoadingTime,
            actualDeparture: dispatchData.actualDeparture !== undefined ? dispatchData.actualDeparture : d.actualDeparture,
            transportDispatcher: dispatchData.transportDispatcher || d.transportDispatcher,
            truckDispatchPod: dispatchData.truckDispatchPod || d.truckDispatchPod || existing.truckDispatchPod,
            dispatchOperationalStatus: derivedStatus,
            isDispatched: derivedStatus === 'DEPARTED' ? true : d.isDispatched,
            dispatchedAt: derivedStatus === 'DEPARTED' ? (d.dispatchedAt || new Date().toISOString()) : d.dispatchedAt,
            status: syncStatus,
            deliveryStatus: syncStatus,
            driverProgressStatus: derivedStatus === 'DEPARTED' ? (d.driverProgressStatus || 'In Transit') : d.driverProgressStatus,
          };
        }
        return d;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // If linked to a TruckRun, update the TruckRun's operational status and fields
    if (existing.truckRunId) {
      setTruckRuns((prevRuns) => {
        const nextRuns = prevRuns.map((r) => {
          if (r.id === existing.truckRunId) {
            return {
              ...r,
              timeArrived: dispatchData.timeArrived || r.timeArrived,
              startLoadingTime: dispatchData.startLoadingTime || r.startLoadingTime,
              endLoadingTime: dispatchData.endLoadingTime || r.endLoadingTime,
              actualDeparture: dispatchData.actualDeparture || r.actualDeparture,
              driver: dispatchData.driver || r.driver,
              helper: dispatchData.helper || r.helper,
              truckName: dispatchData.truckName || r.truckName,
              plateNumber: dispatchData.plateNumber || r.plateNumber,
              truckerContact: dispatchData.truckerContact || r.truckerContact,
              transportDispatcher: dispatchData.transportDispatcher || r.transportDispatcher,
              truckDispatchPod: dispatchData.truckDispatchPod || r.truckDispatchPod,
              dispatchOperationalStatus: derivedStatus,
              status: derivedStatus === 'DEPARTED' ? ('Dispatched' as const) : r.status,
            };
          }
          return r;
        });
        try {
          localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(nextRuns));
        } catch (e) {}
        return nextRuns;
      });
    }

    // 2. Link & Sync with Forwarding Progressive Report (Requirement 4 & 7)
    // Ensures the exact delivery record exists in Forwarding Progressive Report for the Encoder
    let linkedForwardingId = existing.id;
    setForwardingRecords((prevForwarding) => {
      const existingFprIndex = prevForwarding.findIndex(
        (f) =>
          f.id === existing.id ||
          f.deliveryId === existing.deliveryId ||
          f.individualDeliveryId === existing.id ||
          (existing.individualDeliveryPod && f.individualDeliveryPod === existing.individualDeliveryPod) ||
          (existing.individualDeliveryPod && f.podNumber === existing.individualDeliveryPod)
      );

      if (existingFprIndex >= 0) {
        const target = prevForwarding[existingFprIndex];
        linkedForwardingId = target.id;
        const updatedFpr: ForwardingProgressiveRecord = {
          ...target,
          deliveryId: existing.deliveryId,
          individualDeliveryId: existing.id,
          individualDeliveryPod: existing.individualDeliveryPod,
          batchId: existing.batchId || target.batchId,
          batchName: existing.batchName || target.batchName,
          client: existing.client || target.client,
          consignee: existing.consignee || target.consignee,
          destination: existing.destination || target.destination,
          destinationCode: existing.destinationCode || target.destinationCode,
          area: (existing.area as any) || target.area,
          modeOfShipment: (existing.modeOfShipment as any) || target.modeOfShipment,
          plateNumber: dispatchData.plateNumber || target.plateNumber,
          driverName: dispatchData.driver || target.driverName,
          helperName: dispatchData.helper || target.helperName,
          truckProvider: dispatchData.truckName || target.truckProvider,
          timeArrived: dispatchData.timeArrived || target.timeArrived,
          startLoadingTime: dispatchData.startLoadingTime || target.startLoadingTime,
          endLoadingTime: dispatchData.endLoadingTime || target.endLoadingTime,
          actualDepartureTime: dispatchData.actualDeparture || target.actualDepartureTime,
          transportDispatcher: dispatchData.transportDispatcher || target.transportDispatcher,
          truckDispatchPod: dispatchData.truckDispatchPod || existing.truckDispatchPod || target.truckDispatchPod,
          truckRunNumber: existing.truckRunNumber || target.truckRunNumber,
          dispatchOperationalStatus: derivedStatus,
          deliveryStatus: derivedStatus === 'DEPARTED' ? 'In Transit' : target.deliveryStatus || 'Pending Delivery',
        };
        const next = [...prevForwarding];
        next[existingFprIndex] = updatedFpr;
        try {
          localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(next));
        } catch (e) {}
        return next;
      } else {
        // Create corresponding Forwarding Progressive Record preserving exact delivery structure
        linkedForwardingId = existing.id;
        const newFpr: ForwardingProgressiveRecord = {
          id: existing.id,
          deliveryId: existing.deliveryId,
          individualDeliveryId: existing.id,
          individualDeliveryPod: existing.individualDeliveryPod,
          batchId: existing.batchId,
          batchName: existing.batchName || 'Project Consignment',
          client: existing.client,
          clientId: existing.clientId,
          coordinator: existing.coordinator || 'Alodia Manalansan',
          month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          modeOfShipment: (existing.modeOfShipment as any) || 'Land Freight',
          area: (existing.area as any) || 'Luzon',
          referenceNumber: existing.referenceNumber || existing.batchName || existing.deliveryId,
          destination: existing.destination,
          destinationCode: existing.destinationCode || 'LZN-01',
          consignee: existing.consignee,
          quantity: existing.quantity || 1,
          unit: existing.unit || 'cases',
          actualDispatchDate: dispatchData.actualDeparture
            ? new Date().toISOString().split('T')[0]
            : existing.createdAt
            ? existing.createdAt.split('T')[0]
            : new Date().toISOString().split('T')[0],
          plannedDeliveryDate: existing.rdd || new Date().toISOString().split('T')[0],
          requestDeliveryDate: existing.rdd,
          deliveryLeadTimeDays: 3,
          deliveryTatDays: 0,
          deliveryPerformance: 'PENDING',
          podStatus: 'Pending Return',
          podLeadTimeDays: 3,
          podTatDays: 0,
          podPerformance: 'PENDING',
          podNumber: existing.individualDeliveryPod || existing.deliveryId,
          awbCourierRefNumber: existing.referenceNumber || existing.deliveryId,
          courier: dispatchData.truckName || 'OFII Dedicated Transport',
          truckProvider: dispatchData.truckName || 'OFII Dedicated Fleet',
          plateNumber: dispatchData.plateNumber || '',
          driverName: dispatchData.driver || '',
          helperName: dispatchData.helper || '',
          timeArrived: dispatchData.timeArrived,
          startLoadingTime: dispatchData.startLoadingTime,
          endLoadingTime: dispatchData.endLoadingTime,
          actualDepartureTime: dispatchData.actualDeparture,
          transportDispatcher: dispatchData.transportDispatcher,
          truckDispatchPod: dispatchData.truckDispatchPod || existing.truckDispatchPod,
          truckRunNumber: existing.truckRunNumber,
          dispatchOperationalStatus: derivedStatus,
          deliveryStatus: derivedStatus === 'DEPARTED' ? 'In Transit' : 'Pending Delivery',
          receiversName: '',
          actualDeliveryDate: '',
          dateOfPodReturn: '',
          chargeableWeightFees: 'PHP 0.00',
          declaredValue: 'PHP 0.00',
          remarks: dispatchData.remarks || '',
          deliveryRemarks: 'Dispatched by Transport Dispatcher. Ready for Encoder processing.',
        };
        const next = [newFpr, ...prevForwarding];
        try {
          localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(next));
        } catch (e) {}
        return next;
      }
    });

    // 3. Phase 3B.8: Link & Synchronize with Daily Dispatching Monitoring (Requirements 2, 4, 6)
    // Ensures the exact delivery is registered and up-to-date in Daily Dispatching Monitoring without duplicate records
    let linkedDispatchId = existing.id;
    setDispatches((prevDispatches) => {
      const existingIndex = prevDispatches.findIndex(
        (d) =>
          d.id === existing.id ||
          d.id === existing.deliveryId ||
          (existing.individualDeliveryPod && d.podNumber === existing.individualDeliveryPod) ||
          (existing.truckDispatchPod && d.podNumber === existing.truckDispatchPod) ||
          (existing.deliveryId && d.manifestNumber === existing.deliveryId)
      );

      if (existingIndex >= 0) {
        const target = prevDispatches[existingIndex];
        linkedDispatchId = target.id;
        const updated: DispatchRecord = {
          ...target,
          timeArrived: dispatchData.timeArrived || target.timeArrived,
          truckArrivalTime: dispatchData.timeArrived || target.truckArrivalTime,
          startLoadingTime: dispatchData.startLoadingTime || target.startLoadingTime,
          loadingStartTime: dispatchData.startLoadingTime || target.loadingStartTime,
          endLoadingTime: dispatchData.endLoadingTime || target.endLoadingTime,
          loadingEndTime: dispatchData.endLoadingTime || target.loadingEndTime,
          actualDepartureTime: dispatchData.actualDeparture || target.actualDepartureTime,
          departureTime: dispatchData.actualDeparture || target.departureTime,
          truckProvider: dispatchData.truckName || target.truckProvider,
          plateNumber: dispatchData.plateNumber || target.plateNumber,
          driverName: dispatchData.driver || target.driverName,
          assignedDriver: dispatchData.driver || target.assignedDriver,
          helperName: dispatchData.helper || target.helperName,
          assignedHelper: dispatchData.helper || target.assignedHelper,
          remarks: dispatchData.remarks !== undefined ? dispatchData.remarks : target.remarks,
          status: derivedStatus === 'DEPARTED' ? 'Departed' : (derivedStatus === 'LOADING COMPLETED' || derivedStatus === 'LOADING' ? 'In Loading' : (derivedStatus === 'ARRIVED' ? 'Arrived at Hub' : target.status)),
        };
        const next = [...prevDispatches];
        next[existingIndex] = updated;
        try {
          localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
        } catch (e) {}
        return next;
      } else {
        linkedDispatchId = existing.id;
        const newDispatch: DispatchRecord = {
          id: existing.id,
          deliveryDate: existing.rdd || new Date().toISOString().split('T')[0],
          plannedDeliveryDate: existing.rdd || new Date().toISOString().split('T')[0],
          clientName: existing.client,
          deliveryArea: (existing.area as any) || 'Luzon',
          area: (existing.area as any) || 'Luzon',
          podNumber: existing.individualDeliveryPod || existing.truckDispatchPod || existing.deliveryId,
          quantityCasesBoxes: existing.quantity || 1,
          unit: existing.unit || 'cases',
          deliveryType: ((existing as any).deliveryType as any) || 'FTL',
          destination: existing.destination || existing.destinationCode || existing.area,
          consignee: existing.consignee,
          truckProvider: dispatchData.truckName || existing.truckName || 'OFII Dedicated Transport',
          plateNumber: dispatchData.plateNumber || existing.plateNumber || '',
          timeArrived: dispatchData.timeArrived,
          truckArrivalTime: dispatchData.timeArrived,
          startLoadingTime: dispatchData.startLoadingTime,
          loadingStartTime: dispatchData.startLoadingTime,
          endLoadingTime: dispatchData.endLoadingTime,
          loadingEndTime: dispatchData.endLoadingTime,
          actualDepartureTime: dispatchData.actualDeparture,
          departureTime: dispatchData.actualDeparture,
          manifestNumber: existing.referenceNumber || existing.truckRunNumber || existing.deliveryId,
          remarks: dispatchData.remarks || existing.remarks || '',
          status: derivedStatus === 'DEPARTED' ? 'Departed' : (derivedStatus === 'LOADING COMPLETED' || derivedStatus === 'LOADING' ? 'In Loading' : (derivedStatus === 'ARRIVED' ? 'Arrived at Hub' : 'In Loading')),
          driverName: dispatchData.driver || existing.driver || '',
          assignedDriver: dispatchData.driver || existing.driver || '',
          helperName: dispatchData.helper || existing.helper || '',
          assignedHelper: dispatchData.helper || existing.helper || '',
        };
        const next = [newDispatch, ...prevDispatches];
        try {
          localStorage.setItem('ofii_cache_v4_dispatches', JSON.stringify(next));
        } catch (e) {}
        return next;
      }
    });

    // 4. Phase 3B.8: Dispatcher to Encoder Notification Trigger
    // Automatically creates a notification for the ENCODER role linking to Daily Dispatching Monitoring
    try {
      setEncoderNotifications((prevNotifs) => {
        // Requirement 7: Duplicate Prevention
        // Check if an encoder notification already exists for this exact delivery
        const existingIndex = prevNotifs.findIndex(
          (n) => n.deliveryId === existing.deliveryId || n.individualDeliveryId === existing.id
        );

        const truckOrDispatchNo =
          existing.truckRunNumber || dispatchData.truckDispatchPod || existing.truckDispatchPod || '';
        const targetRef = existing.truckRunNumber
          ? `${existing.deliveryId} / ${existing.truckRunNumber}`
          : (dispatchData.truckDispatchPod || existing.truckDispatchPod
              ? `${existing.deliveryId} / ${dispatchData.truckDispatchPod || existing.truckDispatchPod}`
              : existing.deliveryId);

        const notifTitle = 'Dispatch Ready for Daily Monitoring';
        const notifMessage = `Dispatch information for ${targetRef} is ready for Encoder review in Daily Dispatching Monitoring.`;

        if (existingIndex >= 0) {
          // Update existing notification with latest dispatch details without creating duplicate
          const updatedNotification: EncoderDispatchNotification = {
            ...prevNotifs[existingIndex],
            title: notifTitle,
            message: notifMessage,
            deliveryId: existing.deliveryId,
            individualDeliveryId: existing.id,
            batchId: existing.batchId,
            batchName: existing.batchName || 'Project Consignment',
            client: existing.client,
            consignee: existing.consignee,
            place: existing.destination || existing.destinationCode || existing.area,
            deliveryArea: (existing.area as any) || 'Luzon',
            quantity: existing.quantity || 1,
            individualDeliveryPod: existing.individualDeliveryPod,
            truckDispatchPod: dispatchData.truckDispatchPod || existing.truckDispatchPod || '',
            actualDeparture: dispatchData.actualDeparture || prevNotifs[existingIndex].actualDeparture || '',
            truckDispatchNumber: truckOrDispatchNo || prevNotifs[existingIndex].truckDispatchNumber,
            dispatchRecordId: linkedDispatchId,
            forwardingRecordId: linkedForwardingId,
            updatedAt: new Date().toISOString(),
            // Preserves existing isRead status (Requirement 7)
          };
          const next = [...prevNotifs];
          next[existingIndex] = updatedNotification;
          try {
            localStorage.setItem('ofii_encoder_notifications_v1', JSON.stringify(next));
          } catch (e) {}
          return next;
        }

        // Create new single notification for the ENCODER role
        const newNotification: EncoderDispatchNotification = {
          id: `ENC-NOTIF-${existing.deliveryId}-${Date.now()}`,
          title: notifTitle,
          message: notifMessage,
          deliveryId: existing.deliveryId,
          individualDeliveryId: existing.id,
          batchId: existing.batchId,
          batchName: existing.batchName || 'Project Consignment',
          client: existing.client,
          consignee: existing.consignee,
          place: existing.destination || existing.destinationCode || existing.area,
          deliveryArea: (existing.area as any) || 'Luzon',
          quantity: existing.quantity || 1,
          individualDeliveryPod: existing.individualDeliveryPod,
          truckDispatchPod: dispatchData.truckDispatchPod || existing.truckDispatchPod || '',
          actualDeparture: dispatchData.actualDeparture || '',
          truckDispatchNumber: truckOrDispatchNo,
          dispatchRecordId: linkedDispatchId,
          forwardingRecordId: linkedForwardingId,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        const next = [newNotification, ...prevNotifs];
        try {
          localStorage.setItem('ofii_encoder_notifications_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    } catch (notifErr) {
      // Data Safety Guarantee: If notification creation fails, the dispatch save must remain safe and not show a white screen.
      console.error('[Notification Creation Safe Failure Guard]', notifErr);
    }

    showSuccessToast('Dispatch Saved', `Operational dispatch for ${existing.deliveryId} saved (${derivedStatus}).`);
    return updatedDelivery;
  }, [individualDeliveries, showSuccessToast]);

  // ---------------------------------------------------------------------------
  // 10. PHASE 2: TRUCK RUN / DISPATCH GROUPING OPERATIONS
  // ---------------------------------------------------------------------------
  const createTruckRun = useCallback(async (runData: {
    truckRunNumber?: string;
    truckDispatchPod: string;
    plannedDispatchDate: string;
    deliveryArea: string;
    routeLocation: string;
    truckSource: string;
    plateNumber: string;
    driver: string;
    driverContact?: string;
    helper?: string;
    helperContact?: string;
    remarks?: string;
    deliveryIds: string[];
    status?: TruckRunStatus;
  }): Promise<{ success: boolean; truckRun?: TruckRun; error?: string }> => {
    assertCanMutate('create truck run');
    // RBAC: Truck Planner or Admin authorized
    const canonicalRole = normalizeUserRole(currentUserProfile);
    if (canonicalRole !== 'TRUCK_PLANNER' && canonicalRole !== 'ADMIN') {
      const errorMsg = 'Access Denied: Only a Truck Planner / Driver\'s Head is authorized to create a Truck Run.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      if (!runData.deliveryIds || runData.deliveryIds.length === 0) {
        return { success: false, error: 'Please select at least one delivery to include in this Truck Run.' };
      }

      const cleanPod = runData.truckDispatchPod ? String(runData.truckDispatchPod).trim() : '';
      if (!cleanPod) {
        return { success: false, error: 'Truck/Dispatch POD Number is required (e.g. TRK-001).' };
      }

      // Check if any of the selected deliveries are already assigned to a truck run
      const alreadyAssigned = individualDeliveries.filter(
        (d) => runData.deliveryIds.includes(d.id) && d.truckRunId
      );
      if (alreadyAssigned.length > 0) {
        const storeNames = alreadyAssigned.map((d) => `${d.consignee} (POD: ${d.individualDeliveryPod})`).join(', ');
        return {
          success: false,
          error: `The following deliveries are already assigned to a Truck Run: ${storeNames}. Please deselect them before proceeding.`
        };
      }

      const selectedDels = individualDeliveries.filter((d) => runData.deliveryIds.includes(d.id));
      const totalQty = selectedDels.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
      const clients = Array.from(new Set(selectedDels.map((d) => d.client).filter(Boolean)));
      const batchNames = Array.from(new Set(selectedDels.map((d) => d.batchName).filter(Boolean)));
      const primaryArea = runData.deliveryArea?.trim() || selectedDels[0]?.area || 'Luzon';

      const nowIso = new Date().toISOString();
      const nextId = `TRK-RUN-${Date.now().toString().slice(-6)}`;
      const autoNum = `TRUCK RUN #${String(truckRuns.length + 1).padStart(3, '0')}`;
      const finalRunNumber = runData.truckRunNumber?.trim() || autoNum;

      const finalDriver = runData.driver?.trim() || 'Unassigned';
      const resolvedDriverId = finalDriver !== 'Unassigned' ? resolveDriverId(finalDriver) : undefined;
      const finalHelper = runData.helper?.trim();
      const resolvedHelperId = finalHelper ? resolveHelperId(finalHelper) : undefined;

      const newRun: TruckRun = {
        id: nextId,
        truckRunNumber: finalRunNumber,
        truckDispatchPod: cleanPod,
        plannedDispatchDate: runData.plannedDispatchDate || nowIso.split('T')[0],
        clients,
        deliveryBatchNames: batchNames,
        deliveryArea: primaryArea,
        routeLocation: runData.routeLocation?.trim() || 'Standard Delivery Route',
        truckSource: runData.truckSource || 'OFII Dedicated Fleet',
        plateNumber: runData.plateNumber?.trim() || 'TBD',
        driver: finalDriver,
        driverId: resolvedDriverId,
        assignedDriverId: resolvedDriverId,
        driverContact: runData.driverContact?.trim(),
        helper: finalHelper,
        helperId: resolvedHelperId,
        assignedHelperId: resolvedHelperId,
        helperContact: runData.helperContact?.trim(),
        remarks: runData.remarks?.trim(),
        status: runData.status || 'Planned',
        deliveryIds: runData.deliveryIds,
        totalDeliveries: selectedDels.length,
        totalQuantity: totalQty,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 1. Add Truck Run to list
      setTruckRuns((prev) => {
        const next = [newRun, ...prev];
        try {
          localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      // 2. Link each selected Individual Delivery to this Truck Run with assigned driverId and helperId
      // CRITICAL: DO NOT overwrite individualDeliveryPod! It is completely preserved!
      const hasDriverAssigned = Boolean(newRun.driver && newRun.driver.trim() !== '' && newRun.driver !== 'Unassigned');
      const isRunReady = newRun.status === 'Ready for Dispatch' || runData.status === 'Ready for Dispatch';
      const initialCanonicalStatus: CanonicalDeliveryStatus = isRunReady
        ? 'READY FOR DISPATCH'
        : hasDriverAssigned
          ? 'ASSIGNED'
          : 'PLANNED';

      setIndividualDeliveries((prev) => {
        const next = prev.map((del) => {
          if (runData.deliveryIds.includes(del.id)) {
            return {
              ...del,
              truckRunId: newRun.id,
              truckRunNumber: newRun.truckRunNumber,
              truckDispatchPod: newRun.truckDispatchPod,
              driver: newRun.driver,
              driverId: resolvedDriverId,
              assignedDriverId: resolvedDriverId,
              helper: newRun.helper,
              helperId: resolvedHelperId,
              assignedHelperId: resolvedHelperId,
              plateNumber: newRun.plateNumber,
              truckName: newRun.truckSource,
              assignedToTruckRunAt: nowIso,
              status: initialCanonicalStatus,
              deliveryStatus: initialCanonicalStatus,
              driverProgressStatus: del.driverProgressStatus || (hasDriverAssigned ? 'Assigned' : undefined),
            };
          }
          return del;
        });
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      // 3. Synchronize / establish corresponding Forwarding Records
      setForwardingRecords((prev) => {
        const existingPodMap = new Map(prev.map((r) => [r.podNumber, r]));
        const updated = [...prev];
        for (const del of selectedDels) {
          const matched = existingPodMap.get(del.individualDeliveryPod) || updated.find((r) => r.id === del.id);
          if (matched) {
            const idx = updated.findIndex((r) => r.id === matched.id);
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                driverName: newRun.driver,
                assignedDriver: newRun.driver,
                assignedDriverId: resolvedDriverId,
                helperName: newRun.helper || updated[idx].helperName,
                assignedHelper: newRun.helper || updated[idx].assignedHelper,
                assignedHelperId: resolvedHelperId || updated[idx].assignedHelperId,
                plateNumber: newRun.plateNumber,
                truckRunNumber: newRun.truckRunNumber,
                vehicle: newRun.truckSource,
                deliveryStatus: updated[idx].deliveryStatus === 'Delivered' ? 'Delivered' : 'Assigned',
              };
            }
          } else {
            const newFwd: ForwardingProgressiveRecord = {
              id: del.id,
              month: new Date().toLocaleString('default', { month: 'long' }),
              coordinator: 'Operations Coordinator',
              referenceNumber: del.referenceNumber,
              client: del.client,
              consignee: del.consignee,
              modeOfShipment: (del.modeOfShipment as any) || 'Land Freight',
              area: (del.area as any) || 'Luzon',
              deliveryLeadTimeDays: 3,
              actualDispatchDate: newRun.plannedDispatchDate,
              podNumber: del.individualDeliveryPod,
              driverName: newRun.driver,
              assignedDriver: newRun.driver,
              assignedDriverId: resolvedDriverId,
              helperName: newRun.helper,
              assignedHelper: newRun.helper,
              assignedHelperId: resolvedHelperId,
              plateNumber: newRun.plateNumber,
              truckRunNumber: newRun.truckRunNumber,
              vehicle: newRun.truckSource,
              courier: newRun.truckSource,
              truckProvider: newRun.truckSource,
              deliveryStatus: 'Assigned',
              driverProgressStatus: 'Assigned',
              quantity: del.quantity,
              unit: del.unit || 'Cases',
              destination: del.destination || del.destinationCode || primaryArea,
              destinationCode: del.destinationCode,
              batchName: del.batchName,
              deliveryId: del.id,
              chargeableWeightFees: 0,
              declaredValue: 0,
              grossWeightKg: (del as any).grossWeightKg || 0,
              insuranceFee: 0,
              waybillNumber: del.individualDeliveryPod,
              shipper: del.client,
              truckRate: 0,
              totalBilledAmount: 0,
              podStatus: 'Pending Return',
            } as unknown as ForwardingProgressiveRecord;
            updated.unshift(newFwd);
          }
        }
        try {
          localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // 4. Send New Delivery Assignment Notification to specifically assigned Driver ONLY
      if (resolvedDriverId && finalDriver !== 'Unassigned') {
        const notificationsToCreate: DriverAssignmentNotification[] = selectedDels.map((del) => ({
          id: `DAN-${Date.now()}-${del.id}-${Math.floor(Math.random() * 1000)}`,
          title: 'New Delivery Assigned',
          message: `You have been assigned a new delivery under Truck Run ${newRun.truckRunNumber}.`,
          driverName: newRun.driver,
          driverId: resolvedDriverId,
          assignedDriverId: resolvedDriverId,
          helperName: newRun.helper || undefined,
          assignedHelper: newRun.helper || undefined,
          assignedHelperId: resolvedHelperId,
          recordId: del.id,
          deliveryId: del.deliveryId || del.id,
          truckRunNumber: newRun.truckRunNumber,
          truckRunId: newRun.id,
          batchName: del.batchName || 'General Batch',
          client: del.client,
          consignee: del.consignee,
          destination: del.destination || del.destinationCode || primaryArea,
          area: del.area || primaryArea,
          quantity: del.quantity,
          unit: del.unit || 'Cases',
          plannedDispatchDate: newRun.plannedDispatchDate,
          truckName: newRun.truckSource || 'OFII Dedicated Fleet',
          plateNumber: newRun.plateNumber,
          assignedDriver: newRun.driver,
          podNumber: del.individualDeliveryPod,
          referenceNumber: del.referenceNumber,
          deliveryDate: del.rdd || newRun.plannedDispatchDate,
          createdAt: nowIso,
          isRead: false,
        }));

        setDriverNotifications((prev) => {
          const existingKeys = new Set(prev.map((n) => `${n.recordId}_${n.driverId || n.assignedDriverId}`));
          const uniqueNew = notificationsToCreate.filter(
            (n) => !existingKeys.has(`${n.recordId}_${n.driverId || n.assignedDriverId}`)
          );
          const next = [...uniqueNew, ...prev];
          try {
            localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }

      showSuccessToast(
        'Truck Run Created',
        `${newRun.truckRunNumber} (${newRun.truckDispatchPod}) created with ${newRun.totalDeliveries} store deliveries. Assigned driver notified.`
      );
      return { success: true, truckRun: newRun };
    } catch (err: any) {
      console.error('[createTruckRun] Error:', err);
      return { success: false, error: err?.message || 'Failed to create Truck Run.' };
    }
  }, [individualDeliveries, truckRuns.length, showSuccessToast, currentUserProfile]);

  const updateTruckRun = useCallback(async (runId: string, updates: Partial<TruckRun>): Promise<void> => {
    assertCanMutate('update truck run');
    // RBAC: Truck Planner, Dispatcher, and Head Staff authorized
    const canonicalRole = normalizeUserRole(currentUserProfile);
    if (
      canonicalRole !== 'TRUCK_PLANNER' && 
      canonicalRole !== 'DISPATCHER' && 
      canonicalRole !== 'HEAD_STAFF' &&
      canonicalRole !== 'ADMIN'
    ) {
      const errorMsg = 'Access Denied: Only a Truck Planner or Dispatcher is authorized to update Truck Runs.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    const currentRun = truckRuns.find((r) => r.id === runId);
    const oldDriver = currentRun?.driver;
    const oldDriverId = currentRun?.driverId || (oldDriver ? resolveDriverId(oldDriver) : undefined);

    let nextDriverId = updates.driverId;
    if (updates.driver && !nextDriverId) {
      nextDriverId = resolveDriverId(updates.driver);
    }
    let nextHelperId = updates.helperId;
    if (updates.helper && !nextHelperId) {
      nextHelperId = resolveHelperId(updates.helper);
    }

    const finalTimeArrived = updates.timeArrived !== undefined ? updates.timeArrived : currentRun?.timeArrived;
    const finalStartLoading = updates.startLoadingTime !== undefined ? updates.startLoadingTime : currentRun?.startLoadingTime;
    const finalEndLoading = updates.endLoadingTime !== undefined ? updates.endLoadingTime : currentRun?.endLoadingTime;
    const finalActualDeparture = updates.actualDeparture !== undefined ? updates.actualDeparture : currentRun?.actualDeparture;

    let derivedOpStatus = updates.dispatchOperationalStatus;
    if (!derivedOpStatus && (finalTimeArrived || finalStartLoading || finalEndLoading || finalActualDeparture)) {
      derivedOpStatus = deriveDeliveryOperationalStatus(
        finalTimeArrived,
        finalStartLoading,
        finalEndLoading,
        finalActualDeparture
      );
    }

    const nextUpdates: Partial<TruckRun> = {
      ...updates,
      ...(derivedOpStatus ? { dispatchOperationalStatus: derivedOpStatus } : {}),
      ...(nextDriverId ? { driverId: nextDriverId, assignedDriverId: nextDriverId } : {}),
      ...(nextHelperId ? { helperId: nextHelperId, assignedHelperId: nextHelperId } : {}),
    };

    const nowIso = new Date().toISOString();
    setTruckRuns((prev) => {
      const next = prev.map((r) => (r.id === runId ? { ...r, ...nextUpdates, updatedAt: nowIso } : r));
      try {
        localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Synchronize individual deliveries
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (del.truckRunId === runId) {
          const isDone = Boolean(
            del.actualDeliveryDate ||
            del.dateReceived ||
            del.podReturnDate ||
            del.status === 'Delivered' ||
            del.status === 'DELIVERED' ||
            del.status === 'POD PENDING' ||
            del.status === 'POD RETURNED' ||
            del.status === 'COMPLETED' ||
            del.deliveryStatus === 'DELIVERED' ||
            del.deliveryStatus === 'POD PENDING' ||
            del.deliveryStatus === 'POD RETURNED' ||
            del.deliveryStatus === 'COMPLETED'
          );

          let nextCanonicalStatus: CanonicalDeliveryStatus;
          if (isDone) {
            nextCanonicalStatus = (del.deliveryStatus as CanonicalDeliveryStatus) || 'DELIVERED';
          } else if (derivedOpStatus === 'DEPARTED') {
            nextCanonicalStatus = 'DEPARTED';
          } else if (derivedOpStatus === 'LOADING COMPLETED') {
            nextCanonicalStatus = 'LOADING COMPLETED';
          } else if (derivedOpStatus === 'LOADING') {
            nextCanonicalStatus = 'LOADING';
          } else if (derivedOpStatus === 'ARRIVED') {
            nextCanonicalStatus = 'ARRIVED';
          } else if (updates.status === 'Ready for Dispatch' || currentRun?.status === 'Ready for Dispatch') {
            nextCanonicalStatus = 'READY FOR DISPATCH';
          } else {
            const effectiveDriver = updates.driver !== undefined ? updates.driver : currentRun?.driver;
            const hasDriver = Boolean(effectiveDriver && effectiveDriver.trim() !== '' && effectiveDriver !== 'Unassigned');
            nextCanonicalStatus = hasDriver ? 'ASSIGNED' : 'PLANNED';
          }

          return {
            ...del,
            ...(updates.truckRunNumber ? { truckRunNumber: updates.truckRunNumber } : {}),
            ...(updates.truckDispatchPod ? { truckDispatchPod: updates.truckDispatchPod } : {}),
            ...(updates.driver ? { driver: updates.driver, driverId: nextDriverId, assignedDriverId: nextDriverId } : {}),
            ...(updates.helper !== undefined ? { helper: updates.helper, helperId: nextHelperId, assignedHelperId: nextHelperId } : {}),
            ...(updates.plateNumber ? { plateNumber: updates.plateNumber } : {}),
            ...(updates.truckSource ? { truckName: updates.truckSource } : {}),
            ...(finalTimeArrived !== undefined ? { timeArrived: finalTimeArrived } : {}),
            ...(finalStartLoading !== undefined ? { startLoadingTime: finalStartLoading } : {}),
            ...(finalEndLoading !== undefined ? { endLoadingTime: finalEndLoading } : {}),
            ...(finalActualDeparture !== undefined ? { 
              actualDeparture: finalActualDeparture, 
              actualDispatchDate: finalActualDeparture.split('T')[0] || del.actualDispatchDate || nowIso.split('T')[0],
              isDispatched: true
            } : {}),
            ...(updates.transportDispatcher !== undefined ? { transportDispatcher: updates.transportDispatcher } : {}),
            ...(updates.truckerContact !== undefined ? { truckerContact: updates.truckerContact } : {}),
            ...(derivedOpStatus ? { dispatchOperationalStatus: derivedOpStatus } : {}),
            status: isDone ? del.status : nextCanonicalStatus,
            deliveryStatus: isDone ? del.deliveryStatus : nextCanonicalStatus,
            driverProgressStatus: derivedOpStatus === 'DEPARTED' ? (del.driverProgressStatus || 'In Transit') : del.driverProgressStatus,
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Synchronize forwarding records for the updated truck run
    setForwardingRecords((prev) => {
      const next = prev.map((fwd) => {
        const isLinked = fwd.truckRunNumber === currentRun?.truckRunNumber || 
          (updates.truckRunNumber && fwd.truckRunNumber === updates.truckRunNumber) ||
          (currentRun && currentRun.deliveryIds.includes(fwd.id)) ||
          (currentRun && currentRun.deliveryIds.includes(fwd.individualDeliveryId || ''));
        
        if (isLinked) {
          const isDone = fwd.deliveryStatus === 'Delivered' || fwd.deliveryStatus === 'DELIVERED' || fwd.deliveryStatus === 'COMPLETED' || fwd.actualDeliveryDate;
          let fwdDeliveryStatus = fwd.deliveryStatus;
          if (!isDone) {
            if (derivedOpStatus === 'DEPARTED') {
              fwdDeliveryStatus = 'In Transit';
            } else if (derivedOpStatus === 'LOADING COMPLETED') {
              fwdDeliveryStatus = 'LOADING COMPLETED' as any;
            } else if (derivedOpStatus === 'LOADING') {
              fwdDeliveryStatus = 'LOADING' as any;
            } else if (derivedOpStatus === 'ARRIVED') {
              fwdDeliveryStatus = 'ARRIVED' as any;
            } else if (updates.status === 'Ready for Dispatch' || currentRun?.status === 'Ready for Dispatch') {
              fwdDeliveryStatus = 'Ready for Dispatch';
            } else {
              const effectiveDriver = updates.driver !== undefined ? updates.driver : currentRun?.driver;
              fwdDeliveryStatus = (effectiveDriver && effectiveDriver !== 'Unassigned') ? 'Assigned' : 'Planned' as any;
            }
          }

          return {
            ...fwd,
            timeArrived: finalTimeArrived !== undefined ? finalTimeArrived : fwd.timeArrived,
            startLoadingTime: finalStartLoading !== undefined ? finalStartLoading : fwd.startLoadingTime,
            endLoadingTime: finalEndLoading !== undefined ? finalEndLoading : fwd.endLoadingTime,
            actualDepartureTime: finalActualDeparture !== undefined ? finalActualDeparture : fwd.actualDepartureTime,
            actualDispatchDate: finalActualDeparture ? (finalActualDeparture.split('T')[0] || fwd.actualDispatchDate) : fwd.actualDispatchDate,
            driverName: updates.driver !== undefined ? updates.driver : fwd.driverName,
            assignedDriver: updates.driver !== undefined ? updates.driver : fwd.assignedDriver,
            assignedDriverId: nextDriverId !== undefined ? nextDriverId : fwd.assignedDriverId,
            helperName: updates.helper !== undefined ? updates.helper : fwd.helperName,
            assignedHelper: updates.helper !== undefined ? updates.helper : fwd.assignedHelper,
            assignedHelperId: nextHelperId !== undefined ? nextHelperId : fwd.assignedHelperId,
            plateNumber: updates.plateNumber !== undefined ? updates.plateNumber : fwd.plateNumber,
            truckRunNumber: updates.truckRunNumber !== undefined ? updates.truckRunNumber : fwd.truckRunNumber,
            vehicle: updates.truckSource !== undefined ? updates.truckSource : fwd.vehicle,
            dispatchOperationalStatus: derivedOpStatus || fwd.dispatchOperationalStatus,
            deliveryStatus: fwdDeliveryStatus,
          };
        }
        return fwd;
      });
      try {
        localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // If driver was reassigned to a different driver, notify the newly assigned driver
    const isDriverReassigned = Boolean(updates.driver && updates.driver !== 'Unassigned' && nextDriverId && nextDriverId !== oldDriverId);
    if (isDriverReassigned && nextDriverId) {
      const runDeliveries = individualDeliveries.filter((d) => d.truckRunId === runId);
      const reassignedNotifs: DriverAssignmentNotification[] = runDeliveries.map((del) => ({
        id: `DAN-${Date.now()}-${del.id}-${Math.floor(Math.random() * 1000)}`,
        title: 'New Delivery Assigned',
        message: `You have been assigned a new delivery under Truck Run ${updates.truckRunNumber || currentRun?.truckRunNumber || 'TR-0007'}.`,
        driverName: updates.driver || currentRun?.driver || 'Assigned Driver',
        driverId: nextDriverId,
        assignedDriverId: nextDriverId,
        helperName: updates.helper || currentRun?.helper || undefined,
        assignedHelper: updates.helper || currentRun?.helper || undefined,
        assignedHelperId: nextHelperId || currentRun?.helperId,
        recordId: del.id,
        deliveryId: del.deliveryId || del.id,
        truckRunNumber: updates.truckRunNumber || currentRun?.truckRunNumber || 'TR-0007',
        truckRunId: runId,
        batchName: del.batchName || 'General Batch',
        client: del.client,
        consignee: del.consignee,
        destination: del.destination || del.destinationCode || del.area,
        area: del.area,
        quantity: del.quantity,
        unit: del.unit || 'Cases',
        plannedDispatchDate: updates.plannedDispatchDate || currentRun?.plannedDispatchDate || nowIso.split('T')[0],
        truckName: updates.truckSource || currentRun?.truckSource || 'OFII Dedicated Fleet',
        plateNumber: updates.plateNumber || currentRun?.plateNumber || '—',
        assignedDriver: updates.driver || currentRun?.driver || 'Assigned Driver',
        podNumber: del.individualDeliveryPod,
        referenceNumber: del.referenceNumber,
        deliveryDate: del.rdd || currentRun?.plannedDispatchDate || nowIso.split('T')[0],
        createdAt: nowIso,
        isRead: false,
      }));

      setDriverNotifications((prev) => {
        const existingKeys = new Set(prev.map((n) => `${n.recordId}_${n.driverId || n.assignedDriverId}`));
        const uniqueNew = reassignedNotifs.filter(
          (n) => !existingKeys.has(`${n.recordId}_${n.driverId || n.assignedDriverId}`)
        );
        const next = [...uniqueNew, ...prev];
        try {
          localStorage.setItem('ofii_cache_v4_driver_notifications', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    showSuccessToast('Truck Run Updated', 'Truck Run settings saved successfully.');
  }, [truckRuns, individualDeliveries, showSuccessToast, currentUserProfile]);

  const updateTruckRunStatus = useCallback(async (runId: string, status: TruckRunStatus): Promise<void> => {
    assertCanMutate('update truck run status');
    // RBAC: Truck Planner, Dispatcher, and Head Staff authorized
    const canonicalRole = normalizeUserRole(currentUserProfile);
    if (
      canonicalRole !== 'TRUCK_PLANNER' && 
      canonicalRole !== 'DISPATCHER' && 
      canonicalRole !== 'HEAD_STAFF' &&
      canonicalRole !== 'ADMIN'
    ) {
      const errorMsg = 'Access Denied: Only authorized operations staff are permitted to update Truck Run status.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    const nowIso = new Date().toISOString();
    setTruckRuns((prev) => {
      const next = prev.map((r) => (r.id === runId ? { ...r, status, updatedAt: nowIso } : r));
      try {
        localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Synchronize deliveries according to status transition
    if (status === 'Ready for Dispatch') {
      setIndividualDeliveries((prev) => {
        const next = prev.map((del) => {
          if (del.truckRunId === runId) {
            const isDeliveredOrComplete = Boolean(
              del.actualDeliveryDate ||
              del.dateReceived ||
              del.podReturnDate ||
              del.status === 'Delivered' ||
              del.status === 'DELIVERED' ||
              del.status === 'POD PENDING' ||
              del.status === 'POD RETURNED' ||
              del.status === 'COMPLETED' ||
              del.deliveryStatus === 'DELIVERED' ||
              del.deliveryStatus === 'POD PENDING' ||
              del.deliveryStatus === 'POD RETURNED' ||
              del.deliveryStatus === 'COMPLETED'
            );
            if (!isDeliveredOrComplete) {
              return {
                ...del,
                status: 'READY FOR DISPATCH',
                deliveryStatus: 'READY FOR DISPATCH',
              };
            }
          }
          return del;
        });
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setForwardingRecords((prev) => {
        const next: ForwardingProgressiveRecord[] = prev.map((fwd) => {
          const run = truckRuns.find((r) => r.id === runId);
          if (run && (fwd.truckRunNumber === run.truckRunNumber || run.deliveryIds.includes(fwd.id) || run.deliveryIds.includes(fwd.individualDeliveryId || ''))) {
            const isDone = fwd.deliveryStatus === 'Delivered' || fwd.deliveryStatus === 'DELIVERED' || fwd.deliveryStatus === 'COMPLETED' || fwd.actualDeliveryDate;
            if (!isDone) {
              return {
                ...fwd,
                deliveryStatus: 'READY FOR DISPATCH',
              };
            }
          }
          return fwd;
        });
        try {
          localStorage.setItem('ofii_cache_v4_forwarding', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    // If cancelled, release assigned deliveries back to CREATED
    if (status === 'Cancelled') {
      setIndividualDeliveries((prev) => {
        const next = prev.map((del) => {
          if (del.truckRunId === runId) {
            const { truckRunId: _tr, truckRunNumber: _trn, truckDispatchPod: _trp, assignedToTruckRunAt: _at, ...rest } = del;
            return {
              ...rest,
              status: 'CREATED',
              deliveryStatus: 'CREATED',
            };
          }
          return del;
        });
        try {
          localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    }

    showSuccessToast('Status Updated', `Truck run marked as ${status}.`);
  }, [showSuccessToast, currentUserProfile]);

  const removeDeliveryFromTruckRun = useCallback(async (
    truckRunId: string,
    deliveryId: string
  ): Promise<{ success: boolean; error?: string }> => {
    // RBAC: Truck Planner (or mapped driver_head) or Admin
    const userRole = currentUserProfile?.userRole;
    const canonicalRole = normalizeUserRole(userRole || currentUserProfile?.role);
    if (
      canonicalRole !== 'TRUCK_PLANNER' &&
      canonicalRole !== 'ADMIN' &&
      userRole !== 'truck_planner' &&
      (userRole as string) !== 'driver_head'
    ) {
      const errorMsg = 'Access Denied: Only a Truck Planner / Driver\'s Head is authorized to remove deliveries from Truck Runs.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      return { success: false, error: errorMsg };
    }

    // 1. Unassign individual delivery
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (del.id === deliveryId && del.truckRunId === truckRunId) {
          const { truckRunId: _tr, truckRunNumber: _trn, truckDispatchPod: _trp, assignedToTruckRunAt: _at, ...rest } = del;
          return {
            ...rest,
            status: 'CREATED',
            deliveryStatus: 'CREATED',
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 2. Update truck run totals
    setTruckRuns((prev) => {
      const next = prev.map((run) => {
        if (run.id === truckRunId) {
          const nextDeliveryIds = run.deliveryIds.filter((id) => id !== deliveryId);
          const remainingDeliveries = individualDeliveries.filter(
            (d) => nextDeliveryIds.includes(d.id) && d.id !== deliveryId
          );
          return {
            ...run,
            deliveryIds: nextDeliveryIds,
            totalDeliveries: nextDeliveryIds.length,
            totalQuantity: remainingDeliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
            updatedAt: new Date().toISOString(),
          };
        }
        return run;
      });
      try {
        localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showSuccessToast('Delivery Unassigned', 'Delivery removed from Truck Run and returned to available deliveries pool.');
    return { success: true };
  }, [individualDeliveries, showSuccessToast, currentUserProfile]);

  const addDeliveriesToTruckRun = useCallback(async (
    truckRunId: string,
    deliveryIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    assertCanMutate('add deliveries to truck run');
    // RBAC: Truck Planner and Office Head / Admin authorized
    const userRole = currentUserProfile?.userRole;
    const canonicalRole = normalizeUserRole(userRole || currentUserProfile?.role);
    if (
      canonicalRole !== 'TRUCK_PLANNER' &&
      canonicalRole !== 'ADMIN' &&
      userRole !== 'truck_planner' &&
      userRole !== 'office_head'
    ) {
      const errorMsg = 'Access Denied: Only a Truck Planner is authorized to assign deliveries to Truck Runs.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!deliveryIds || deliveryIds.length === 0) {
      return { success: false, error: 'No deliveries selected.' };
    }
    const targetRun = truckRuns.find((r) => r.id === truckRunId);
    if (!targetRun) {
      return { success: false, error: 'Truck Run not found.' };
    }

    const nowIso = new Date().toISOString();
    const hasDriverAssigned = Boolean(targetRun.driver && targetRun.driver.trim() !== '' && targetRun.driver !== 'Unassigned');
    const isRunReady = targetRun.status === 'Ready for Dispatch';
    const canonicalStatus: CanonicalDeliveryStatus = isRunReady
      ? 'READY FOR DISPATCH'
      : hasDriverAssigned
        ? 'ASSIGNED'
        : 'PLANNED';

    // Update individual deliveries
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (deliveryIds.includes(del.id)) {
          return {
            ...del,
            truckRunId: targetRun.id,
            truckRunNumber: targetRun.truckRunNumber,
            truckDispatchPod: targetRun.truckDispatchPod,
            driver: targetRun.driver,
            driverId: targetRun.driverId,
            assignedDriverId: targetRun.assignedDriverId || targetRun.driverId,
            helper: targetRun.helper,
            helperId: targetRun.helperId,
            assignedHelperId: targetRun.assignedHelperId || targetRun.helperId,
            plateNumber: targetRun.plateNumber,
            truckName: targetRun.truckSource,
            assignedToTruckRunAt: nowIso,
            status: canonicalStatus,
            deliveryStatus: canonicalStatus,
            driverProgressStatus: del.driverProgressStatus || (hasDriverAssigned ? 'Assigned' : undefined),
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Update Truck Run
    setTruckRuns((prev) => {
      const next = prev.map((run) => {
        if (run.id === truckRunId) {
          const combinedIds = Array.from(new Set([...run.deliveryIds, ...deliveryIds]));
          const allDel = individualDeliveries.filter((d) => combinedIds.includes(d.id));
          return {
            ...run,
            deliveryIds: combinedIds,
            totalDeliveries: combinedIds.length,
            totalQuantity: allDel.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0),
            updatedAt: nowIso,
          };
        }
        return run;
      });
      try {
        localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showSuccessToast('Deliveries Added', `${deliveryIds.length} deliveries added to ${targetRun.truckRunNumber}.`);
    return { success: true };
  }, [truckRuns, individualDeliveries, showSuccessToast, currentUserProfile]);

  const cancelTruckRun = useCallback(async (truckRunId: string): Promise<{ success: boolean; error?: string }> => {
    // RBAC: Truck Planner (or mapped driver_head) or Admin
    const userRole = currentUserProfile?.userRole;
    const canonicalRole = normalizeUserRole(userRole || currentUserProfile?.role);
    if (
      canonicalRole !== 'TRUCK_PLANNER' &&
      canonicalRole !== 'ADMIN' &&
      userRole !== 'truck_planner' &&
      (userRole as string) !== 'driver_head'
    ) {
      const errorMsg = 'Access Denied: Only a Truck Planner / Driver\'s Head is authorized to cancel Truck Runs.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      return { success: false, error: errorMsg };
    }

    const targetRun = truckRuns.find((r) => r.id === truckRunId);
    const runName = targetRun?.truckRunNumber || 'Truck Run';

    // 1. Mark status as Cancelled
    setTruckRuns((prev) => {
      const next = prev.map((run) => {
        if (run.id === truckRunId) {
          return {
            ...run,
            status: 'Cancelled' as TruckRunStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return run;
      });
      try {
        localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 2. Release assigned deliveries without deleting them
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (del.truckRunId === truckRunId) {
          const { truckRunId: _tr, truckRunNumber: _trn, truckDispatchPod: _trp, assignedToTruckRunAt: _at, ...rest } = del;
          return {
            ...rest,
            status: 'CREATED',
            deliveryStatus: 'CREATED',
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showSuccessToast('Truck Run Cancelled', `${runName} marked as cancelled. Deliveries released back to available pool.`);
    return { success: true };
  }, [truckRuns, showSuccessToast, currentUserProfile]);

  const deleteTruckRun = useCallback(async (truckRunId: string): Promise<void> => {
    assertCanMutate('delete truck run');
    // RBAC: Truck Planner and Office Head / Admin authorized
    const userRole = currentUserProfile?.userRole;
    const canonicalRole = normalizeUserRole(userRole || currentUserProfile?.role);
    if (
      canonicalRole !== 'TRUCK_PLANNER' &&
      canonicalRole !== 'ADMIN' &&
      userRole !== 'truck_planner' &&
      userRole !== 'office_head'
    ) {
      const errorMsg = 'Access Denied: Only a Truck Planner is authorized to delete Truck Runs.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    // Release assigned deliveries
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (del.truckRunId === truckRunId) {
          const { truckRunId: _tr, truckRunNumber: _trn, truckDispatchPod: _trp, assignedToTruckRunAt: _at, ...rest } = del;
          return {
            ...rest,
            status: 'CREATED',
            deliveryStatus: 'CREATED',
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    setTruckRuns((prev) => {
      const next = prev.filter((r) => r.id !== truckRunId);
      try {
        localStorage.setItem('ofii_truck_runs_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    showSuccessToast('Truck Run Deleted', 'Truck run deleted and deliveries returned to available pool.');
  }, [showSuccessToast, currentUserProfile]);

  // Phase 5.1: Encoder Action — Encode Physical POD Return, track Recipient Name edit history, and calculate SLA
  const encodePodReturn = useCallback(async (params: {
    recordId: string;
    dateReceived: string;
    podReturnDate: string;
    recipientName?: string;
    editReason?: string;
    podRemarks?: string;
  }): Promise<{ slaStatus: 'HIT' | 'MISSED'; dueDate: string }> => {
    assertCanMutate('encode pod return');
    const { recordId, dateReceived, podReturnDate, recipientName, editReason, podRemarks } = params;
    const cleanReturnDate = podReturnDate.trim();
    const cleanRecipientName = recipientName !== undefined ? recipientName.trim() : undefined;
    const cleanEditReason = editReason !== undefined ? editReason.trim() : undefined;

    // RBAC: Encoder and Operations Head authorized only (Requirement 3: Role Permissions)
    const canonicalRole = normalizeUserRole(currentUserProfile?.userRole || currentUserProfile?.role);
    const isEncoder = canonicalRole === 'ENCODER';
    const isHead = canonicalRole === 'HEAD_STAFF';

    if (!isEncoder && !isHead) {
      const errorMsg = 'Access Denied: Only an authorized Encoder (or Operations Head) is permitted to encode and confirm POD returns.';
      console.warn('[RBAC Denied]', errorMsg);
      showSuccessToast('Permission Denied', errorMsg);
      throw new Error(errorMsg);
    }

    // 1. Locate record across collections
    const targetIndividual = individualDeliveries.find(
      (d) => d.id === recordId || d.deliveryId === recordId || d.individualDeliveryPod === recordId
    );
    const targetForwarding = forwardingRecords.find(
      (f) => f.id === recordId || f.deliveryId === recordId || f.podNumber === recordId || f.individualDeliveryPod === recordId
    );
    const targetNotif = podReturningNotifications.find(
      (n) => n.recordId === recordId || n.deliveryId === recordId || n.individualDeliveryPod === recordId
    );

    // Determine the permanent Driver-entered recipient name (Never deleted!)
    const originalDriverName = 
      targetIndividual?.driverRecipientName ||
      targetForwarding?.driverRecipientName ||
      targetNotif?.driverRecipientName ||
      targetIndividual?.recipientName ||
      targetIndividual?.receiversName ||
      targetForwarding?.recipientName ||
      targetForwarding?.receiversName ||
      targetNotif?.recipientName ||
      targetNotif?.receiversName ||
      cleanRecipientName ||
      '';

    const existingHistory: RecipientNameHistoryEntry[] = 
      targetIndividual?.recipientNameHistory ||
      targetForwarding?.recipientNameHistory ||
      targetNotif?.recipientNameHistory ||
      [];

    // Check if Encoder modified the Recipient Name
    const isNameChanged = Boolean(
      cleanRecipientName &&
      originalDriverName &&
      cleanRecipientName.toLowerCase() !== originalDriverName.trim().toLowerCase()
    );

    let updatedHistory = [...existingHistory];
    if (isNameChanged) {
      // Prevent duplicate history entries when no changes were made or identical to last change
      const lastEntry = existingHistory[existingHistory.length - 1];
      const isDuplicate = lastEntry &&
        lastEntry.originalRecipientName.trim().toLowerCase() === originalDriverName.trim().toLowerCase() &&
        lastEntry.finalRecipientName.trim().toLowerCase() === cleanRecipientName.toLowerCase() &&
        (lastEntry.editReason || '').trim() === (cleanEditReason || '');

      if (!isDuplicate) {
        const encoderName = currentUserProfile?.name || 'Encoder User';
        const newHistoryEntry: RecipientNameHistoryEntry = {
          id: `RNH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          originalRecipientName: originalDriverName,
          finalRecipientName: cleanRecipientName,
          editedBy: encoderName,
          editedAt: new Date().toISOString(),
          editReason: cleanEditReason || undefined,
        };
        updatedHistory.push(newHistoryEntry);
      }
    }

    const clientName = targetForwarding?.client || targetIndividual?.client || 'Default Client';
    const area = (targetForwarding?.area || targetIndividual?.area || 'Luzon') as any;
    const actualDelivery = targetForwarding?.actualDeliveryDate || targetIndividual?.actualDeliveryDate || dateReceived || new Date().toISOString().split('T')[0];

    // 2. Calculate POD Return Due Date using working days and business rules
    const dueRes = calculatePodReturnDueDate(actualDelivery, clientName, area);
    const dueDate = dueRes.podReturnDueDate || cleanReturnDate;

    // 3. Evaluate SLA: HIT if on/before due date, MISSED if after due date
    const slaStatus: 'HIT' | 'MISSED' = (dueDate && cleanReturnDate <= dueDate) ? 'HIT' : 'MISSED';
    const podStatusLabel = slaStatus === 'HIT' ? 'Returned On Time' : 'POD Delayed';

    // 4. Update individualDeliveries (Save final edited Recipient Name and edit history to exact Individual Delivery record)
    setIndividualDeliveries((prev) => {
      const next = prev.map((del) => {
        if (del.id === recordId || del.deliveryId === recordId || del.individualDeliveryPod === recordId) {
          return {
            ...del,
            recipientName: cleanRecipientName !== undefined && cleanRecipientName !== '' ? cleanRecipientName : del.recipientName,
            driverRecipientName: del.driverRecipientName || originalDriverName,
            recipientNameHistory: updatedHistory,
            dateReceived: dateReceived || del.dateReceived,
            podReturnDate: cleanReturnDate,
            dateOfPodReturn: cleanReturnDate,
            podStatus: 'POD RETURNED',
            status: 'COMPLETED',
            deliveryStatus: 'COMPLETED',
            deliveryRemarks: podRemarks || del.deliveryRemarks,
          };
        }
        return del;
      });
      try {
        localStorage.setItem('ofii_individual_deliveries_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 5. Update forwardingRecords
    setForwardingRecords((prev) => {
      const next = prev.map((fwd) => {
        if (fwd.id === recordId || fwd.deliveryId === recordId || fwd.podNumber === recordId || fwd.individualDeliveryPod === recordId) {
          return {
            ...fwd,
            recipientName: cleanRecipientName !== undefined && cleanRecipientName !== '' ? cleanRecipientName : (fwd as any).recipientName,
            driverRecipientName: fwd.driverRecipientName || originalDriverName,
            recipientNameHistory: updatedHistory,
            dateReceived: dateReceived || fwd.dateReceived,
            dateOfPodReturn: cleanReturnDate,
            podStatus: 'POD RETURNED' as any,
            podSla: slaStatus,
            deliveryStatus: 'COMPLETED' as any,
            remarks: podRemarks ? `${fwd.remarks ? fwd.remarks + ' | ' : ''}POD: ${podRemarks}` : fwd.remarks,
          };
        }
        return fwd;
      });
      try {
        localStorage.setItem('ofii_forwarding_records_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 6. Update dispatches & shipments
    setDispatches((prev) => {
      const next = prev.map((disp) => {
        if (disp.id === recordId) {
          return { ...disp, podReturnDate: cleanReturnDate, remarks: podRemarks || disp.remarks };
        }
        return disp;
      });
      try {
        localStorage.setItem('ofii_dispatches_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    setShipments((prev) => {
      const next = prev.map((ship) => {
        if (ship.id === recordId || ship.podNumber === recordId || ship.awbNumber === recordId || ship.drNumber === recordId) {
          return { ...ship, datePodReceived: cleanReturnDate, podStatus: podStatusLabel as any };
        }
        return ship;
      });
      try {
        localStorage.setItem('ofii_shipments_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 7. Update podReturningNotifications
    setPodReturningNotifications((prev) => {
      const next = prev.map((n) => {
        if (n.recordId === recordId || n.deliveryId === recordId || n.individualDeliveryPod === recordId) {
          return {
            ...n,
            recipientName: cleanRecipientName !== undefined && cleanRecipientName !== '' ? cleanRecipientName : n.recipientName,
            driverRecipientName: n.driverRecipientName || originalDriverName,
            recipientNameHistory: updatedHistory,
            podStatus: slaStatus,
            podReturnDate: cleanReturnDate,
            dateReceived: dateReceived || n.dateReceived,
            podRemarks: podRemarks || n.podRemarks,
            isRead: true,
            readAt: new Date().toISOString(),
          };
        }
        return n;
      });
      try {
        localStorage.setItem('ofii_cache_v5_pod_returning_notifications', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 8. Broadcast change and show toast
    broadcastDataChange('POD_RETURN_ENCODED', { recordId, podReturnDate: cleanReturnDate, slaStatus });
    showSuccessToast(
      'POD Return Encoded Successfully',
      `Physical POD recorded on ${cleanReturnDate} for ${recordId}. SLA Status: ${slaStatus} (Due Date: ${dueDate}).`
    );

    return { slaStatus, dueDate };
  }, [individualDeliveries, forwardingRecords, podReturningNotifications, currentUserProfile, showSuccessToast]);

  const refreshData = async (showMessage = true) => {
    await fetchAllData(true);
    if (showMessage) {
      showSuccessToast('Database synchronized.', 'Loaded latest records from Supabase.');
    }
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        dispatches,
        shipments,
        forwardingRecords,
        notifications,
        podNotifications,
        businessRules,
        dashboardSummary,
        syncStatus,
        importHistory,
        currentUserProfile,
        driverNotifications,
        deliveryAssignments,
        deliveryBatches,
        individualDeliveries,
        truckRuns,
        truckPlannerNotifications,
        encoderNotifications,
        podReturningNotifications,
        markEncoderNotificationAsRead,
        markAllEncoderNotificationsAsRead,
        markPodReturningNotificationAsRead,
        markAllPodReturningNotificationsAsRead,
        encodePodReturn,
        isLoading,
        loadingMessage,
        errorMessage,
        toastMessage,
        setCurrentUserProfile,
        createDeliveryAssignment,
        getDeliveryAssignmentByOriginalDeliveryId,
        createDeliveryBatch,
        updateDeliveryBatch,
        deleteDeliveryBatch,
        addIndividualDelivery,
        bulkImportIndividualDeliveries,
        updateIndividualDelivery,
        deleteIndividualDelivery,
        saveDeliveryDispatch,
        createTruckPlannerNotification,
        markTruckPlannerNotificationAsRead,
        markAllTruckPlannerNotificationsAsRead,
        deleteTruckPlannerNotification,
        createTruckRun,
        updateTruckRun,
        updateTruckRunStatus,
        removeDeliveryFromTruckRun,
        addDeliveriesToTruckRun,
        cancelTruckRun,
        deleteTruckRun,
        assignDriverToDelivery,
        markDriverNotificationAsRead,
        markAllDriverNotificationsAsRead,
        addClient,
        updateClient,
        toggleClientStatus,
        addDispatch,
        updateDispatch,
        addForwardingRecord,
        bulkImportForwardingRecords,
        bulkImportDispatches,
        updateForwardingRecord,
        clearImportHistory,
        updateShipment,
        softDeleteRecord,
        restoreRecord,
        permanentDeleteRecord,
        dismissNotification,
        completeNotification,
        markPodNotificationAsRead,
        markAllPodNotificationsAsRead,
        updateDriverProgress,
        markDeliveryAsDelivered,
        refreshData,
        dismissToast,
        showSuccessToast,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
