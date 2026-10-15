/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { CreateAccountScreen } from './components/CreateAccountScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DailyDispatchView } from './components/DailyDispatchView';
import { DispatchDetailModal } from './components/DispatchDetailModal';
import { ClientShipmentView } from './components/ClientShipmentView';
import { ClientShipmentDetailView } from './components/ClientShipmentDetailView';
import { ForwardingProgressiveView } from './components/ForwardingProgressiveView';
import { ForwardingDetailModal } from './components/ForwardingDetailModal';
import { AddForwardingRecordModal } from './components/AddForwardingRecordModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { ImportErrorBoundary } from './components/ImportErrorBoundary';
import { RecentlyDeletedView } from './components/RecentlyDeletedView';
import { SafeDeleteModal } from './components/SafeDeleteModal';
import { PermanentDeleteModal } from './components/PermanentDeleteModal';
import { ClientDeactivateModal } from './components/ClientDeactivateModal';
import { ClientManagementView } from './components/ClientManagementView';
import { ClientDetailView } from './components/ClientDetailView';
import { ClientFormModal } from './components/ClientFormModal';
import { ClientStatusToggleModal } from './components/ClientStatusToggleModal';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AddDispatchModal, DispatchPrefillData } from './components/AddDispatchModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { DriverDeliveryView } from './components/DriverDeliveryView';
import { CoordinatorPortalView } from './components/CoordinatorPortalView';
import { TruckPlannerView } from './components/TruckPlannerView';
import { DispatcherPortalView } from './components/DispatcherPortalView';
import { AccessDeniedView } from './components/AccessDeniedView';
import { RoleNotConfiguredView } from './components/RoleNotConfiguredView';
import { AssignDriverModal, DeliveryAssignTarget } from './components/AssignDriverModal';
import { PodReturningView } from './components/PodReturningView';
import { DataAuditView } from './components/DataAuditView';
import { UserManagementView } from './components/UserManagementView';
import { DEFAULT_ENCODER_USER } from './data/mockData';
import { getAuthSession, clearAuthSession, isClientAssignedToUser, getDefaultUserForRole, saveAuthSession } from './data/userAccounts';
import { 
  normalizeUserRole, 
  isCoordinatorRole,
  isTabAuthorized, 
  getDefaultTabForRole, 
  getUserRoleDisplayLabel,
  getRolePermissions
} from './utils/roleUtils';
import { CheckCircle2, X, RefreshCw, AlertCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useData } from './context/DataContext';

import { 
  NavigationTab, 
  DispatchRecord, 
  ShipmentRecord, 
  ClientSummary, 
  DispatchStatus, 
  ShipmentStatus, 
  PhilippineArea, 
  ForwardingProgressiveRecord,
  OperationalRecordType,
  ForwardingDispatchNotification,
  UserRole
} from './types';

export default function App() {
  // 1. Auth State: Login Screen is shown first or restored from active session
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const session = getAuthSession();
    return Boolean(session && session.isActive);
  });
  const [authView, setAuthView] = useState<'login' | 'create-account'>('login');

  // 2. Navigation State: Initial tab based on authenticated role
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    const session = getAuthSession();
    return getDefaultTabForRole(session?.userRole);
  });
  const [selectedHub, setSelectedHub] = useState('OFII Central Hub (Paranaque)');

  // 3. Centralized Database Context (Supabase Cloud + Cross-Tab Sync)
  const {
    clients,
    dispatches,
    shipments,
    forwardingRecords,
    notifications: dispatchNotifications,
    podNotifications,
    truckPlannerNotifications,
    individualDeliveries,
    truckRuns,
    currentUserProfile,
    setCurrentUserProfile,
    assignDriverToDelivery,
    isLoading,
    loadingMessage,
    errorMessage,
    addClient,
    updateClient,
    toggleClientStatus,
    addDispatch,
    updateDispatch,
    addForwardingRecord,
    bulkImportForwardingRecords,
    bulkImportDispatches,
    updateForwardingRecord,
    updateShipment,
    softDeleteRecord,
    restoreRecord,
    permanentDeleteRecord,
    dismissNotification,
    completeNotification,
    markPodNotificationAsRead,
    markAllPodNotificationsAsRead,
    markTruckPlannerNotificationAsRead,
    markAllTruckPlannerNotificationsAsRead,
    encoderNotifications,
    markEncoderNotificationAsRead,
    markAllEncoderNotificationsAsRead,
    showSuccessToast
  } = useData();

  // 4. Confirmation Toast / Alert
  const [confirmationToast, setConfirmationToast] = useState<{ 
    message: string; 
    subtext?: string;
    type?: 'success' | 'error' | 'warning';
  } | null>(null);

  const [isPodNotificationModalOpen, setIsPodNotificationModalOpen] = useState(false);
  const [truckPlannerBatchFilter, setTruckPlannerBatchFilter] = useState<string | undefined>(undefined);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // 4b. Driver Assignment Modal State
  const [assignDriverTarget, setAssignDriverTarget] = useState<DeliveryAssignTarget | null>(null);

  // 5. Detailed View / Modal State
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchRecord | null>(null);
  const [isDispatchDetailEditMode, setIsDispatchDetailEditMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [isAddDispatchOpen, setIsAddDispatchOpen] = useState(false);
  const [prefillDispatchData, setPrefillDispatchData] = useState<DispatchPrefillData | null>(null);

  // 6. Forwarding Module Modal & Record Selection State
  const [selectedForwardingRecord, setSelectedForwardingRecord] = useState<ForwardingProgressiveRecord | null>(null);
  const [isAddForwardingOpen, setIsAddForwardingOpen] = useState(false);
  const [excelImportTarget, setExcelImportTarget] = useState<'forwarding' | 'dispatch' | null>(null);
  const [isForwardingDetailEditMode, setIsForwardingDetailEditMode] = useState(false);

  // 7. Safe Delete & Recovery Modal States
  const [safeDeleteTarget, setSafeDeleteTarget] = useState<{
    id: string;
    type: OperationalRecordType;
    identifier?: string;
    clientName?: string;
    additionalInfo?: string;
  } | null>(null);

  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{
    id: string;
    type: OperationalRecordType;
    identifier?: string;
    clientName?: string;
  } | null>(null);

  const [clientDeactivateTarget, setClientDeactivateTarget] = useState<ClientSummary | null>(null);

  // 8. Client Management Specific State
  const [selectedManagementClient, setSelectedManagementClient] = useState<ClientSummary | null>(null);
  const [clientFormModal, setClientFormModal] = useState<{
    isOpen: boolean;
    clientToEdit: ClientSummary | null;
    initialClientName?: string;
  }>({ isOpen: false, clientToEdit: null });
  const [clientStatusToggle, setClientStatusToggle] = useState<{
    isOpen: boolean;
    client: ClientSummary | null;
    mode: 'deactivate' | 'reactivate';
  }>({ isOpen: false, client: null, mode: 'deactivate' });

  // Calculate live count of deleted records across all categories
  const deletedCount = useMemo(() => {
    const deletedDispatches = dispatches.filter(d => d.isDeleted).length;
    const deletedShipments = shipments.filter(s => s.isDeleted).length;
    const deletedForwarding = forwardingRecords.filter(f => f.isDeleted).length;
    const deletedClients = clients.filter(c => c.isDeleted).length;
    return deletedDispatches + deletedShipments + deletedForwarding + deletedClients;
  }, [dispatches, shipments, forwardingRecords, clients]);

  // Calculate live count of pending forwarding->dispatch notifications
  const pendingNotificationsCount = useMemo(() => {
    return dispatchNotifications.filter(n => !n.isDismissed && (n.status === 'NEW' || n.status === 'IN PROGRESS')).length;
  }, [dispatchNotifications]);

  // Sync active auth session on mount
  React.useEffect(() => {
    const session = getAuthSession();
    if (session && session.isActive) {
      if (currentUserProfile.employeeId !== session.employeeId) {
        setCurrentUserProfile(session);
      }
      if (!isTabAuthorized(session, currentTab)) {
        setCurrentTab(getDefaultTabForRole(session));
      }
    }
  }, []);

  const userRole = (currentUserProfile?.userRole || '') as UserRole;
  const canonicalRole = normalizeUserRole(currentUserProfile);
  const rolePermissions = useMemo(() => getRolePermissions(currentUserProfile), [currentUserProfile]);
  const isViewerReadOnly = canonicalRole === 'VIEWER' || rolePermissions.isReadOnly;

  const showPermissionDeniedToast = (customSubtext?: string) => {
    setConfirmationToast({
      message: 'Permission Denied',
      subtext: customSubtext || 'You do not have permission to modify this information.',
      type: 'error',
    });
    setTimeout(() => setConfirmationToast(null), 4500);
  };

  React.useEffect(() => {
    if (isLoggedIn && currentUserProfile) {
      if (currentUserProfile.approvalStatus === 'PENDING' || currentUserProfile.approvalStatus === 'REJECTED') {
        handleLogout();
        return;
      }
      if (!isTabAuthorized(currentUserProfile, currentTab)) {
        setCurrentTab(getDefaultTabForRole(currentUserProfile));
      }
    }
  }, [currentUserProfile, isLoggedIn, currentTab]);

  // Handlers
  const handleLogin = () => {
    setIsLoggedIn(true);
    const session = getAuthSession() || currentUserProfile;
    setCurrentTab(getDefaultTabForRole(session));
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    setAuthView('login');
    setSelectedDispatch(null);
    setSelectedClientId(null);
    setSelectedShipment(null);
    setSelectedManagementClient(null);
    setIsMobileNavOpen(false);
  };

  // Role-Scoped Collections (Coordinators are strictly restricted to assigned accounts)
  const isCoordinator = isCoordinatorRole(currentUserProfile);
  const roleScopedClients = useMemo(() => {
    if (isCoordinator) {
      return clients.filter(c => isClientAssignedToUser(currentUserProfile, c.name));
    }
    return clients;
  }, [clients, currentUserProfile, isCoordinator]);

  const roleScopedForwardingRecords = useMemo(() => {
    if (isCoordinator) {
      return forwardingRecords.filter(f => isClientAssignedToUser(currentUserProfile, f.client));
    }
    return forwardingRecords;
  }, [forwardingRecords, currentUserProfile, isCoordinator]);

  const roleScopedDispatches = useMemo(() => {
    if (isCoordinator) {
      return dispatches.filter(d => isClientAssignedToUser(currentUserProfile, d.clientName));
    }
    return dispatches;
  }, [dispatches, currentUserProfile, isCoordinator]);

  const roleScopedShipments = useMemo(() => {
    if (isCoordinator) {
      return shipments.filter(s => isClientAssignedToUser(currentUserProfile, s.client));
    }
    return shipments;
  }, [shipments, currentUserProfile, isCoordinator]);

  const handleNavigate = (tab: NavigationTab) => {
    if (!isTabAuthorized(currentUserProfile, tab)) {
      console.warn(`[Navigation Guard] Access to ${tab} denied for role ${currentUserProfile?.userRole}`);
      return;
    }
    setCurrentTab(tab);
    setIsMobileNavOpen(false);
    // If switching main tabs, clear granular views
    if (tab !== 'clients') {
      setSelectedShipment(null);
    }
    if (tab !== 'client_management') {
      setSelectedManagementClient(null);
    }
  };

  const handleSelectClientFromDashboard = (clientName: string) => {
    const client = clients.find(c => c.name.toLowerCase().includes(clientName.toLowerCase()));
    if (client) {
      setSelectedClientId(client.id);
    } else {
      setSelectedClientId(null);
    }
    setSelectedShipment(null);
    setCurrentTab('clients');
  };

  // Maps a dispatch status to standard shipment monitoring status
  const mapDispatchStatusToShipmentStatus = (s: DispatchStatus): ShipmentStatus => {
    switch (s) {
      case 'Delivered': return 'Delivered';
      case 'In Transit': return 'In Transit';
      case 'Departed': return 'In Transit';
      case 'Arrived at Hub': return 'In Transit';
      case 'Delayed': return 'Delayed';
      case 'In Loading': return 'Booked';
      case 'Pending Pickup': return 'Booked';
      default: return 'In Transit';
    }
  };

  // ---------------------------------------------------------------------------
  // SAFE DELETE & RECOVERY WORKFLOW HANDLERS (Connected to Database)
  // ---------------------------------------------------------------------------

  // Permission-Guarded Excel Import Opener
  const handleOpenExcelImport = (target: 'forwarding' | 'dispatch') => {
    if (isViewerReadOnly || !rolePermissions.canImportExcel) {
      showPermissionDeniedToast('Excel Import is disabled for Viewer accounts.');
      return;
    }
    setExcelImportTarget(target);
  };

  // 1. Request Move to Trash (Safe Delete Modal triggers) - RBAC Enforced
  const handleRequestDeleteDispatch = (dispatch: DispatchRecord) => {
    if (isViewerReadOnly || rolePermissions.canDeleteRecords === 'No') {
      showPermissionDeniedToast();
      return;
    }
    setSafeDeleteTarget({
      id: dispatch.id,
      type: 'dispatch',
      identifier: dispatch.podNumber || dispatch.manifestNumber || dispatch.id,
      clientName: dispatch.clientName,
      additionalInfo: `Destination: ${dispatch.destination} • Truck: ${dispatch.plateNumber} • Driver: ${dispatch.driverName || 'OFII Fleet Driver'}`,
    });
  };

  const handleRequestDeleteShipment = (shipment: ShipmentRecord) => {
    if (isViewerReadOnly || rolePermissions.canDeleteRecords === 'No') {
      showPermissionDeniedToast();
      return;
    }
    setSafeDeleteTarget({
      id: shipment.id,
      type: 'shipment',
      identifier: shipment.podNumber || shipment.awbNumber || shipment.id,
      clientName: shipment.client,
      additionalInfo: `${shipment.itemDescription} • Mode: ${shipment.modeOfShipment} • Status: ${shipment.status}`,
    });
  };

  const handleRequestDeleteForwarding = (record: ForwardingProgressiveRecord) => {
    if (isViewerReadOnly || rolePermissions.canDeleteRecords === 'No') {
      showPermissionDeniedToast();
      return;
    }
    setSafeDeleteTarget({
      id: record.id,
      type: 'forwarding_report',
      identifier: record.referenceNumber,
      clientName: record.client,
      additionalInfo: `Consignee: ${record.consignee} (${record.destinationCode}) • ${record.quantity} ${record.unit || 'Units'}`,
    });
  };

  const handleRequestDeleteClient = (client: ClientSummary) => {
    if (isViewerReadOnly || rolePermissions.canDeleteRecords === 'No') {
      showPermissionDeniedToast();
      return;
    }
    const clientShipmentHistory = shipments.filter(
      s => s.clientId === client.id || s.client.toLowerCase() === client.name.toLowerCase()
    );
    const clientForwardingHistory = forwardingRecords.filter(
      f => f.clientId === client.id || f.client.toLowerCase() === client.name.toLowerCase()
    );

    const totalHistoricalRecords = clientShipmentHistory.length + clientForwardingHistory.length;

    if (totalHistoricalRecords > 0) {
      setClientDeactivateTarget(client);
    } else {
      setSafeDeleteTarget({
        id: client.id,
        type: 'client',
        identifier: client.code,
        clientName: client.name,
        additionalInfo: `Account Manager: ${client.accountManager} • Contact: ${client.primaryContact}`,
      });
    }
  };

  // 2. Execute Move to Trash (Soft Delete in Database)
  const handleConfirmMoveToTrash = async () => {
    if (!safeDeleteTarget) return;
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      setSafeDeleteTarget(null);
      return;
    }

    const { id, type, identifier, clientName } = safeDeleteTarget;

    try {
      await softDeleteRecord(id, type, 'Moved to Trash via Operations Console');
      if (selectedDispatch?.id === id) setSelectedDispatch(null);
      if (selectedShipment?.id === id) setSelectedShipment(null);
      if (selectedForwardingRecord?.id === id) setSelectedForwardingRecord(null);
      if (selectedClientId === id) setSelectedClientId(null);

      setSafeDeleteTarget(null);

      setConfirmationToast({
        message: 'Record moved to Recently Deleted.',
        subtext: `"${identifier || clientName}" has been removed from active lists and can be restored from the Trash section at any time.`,
        type: 'success',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
    } catch (err: any) {
      setConfirmationToast({
        message: 'Unable to delete record',
        subtext: err?.message || 'Please check your connection and operational permissions.',
        type: 'error',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
    }
  };

  // 3. Execute Restore from Trash in Database
  const handleRestoreFromTrash = async (type: OperationalRecordType, id: string) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    try {
      await restoreRecord(id, type);
      setConfirmationToast({
        message: 'Record restored to active operational list.',
        subtext: `The ${type.replace('_', ' ')} record has been restored with all relationships intact.`,
        type: 'success',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
    } catch (err: any) {
      setConfirmationToast({
        message: 'Unable to restore record',
        subtext: err?.message || 'Please check your connection and operational permissions.',
        type: 'error',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
    }
  };

  // 4. Request Permanent Delete (Modal opener) - Strictly Admin Only
  const handleRequestPermanentDelete = (
    type: OperationalRecordType, 
    id: string, 
    identifier: string, 
    clientName: string
  ) => {
    if (isViewerReadOnly || rolePermissions.canDeleteRecords !== 'Full') {
      showPermissionDeniedToast('Permanent record purge is strictly restricted to System Administrators.');
      return;
    }
    setPermanentDeleteTarget({ id, type, identifier, clientName });
  };

  // 5. Execute Permanent Delete (Purge from Database)
  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      setPermanentDeleteTarget(null);
      return;
    }

    const { id, type, identifier, clientName } = permanentDeleteTarget;

    try {
      await permanentDeleteRecord(id, type);
      setPermanentDeleteTarget(null);

      setConfirmationToast({
        message: 'Record permanently deleted.',
        subtext: `"${identifier || clientName}" has been permanently purged from the database.`,
        type: 'success',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
    } catch (err: any) {
      setConfirmationToast({
        message: 'Unable to purge record',
        subtext: err?.message || 'Please check your connection and administrator permissions.',
        type: 'error',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
    }
  };

  // 6. Client Deactivation & Reactivation in Database
  const handleConfirmDeactivateClient = async (clientId: string, reason?: string) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      setClientDeactivateTarget(null);
      return;
    }
    await toggleClientStatus(clientId, reason || 'Deactivated by Operations');
    setClientDeactivateTarget(null);

    const client = clients.find(c => c.id === clientId);
    setConfirmationToast({
      message: 'Client account deactivated.',
      subtext: `Client "${client?.name || clientId}" is now marked as Deactivated. All historical shipment and forwarding records remain preserved in the system.`,
      type: 'success',
    });
    setTimeout(() => setConfirmationToast(null), 5000);
  };

  const handleReactivateClient = async (clientId: string) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    await toggleClientStatus(clientId);

    const client = clients.find(c => c.id === clientId);
    setConfirmationToast({
      message: 'Client account reactivated.',
      subtext: `Client "${client?.name || clientId}" is now active and available for new dispatches.`,
      type: 'success',
    });
    setTimeout(() => setConfirmationToast(null), 5000);
  };

  // ---------------------------------------------------------------------------
  // OPERATIONAL CREATION & UPDATE HANDLERS (Connected to Supabase)
  // ---------------------------------------------------------------------------

  // Add Dispatch Record with Automatic Client & Shipment Synchronization
  const handleAddDispatchRecord = async (newDispatch: DispatchRecord, originNotificationId?: string) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      throw new Error('You do not have permission to modify this information.');
    }

    // 0. Duplicate Protection Guard
    const existingDuplicate = dispatches.find(
      d => !d.isDeleted && d.podNumber.trim().toLowerCase() === newDispatch.podNumber.trim().toLowerCase()
    );
    if (existingDuplicate) {
      setConfirmationToast({
        message: 'Duplicate Dispatch Prevented.',
        subtext: `A dispatch record with POD ${newDispatch.podNumber} already exists in the system.`,
        type: 'warning',
      });
      setTimeout(() => setConfirmationToast(null), 5000);
      throw new Error(`A dispatch record with POD ${newDispatch.podNumber} already exists in the system.`);
    }

    try {
      // 1. Ensure client is in database
      const existingClient = clients.find(
        c => c.name.toLowerCase() === newDispatch.clientName.toLowerCase()
      );

      let targetClientName = newDispatch.clientName;
      if (!existingClient) {
        const saved = await addClient({
          name: newDispatch.clientName,
          address: `${newDispatch.destination}, NCR`,
          area: 'NCR',
        });
        targetClientName = saved.name;
      }

      // 2. Add Dispatch to database/state
      await addDispatch({
        ...newDispatch,
        clientName: targetClientName,
      });

      // 3. Complete linked notification if applicable
      if (originNotificationId) {
        await completeNotification(originNotificationId, newDispatch.id);
      }

      setPrefillDispatchData(null);
    } catch (err: any) {
      console.error('Error saving dispatch record:', err);
      showPermissionDeniedToast(err?.message || 'Unable to save Dispatch record.');
      throw new Error(err?.message || 'Unable to save Dispatch record. Please try again.');
    }
  };

  // Add / Edit Shared Client Handler
  const handleAddNewClient = async (newClient: ClientSummary) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    try {
      await addClient(newClient);
    } catch (err: any) {
      showPermissionDeniedToast(err?.message || 'Unable to add client.');
    }
  };

  const handleSaveClientFromForm = async (savedClient: ClientSummary) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    const isEdit = clients.some(c => c.id === savedClient.id);
    try {
      if (isEdit) {
        await updateClient(savedClient);
        if (selectedManagementClient?.id === savedClient.id) {
          setSelectedManagementClient(savedClient);
        }
      } else {
        await addClient(savedClient);
      }
    } catch (err: any) {
      showPermissionDeniedToast(err?.message || 'Unable to save client.');
    }
  };

  const handleOpenAddClientModal = (initialName?: string) => {
    if (isViewerReadOnly || (rolePermissions.canManageClients !== 'Full' && rolePermissions.canManageClients !== 'Operational')) {
      showPermissionDeniedToast();
      return;
    }
    setClientFormModal({ isOpen: true, clientToEdit: null, initialClientName: typeof initialName === 'string' ? initialName : undefined });
  };

  const handleOpenEditClientModal = (client: ClientSummary) => {
    if (isViewerReadOnly || rolePermissions.canManageClients === 'No' || rolePermissions.canManageClients === 'View') {
      showPermissionDeniedToast();
      return;
    }
    setClientFormModal({ isOpen: true, clientToEdit: client });
  };

  const handleOpenDeactivateClientModal = (client: ClientSummary) => {
    if (isViewerReadOnly || rolePermissions.canManageClients !== 'Full') {
      showPermissionDeniedToast();
      return;
    }
    setClientStatusToggle({ isOpen: true, client, mode: 'deactivate' });
  };

  const handleOpenReactivateClientModal = (client: ClientSummary) => {
    if (isViewerReadOnly || rolePermissions.canManageClients !== 'Full') {
      showPermissionDeniedToast();
      return;
    }
    setClientStatusToggle({ isOpen: true, client, mode: 'reactivate' });
  };

  const handleConfirmClientStatusToggle = async (clientId: string) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      setClientStatusToggle({ isOpen: false, client: null, mode: 'deactivate' });
      return;
    }
    const isDeactivating = clientStatusToggle.mode === 'deactivate';
    await toggleClientStatus(clientId);
    setClientStatusToggle({ isOpen: false, client: null, mode: 'deactivate' });

    const targetClient = clients.find(c => c.id === clientId);
    if (selectedManagementClient?.id === clientId && targetClient) {
      setSelectedManagementClient({ ...targetClient, isDeactivated: isDeactivating });
    }
  };

  // Handle Updates in Daily Dispatch
  const handleUpdateDispatches = async (updated: DispatchRecord[]) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    try {
      for (const d of updated) {
        await updateDispatch(d);
      }
    } catch (err: any) {
      console.error('Error batch updating dispatches:', err);
      showPermissionDeniedToast(err?.message || 'Unable to update dispatches.');
    }
  };

  // Handle Save Single Dispatch from Details Modal
  const handleSaveSingleDispatch = async (updatedDispatch: DispatchRecord) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    try {
      await updateDispatch(updatedDispatch);
      setSelectedDispatch(updatedDispatch);
    } catch (err: any) {
      showPermissionDeniedToast(err?.message || 'Unable to update dispatch.');
    }
  };

  // Handle Updates in Client Shipment
  const handleUpdateShipment = async (updatedShipment: ShipmentRecord) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    try {
      await updateShipment(updatedShipment);
      setSelectedShipment(updatedShipment);
    } catch (err: any) {
      showPermissionDeniedToast(err?.message || 'Unable to update shipment.');
    }
  };

  // Forwarding Progressive Report Handlers with Shared Client Sync
  const handleAddForwardingRecord = async (newRecord: ForwardingProgressiveRecord, clientName: string) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    const rawClientName = (clientName || newRecord.client || 'General Client').trim();
    try {
      // Ensure client exists
      const existing = clients.find(c => c.name.toLowerCase() === rawClientName.toLowerCase());
      let targetClientId = existing?.id;
      if (!existing) {
        const saved = await addClient({
          name: rawClientName,
          area: newRecord.area,
        });
        targetClientId = saved?.id;
      }

      await addForwardingRecord({
        ...newRecord,
        client: rawClientName,
        clientId: targetClientId,
      });
    } catch (err: any) {
      console.error('Error adding forwarding record:', err);
      showPermissionDeniedToast(err?.message || 'Unable to add forwarding record.');
    }
  };

  // Handler: Complete Dispatch from Forwarding Notification
  const handleCompleteDispatchFromNotification = (notification: ForwardingDispatchNotification) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    // 1. Set prefilled data for the Add Dispatch modal
    setPrefillDispatchData({
      clientName: notification.client,
      consignee: notification.consignee,
      podNumber: notification.podNumber,
      referenceNumber: notification.referenceNumber,
      deliveryDate: notification.deliveryDate,
      destination: notification.destination,
      quantity: notification.quantity,
      unit: notification.unit,
      modeOfShipment: notification.modeOfShipment,
      area: notification.area,
      notificationId: notification.id,
    });

    // 2. Open the modal
    setIsAddDispatchOpen(true);
  };

  // Handler: Dismiss notification in database
  const handleDismissDispatchNotification = async (notificationId: string) => {
    await dismissNotification(notificationId);
  };

  const handleUpdateForwardingRecord = async (updatedRecord: ForwardingProgressiveRecord) => {
    if (isViewerReadOnly) {
      showPermissionDeniedToast();
      return;
    }
    try {
      await updateForwardingRecord(updatedRecord);
      setSelectedForwardingRecord(updatedRecord);
    } catch (err: any) {
      showPermissionDeniedToast(err?.message || 'Unable to update forwarding record.');
    }
  };

  // 1. If not logged in, render corporate Login Screen or Create Account Screen
  if (!isLoggedIn) {
    if (authView === 'create-account') {
      return (
        <CreateAccountScreen 
          onBackToLogin={() => setAuthView('login')} 
        />
      );
    }
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onCreateAccount={() => setAuthView('create-account')} 
      />
    );
  }

  // 1a. Role-Based Safety Guard: If logged in but role is missing or unconfigured, show RoleNotConfiguredView
  if (!canonicalRole) {
    return (
      <RoleNotConfiguredView 
        currentUserProfile={currentUserProfile} 
        onLogout={handleLogout} 
        onSelectRole={(chosenRole) => {
          const defaultUser = getDefaultUserForRole(chosenRole);
          setCurrentUserProfile(defaultUser);
        }}
      />
    );
  }

  // 1b. Role-Based Routing: If logged in as a Driver, render the dedicated Driver Delivery Portal
  if (canonicalRole === 'DRIVER' || canonicalRole === 'DRIVER_HELPER') {
    return (
      <DriverDeliveryView 
        onLogout={handleLogout}
        onSwitchToOffice={() => {
          setCurrentUserProfile(getDefaultUserForRole('ENCODER'));
        }}
      />
    );
  }

  // Selected client name for header breadcrumb
  const currentClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-row antialiased font-sans text-slate-800 relative w-full overflow-x-hidden">
      
      {/* Persistent Left Sidebar (Desktop) + Accessible Collapsible Drawer (Mobile) */}
      <Sidebar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        unreadDispatchesCount={dispatches.filter(d => !d.isDeleted).length}
        deletedCount={deletedCount}
        pendingNotificationsCount={pendingNotificationsCount}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Sticky Top Header */}
        <Header
          currentTab={currentTab}
          clientSelectedName={currentClient?.name}
          selectedHub={selectedHub}
          onSelectHub={setSelectedHub}
          onOpenNotifications={() => setIsPodNotificationModalOpen(true)}
          onNavigateTab={handleNavigate}
          onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
          isMobileNavOpen={isMobileNavOpen}
        />

        {/* Global Toast Confirmation Notification */}
        {confirmationToast && (
          <div className={`fixed top-16 right-3 sm:right-6 z-50 max-w-md text-white p-4 rounded-lg shadow-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            confirmationToast.type === 'error'
              ? 'bg-slate-950 border-rose-500/80 shadow-rose-950/40'
              : confirmationToast.type === 'warning'
              ? 'bg-slate-950 border-amber-500/80 shadow-amber-950/40'
              : 'bg-slate-900 border-slate-700'
          }`}>
            {confirmationToast.type === 'error' ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : confirmationToast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold tracking-wide uppercase ${
                confirmationToast.type === 'error'
                  ? 'text-rose-300'
                  : confirmationToast.type === 'warning'
                  ? 'text-amber-300'
                  : 'text-white'
              }`}>
                {confirmationToast.message}
              </p>
              {confirmationToast.subtext && (
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {confirmationToast.subtext}
                </p>
              )}
            </div>
            <button
              onClick={() => setConfirmationToast(null)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Main View Container */}
        <main className="flex-1 overflow-y-auto px-2.5 sm:px-6 py-3 sm:py-6 bg-slate-100/90 w-full min-w-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            
            {/* RBAC ACCESS GUARD: Unauthorized Tab Attempt */}
            {!isTabAuthorized(currentUserProfile, currentTab) ? (
              <AccessDeniedView
                userRole={currentUserProfile?.userRole || 'ADMIN'}
                user={currentUserProfile}
                attemptedTab={currentTab}
                onReturnToAuthorizedPortal={() => {
                  setCurrentTab(getDefaultTabForRole(currentUserProfile?.userRole));
                }}
                onNavigateToDashboard={() => {
                  setCurrentTab('dashboard');
                }}
              />
            ) : (
              <>
                {/* VIEWER PORTAL READ-ONLY BANNER */}
                {canonicalRole === 'VIEWER' && (
                  <div className="mb-4 bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
                      <div>
                        <span className="font-bold text-blue-200 uppercase tracking-wider text-[11px] block sm:inline mr-2">
                          Viewer Portal (Read-Only Mode)
                        </span>
                        <span className="text-slate-300 text-xs">
                          Operational data is accessible for review, search, and audit. Creating, modifying, deleting records, and importing files are disabled.
                        </span>
                      </div>
                    </div>
                    <span className="hidden md:inline-block text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 shrink-0">
                      Audit Mode Active
                    </span>
                  </div>
                )}
                {/* TAB: COORDINATOR DEDICATED PORTAL */}
                {currentTab === 'coordinator_portal' && (
                  <CoordinatorPortalView
                    currentUser={currentUserProfile}
                    forwardingRecords={roleScopedForwardingRecords}
                    dispatches={roleScopedDispatches}
                    shipments={roleScopedShipments}
                    clients={roleScopedClients}
                    onSelectForwardingRecord={(rec) => {
                      setSelectedForwardingRecord(rec);
                      setIsForwardingDetailEditMode(false);
                      setCurrentTab('forwarding_report');
                    }}
                    onNavigateToForwarding={() => setCurrentTab('forwarding_report')}
                    onNavigateToShipments={() => setCurrentTab('clients')}
                  />
                )}

                {/* TAB: TRUCK PLANNER & DISPATCH GROUPING (DRIVER'S HEAD = TRUCK PLANNER) */}
                {(currentTab === 'truck_planner' || currentTab === 'driver_head_portal') && (
                  <TruckPlannerView 
                    initialBatchFilter={truckPlannerBatchFilter}
                    onClearInitialBatchFilter={() => setTruckPlannerBatchFilter(undefined)}
                  />
                )}

                {/* TAB: DISPATCHER DEDICATED PORTAL */}
                {currentTab === 'dispatcher_portal' && (
                  <DispatcherPortalView currentUserProfile={currentUserProfile} />
                )}

                {/* TAB 1: DASHBOARD */}
                {currentTab === 'dashboard' && (
                  <DashboardView
                    dispatches={roleScopedDispatches}
                    shipments={roleScopedShipments}
                    forwardingRecords={roleScopedForwardingRecords}
                    clients={roleScopedClients}
                    dispatchNotifications={dispatchNotifications}
                    podNotifications={podNotifications}
                    individualDeliveries={individualDeliveries}
                    truckRuns={truckRuns}
                    currentUserProfile={currentUserProfile}
                    onSelectDispatch={setSelectedDispatch}
                    onSelectShipment={(shipment) => {
                      setSelectedShipment(shipment);
                      setSelectedClientId(shipment.clientId || null);
                      setCurrentTab('clients');
                    }}
                    onSelectForwardingRecord={(rec) => {
                      setSelectedForwardingRecord(rec);
                      setIsForwardingDetailEditMode(false);
                      setCurrentTab('forwarding_report');
                    }}
                    onNavigate={handleNavigate}
                    onSelectClientFromDashboard={handleSelectClientFromDashboard}
                    onOpenAddDispatchModal={isViewerReadOnly ? undefined : () => {
                      setPrefillDispatchData(null);
                      setIsAddDispatchOpen(true);
                    }}
                    onOpenAddClientModal={isViewerReadOnly ? undefined : handleOpenAddClientModal}
                    onOpenImportModal={isViewerReadOnly ? undefined : ((target) => handleOpenExcelImport(target || 'forwarding'))}
                  />
                )}

                {/* TAB 2: DAILY DISPATCHING MONITORING */}
                {currentTab === 'dispatch' && (
                  <DailyDispatchView
                    dispatches={roleScopedDispatches}
                    onSelectDispatch={setSelectedDispatch}
                    onOpenAddModal={isViewerReadOnly ? undefined : () => {
                      setPrefillDispatchData(null);
                      setIsAddDispatchOpen(true);
                    }}
                    onOpenImportModal={isViewerReadOnly ? undefined : () => handleOpenExcelImport('dispatch')}
                    onUpdateDispatches={isViewerReadOnly ? undefined : handleUpdateDispatches}
                    onRequestDeleteDispatch={isViewerReadOnly ? undefined : handleRequestDeleteDispatch}
                    dispatchNotifications={dispatchNotifications}
                    onCompleteDispatchNotification={isViewerReadOnly ? undefined : handleCompleteDispatchFromNotification}
                    onDismissDispatchNotification={isViewerReadOnly ? undefined : handleDismissDispatchNotification}
                    clients={roleScopedClients}
                    onAssignDriver={isViewerReadOnly ? undefined : (record) => {
                      setAssignDriverTarget({
                        id: record.id,
                        podNumber: record.podNumber,
                        referenceNumber: record.manifestNumber,
                        client: record.clientName || 'General Client',
                        consignee: record.consignee,
                        area: record.deliveryArea || record.area || 'Luzon',
                        destination: record.destination,
                        plannedDeliveryDate: record.plannedDeliveryDate || record.deliveryDate,
                        quantity: record.quantityCasesBoxes,
                        unit: record.unit,
                        driverName: record.driverName || record.assignedDriver,
                        plateNumber: record.plateNumber,
                        truckProvider: record.truckProvider,
                      });
                    }}
                  />
                )}

                {/* TAB: CLIENT MANAGEMENT */}
                {currentTab === 'client_management' && (
                  <>
                    {selectedManagementClient ? (
                      <ClientDetailView
                        client={selectedManagementClient}
                        dispatches={roleScopedDispatches}
                        shipments={roleScopedShipments}
                        forwardingRecords={roleScopedForwardingRecords}
                        onBack={() => setSelectedManagementClient(null)}
                        onEditClient={handleOpenEditClientModal}
                        onDeactivateClient={handleOpenDeactivateClientModal}
                        onReactivateClient={handleOpenReactivateClientModal}
                        onDeleteClient={handleRequestDeleteClient}
                        onSelectDispatch={setSelectedDispatch}
                        onSelectShipment={setSelectedShipment}
                        onSelectForwardingRecord={(rec) => {
                          setSelectedForwardingRecord(rec);
                          setIsForwardingDetailEditMode(false);
                          setCurrentTab('forwarding_report');
                        }}
                      />
                    ) : (
                      <ClientManagementView
                        clients={roleScopedClients}
                        dispatches={roleScopedDispatches}
                        shipments={roleScopedShipments}
                        forwardingRecords={roleScopedForwardingRecords}
                        onSelectClient={setSelectedManagementClient}
                        onOpenAddClientModal={handleOpenAddClientModal}
                        onEditClient={handleOpenEditClientModal}
                        onDeactivateClient={handleOpenDeactivateClientModal}
                        onReactivateClient={handleOpenReactivateClientModal}
                        onDeleteClient={handleRequestDeleteClient}
                      />
                    )}
                  </>
                )}

                {/* TAB 3: CLIENT SHIPMENT MONITORING */}
                {currentTab === 'clients' && (
                  <>
                    {selectedShipment ? (
                      <ClientShipmentDetailView
                        shipment={selectedShipment}
                        onBack={() => setSelectedShipment(null)}
                        onUpdateShipment={isViewerReadOnly ? undefined : handleUpdateShipment}
                        onRequestDeleteShipment={isViewerReadOnly ? undefined : handleRequestDeleteShipment}
                      />
                    ) : (
                      <ClientShipmentView
                        shipments={roleScopedShipments}
                        clients={roleScopedClients}
                        selectedClientId={selectedClientId}
                        onSelectClient={setSelectedClientId}
                        onSelectShipment={setSelectedShipment}
                        onRequestDeleteShipment={isViewerReadOnly ? undefined : handleRequestDeleteShipment}
                      />
                    )}
                  </>
                )}

                {/* TAB 4: FORWARDING PROGRESSIVE REPORT */}
                {currentTab === 'forwarding_report' && (
                  <ForwardingProgressiveView
                    records={roleScopedForwardingRecords}
                    clients={roleScopedClients}
                    onSelectRecord={(rec) => {
                      setSelectedForwardingRecord(rec);
                      setIsForwardingDetailEditMode(false);
                    }}
                    onOpenAddModal={isViewerReadOnly ? undefined : () => setIsAddForwardingOpen(true)}
                    onOpenImportModal={isViewerReadOnly ? undefined : () => handleOpenExcelImport('forwarding')}
                    onRequestDeleteRecord={isViewerReadOnly ? undefined : handleRequestDeleteForwarding}
                    onEditRecord={isViewerReadOnly ? undefined : (rec) => {
                      setSelectedForwardingRecord(rec);
                      setIsForwardingDetailEditMode(true);
                    }}
                    onAssignDriver={isViewerReadOnly ? undefined : (rec) => {
                      setAssignDriverTarget({
                        id: rec.id,
                        podNumber: rec.podNumber,
                        referenceNumber: rec.referenceNumber,
                        client: rec.client,
                        consignee: rec.consignee,
                        area: rec.area,
                        destination: rec.destinationCode,
                        plannedDeliveryDate: rec.expectedDeliveryDate,
                        quantity: rec.quantity,
                        unit: rec.unit,
                        driverName: rec.driverName || rec.assignedDriver,
                        courier: rec.courier,
                      });
                    }}
                  />
                )}

                {/* TAB 5: LOGISTICS & SLA REPORTS */}
                {currentTab === 'reports' && (
                  <ReportsView onNavigateToAudit={() => setCurrentTab('data_audit')} />
                )}

                {/* TAB: DATA RELATIONSHIP & DUPLICATE AUDIT */}
                {currentTab === 'data_audit' && (
                  <DataAuditView />
                )}

                {/* TAB: POD RETURNING MODULE (ENCODER MODULE 3 - PHASE 5.1) */}
                {currentTab === 'pod_returning' && (
                  <PodReturningView
                    onNavigateToForwarding={() => setCurrentTab('forwarding_report')}
                  />
                )}

                {/* TAB 6: RECENTLY DELETED / TRASH (RECOVERY VIEW) */}
                {currentTab === 'trash' && (
                  <RecentlyDeletedView
                    dispatches={dispatches}
                    shipments={shipments}
                    forwardingRecords={forwardingRecords}
                    clients={clients}
                    onRestoreRecord={handleRestoreFromTrash}
                    onPermanentDeleteRecord={(type, id) => {
                      handleRequestPermanentDelete(type, id, id, 'Record');
                    }}
                    onRequestPermanentDelete={handleRequestPermanentDelete}
                  />
                )}

                {/* TAB 7: SETTINGS VIEW */}
                {currentTab === 'settings' && (
                  <SettingsView />
                )}

                {/* TAB: USER MANAGEMENT (ADMIN ONLY - PHASE 6.7) */}
                {currentTab === 'user_management' && (
                  <UserManagementView currentUser={currentUserProfile} />
                )}
              </>
            )}

          </div>
        </main>
      </div>

      {/* ---------------- MODALS & OVERLAYS ---------------- */}

      {/* 1. Add Daily Dispatch Modal */}
      {isAddDispatchOpen && !isViewerReadOnly && (
        <AddDispatchModal
          isOpen={isAddDispatchOpen}
          onClose={() => {
            setIsAddDispatchOpen(false);
            setPrefillDispatchData(null);
          }}
          onAdd={handleAddDispatchRecord}
          onAddDispatch={handleAddDispatchRecord}
          prefillData={prefillDispatchData}
          initialPrefillData={prefillDispatchData}
          clients={clients}
          onAddNewClient={handleAddNewClient}
          existingDispatches={dispatches}
          onViewExistingDispatch={setSelectedDispatch}
        />
      )}

      {/* 2. Dispatch Detail / Edit Modal */}
      {selectedDispatch && (
        <DispatchDetailModal
          dispatch={selectedDispatch}
          initialEditMode={isDispatchDetailEditMode && !isViewerReadOnly}
          onClose={() => {
            setSelectedDispatch(null);
            setIsDispatchDetailEditMode(false);
          }}
          onSelectClient={(cName) => {
            setSelectedClientId(cName);
            setCurrentTab('clients');
          }}
          onSaveDispatch={handleSaveSingleDispatch}
          onRequestDelete={handleRequestDeleteDispatch}
          clients={clients}
        />
      )}

      {/* 3. Add Forwarding Record Modal */}
      {isAddForwardingOpen && !isViewerReadOnly && (
        <AddForwardingRecordModal
          isOpen={isAddForwardingOpen}
          onClose={() => setIsAddForwardingOpen(false)}
          onAdd={handleAddForwardingRecord}
          onAddRecord={handleAddForwardingRecord}
          clients={clients}
          existingRecords={forwardingRecords}
          existingDispatches={dispatches}
          onOpenAddClientModal={handleOpenAddClientModal}
        />
      )}

      {/* 4. Forwarding Detail & Edit Modal */}
      {selectedForwardingRecord && (
        <ForwardingDetailModal
          record={selectedForwardingRecord}
          clients={clients}
          isOpen={!!selectedForwardingRecord}
          initialEditMode={isForwardingDetailEditMode && !isViewerReadOnly}
          onClose={() => {
            setSelectedForwardingRecord(null);
            setIsForwardingDetailEditMode(false);
          }}
          onSave={handleUpdateForwardingRecord}
          onSaveRecord={handleUpdateForwardingRecord}
          onRequestDelete={handleRequestDeleteForwarding}
        />
      )}

      {/* 5. Safe Delete (Soft Delete to Trash) Modal */}
      {safeDeleteTarget && (
        <SafeDeleteModal
          isOpen={!!safeDeleteTarget}
          recordType={safeDeleteTarget.type}
          recordIdentifier={safeDeleteTarget.identifier}
          clientName={safeDeleteTarget.clientName}
          additionalInfo={safeDeleteTarget.additionalInfo}
          onClose={() => setSafeDeleteTarget(null)}
          onConfirm={handleConfirmMoveToTrash}
        />
      )}

      {/* 6. Permanent Delete (Purge) Modal */}
      {permanentDeleteTarget && (
        <PermanentDeleteModal
          isOpen={!!permanentDeleteTarget}
          recordType={permanentDeleteTarget.type}
          recordIdentifier={permanentDeleteTarget.identifier}
          clientName={permanentDeleteTarget.clientName}
          onClose={() => setPermanentDeleteTarget(null)}
          onConfirm={handleConfirmPermanentDelete}
        />
      )}

      {/* 7. Client Deactivate instead of Delete Protection Modal */}
      {clientDeactivateTarget && (
        <ClientDeactivateModal
          isOpen={!!clientDeactivateTarget}
          client={clientDeactivateTarget}
          hasHistoricalRecords={true}
          historicalRecordsCount={
            dispatches.filter(d => d.clientName.toLowerCase() === clientDeactivateTarget.name.toLowerCase()).length +
            shipments.filter(s => s.clientId === clientDeactivateTarget.id || s.client.toLowerCase() === clientDeactivateTarget.name.toLowerCase()).length +
            forwardingRecords.filter(f => f.clientId === clientDeactivateTarget.id || f.client.toLowerCase() === clientDeactivateTarget.name.toLowerCase()).length
          }
          onClose={() => setClientDeactivateTarget(null)}
          onConfirmDeactivate={handleConfirmDeactivateClient}
        />
      )}

      {/* 8. Client Management: Create / Edit Client Modal */}
      {clientFormModal.isOpen && !isViewerReadOnly && (
        <ClientFormModal
          isOpen={clientFormModal.isOpen}
          clientToEdit={clientFormModal.clientToEdit}
          initialClientName={clientFormModal.initialClientName}
          onClose={() => setClientFormModal({ isOpen: false, clientToEdit: null, initialClientName: undefined })}
          onSaveClient={handleSaveClientFromForm}
        />
      )}

      {/* 9. Client Management: Deactivate / Reactivate Modal */}
      {clientStatusToggle.isOpen && clientStatusToggle.client && !isViewerReadOnly && (
        <ClientStatusToggleModal
          isOpen={clientStatusToggle.isOpen}
          client={clientStatusToggle.client}
          mode={clientStatusToggle.mode}
          onClose={() => setClientStatusToggle({ isOpen: false, client: null, mode: 'deactivate' })}
          onConfirm={handleConfirmClientStatusToggle}
        />
      )}

      {/* 10. Excel Bulk Import Modal (Forwarding & Daily Dispatching) */}
      {excelImportTarget && !isViewerReadOnly && (
        <ImportErrorBoundary
          isModal={true}
          title="Unable to display Import Preview. Please try again."
          fallbackMessage="An unexpected data issue was prevented from crashing the system. You can retry importing or cancel to return to the active monitoring view."
          onCancel={() => setExcelImportTarget(null)}
          onReset={() => {
            // Re-mounts ExcelImportModal cleanly
            const current = excelImportTarget;
            setExcelImportTarget(null);
            setTimeout(() => setExcelImportTarget(current), 50);
          }}
        >
          <ExcelImportModal
            isOpen={!!excelImportTarget}
            targetModule={excelImportTarget}
            onClose={() => setExcelImportTarget(null)}
            clients={clients}
            existingForwardingRecords={forwardingRecords}
            existingDispatches={dispatches}
            currentUserName="Operations Officer"
            onConfirmBulkImport={async (importedRecords, summary) => {
              if (excelImportTarget === 'dispatch') {
                await bulkImportDispatches(importedRecords, summary);
              } else {
                await bulkImportForwardingRecords(importedRecords, summary);
              }
            }}
            onOpenAddClientModal={handleOpenAddClientModal}
          />
        </ImportErrorBoundary>
      )}

      {/* 11. Office & POD Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isPodNotificationModalOpen}
        onClose={() => setIsPodNotificationModalOpen(false)}
        podNotifications={podNotifications}
        truckPlannerNotifications={truckPlannerNotifications}
        encoderNotifications={encoderNotifications}
        individualDeliveries={individualDeliveries}
        truckRuns={truckRuns}
        onMarkAsRead={markPodNotificationAsRead}
        onMarkAllAsRead={markAllPodNotificationsAsRead}
        onMarkTruckPlannerAsRead={markTruckPlannerNotificationAsRead}
        onMarkAllTruckPlannerAsRead={markAllTruckPlannerNotificationsAsRead}
        onMarkEncoderAsRead={markEncoderNotificationAsRead}
        onMarkAllEncoderAsRead={markAllEncoderNotificationsAsRead}
        onSelectEncoderNotification={(notif) => {
          markEncoderNotificationAsRead(notif.id);
          // Look up corresponding Daily Dispatching Monitoring record
          const foundDispatch = dispatches.find((d) =>
            (notif.dispatchRecordId && d.id === notif.dispatchRecordId) ||
            d.id === notif.deliveryId ||
            d.id === notif.individualDeliveryId ||
            (notif.individualDeliveryPod && d.podNumber === notif.individualDeliveryPod) ||
            (notif.truckDispatchPod && d.podNumber === notif.truckDispatchPod) ||
            (notif.deliveryId && d.manifestNumber === notif.deliveryId) ||
            (notif.truckDispatchNumber && d.manifestNumber === notif.truckDispatchNumber)
          );

          if (foundDispatch) {
            setSelectedDispatch(foundDispatch);
            setIsDispatchDetailEditMode(!isViewerReadOnly);
            setCurrentTab('dispatch');
          } else {
            // Find individual delivery and generate matching DispatchRecord
            const ind = individualDeliveries.find(d => d.id === notif.individualDeliveryId || d.deliveryId === notif.deliveryId);
            if (ind) {
              const syntheticDispatch: DispatchRecord = {
                id: ind.id,
                deliveryDate: ind.rdd || new Date().toISOString().split('T')[0],
                plannedDeliveryDate: ind.rdd || new Date().toISOString().split('T')[0],
                clientName: ind.client,
                deliveryArea: (ind.area as any) || 'Luzon',
                area: (ind.area as any) || 'Luzon',
                podNumber: ind.individualDeliveryPod || ind.truckDispatchPod || ind.deliveryId,
                quantityCasesBoxes: ind.quantity || 1,
                unit: ind.unit || 'cases',
                deliveryType: ((ind as any).deliveryType as any) || 'FTL',
                destination: ind.destination || ind.destinationCode || ind.area,
                consignee: ind.consignee,
                truckProvider: ind.truckName || 'OFII Dedicated Transport',
                plateNumber: ind.plateNumber || '',
                timeArrived: ind.timeArrived,
                truckArrivalTime: ind.timeArrived,
                startLoadingTime: ind.startLoadingTime,
                loadingStartTime: ind.startLoadingTime,
                endLoadingTime: ind.endLoadingTime,
                loadingEndTime: ind.endLoadingTime,
                actualDepartureTime: ind.actualDeparture,
                departureTime: ind.actualDeparture,
                manifestNumber: ind.referenceNumber || ind.truckRunNumber || ind.deliveryId,
                remarks: ind.remarks || '',
                status: ind.dispatchOperationalStatus === 'DEPARTED' ? 'Departed' : (ind.dispatchOperationalStatus === 'LOADING COMPLETED' || ind.dispatchOperationalStatus === 'LOADING' ? 'In Loading' : (ind.dispatchOperationalStatus === 'ARRIVED' ? 'Arrived at Hub' : 'In Loading')),
                driverName: ind.driver || '',
                assignedDriver: ind.driver || '',
                helperName: ind.helper || '',
                assignedHelper: ind.helper || '',
              };
              setSelectedDispatch(syntheticDispatch);
              setIsDispatchDetailEditMode(!isViewerReadOnly);
              setCurrentTab('dispatch');
            }
          }
          setIsPodNotificationModalOpen(false);
        }}
        onNavigateToTruckPlanner={(batchName) => {
          if (canonicalRole === 'TRUCK_PLANNER' || canonicalRole === 'ADMIN' || userRole === 'truck_planner' || (userRole as string) === 'driver_head') {
            setTruckPlannerBatchFilter(batchName);
            setCurrentTab('truck_planner');
          }
        }}
        onNavigateToAccountManagement={() => handleNavigate('user_management')}
        userRole={userRole}
        onSelectRecord={(recordId) => {
          const found = forwardingRecords.find((r) => r.id === recordId);
          if (found) {
            setSelectedForwardingRecord(found);
            setIsForwardingDetailEditMode(false);
            setCurrentTab('forwarding_report');
          }
        }}
      />

      {/* 12. Driver Assignment Modal */}
      {assignDriverTarget && !isViewerReadOnly && (
        <AssignDriverModal
          isOpen={!!assignDriverTarget}
          onClose={() => setAssignDriverTarget(null)}
          target={assignDriverTarget}
        />
      )}

    </div>
  );
}
