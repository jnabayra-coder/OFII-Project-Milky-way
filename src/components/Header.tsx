import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Clock, 
  Search, 
  Bell, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet,
  Database,
  RefreshCw,
  Wifi,
  WifiOff,
  Truck,
  UserCheck,
  Eye,
  Menu
} from 'lucide-react';
import { NavigationTab } from '../types';
import { useData } from '../context/DataContext';
import { OFII_DRIVERS_ROSTER } from '../data/mockData';
import { getUserRoleDisplayLabel, normalizeUserRole, getRolePermissions } from '../utils/roleUtils';
import { getPendingRequestsCount } from '../data/userAccounts';

interface HeaderProps {
  currentTab: NavigationTab;
  clientSelectedName?: string;
  onSearchClick?: () => void;
  selectedHub: string;
  onSelectHub: (hub: string) => void;
  onOpenNotifications?: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  clientSelectedName,
  selectedHub,
  onSelectHub,
  onOpenNotifications,
  onNavigateTab,
  onToggleMobileNav,
  isMobileNavOpen,
}) => {
  const { 
    syncStatus, 
    refreshData, 
    isLoading, 
    podNotifications, 
    truckPlannerNotifications, 
    encoderNotifications,
    podReturningNotifications,
    currentUserProfile, 
    setCurrentUserProfile 
  } = useData();

  const [pendingAccountRequestsCount, setPendingAccountRequestsCount] = useState<number>(() => getPendingRequestsCount());

  useEffect(() => {
    const updatePending = () => setPendingAccountRequestsCount(getPendingRequestsCount());
    window.addEventListener('ofii-accounts-changed', updatePending);
    window.addEventListener('storage', updatePending);
    return () => {
      window.removeEventListener('ofii-accounts-changed', updatePending);
      window.removeEventListener('storage', updatePending);
    };
  }, []);

  const userRole = currentUserProfile?.userRole || '';
  const canonicalRole = normalizeUserRole(currentUserProfile?.userRole || currentUserProfile?.role);
  const isTruckPlanner = canonicalRole === 'TRUCK_PLANNER' || userRole === 'truck_planner' || (userRole as string) === 'driver_head';
  const isDispatcher = canonicalRole === 'DISPATCHER' || userRole === 'dispatcher';

  // Notification recipients:
  // - TRUCK_PLANNER receives Truck Planner notifications
  // - DISPATCHER receives dispatches ready for processing & truck run notifications
  // - ENCODER receives Dispatch Ready for Encoding notifications & POD Returning alerts
  // - ADMIN / OFFICE_HEAD receives all operational notifications + Pending Account Registration Requests (Phase 6.7.2)
  let unreadCount = 0;
  const unreadPodReturning = (podReturningNotifications || []).filter((n) => !n.isRead).length;

  if (isTruckPlanner) {
    unreadCount = truckPlannerNotifications.filter((n) => !n.isRead).length;
  } else if (isDispatcher) {
    unreadCount = truckPlannerNotifications.filter((n) => !n.isRead).length;
  } else if (canonicalRole === 'ADMIN' || userRole === 'office_head') {
    const unreadPod = podNotifications.filter((n) => !n.isRead).length;
    const unreadPlanner = truckPlannerNotifications.filter((n) => !n.isRead).length;
    const unreadEncoder = (encoderNotifications || []).filter((n) => !n.isRead).length;
    unreadCount = unreadPod + unreadPlanner + unreadEncoder + unreadPodReturning + pendingAccountRequestsCount;
  } else if (canonicalRole === 'ENCODER' || userRole === 'encoder') {
    const unreadEncoder = (encoderNotifications || []).filter((n) => !n.isRead).length;
    unreadCount = unreadEncoder + unreadPodReturning;
  } else if (canonicalRole === 'COORDINATOR' || userRole === 'coordinator') {
    unreadCount = podNotifications.filter((n) => !n.isRead).length;
  } else {
    unreadCount = 0;
  }

  const getPageTitle = () => {
    switch (currentTab) {
      case 'coordinator_portal':
        return 'Coordinator Operations Portal';
      case 'truck_planner':
        return "Truck Planner / Driver's Head Portal";
      case 'dispatcher_portal':
        return 'Dispatcher Portal';
      case 'dashboard':
        if (canonicalRole === 'ADMIN') return 'Admin Master Operations & Oversight';
        if (canonicalRole === 'MANAGEMENT') return 'Management & Executive Oversight Dashboard';
        if (canonicalRole === 'VIEWER') return 'Operations Dashboard (Read-Only Mode)';
        if (canonicalRole === 'ENCODER') return 'Operations Dashboard & Encoding Summary';
        if (canonicalRole === 'COORDINATOR') return 'Coordinator Operations Overview';
        if (canonicalRole === 'TRUCK_PLANNER') return 'Truck Planner / Route Dispatch Overview';
        if (canonicalRole === 'DISPATCHER') return 'Dispatcher / Gate Logistics Overview';
        return 'Operations Overview';
      case 'dispatch':
        if (canonicalRole === 'VIEWER') return 'Daily Dispatching Monitoring (Read-Only)';
        if (canonicalRole === 'MANAGEMENT') return 'Daily Dispatching Monitoring (Supervisory View)';
        return 'Daily Dispatching Monitoring';
      case 'client_management':
        return 'Client Management';
      case 'clients':
        return clientSelectedName ? `Client Monitoring: ${clientSelectedName}` : 'Client Shipment Monitoring';
      case 'forwarding_report':
        if (canonicalRole === 'VIEWER') return 'Forwarding Progressive Report (Read-Only)';
        if (canonicalRole === 'MANAGEMENT') return 'Forwarding Progressive Report (Executive View)';
        return 'Forwarding Progressive Report';
      case 'pod_returning':
        return 'POD Returning Module';
      case 'user_management':
        return 'Account Management & Registration Approvals';
      case 'reports':
        return 'Logistics & SLA Reports';
      case 'trash':
        return 'Recently Deleted & Operational Trash';
      case 'settings':
        return 'System Settings & Profile';
      default:
        return 'OFII Monitoring System';
    }
  };

  const getBreadcrumb = () => {
    const prefix = 
      canonicalRole === 'ADMIN' ? 'Admin Portal' :
      canonicalRole === 'MANAGEMENT' ? 'Management Portal' :
      canonicalRole === 'VIEWER' ? 'Viewer Portal' :
      canonicalRole === 'ENCODER' ? 'Encoder Portal' :
      canonicalRole === 'COORDINATOR' ? 'Coordinator Portal' :
      canonicalRole === 'TRUCK_PLANNER' ? 'Truck Planner Portal' :
      canonicalRole === 'DISPATCHER' ? 'Dispatcher Portal' : 'Portal';

    switch (currentTab) {
      case 'coordinator_portal':
        return `${prefix} / Delivery Batches & Projects`;
      case 'truck_planner':
        return `${prefix} / Truck Runs`;
      case 'dispatcher_portal':
        return `${prefix} / Gate Logistics & Dispatch Execution`;
      case 'dashboard':
        return `${prefix} / Operations Overview`;
      case 'dispatch':
        return `${prefix} / Daily Dispatching`;
      case 'client_management':
        return `${prefix} / Client Management`;
      case 'clients':
        return clientSelectedName ? `${prefix} / Clients / ${clientSelectedName}` : `${prefix} / Client Shipments`;
      case 'forwarding_report':
        return `${prefix} / Forwarding Progressive Report`;
      case 'pod_returning':
        return `${prefix} / POD Returning`;
      case 'user_management':
        return `${prefix} / User & Role Management`;
      case 'reports':
        return `${prefix} / Reports & Performance`;
      case 'trash':
        return `${prefix} / Operational Recovery & Trash`;
      case 'settings':
        return `${prefix} / Configuration`;
      default:
        return prefix;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 flex items-center justify-between sticky top-0 z-20 gap-2 sm:gap-4">
      {/* Left side: Hamburger button + Breadcrumb / Title */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
        {onToggleMobileNav && (
          <button
            type="button"
            onClick={onToggleMobileNav}
            aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 cursor-pointer transition-colors shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
            <span>{getBreadcrumb()}</span>
          </div>
          <h2 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      {/* Right side: Responsive action badges, status pills, user, notifications */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Real-time Cloud Database Status Pill */}
        <div 
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-medium transition-colors ${
            syncStatus.isSyncing || isLoading
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : syncStatus.isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={syncStatus.lastSyncedAt ? `Last Synced: ${syncStatus.lastSyncedAt}` : 'Real-time database active'}
        >
          {syncStatus.isSyncing || isLoading ? (
            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
          ) : (
            <Database className="w-3 h-3 text-emerald-600" />
          )}
          <span className="text-[11px]">
            {syncStatus.isSyncing || isLoading 
              ? 'Syncing DB...' 
              : 'Cloud DB Active'}
          </span>
          <button
            onClick={() => refreshData(true)}
            disabled={syncStatus.isSyncing || isLoading}
            className="ml-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 p-0.5 rounded cursor-pointer transition-colors"
            title="Force refresh from Supabase"
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Hub Selector */}
        <div className="hidden xl:flex items-center bg-slate-100 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-blue-700 mr-1.5 shrink-0" />
          <span className="text-slate-500 mr-1">Station:</span>
          <select
            value={selectedHub}
            onChange={(e) => onSelectHub(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="OFII Central Hub (Paranaque)">OFII Central Hub (Paranaque, NCR)</option>
            <option value="OFII North Harbor Pier 4 Terminal">OFII North Harbor Pier 4 Terminal</option>
            <option value="OFII Cebu Hub (Mandaue)">OFII Cebu Hub (Mandaue, Visayas)</option>
            <option value="OFII Davao Terminal (Sasa Wharf)">OFII Davao Terminal (Sasa Wharf, Mindanao)</option>
          </select>
        </div>

        {/* Live System Time / Date Badge */}
        <div className="hidden lg:flex items-center text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
          <Clock className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
          <span>Today: <strong className="text-slate-800">Aug 25, 2026</strong></span>
        </div>

        {/* Subtle Read-Only indicator for Viewer */}
        {(normalizeUserRole(currentUserProfile) === 'VIEWER' || getRolePermissions(currentUserProfile).isReadOnly) && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[11px] sm:text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span className="truncate">Read-Only</span>
          </div>
        )}

        {/* Compact User Info & Role Badge on all devices */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 sm:px-2.5 py-1 text-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[65px] sm:max-w-[120px]">
            {currentUserProfile?.name?.split(' ')[0] || 'User'}
          </span>
          <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 font-semibold rounded uppercase">
            {getUserRoleDisplayLabel(currentUserProfile).roleLabel}
          </span>
        </div>

        {/* Admin Pending Registration Request Quick Link */}
        {canonicalRole === 'ADMIN' && pendingAccountRequestsCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigateTab?.('user_management')}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Review pending personnel registration requests in Account Management"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>{pendingAccountRequestsCount} Pending</span>
          </button>
        )}

        {/* Notification Bell 🔔 */}
        <button
          id="btn-header-pod-notifications"
          onClick={onOpenNotifications}
          className={`relative p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center min-w-[38px] min-h-[38px] ${
            unreadCount > 0
              ? 'bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100/80'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        >
          <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-700 animate-bounce' : 'text-slate-600'}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] min-w-[18px] leading-tight shadow-xs border border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* SystemTMS Label */}
        <div className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 hidden lg:inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <span>TMS</span>
        </div>
      </div>
    </header>
  );
};

