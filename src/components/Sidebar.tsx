import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users,
  Building2, 
  FileSpreadsheet, 
  BarChart3, 
  Trash2,
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Boxes,
  FileCheck,
  X
} from 'lucide-react';
import { NavigationTab } from '../types';
import { useData } from '../context/DataContext';
import { isTabAuthorized, getUserRoleDisplayLabel, normalizeUserRole } from '../utils/roleUtils';
import { getPendingRequestsCount } from '../data/userAccounts';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  onLogout: () => void;
  unreadDispatchesCount?: number;
  deletedCount?: number;
  pendingNotificationsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  onLogout,
  unreadDispatchesCount = 8,
  deletedCount = 0,
  pendingNotificationsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { currentUserProfile, podReturningNotifications, dispatches } = useData();
  const [pendingAccountRequests, setPendingAccountRequests] = useState<number>(() => getPendingRequestsCount());

  useEffect(() => {
    const updatePending = () => setPendingAccountRequests(getPendingRequestsCount());
    window.addEventListener('ofii-accounts-changed', updatePending);
    window.addEventListener('storage', updatePending);
    return () => {
      window.removeEventListener('ofii-accounts-changed', updatePending);
      window.removeEventListener('storage', updatePending);
    };
  }, []);

  // Keyboard navigation & body scroll-lock for mobile navigation drawer
  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpenMobile, onCloseMobile]);

  const role = currentUserProfile?.userRole || '';
  const unreadPodReturningCount = podReturningNotifications?.filter(n => !n.isRead).length || 0;
  const activeDispatchesCount = (dispatches || []).filter(d => !d.isDeleted).length;
  const deliveredDispatchesCount = (dispatches || []).filter(d => !d.isDeleted && d.status === 'Delivered').length;
  const dispatchProgressPct = activeDispatchesCount > 0 
    ? Math.round((deliveredDispatchesCount / activeDispatchesCount) * 100) 
    : 100;

  const allNavItems = [
    // 1. Dashboard (Role-Scoped Overview)
    {
      id: 'dashboard' as NavigationTab,
      label: role === 'ADMIN' || role === 'office_head' ? 'Admin Dashboard' : (role === 'MANAGEMENT' ? 'Management Dashboard' : (role === 'VIEWER' ? 'Dashboard (Read-Only)' : 'Dashboard')),
      icon: LayoutDashboard,
      badge: null,
      description: 'Operational overview & summary counters',
      roles: ['ADMIN', 'office_head', 'coordinator', 'truck_planner', 'driver_head', 'dispatcher', 'encoder', 'VIEWER', 'MANAGEMENT'],
    },
    // Account Management (Admin Only - Phase 6.7.2 Approval Workflow)
    {
      id: 'user_management' as NavigationTab,
      label: 'Account Management',
      icon: Users,
      badge: pendingAccountRequests > 0 ? `${pendingAccountRequests} Pending` : 'Admin',
      badgeColor: pendingAccountRequests > 0 
        ? 'bg-amber-500 text-white font-black animate-pulse shadow-sm' 
        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
      description: 'Registration approvals & user accounts',
      roles: ['ADMIN', 'office_head'],
    },
    // 2. Coordinator Dedicated Portal (Strictly Coordinator only)
    {
      id: 'coordinator_portal' as NavigationTab,
      label: 'Coordinator Portal',
      icon: Briefcase,
      badge: currentUserProfile?.assignedClients?.length ? `${currentUserProfile.assignedClients.length} Accounts` : 'Batches',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      description: 'Delivery names & assigned consignments',
      roles: ['coordinator'],
    },
    // 3. Truck Planner / Driver's Head (Strictly Truck Planner / Driver's Head)
    {
      id: 'truck_planner' as NavigationTab,
      label: "Truck Planner / Driver's Head",
      icon: Boxes,
      badge: 'Runs',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      description: 'Route dispatch & truck runs',
      roles: ['truck_planner', 'driver_head', 'TRUCK_PLANNER', 'ADMIN'],
    },
    // 4. Dispatcher Dedicated Portal (Strictly Dispatcher only)
    {
      id: 'dispatcher_portal' as NavigationTab,
      label: 'Dispatcher Portal',
      icon: Truck,
      badge: 'Dispatches',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
      description: 'Dispatches ready for processing',
      roles: ['dispatcher', 'DISPATCHER', 'ADMIN'],
    },
    // 5. Daily Dispatching Monitoring System (Encoder Module 1 / Head Staff / Operations)
    {
      id: 'dispatch' as NavigationTab,
      label: role === 'encoder' ? 'Daily Dispatching Monitoring System' : (role === 'coordinator' ? 'Assigned Dispatches' : 'Daily Dispatching Monitoring'),
      icon: Truck,
      badge: pendingNotificationsCount > 0 ? `🔔 ${pendingNotificationsCount} New` : (unreadDispatchesCount > 0 ? `${unreadDispatchesCount}` : null),
      badgeColor: pendingNotificationsCount > 0 ? 'bg-amber-400 text-slate-950 font-bold border border-amber-300' : undefined,
      description: 'Fleet, loading & departures',
      roles: ['office_head', 'coordinator', 'truck_planner', 'driver_head', 'dispatcher', 'encoder', 'TRUCK_PLANNER', 'DISPATCHER', 'ADMIN'],
    },
    // 6. Client Management Directory
    {
      id: 'client_management' as NavigationTab,
      label: 'Client Management',
      icon: Users,
      badge: null,
      description: 'Directory & corporate profiles',
      roles: ['office_head', 'encoder', 'ADMIN'],
    },
    // 7. Client Shipment Monitoring
    {
      id: 'clients' as NavigationTab,
      label: role === 'coordinator' ? 'Assigned Client Shipments' : 'Client Shipment Monitoring',
      icon: Building2,
      badge: null,
      description: 'By client & reference numbers',
      roles: ['office_head', 'coordinator', 'ADMIN'],
    },
    // 8. Forwarding Progressive Report (Encoder Module 2)
    {
      id: 'forwarding_report' as NavigationTab,
      label: 'Forwarding Progressive Report',
      icon: FileSpreadsheet,
      badge: role === 'encoder' ? 'Report' : 'Active',
      badgeColor: role === 'encoder' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : undefined,
      description: 'Shipment and delivery master records',
      roles: ['office_head', 'coordinator', 'truck_planner', 'driver_head', 'dispatcher', 'encoder', 'TRUCK_PLANNER', 'DISPATCHER', 'ADMIN'],
    },
    // 9. POD RETURNING (Encoder Module 3 - Phase 5.1)
    {
      id: 'pod_returning' as NavigationTab,
      label: 'POD Returning',
      icon: FileCheck,
      badge: unreadPodReturningCount > 0 ? `🔔 ${unreadPodReturningCount} New` : null,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold border border-amber-300',
      description: 'Driver completions & POD returns',
      roles: ['office_head', 'encoder'],
    },
    // 8. Reports & Performance Analytics
    {
      id: 'reports' as NavigationTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: null,
      description: 'SLA & performance analytics',
      roles: ['office_head'],
    },
    // 9. Data Relationship & Duplicate Audit
    {
      id: 'data_audit' as NavigationTab,
      label: 'Data & Duplicate Audit',
      icon: ShieldCheck,
      badge: 'Audit',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      description: 'Single source & duplicate checks',
      roles: ['office_head', 'coordinator', 'truck_planner', 'driver_head', 'dispatcher', 'encoder'],
    },
    // 10. Trash & Operational Recovery
    {
      id: 'trash' as NavigationTab,
      label: 'Recently Deleted',
      icon: Trash2,
      badge: deletedCount > 0 ? `${deletedCount}` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      description: 'Trash & operational recovery',
      roles: ['office_head', 'encoder'],
    },
    // 10. Settings & Preferences
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
      description: 'Profile & preferences',
      roles: ['office_head', 'coordinator', 'truck_planner', 'driver_head', 'dispatcher', 'encoder'],
    },
  ];

  const navItems = allNavItems.filter(item => isTabAuthorized(currentUserProfile, item.id));

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full w-full select-none">
      {/* Brand & Corporate Header */}
      <div className="p-4 border-b border-slate-800/90 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-base tracking-wider border border-blue-500/40 shadow-sm shrink-0">
            OFII
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-white text-xs font-bold tracking-tight uppercase truncate">
              Orient Freight Int&apos;l
            </h1>
            <p className="text-[11px] text-blue-400 font-medium truncate">
              Monitoring System
            </p>
          </div>
        </div>

        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/40">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 text-[10px] text-slate-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Prototype v0.3</span>
        </div>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile && onCloseMobile) {
                  onCloseMobile();
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all group text-left cursor-pointer min-h-[44px] ${
                isActive
                  ? 'bg-blue-700 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-[10px] rounded font-semibold shrink-0 ${
                    isActive
                      ? 'bg-blue-800 text-blue-100'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Operational Status Box */}
      <div className="p-3 mx-3 mb-3 bg-slate-800/50 rounded border border-slate-700/60 text-xs">
        <div className="flex items-center justify-between text-slate-300 mb-1.5">
          <span className="text-[11px] font-semibold text-slate-200">Terminal Dispatch</span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">ONLINE</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(8, dispatchProgressPct))}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
          <span>{deliveredDispatchesCount} Delivered</span>
          <span>{activeDispatchesCount} Dispatches</span>
        </div>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-600/50 flex items-center justify-center text-blue-200 text-xs font-bold shrink-0">
              {currentUserProfile?.name ? currentUserProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'OF'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {currentUserProfile?.name || 'Office Operator'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <p className="text-[10px] text-slate-300 font-medium truncate leading-tight uppercase">
                  {getUserRoleDisplayLabel(currentUserProfile).fullBadge}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onLogout();
              if (isMobile && onCloseMobile) {
                onCloseMobile();
              }
            }}
            title="Sign Out to Login Screen"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Persistent Left Sidebar on Desktop (lg and up) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Accessible Collapsible Drawer for Mobile & Tablet (< lg) */}
      {isOpenMobile && (
        <div 
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Main Navigation Menu"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative flex-1 flex flex-col max-w-[280px] sm:max-w-xs w-full bg-slate-900 text-slate-300 shadow-2xl z-10 min-h-full animate-in slide-in-from-left duration-250">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
