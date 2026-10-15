import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  Package, 
  Building2, 
  User, 
  Search, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  LogOut, 
  Filter, 
  ArrowRight, 
  ExternalLink,
  Info,
  Check,
  Phone,
  RefreshCw,
  Sparkles,
  ChevronDown,
  X,
  History,
  Navigation
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ForwardingProgressiveRecord, DriverAssignmentNotification, PhilippineArea } from '../types';
import { DEFAULT_ENCODER_USER, OFII_DRIVERS_ROSTER } from '../data/mockData';
import { 
  isUserAuthorizedDriverForDelivery, 
  resolveDriverId, 
  resolveHelperId 
} from '../data/userAccounts';

interface DriverDeliveryViewProps {
  onLogout: () => void;
  onSwitchToOffice?: () => void;
}

export const DriverDeliveryView: React.FC<DriverDeliveryViewProps> = ({
  onLogout,
  onSwitchToOffice,
}) => {
  const { 
    forwardingRecords, 
    individualDeliveries,
    currentUserProfile, 
    setCurrentUserProfile,
    driverNotifications, 
    markDriverNotificationAsRead,
    markAllDriverNotificationsAsRead,
    updateDriverProgress,
    markDeliveryAsDelivered,
    syncStatus,
    refreshData
  } = useData();

  // Active perspective driver name
  const currentDriverName = currentUserProfile.driverName || currentUserProfile.name || 'Danilo P. Hernandez';

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [onlyMyDeliveries, setOnlyMyDeliveries] = useState<boolean>(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  // Delivery Progress Update States
  const [progressLocationInput, setProgressLocationInput] = useState<string>('');
  const [progressStatusInput, setProgressStatusInput] = useState<'Assigned' | 'In Transit' | 'Out for Delivery' | 'Delivered'>('In Transit');
  const [progressError, setProgressError] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);

  // Mark as Delivered Confirmation Modal States
  const [confirmDeliveryRecord, setConfirmDeliveryRecord] = useState<ForwardingProgressiveRecord | null>(null);
  const [receiverName, setReceiverName] = useState<string>('');
  const [dateReceived, setDateReceived] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [signatureType, setSignatureType] = useState<string>('Signed Physical POD Copy');
  const [customSignatureText, setCustomSignatureText] = useState<string>('');
  const [deliveryRemarks, setDeliveryRemarks] = useState<string>('');
  const [confirmError, setConfirmError] = useState<string>('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState<boolean>(false);

  // Driver Workflow Status Events (Status 1: Left Compound, Status 2: Arrived at Site)
  const [driverWorkflowEvents, setDriverWorkflowEvents] = useState<Record<string, {
    leftCompoundAt?: string;
    arrivedSiteAt?: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem('ofii_driver_workflow_events');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [driverToast, setDriverToast] = useState<{ title: string; message: string } | null>(null);

  const showDriverToast = (title: string, message: string) => {
    setDriverToast({ title, message });
    setTimeout(() => setDriverToast(null), 4000);
  };

  const handleVehicleLeftCompound = async (rec: ForwardingProgressiveRecord) => {
    if (!isAuthorizedDriverForRecord(rec)) return;
    const existing = driverWorkflowEvents[rec.id]?.leftCompoundAt;
    if (existing) {
      showDriverToast('Already Recorded', `Vehicle compound departure was already recorded at ${existing}.`);
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...driverWorkflowEvents,
      [rec.id]: {
        ...(driverWorkflowEvents[rec.id] || {}),
        leftCompoundAt: timeStr,
      },
    };
    setDriverWorkflowEvents(updated);
    try {
      localStorage.setItem('ofii_driver_workflow_events', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    await updateDriverProgress(rec.id, `Vehicle Left Compound at ${timeStr} (En Route)`, 'In Transit');
    showDriverToast('Compound Departure Confirmed', `VEHICLE LEFT COMPOUND recorded at ${timeStr}. Status is now available to the dispatch office.`);
  };

  const handleArrivedAtDeliverySite = async (rec: ForwardingProgressiveRecord) => {
    if (!isAuthorizedDriverForRecord(rec)) return;
    const existing = driverWorkflowEvents[rec.id]?.arrivedSiteAt;
    if (existing) {
      showDriverToast('Already Recorded', `Arrival at delivery site was already recorded at ${existing}.`);
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = {
      ...driverWorkflowEvents,
      [rec.id]: {
        ...(driverWorkflowEvents[rec.id] || {}),
        arrivedSiteAt: timeStr,
      },
    };
    setDriverWorkflowEvents(updated);
    try {
      localStorage.setItem('ofii_driver_workflow_events', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }

    await updateDriverProgress(rec.id, `Arrived at Delivery Site (${rec.consignee}) at ${timeStr}`, 'Out for Delivery');
    showDriverToast('Site Arrival Confirmed', `ARRIVED AT DELIVERY SITE recorded at ${timeStr}. Unloading and receiver confirmation ready.`);
  };

  // Keep selectedDelivery reactive to forwardingRecords updates
  const selectedDelivery = useMemo(() => {
    if (!selectedDeliveryId) return null;
    return forwardingRecords.find(r => r.id === selectedDeliveryId || r.podNumber === selectedDeliveryId) || null;
  }, [selectedDeliveryId, forwardingRecords]);

  // Sync inputs when selectedDelivery changes
  React.useEffect(() => {
    if (selectedDelivery) {
      setProgressLocationInput(selectedDelivery.currentLocation || '');
      setProgressStatusInput(
        selectedDelivery.driverProgressStatus ||
        (selectedDelivery.deliveryStatus === 'Delivered' ? 'Delivered' : 'In Transit')
      );
    }
  }, [selectedDelivery]);

  // Helper: check if current user is a helper
  const isCurrentUserHelper = useMemo(() => {
    const id = (currentUserProfile.driverId || currentUserProfile.employeeId || currentUserProfile.id || '').toUpperCase();
    const role = (currentUserProfile.role || '').toLowerCase();
    const name = (currentUserProfile.name || '').toLowerCase();
    return id.startsWith('HLP-') || role.includes('helper') || name.includes('helper');
  }, [currentUserProfile]);

  // Authorization helper: strictly validates driverId (driver edit vs helper/unauthorized read-only)
  const isAuthorizedDriverForRecord = (rec: ForwardingProgressiveRecord | null | undefined): boolean => {
    if (!rec) return false;
    const targetDriverId = rec.assignedDriverId || ('driverId' in rec ? (rec as any).driverId : undefined);
    const targetDriverName = rec.driverName || rec.assignedDriver;
    return isUserAuthorizedDriverForDelivery(currentUserProfile, targetDriverId, targetDriverName);
  };

  // Open confirmation modal handler
  const handleOpenConfirmDelivery = (rec: ForwardingProgressiveRecord) => {
    if (!isAuthorizedDriverForRecord(rec)) {
      setProgressError('You are not authorized to edit this delivery.');
      return;
    }
    setConfirmDeliveryRecord(rec);
    setReceiverName((rec as any).recipientName || rec.receiversName || '');
    setDateReceived(new Date().toISOString().split('T')[0]);
    setSignatureType('Signed Physical POD Copy');
    setCustomSignatureText('');
    setDeliveryRemarks('');
    setConfirmError('');
  };

  // Quick preset location chips
  const LOCATION_PRESETS = [
    'OFII Hub Parañaque',
    'En Route / NLEX',
    'En Route / SLEX',
    'Calamba Exit',
    'Arrived at Consignee Gate',
    'Unloading at Dock',
  ];

  // Save Progress Update Handler
  const handleSaveProgress = async () => {
    if (!selectedDelivery) return;
    if (!isAuthorizedDriverForRecord(selectedDelivery)) {
      setProgressError('You are not authorized to edit this delivery.');
      return;
    }
    if (!progressLocationInput.trim()) {
      setProgressError('Please enter or select your current delivery location.');
      return;
    }
    setProgressError('');
    setIsUpdatingProgress(true);
    try {
      await updateDriverProgress(selectedDelivery.id, progressLocationInput.trim(), progressStatusInput);
    } catch (e: any) {
      console.error(e);
      setProgressError(e?.message || 'You are not authorized to edit this delivery.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Confirm Delivery Completion Handler
  const handleExecuteDeliveryConfirmation = async () => {
    if (!confirmDeliveryRecord) return;
    if (isSubmittingDelivery) return; // Prevent double clicks
    if (!isAuthorizedDriverForRecord(confirmDeliveryRecord)) {
      setConfirmError('You are not authorized to edit this delivery.');
      return;
    }
    if (!receiverName.trim()) {
      setConfirmError("Recipient Name is required. Please enter the full name of the person who physically received the delivery.");
      return;
    }
    if (!dateReceived) {
      setConfirmError("Date Received is required. Please select when cargo was accepted.");
      return;
    }

    setIsSubmittingDelivery(true);
    setConfirmError('');
    try {
      const finalSignature = customSignatureText.trim() ? customSignatureText.trim() : signatureType;
      await markDeliveryAsDelivered({
        recordId: confirmDeliveryRecord.id,
        recipientName: receiverName.trim(),
        receiverName: receiverName.trim(),
        dateReceived,
        signature: finalSignature,
        remarks: deliveryRemarks.trim() || undefined,
      });

      setConfirmDeliveryRecord(null);
      setSelectedDeliveryId(null);
      setActiveTab('history');
    } catch (e: any) {
      console.error(e);
      setConfirmError(e?.message || 'You are not authorized to edit this delivery.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // Check if delivery is assigned to current user (strictly using driverId)
  const checkIsAssignedToCurrentDriver = (rec: ForwardingProgressiveRecord): boolean => {
    const currentId = (currentUserProfile.driverId || currentUserProfile.employeeId || currentUserProfile.id || '').toUpperCase().trim();
    if (!currentId) return false;

    if (isCurrentUserHelper) {
      const helperId = (rec.assignedHelperId || (rec.helperName ? resolveHelperId(rec.helperName) : '') || (rec.assignedHelper ? resolveHelperId(rec.assignedHelper) : '')).toUpperCase().trim();
      return Boolean(helperId && helperId === currentId);
    }

    // Driver matching strictly authorized using driverId, not driverName
    const recDriverId = (rec.assignedDriverId || (rec.driverName ? resolveDriverId(rec.driverName) : '') || (rec.assignedDriver ? resolveDriverId(rec.assignedDriver) : '')).toUpperCase().trim();
    return Boolean(recDriverId && recDriverId === currentId);
  };

  // Driver notifications for THIS driver (strictly matched by Driver ID)
  const myNotifications = useMemo(() => {
    const currentId = (currentUserProfile.driverId || currentUserProfile.employeeId || currentUserProfile.id || '').toUpperCase().trim();
    if (!currentId) return [];

    return driverNotifications.filter(n => {
      const notifDriverId = (n.driverId || n.assignedDriverId || (n.driverName ? resolveDriverId(n.driverName) : '')).toUpperCase().trim();
      const notifHelperId = (n.assignedHelperId || (n.helperName ? resolveHelperId(n.helperName) : '') || (n.assignedHelper ? resolveHelperId(n.assignedHelper) : '')).toUpperCase().trim();

      if (isCurrentUserHelper) {
        return notifHelperId === currentId;
      }
      return notifDriverId === currentId;
    });
  }, [driverNotifications, currentUserProfile, isCurrentUserHelper]);

  const unreadNotifCount = myNotifications.filter(n => !n.isRead).length;

  // Active records (not soft-deleted)
  const activeNetworkRecords = useMemo(() => {
    const list: ForwardingProgressiveRecord[] = [...forwardingRecords.filter(r => !r.isDeleted)];

    // Also include any individualDeliveries from Truck Planning not already in forwardingRecords
    (individualDeliveries || []).forEach(del => {
      const delObj = del as any;
      const alreadyPresent = list.some(
        r => r.id === del.id || r.deliveryId === del.deliveryId || (r.podNumber && (r.podNumber === del.individualDeliveryPod || r.podNumber === del.deliveryId))
      );
      if (!alreadyPresent) {
        const isDelivered = delObj.deliveryStatus === 'DELIVERED' || del.status === 'Delivered';
        list.push({
          id: del.id,
          deliveryId: del.deliveryId || del.id,
          client: del.client || 'Client',
          consignee: del.consignee || 'Consignee',
          podNumber: del.individualDeliveryPod || del.deliveryId || del.id,
          individualDeliveryPod: del.individualDeliveryPod,
          destinationCode: del.destinationCode || del.destination || 'NCR',
          destination: del.destination || del.destinationCode || 'NCR',
          area: (del.area || 'Luzon') as any,
          quantity: del.quantity || 1,
          modeOfShipment: (del.modeOfShipment as any) || 'Land Freight',
          truckRunNumber: del.truckRunNumber || 'TRUCK RUN #001',
          driverName: delObj.assignedDriver || del.driver || 'Danilo P. Hernandez',
          assignedDriver: delObj.assignedDriver || del.driver || 'Danilo P. Hernandez',
          assignedDriverId: delObj.assignedDriverId || del.driverId,
          helperName: del.helper || 'Helper',
          assignedHelper: del.helper || 'Helper',
          assignedHelperId: del.assignedHelperId || del.helperId,
          plateNumber: del.plateNumber || 'N/A',
          truckName: del.truckName || '6W Forward Truck',
          deliveryStatus: (isDelivered ? 'Delivered' : 'In Transit') as any,
          actualDeliveryDate: del.actualDeliveryDate,
          dateReceived: del.dateReceived,
          receiversName: del.receiversName,
          dateOfPodReturn: del.podReturnDate,
          podStatus: (del.podStatus as any) || 'Pending Return',
        } as unknown as ForwardingProgressiveRecord);
      }
    });

    return list;
  }, [forwardingRecords, individualDeliveries]);

  // Filter helper
  const filterRecord = (rec: ForwardingProgressiveRecord) => {
    if (selectedArea !== 'all' && rec.area !== selectedArea) {
      return false;
    }
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      rec.client.toLowerCase().includes(term) ||
      rec.consignee.toLowerCase().includes(term) ||
      rec.podNumber.toLowerCase().includes(term) ||
      (rec.destination && rec.destination.toLowerCase().includes(term)) ||
      (rec.referenceNumber && rec.referenceNumber.toLowerCase().includes(term)) ||
      (rec.plateNumber && rec.plateNumber.toLowerCase().includes(term)) ||
      (rec.driverName && rec.driverName.toLowerCase().includes(term))
    );
  };

  // 1. My Assigned Active Deliveries
  const myAssignedActiveDeliveries = useMemo(() => {
    return activeNetworkRecords.filter(rec => {
      const isAssigned = checkIsAssignedToCurrentDriver(rec);
      const isNotYetDelivered = rec.deliveryStatus !== 'Delivered';
      return isAssigned && isNotYetDelivered && filterRecord(rec);
    });
  }, [activeNetworkRecords, currentDriverName, selectedArea, searchTerm, currentUserProfile]);

  // 2. All Other Active Deliveries in the Network
  const otherActiveDeliveries = useMemo(() => {
    return activeNetworkRecords.filter(rec => {
      const isAssignedToMe = checkIsAssignedToCurrentDriver(rec);
      const isNotYetDelivered = rec.deliveryStatus !== 'Delivered';
      return !isAssignedToMe && isNotYetDelivered && filterRecord(rec);
    });
  }, [activeNetworkRecords, currentDriverName, selectedArea, searchTerm, currentUserProfile]);

  // 3. Driver History (Completed / Delivered records for this driver)
  const myCompletedHistory = useMemo(() => {
    return activeNetworkRecords.filter(rec => {
      const isAssigned = checkIsAssignedToCurrentDriver(rec);
      const isDelivered = rec.deliveryStatus === 'Delivered';
      return isAssigned && isDelivered && filterRecord(rec);
    });
  }, [activeNetworkRecords, currentDriverName, selectedArea, searchTerm, currentUserProfile]);

  // Switch active perspective user (Drivers or Helpers) for testing access control
  const handleSwitchUser = (selectedIdOrName: string) => {
    if (selectedIdOrName === 'HLP-A' || selectedIdOrName.toLowerCase().includes('helper')) {
      setCurrentUserProfile({
        id: 'HLP-A',
        name: 'Helper A',
        role: 'OFII Logistics Helper',
        userRole: 'driver',
        department: 'Fleet & Logistics Transport',
        email: 'helper.a@orientfreight.com',
        employeeId: 'HLP-A',
        hubLocation: 'OFII Central Cargo Hub, Paranaque',
        driverName: 'Helper A',
        driverId: 'HLP-A',
        contactNumber: '+63 917 333 0001',
      });
      return;
    }
    const matched = OFII_DRIVERS_ROSTER.find(d => d.name === selectedIdOrName || d.id === selectedIdOrName);
    const resolvedId = matched?.id || resolveDriverId(selectedIdOrName);
    const resolvedName = matched?.name || selectedIdOrName;
    setCurrentUserProfile({
      id: resolvedId,
      name: resolvedName,
      role: 'OFII Fleet Driver',
      userRole: 'driver',
      department: 'Fleet & Logistics Transport',
      email: `${resolvedName.toLowerCase().replace(/[^a-z]/g, '.')}@orientfreight.com`,
      employeeId: resolvedId,
      hubLocation: 'OFII Central Cargo Hub, Paranaque',
      driverName: resolvedName,
      driverId: resolvedId,
      vehiclePlate: matched?.defaultPlate || 'NDB-4921',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Delayed':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none">
      {/* Top Driver Header Bar */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-blue-700 flex items-center justify-center text-white font-black text-lg tracking-wider border border-blue-500/40 shadow-inner">
              OFII
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-wide text-white">
                  ORIENT FREIGHT
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider">
                  Driver Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logistics & Shipment Delivery Perspective
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2.5 sm:space-x-4">
            {/* Driver/Helper Profile Indicator / User Selector */}
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <User className={`w-3.5 h-3.5 mr-2 shrink-0 ${isCurrentUserHelper ? 'text-amber-400' : 'text-blue-400'}`} />
              <div className="text-left mr-2">
                <span className="block text-[10px] uppercase text-slate-400 font-semibold">
                  {isCurrentUserHelper ? 'Active Helper (View Only)' : 'Active Driver'}
                </span>
                <select
                  value={currentUserProfile.id || currentUserProfile.driverId || currentUserProfile.employeeId || currentDriverName}
                  onChange={(e) => handleSwitchUser(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
                  title="Switch logged-in Driver or Helper to test access control"
                >
                  <optgroup label="OFII Drivers (Edit Authorized)">
                    {OFII_DRIVERS_ROSTER.map(d => (
                      <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                        {d.name} ({d.id}) - {d.defaultPlate}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Logistics Helpers (View Only)">
                    <option value="HLP-A" className="bg-slate-900 text-amber-300 font-semibold">
                      Helper A (HLP-A) — View Only
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Notification Bell 🔔 */}
            <button
              onClick={() => setShowNotificationDrawer(true)}
              className={`relative p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                unreadNotifCount > 0
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={`${unreadNotifCount} assignment notification${unreadNotifCount === 1 ? '' : 's'}`}
            >
              <Bell className={`w-4 h-4 ${unreadNotifCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
              {unreadNotifCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] min-w-[18px] leading-tight shadow-xs">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Switch to Office View Button (Seamless Role Verification) */}
            <button
              onClick={() => {
                if (onSwitchToOffice) {
                  onSwitchToOffice();
                } else {
                  setCurrentUserProfile(DEFAULT_ENCODER_USER);
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Switch role to Encoder / Office Perspective"
            >
              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Office Perspective</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Log Out to Login Screen"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Driver Sub-Bar: Station & Assigned Vehicle Status */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-bold text-white text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {currentDriverName}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              Vehicle: <strong className="text-slate-200 font-mono">{currentUserProfile.vehiclePlate || 'NDB-4921'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Hub: <strong className="text-slate-300">OFII Central Cargo Hub</strong></span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400 font-medium">Duty Status: Ready for Dispatch</span>
          </div>
        </div>
      </div>

      {/* Driver Action Confirmation Toast */}
      {driverToast && (
        <div className="fixed top-16 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-blue-500/80 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white uppercase tracking-wider">{driverToast.title}</p>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{driverToast.message}</p>
          </div>
          <button onClick={() => setDriverToast(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs & Search Controls */}
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3.5 backdrop-blur-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-700/80">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Active Deliveries</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'active' ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {myAssignedActiveDeliveries.length} Assigned
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Delivery History</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'history' ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {myCompletedHistory.length}
                </span>
              </button>
            </div>

            {/* Quick Toggle: Show My Deliveries Only */}
            {activeTab === 'active' && (
              <label className="flex items-center text-xs text-slate-300 font-medium cursor-pointer select-none bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
                <input
                  type="checkbox"
                  checked={onlyMyDeliveries}
                  onChange={(e) => setOnlyMyDeliveries(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-600 mr-2"
                />
                <span>Focus on My Assigned Deliveries Only</span>
              </label>
            )}
          </div>

          {/* Search & Area Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Consignee, POD #, Destination, or Client..."
                className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
              >
                <option value="all">All Philippine Areas</option>
                <option value="NCR">National Capital Region (NCR)</option>
                <option value="Luzon">Luzon Province</option>
                <option value="Visayas">Visayas Region</option>
                <option value="Mindanao">Mindanao Region</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tab 1: ACTIVE DELIVERIES */}
        {activeTab === 'active' && (
          <div className="space-y-8">
            {/* SECTION 1: MY ASSIGNED DELIVERIES (PRIORITY PLACEMENT) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
                    MY ASSIGNED DELIVERIES
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                    {myAssignedActiveDeliveries.length} Assigned to You
                  </span>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Priority operational run for {currentDriverName}
                </span>
              </div>

              {myAssignedActiveDeliveries.length === 0 ? (
                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <Truck className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-300">
                    No active assignments for {currentDriverName} right now
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When the Office or Trucking coordinator assigns a shipment to you, it will immediately appear here with full consignee and dispatch details.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAssignedActiveDeliveries.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-800 rounded-xl border-2 border-emerald-500/80 shadow-lg shadow-emerald-950/30 overflow-hidden flex flex-col justify-between hover:border-emerald-400 transition-all"
                    >
                      {/* Card Top Banner: ASSIGNED TO YOU BADGE */}
                      <div className="bg-emerald-950/70 px-4 py-2.5 border-b border-emerald-800/60 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                            ASSIGNED TO YOU
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-200">
                            {rec.podNumber}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(rec.deliveryStatus)}`}>
                          {rec.deliveryStatus}
                        </span>
                      </div>

                      {/* Card Main Information */}
                      <div className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-300 flex-1">
                        {/* Consignee & Destination */}
                        <div>
                          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
                            <span className="uppercase font-semibold tracking-wider">Consignee & Destination</span>
                            <span className="text-blue-400 font-semibold">{rec.client}</span>
                          </div>
                          <h3 className="text-base font-bold text-white leading-snug">
                            {rec.consignee}
                          </h3>
                          <p className="text-slate-300 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{rec.destination || `${rec.destinationCode} — ${rec.area}`}</span>
                          </p>
                        </div>

                        {/* Operational Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-900/70 p-3 rounded-lg border border-slate-700/60 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mode of Shipment</span>
                            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                              <Truck className="w-3 h-3 text-blue-400" />
                              {rec.modeOfShipment || 'Land Freight'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Actual Dispatched</span>
                            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {rec.actualDispatchDate || rec.deliveryDate || '2026-08-25'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Req Delivery Date (RDD)</span>
                            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-emerald-400" />
                              {rec.requestDeliveryDate || rec.plannedDeliveryDate || 'Immediate'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vehicle & Plate</span>
                            <span className="font-semibold text-white flex items-center gap-1 mt-0.5 font-mono">
                              <span className="text-slate-300">{rec.vehicle || 'Truck'}</span>
                              <span className="text-emerald-400">({rec.plateNumber || 'NDB-4921'})</span>
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Driver & Helper</span>
                            <span className="font-semibold text-white block mt-0.5 truncate" title={`Driver: ${rec.driverName || rec.assignedDriver || currentDriverName} | Helper: ${rec.helperName || rec.assignedHelper || 'None'}`}>
                              <span className="text-emerald-300">{rec.driverName || rec.assignedDriver || currentDriverName}</span>
                              <span className="text-slate-400 text-[10px]"> / {rec.helperName || rec.assignedHelper || 'No Helper'}</span>
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cargo Quantity</span>
                            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                              <Package className="w-3 h-3 text-purple-400" />
                              {rec.quantity} {rec.unit || 'Boxes'}
                            </span>
                          </div>
                        </div>

                        {/* Driver Progress Location Display if reported */}
                        {rec.currentLocation ? (
                          <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-slate-200 font-semibold truncate">
                                {rec.currentLocation}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase border border-blue-500/30">
                                {rec.driverProgressStatus || rec.deliveryStatus || 'In Transit'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900/50 border border-dashed border-slate-700/60 rounded-lg p-2 text-center text-slate-400 text-[11px] flex items-center justify-center gap-1.5">
                            <Navigation className="w-3 h-3 text-slate-500" />
                            <span>Location not yet updated by driver</span>
                          </div>
                        )}

                        {rec.leadtimeMessage && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{rec.leadtimeMessage}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer: Workflow Status 1 & Status 2 + Mark as Delivered */}
                      <div className="bg-slate-900/90 px-4 py-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                        {isAuthorizedDriverForRecord(rec) ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* STATUS 1 — LEAVE COMPOUND */}
                            {driverWorkflowEvents[rec.id]?.leftCompoundAt ? (
                              <span className="px-3 py-1.5 bg-blue-950/80 text-blue-300 border border-blue-800 rounded font-semibold text-xs flex items-center gap-1.5 shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-blue-400" />
                                <span>Left Compound ({driverWorkflowEvents[rec.id].leftCompoundAt})</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVehicleLeftCompound(rec)}
                                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Press when vehicle departs OFII Compound"
                              >
                                <Truck className="w-3.5 h-3.5 text-blue-200" />
                                <span>VEHICLE LEFT COMPOUND</span>
                              </button>
                            )}

                            {/* STATUS 2 — ARRIVED AT DELIVERY SITE */}
                            {driverWorkflowEvents[rec.id]?.arrivedSiteAt ? (
                              <span className="px-3 py-1.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded font-semibold text-xs flex items-center gap-1.5 shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-amber-400" />
                                <span>Arrived Site ({driverWorkflowEvents[rec.id].arrivedSiteAt})</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleArrivedAtDeliverySite(rec)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Press upon arrival at consignee delivery location"
                              >
                                <MapPin className="w-3.5 h-3.5 text-amber-200" />
                                <span>ARRIVED AT DELIVERY SITE</span>
                              </button>
                            )}

                            {/* MARK AS DELIVERED / CONFIRM RECEIVER */}
                            <button
                              type="button"
                              onClick={() => handleOpenConfirmDelivery(rec)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Confirm delivery completion with receiver signature"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>MARK AS DELIVERED</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/60">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {isCurrentUserHelper
                                ? 'Helper View (Read-Only)'
                                : `Assigned to ${rec.driverName || rec.assignedDriver || 'Another Driver'}`}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedDeliveryId(rec.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer py-1 px-2 hover:bg-slate-800 rounded ml-auto"
                        >
                          <span>Specs</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 2: ALL DELIVERIES (SYSTEM-WIDE NETWORK OVERVIEW) */}
            {!onlyMyDeliveries && (
              <section className="space-y-3 pt-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-300 tracking-wide uppercase">
                      ALL DELIVERIES (OFII Network Overview)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                      {otherActiveDeliveries.length} Network Shipments
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Cross-terminal visibility for operational awareness
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {otherActiveDeliveries.map((rec) => {
                    const assignedDriverName = rec.driverName || rec.assignedDriver;
                    return (
                      <div
                        key={rec.id}
                        className="bg-slate-800/70 rounded-lg border border-slate-700/70 p-4 space-y-3 text-xs text-slate-300 hover:border-slate-600 transition-colors flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-400">
                              {rec.podNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(rec.deliveryStatus)}`}>
                              {rec.deliveryStatus}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                              {rec.client}
                            </span>
                            <h4 className="text-sm font-bold text-white truncate">
                              {rec.consignee}
                            </h4>
                            <p className="text-slate-400 text-[11px] truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              {rec.destination || rec.area}
                            </p>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50 space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Schedule:</span>
                              <span className="font-medium text-slate-200">{rec.plannedDeliveryDate || 'Scheduled'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Truck / Plate:</span>
                              <span className="font-mono text-slate-200">{rec.plateNumber || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Quantity:</span>
                              <span className="text-slate-200">{rec.quantity} {rec.unit || 'Boxes'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            Driver: <strong className="text-slate-200">{assignedDriverName || 'Unassigned'}</strong>
                          </span>
                          <button
                            onClick={() => setSelectedDeliveryId(rec.id)}
                            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <span>Specs</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Tab 2: DELIVERY HISTORY */}
        {activeTab === 'history' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <History className="w-5 h-5 text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
                  COMPLETED DELIVERY HISTORY
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                  {myCompletedHistory.length} Delivered
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Verified deliveries completed by {currentDriverName}
              </span>
            </div>

            {myCompletedHistory.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-300">
                  No completed delivery records found for {currentDriverName}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When active deliveries assigned to you are successfully delivered and audited, they will appear here as verified delivery history.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myCompletedHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-slate-800 rounded-xl border border-slate-700/80 p-5 space-y-3 text-xs text-slate-300 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase border border-emerald-500/30">
                          Delivered
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {rec.podNumber}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        Delivered on: <strong className="text-slate-200">{rec.actualDeliveryDate || rec.deliveryDate}</strong>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        {rec.client}
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {rec.consignee}
                      </h4>
                      <p className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {rec.destination || rec.area}
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Receiver Name:</span>
                        <span className="font-semibold text-slate-200">{rec.receiversName || 'Authorized Custodian'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Date Received:</span>
                        <span className="font-semibold text-emerald-400">{rec.dateReceived || rec.actualDeliveryDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Vehicle / Plate:</span>
                        <span className="font-mono text-slate-200">{rec.plateNumber || 'NDB-4921'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Cargo Delivered:</span>
                        <span className="font-semibold text-slate-200">{rec.quantity} {rec.unit || 'Boxes'}</span>
                      </div>
                      {rec.receiverSignature && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px]">Receiver Acknowledgment:</span>
                          <span className="font-mono text-slate-300 text-[10px]">{rec.receiverSignature}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setSelectedDeliveryId(rec.id)}
                        className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Historical Audit Record</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Operational Delivery Specs Modal (Restricted: Zero Financial Information) */}
      {selectedDelivery && (() => {
        const isAssignedToMe = isAuthorizedDriverForRecord(selectedDelivery);
        const isDelivered = selectedDelivery.deliveryStatus === 'Delivered';
        const assignedDriverName = selectedDelivery.driverName || selectedDelivery.assignedDriver || 'Unassigned Driver';
        const assignedDriverId = selectedDelivery.assignedDriverId || ('driverId' in selectedDelivery ? (selectedDelivery as any).driverId : undefined) || resolveDriverId(assignedDriverName);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-slate-900 text-slate-200 rounded-xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Delivery Specifications
                    </h3>
                    <p className="text-[11px] font-mono text-blue-400">
                      POD: {selectedDelivery.podNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDeliveryId(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Consignee & Route Block */}
                <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 space-y-2">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Delivery Destination
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {selectedDelivery.consignee}
                  </h4>
                  <p className="text-slate-300 flex items-start gap-1.5 mt-1">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{selectedDelivery.destination || `${selectedDelivery.destinationCode} — ${selectedDelivery.area}`}</span>
                  </p>
                </div>

                {/* Delivered Badge if already completed */}
                {isDelivered && (
                  <div className="bg-emerald-950/50 border border-emerald-700/60 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Delivery Successfully Completed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Date Received:</span>
                        <span className="font-semibold text-white">{selectedDelivery.dateReceived || selectedDelivery.actualDeliveryDate || 'Completed'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Received By:</span>
                        <span className="font-semibold text-white">{selectedDelivery.receiversName || 'Authorized Recipient'}</span>
                      </div>
                      {selectedDelivery.receiverSignature && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px]">Receiver Acknowledgment:</span>
                          <span className="font-mono text-slate-300">{selectedDelivery.receiverSignature}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Operational Detail Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/60">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Client Account</span>
                    <span className="font-bold text-white">{selectedDelivery.client}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Scheduled Date</span>
                    <span className="font-semibold text-amber-300">{selectedDelivery.plannedDeliveryDate || 'Immediate'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Vehicle Assigned</span>
                    <span className="font-mono text-white font-semibold">{selectedDelivery.plateNumber || 'NDB-4921'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Driver Assigned</span>
                    <span className="font-semibold text-emerald-400">{selectedDelivery.driverName || 'Danilo P. Hernandez'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Departure / Dispatch</span>
                    <span className="font-semibold text-white">{selectedDelivery.departureTime || '08:00 AM'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Quantity</span>
                    <span className="font-semibold text-purple-300">{selectedDelivery.quantity} {selectedDelivery.unit || 'Boxes'}</span>
                  </div>
                </div>

                {/* SECTION 1: DRIVER PROGRESS CONTROLS (Only for Assigned Driver) */}
                {isAssignedToMe && !isDelivered && (
                  <div className="bg-slate-800/90 p-4 rounded-lg border border-blue-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-blue-400" />
                        Update Delivery Progress
                      </span>
                      {selectedDelivery.progressUpdatedAt && (
                        <span className="text-[10px] text-slate-400">
                          Updated: {new Date(selectedDelivery.progressUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {progressError && (
                      <div className="p-2.5 rounded bg-rose-950/60 border border-rose-700 text-rose-200 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{progressError}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-semibold text-slate-400">
                        Current Location / Landmark
                      </label>
                      <input
                        type="text"
                        value={progressLocationInput}
                        onChange={(e) => {
                          setProgressLocationInput(e.target.value);
                          if (progressError) setProgressError('');
                        }}
                        placeholder="e.g., En Route / NLEX, Arrived at Consignee Gate"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-3 py-2 text-xs text-white"
                      />

                      {/* Location Preset Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {LOCATION_PRESETS.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setProgressLocationInput(loc);
                              if (progressError) setProgressError('');
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-700/60 hover:bg-blue-600 hover:text-white text-slate-300 transition-colors cursor-pointer border border-slate-600"
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Progress Workflow Stepper */}
                    <div className="pt-1">
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
                        Delivery Workflow Progression
                      </label>
                      <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold text-center mb-2">
                        <div className={`p-1.5 rounded border ${
                          selectedDelivery.driverProgressStatus === 'Assigned' || !selectedDelivery.driverProgressStatus
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}>
                          1. Assigned
                        </div>
                        <div className={`p-1.5 rounded border ${
                          selectedDelivery.driverProgressStatus === 'In Transit'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}>
                          2. In Transit
                        </div>
                        <div className={`p-1.5 rounded border ${
                          selectedDelivery.driverProgressStatus === 'Out for Delivery'
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}>
                          3. Out for Delivery
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Progress Status
                        </label>
                        <select
                          value={progressStatusInput}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            if (val === 'Delivered') {
                              handleOpenConfirmDelivery(selectedDelivery);
                            } else {
                              setProgressStatusInput(val);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="Assigned">Assigned</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered (Requires Receiver Info)</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={isUpdatingProgress}
                          onClick={handleSaveProgress}
                          className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{isUpdatingProgress ? 'Saving...' : 'Save Progress'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unauthorized Driver or Helper Access Scope Notice */}
                {!isAssignedToMe && !isDelivered && (
                  <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">
                        Read-Only Access • Assigned to {assignedDriverName} {assignedDriverId ? `(${assignedDriverId})` : ''}
                      </p>
                      <p className="text-[11px] text-amber-300/85 leading-relaxed">
                        {isCurrentUserHelper
                          ? `You are signed in as an OFII Logistics Helper (${currentUserProfile.name}). Helpers have view-only access to truck run deliveries. Progress updates and delivery confirmation are strictly restricted to the assigned driver.`
                          : `You are signed in as ${currentUserProfile.name} (${currentUserProfile.driverId || currentUserProfile.employeeId || 'Driver'}). This delivery is assigned to ${assignedDriverName}. Editing controls (Update Progress, Mark as Delivered) are restricted.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery Instructions / Remarks */}
                <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 text-[11px] space-y-1">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Dispatcher Instructions:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedDelivery.remarks || selectedDelivery.deliveryRemarks || 'Verify seal numbers upon arrival. Ensure recipient stamps physical POD copy.'}
                  </p>
                </div>

                {/* Restriction Notice */}
                <div className="p-2.5 rounded bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>OFII Driver Perspective: Commercial fees and client billing details are restricted.</span>
                </div>
              </div>

              <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDeliveryId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded transition-colors cursor-pointer"
                >
                  Close Specs
                </button>

                {/* Quick Mark as Delivered from Specs Modal if assigned */}
                {isAssignedToMe && !isDelivered && (
                  <button
                    type="button"
                    onClick={() => handleOpenConfirmDelivery(selectedDelivery)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>MARK AS DELIVERED</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmation Modal: MARK AS DELIVERED */}
      {confirmDeliveryRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 text-slate-200 rounded-xl shadow-2xl border border-emerald-500/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-emerald-950/80 px-6 py-4 border-b border-emerald-700/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Confirm Delivery Completion
                  </h3>
                  <p className="text-xs text-emerald-300">
                    Record receiver acceptance & notify OFII Office
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeliveryRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Delivery Summary Banner */}
              <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-emerald-400 font-bold text-xs">
                    POD: {confirmDeliveryRecord.podNumber}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Client: <strong className="text-white">{confirmDeliveryRecord.client}</strong>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {confirmDeliveryRecord.consignee}
                </h4>
                <p className="text-slate-300 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{confirmDeliveryRecord.destination || confirmDeliveryRecord.area}</span>
                </p>
              </div>

              {/* Confirmation Question */}
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-emerald-200 text-xs flex items-center gap-2.5 font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm">Are you sure this delivery has been completed?</span>
              </div>

              {/* Form Validation Alert */}
              {confirmError && (
                <div className="p-3 rounded bg-rose-950/60 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{confirmError}</span>
                </div>
              )}

              {/* Input: Recipient Name (Required) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-200 uppercase flex items-center justify-between">
                  <span>Recipient Name <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] font-medium text-amber-400">Required</span>
                </label>
                <input
                  id="driver-recipient-name-input"
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => {
                    setReceiverName(e.target.value);
                    if (confirmError) setConfirmError('');
                  }}
                  placeholder="Full name of person who physically received delivery"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-3 py-2 text-xs text-white"
                />
                <span className="text-[10px] text-slate-400">
                  Recipient Name — Full name of the person who physically received the delivery.
                </span>
              </div>

              {/* Input: Date Received (Required) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-200 uppercase">
                  Date Received <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateReceived}
                  onChange={(e) => {
                    setDateReceived(e.target.value);
                    if (confirmError) setConfirmError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-3 py-2 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Actual delivery acceptance date (defaults to today).
                </span>
              </div>

              {/* Input: Receiver Signature / Signed Acknowledgment */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-200 uppercase">
                  Receiver Signature / Acknowledgment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Signed Physical POD Copy',
                    'Store Stamped & Signed',
                    'Security Gate Received',
                    'Warehouse Receiving Slip',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSignatureType(preset);
                        setCustomSignatureText('');
                      }}
                      className={`text-[11px] p-2 rounded border text-left transition-colors cursor-pointer ${
                        signatureType === preset && !customSignatureText
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-semibold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    value={customSignatureText}
                    onChange={(e) => setCustomSignatureText(e.target.value)}
                    placeholder="Or enter custom acknowledgment / ID / Stamp number..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Input: Delivery Remarks (Optional) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-200 uppercase">
                  Delivery Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value)}
                  placeholder="e.g., Cargo delivered in good order and condition. Seals intact."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-3 py-2 text-xs text-white resize-none"
                />
              </div>

              {/* Informational Guidance on Physical Date vs POD Return Date */}
              <div className="p-3 rounded bg-blue-950/40 border border-blue-800/60 text-blue-200 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1 text-blue-300">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Physical Delivery vs POD Return Date Notice:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  You are recording the <strong>Physical Delivery (Date Received)</strong>. The <strong>POD Return Date</strong> will be separately recorded by the Office/Encoder once the physical signed paperwork is surrendered back to the OFII branch.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setConfirmDeliveryRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded transition-colors cursor-pointer uppercase tracking-wider"
              >
                CANCEL
              </button>

              <button
                type="button"
                id="driver-confirm-delivery-submit-btn"
                disabled={isSubmittingDelivery || !receiverName.trim()}
                onClick={handleExecuteDeliveryConfirmation}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow-md flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingDelivery ? 'Confirming...' : 'CONFIRM DELIVERY'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Notification Drawer / Modal */}
      {showNotificationDrawer && (() => {
        const displayedNotifications = notifFilter === 'unread' 
          ? myNotifications.filter(n => !n.isRead) 
          : myNotifications;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-slate-900 text-slate-200 rounded-xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh]">
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>Delivery Assignment Notifications</span>
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                          {unreadNotifCount} New
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Notifications for {currentDriverName} {currentUserProfile.driverId ? `(${currentUserProfile.driverId})` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification Filter Tabs */}
              <div className="bg-slate-950/70 px-5 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setNotifFilter('all')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      notifFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All History ({myNotifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifFilter('unread')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      notifFilter === 'unread'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Unread</span>
                    {unreadNotifCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-slate-900 font-black">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                </div>

                {myNotifications.some(n => !n.isRead) && (
                  <button
                    onClick={() => markAllDriverNotificationsAsRead(currentUserProfile.driverId || currentUserProfile.employeeId || currentDriverName)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {displayedNotifications.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-xs space-y-2">
                    <Bell className="w-9 h-9 text-slate-600 mx-auto" />
                    <p className="font-semibold text-slate-400">
                      {notifFilter === 'unread'
                        ? 'All caught up! No unread delivery notifications.'
                        : `No delivery assignment notifications found for ${currentDriverName}.`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Notifications appear here when the Truck Planner schedules truck runs or assigns deliveries to your profile.
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-lg border text-xs transition-all space-y-2.5 ${
                        n.isRead
                          ? 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                          : 'bg-blue-950/40 border-blue-600/70 text-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${n.isRead ? 'bg-slate-500' : 'bg-amber-400 animate-pulse'}`}></span>
                          <span className="font-bold text-white text-xs uppercase tracking-wide">
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>

                      <p className="text-slate-200 font-medium text-xs leading-relaxed">
                        {n.message}
                      </p>

                      {/* 13 Key Delivery Details Grid */}
                      <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700/60 text-[11px] grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-300">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Truck Run Number</span>
                          <span className="font-mono text-amber-300 font-bold">{n.truckRunNumber || 'TR-0007'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Delivery ID</span>
                          <span className="font-mono text-blue-400 font-bold">{n.deliveryId || n.podNumber}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Delivery Name / Batch</span>
                          <span className="font-semibold text-white truncate block">{n.batchName || 'Standard Cargo Dispatch'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client</span>
                          <span className="font-bold text-white truncate block">{n.client}</span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Consignee</span>
                          <span className="font-semibold text-slate-100">{n.consignee}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Place / Destination</span>
                          <span className="text-slate-200 truncate block">{n.destination || 'Metro Manila Terminal'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Delivery Area</span>
                          <span className="font-medium text-slate-200">{n.area}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Quantity</span>
                          <span className="font-semibold text-slate-200">{n.quantity ?? '—'} {n.unit || 'Cases'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Planned Dispatch Date</span>
                          <span className="font-mono text-emerald-400 font-semibold">{n.plannedDispatchDate || n.deliveryDate || 'Today'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Truck Name</span>
                          <span className="font-medium text-slate-200">{n.truckName || 'OFII 6-Wheeler Wing Van'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Plate Number</span>
                          <span className="font-mono text-amber-200 font-bold">{n.plateNumber || 'NDB-4921'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Driver</span>
                          <span className="font-bold text-emerald-300">{n.assignedDriver || n.driverName || currentDriverName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Helper</span>
                          <span className="text-slate-300">{n.assignedHelper || n.helperName || 'None'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {!n.isRead ? (
                          <button
                            type="button"
                            onClick={() => markDriverNotificationAsRead(n.id)}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-emerald-950/40"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as Read</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Check className="w-3 h-3 text-slate-600" />
                            <span>Read</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const target = forwardingRecords.find(r => r.podNumber === n.podNumber || r.id === n.recordId);
                            if (target) {
                              setSelectedDeliveryId(target.id);
                              setShowNotificationDrawer(false);
                            }
                          }}
                          className="ml-auto text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded bg-blue-950/50 hover:bg-blue-900/60 border border-blue-700/50"
                        >
                          <span>Open Delivery Specs</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Showing {displayedNotifications.length} of {myNotifications.length} notifications
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotificationDrawer(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-3 px-6 text-center text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OFII Driver Portal — Orient Freight International, Inc.</span>
          <span>Role: OFII Fleet Driver • Operational Network View</span>
        </div>
      </footer>
    </div>
  );
};
