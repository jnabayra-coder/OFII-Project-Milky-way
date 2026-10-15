import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  Check, 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Filter,
  ShieldCheck,
  AlertCircle,
  Boxes,
  Truck,
  ArrowRight,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { 
  PODNotification, 
  PODNotificationType, 
  TruckPlannerNotification,
  EncoderDispatchNotification,
  IndividualDelivery,
  TruckRun,
  UserRole
} from '../types';
import { getPendingRequestsCount } from '../data/userAccounts';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  podNotifications: PODNotification[];
  truckPlannerNotifications?: TruckPlannerNotification[];
  encoderNotifications?: EncoderDispatchNotification[];
  individualDeliveries?: IndividualDelivery[];
  truckRuns?: TruckRun[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onMarkTruckPlannerAsRead?: (notificationId: string) => void;
  onMarkAllTruckPlannerAsRead?: () => void;
  onMarkEncoderAsRead?: (notificationId: string) => void;
  onMarkAllEncoderAsRead?: () => void;
  onNavigateToTruckPlanner?: (batchName?: string) => void;
  onNavigateToAccountManagement?: () => void;
  onSelectRecord?: (recordId: string) => void;
  onSelectEncoderNotification?: (notification: EncoderDispatchNotification) => void;
  userRole?: UserRole;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  podNotifications,
  truckPlannerNotifications = [],
  encoderNotifications = [],
  individualDeliveries = [],
  truckRuns = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onMarkTruckPlannerAsRead,
  onMarkAllTruckPlannerAsRead,
  onMarkEncoderAsRead,
  onMarkAllEncoderAsRead,
  onNavigateToTruckPlanner,
  onNavigateToAccountManagement,
  onSelectRecord,
  onSelectEncoderNotification,
  userRole = 'office_head',
}) => {
  const roleClean = String(userRole || '').toUpperCase();
  const isEncoder = userRole === 'encoder' || roleClean === 'ENCODER';
  const isTruckPlanner = userRole === 'truck_planner' || (userRole as string) === 'driver_head' || roleClean === 'TRUCK_PLANNER';
  const isOfficeHead = userRole === 'office_head' || roleClean === 'ADMIN';
  const canAccessPlanner = isTruckPlanner || isOfficeHead;
  const pendingRequestsCount = isOfficeHead ? getPendingRequestsCount() : 0;

  // Active top-level tab:
  // - Encoder starts in 'encoder' (Dispatch Ready for Encoding)
  // - Truck Planner starts in 'planner'
  // - Others default to 'pod'
  const [activeSection, setActiveSection] = useState<'encoder' | 'planner' | 'pod'>(
    isEncoder ? 'encoder' : isTruckPlanner ? 'planner' : 'pod'
  );

  // Filters for Encoder Dispatch notifications
  const [encoderFilter, setEncoderFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  // Filters for Truck Planner notifications
  const [plannerFilter, setPlannerFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  // Filters for POD notifications
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | PODNotificationType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadEncoderCount = useMemo(
    () => encoderNotifications.filter((n) => !n.isRead).length,
    [encoderNotifications]
  );

  const unreadPodCount = useMemo(
    () => podNotifications.filter((n) => !n.isRead).length,
    [podNotifications]
  );

  const unreadPlannerCount = useMemo(
    () => truckPlannerNotifications.filter((n) => !n.isRead).length,
    [truckPlannerNotifications]
  );

  const totalUnreadCount = isEncoder
    ? unreadEncoderCount + unreadPodCount
    : isTruckPlanner
    ? unreadPlannerCount
    : isOfficeHead
    ? unreadEncoderCount + unreadPlannerCount + unreadPodCount
    : unreadPodCount;

  // Filtered Encoder Dispatch Notifications
  const filteredEncoderNotifications = useMemo(() => {
    return encoderNotifications.filter((n) => {
      if (encoderFilter === 'UNREAD' && n.isRead) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDeliveryId = n.deliveryId?.toLowerCase().includes(q);
        const matchesBatch = n.batchName?.toLowerCase().includes(q);
        const matchesClient = n.client?.toLowerCase().includes(q);
        const matchesConsignee = n.consignee?.toLowerCase().includes(q);
        const matchesPod = n.individualDeliveryPod?.toLowerCase().includes(q);
        const matchesPlace = n.place?.toLowerCase().includes(q);
        const matchesTruck = n.truckDispatchNumber?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        return matchesDeliveryId || matchesBatch || matchesClient || matchesConsignee || matchesPod || matchesPlace || matchesTruck || matchesMsg;
      }
      return true;
    });
  }, [encoderNotifications, encoderFilter, searchQuery]);

  // Filtered Truck Planner Notifications
  const filteredPlannerNotifications = useMemo(() => {
    return truckPlannerNotifications.filter((n) => {
      if (plannerFilter === 'UNREAD' && n.isRead) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBatch = n.batchName?.toLowerCase().includes(q);
        const matchesClient = n.client?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        return matchesBatch || matchesClient || matchesMsg;
      }
      return true;
    });
  }, [truckPlannerNotifications, plannerFilter, searchQuery]);

  // Filtered POD Notifications
  const filteredPodNotifications = useMemo(() => {
    return podNotifications.filter((n) => {
      if (filterType === 'UNREAD' && n.isRead) return false;
      if (filterType !== 'ALL' && filterType !== 'UNREAD' && n.type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesClient = n.client?.toLowerCase().includes(q);
        const matchesRef = n.referenceNumber?.toLowerCase().includes(q);
        const matchesPod = n.podNumber?.toLowerCase().includes(q);
        const matchesCoordinator = n.coordinator?.toLowerCase().includes(q);
        const matchesConsignee = n.consignee?.toLowerCase().includes(q);
        const matchesMsg = n.message?.toLowerCase().includes(q);
        return matchesClient || matchesRef || matchesPod || matchesCoordinator || matchesConsignee || matchesMsg;
      }

      return true;
    });
  }, [podNotifications, filterType, searchQuery]);

  if (!isOpen) return null;

  const getTypeBadge = (type: PODNotificationType) => {
    switch (type) {
      case 'POD_DUE_SOON':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            Due Soon
          </span>
        );
      case 'POD_OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
            Overdue
          </span>
        );
      case 'POD_RETURNED_LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            Returned Late
          </span>
        );
      case 'POD_RETURNED_ONTIME':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Returned On Time
          </span>
        );
      case 'DELIVERY_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Delivery Completed
          </span>
        );
    }
  };

  const getSlaBadge = (sla: string) => {
    if (sla === 'HIT') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">SLA: HIT</span>;
    }
    if (sla === 'MISSED') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">SLA: MISSED</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">SLA: PENDING</span>;
  };

  return (
    <div 
      id="pod-notification-center-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="pod-notification-center-modal"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Top Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  Office Notification Center
                </h3>
                {totalUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                    {totalUnreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time operational alerts for Dispatches Ready for Daily Monitoring, Truck Planning, and POD SLA compliance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mark All Read Action */}
            {activeSection === 'encoder' && unreadEncoderCount > 0 && onMarkAllEncoderAsRead && (
              <button
                id="btn-mark-all-encoder-read"
                onClick={onMarkAllEncoderAsRead}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}

            {activeSection === 'planner' && unreadPlannerCount > 0 && onMarkAllTruckPlannerAsRead && (
              <button
                id="btn-mark-all-planner-read"
                onClick={onMarkAllTruckPlannerAsRead}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}

            {activeSection === 'pod' && unreadPodCount > 0 && (
              <button
                id="btn-mark-all-notifications-read"
                onClick={onMarkAllAsRead}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10"
              >
                <Check className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}

            <button
              id="btn-close-notification-center"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        {(isOfficeHead || isEncoder) && (
          <div className="bg-slate-100 px-6 pt-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            {/* Tab 1: Dispatch Ready for Daily Monitoring */}
            <button
              type="button"
              id="tab-notification-encoder"
              onClick={() => setActiveSection('encoder')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSection === 'encoder'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs -mb-px'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Dispatch Ready for Daily Monitoring</span>
              {unreadEncoderCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-black text-[10px]">
                  {unreadEncoderCount}
                </span>
              )}
            </button>

            {/* Tab 2: Truck Planning Deliveries (Office Head & Truck Planner) */}
            {canAccessPlanner && (
              <button
                type="button"
                id="tab-notification-planner"
                onClick={() => setActiveSection('planner')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeSection === 'planner'
                    ? 'bg-white text-slate-900 border-slate-200 shadow-2xs -mb-px'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span>Truck Planning Deliveries</span>
                {unreadPlannerCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                    {unreadPlannerCount}
                  </span>
                )}
              </button>
            )}

            {/* Tab 3: POD & SLA Alerts */}
            <button
              type="button"
              id="tab-notification-pod"
              onClick={() => setActiveSection('pod')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSection === 'pod'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs -mb-px'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>POD & SLA Alerts</span>
              {unreadPodCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px]">
                  {unreadPodCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Pending Account Registration Requests Alert (Phase 6.7.2 - Requirement 5) */}
        {isOfficeHead && pendingRequestsCount > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <span>
                <strong>{pendingRequestsCount} Pending Registration Request{pendingRequestsCount > 1 ? 's' : ''}:</strong> Awaiting Administrator review and role authorization.
              </span>
            </div>
            {onNavigateToAccountManagement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAccountManagement();
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>Review Requests →</span>
              </button>
            )}
          </div>
        )}

        {/* Search & Filter Sub-Bar */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {activeSection === 'encoder' ? (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setEncoderFilter('ALL')}
                className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  encoderFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All ({encoderNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setEncoderFilter('UNREAD')}
                className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  encoderFilter === 'UNREAD'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>Unread</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900">
                  {unreadEncoderCount}
                </span>
              </button>
            </div>
          ) : activeSection === 'planner' ? (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setPlannerFilter('ALL')}
                className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  plannerFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All ({truckPlannerNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setPlannerFilter('UNREAD')}
                className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  plannerFilter === 'UNREAD'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>Unread</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                  {unreadPlannerCount}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto text-xs">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All ({podNotifications.length})
              </button>
              <button
                onClick={() => setFilterType('UNREAD')}
                className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                  filterType === 'UNREAD'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>Unread</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                  {unreadPodCount}
                </span>
              </button>
              <button
                onClick={() => setFilterType('POD_DUE_SOON')}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  filterType === 'POD_DUE_SOON'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🟡 Due Soon
              </button>
              <button
                onClick={() => setFilterType('POD_OVERDUE')}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  filterType === 'POD_OVERDUE'
                    ? 'bg-rose-700 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                🔴 Overdue
              </button>
            </div>
          )}

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSection === 'encoder'
                  ? 'Search Delivery ID, batch, consignee, POD...'
                  : activeSection === 'planner'
                  ? 'Search delivery batch or client...'
                  : 'Search client, ref, coordinator...'
              }
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB CONTENT 0: ENCODER DISPATCH NOTIFICATIONS (Phase 3B.8)          */}
        {/* ------------------------------------------------------------------ */}
        {activeSection === 'encoder' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {filteredEncoderNotifications.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">
                  {encoderFilter === 'UNREAD'
                    ? 'No Unread Daily Dispatching Notifications'
                    : 'No Dispatches Awaiting Daily Monitoring'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {encoderFilter === 'UNREAD'
                    ? 'All daily monitoring dispatch notifications have been reviewed.'
                    : 'When the Dispatcher encodes and saves operational dispatch information for deliveries, notifications will appear here for the Encoder to review in Daily Dispatching Monitoring.'}
                </p>
              </div>
            ) : (
              filteredEncoderNotifications.map((notif) => {
                const isUnread = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    id={`encoder-notif-${notif.id}`}
                    className={`p-4 rounded-xl transition-all border text-left flex flex-col gap-3 relative ${
                      isUnread
                        ? 'bg-blue-50/50 hover:bg-blue-50/80 border-blue-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                          <Truck className="w-3.5 h-3.5 text-blue-700" />
                          <span>{notif.title}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
                          {notif.deliveryId}
                        </span>
                        {isUnread ? (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-600 text-white tracking-wide uppercase">
                            UNREAD
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            READ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-slate-400 text-[11px] shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-xs font-semibold text-slate-800">
                      {notif.message}
                    </p>

                    {/* Operational Dispatch Information Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white/90 p-3 rounded-lg border border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Truck Run / Dispatch Number</span>
                        <strong className="font-mono text-slate-800 truncate block" title={notif.truckDispatchNumber || '—'}>
                          {notif.truckDispatchNumber || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Delivery ID</span>
                        <strong className="font-mono text-slate-900">{notif.deliveryId}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Delivery Name / Batch</span>
                        <strong className="text-slate-900 truncate block" title={notif.batchName}>{notif.batchName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Client</span>
                        <strong className="text-slate-900 truncate block" title={notif.client}>{notif.client}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Consignee</span>
                        <strong className="text-slate-900 truncate block" title={notif.consignee}>{notif.consignee}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Place / Destination</span>
                        <strong className="text-slate-900 truncate block" title={notif.place}>{notif.place}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Delivery Area</span>
                        <strong className="text-slate-800 font-medium">{notif.deliveryArea || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Quantity</span>
                        <strong className="text-slate-900">{notif.quantity !== undefined ? notif.quantity : '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Individual Delivery POD</span>
                        <strong className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                          #{notif.individualDeliveryPod || 'Pending'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Truck / Dispatch POD</span>
                        <strong className="font-mono text-slate-700">{notif.truckDispatchPod || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block">Actual Departure</span>
                        <strong className="text-emerald-700 font-semibold">{notif.actualDeparture || 'In Transit'}</strong>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div>
                        {isUnread && onMarkEncoderAsRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkEncoderAsRead(notif.id);
                            }}
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer py-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            Mark as read
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        id={`btn-open-dispatch-${notif.deliveryId}`}
                        onClick={() => {
                          if (onMarkEncoderAsRead) onMarkEncoderAsRead(notif.id);
                          if (onSelectEncoderNotification) {
                            onSelectEncoderNotification(notif);
                          }
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Open in Daily Dispatching</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB CONTENT 1: TRUCK PLANNER NOTIFICATIONS                         */}
        {/* ------------------------------------------------------------------ */}
        {activeSection === 'planner' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {filteredPlannerNotifications.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Truck Planning Notifications</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {plannerFilter === 'UNREAD'
                    ? 'All delivery notifications have been marked as read.'
                    : 'When new Delivery Batches or Individual Deliveries are added or imported, planning alerts will appear here.'}
                </p>
              </div>
            ) : (
              filteredPlannerNotifications.map((notif) => {
                const isUnread = !notif.isRead;
                
                // Dynamic stats from individualDeliveries
                const linkedDeliveries = individualDeliveries.filter((d) => d.batchId === notif.batchId);
                const unplannedCount = linkedDeliveries.filter((d) => !d.truckRunId).length;
                const plannedCount = linkedDeliveries.filter((d) => !!d.truckRunId).length;
                const isFullyPlanned = linkedDeliveries.length > 0 && unplannedCount === 0;

                const isProjectInit = notif.type === 'NEW_PROJECT_CREATED' || (linkedDeliveries.length === 0 && notif.newDeliveriesCount === 0);

                return (
                  <div
                    key={notif.id}
                    id={`notif-card-${notif.id}`}
                    onClick={() => {
                      if (onMarkTruckPlannerAsRead) onMarkTruckPlannerAsRead(notif.id);
                      if (onNavigateToTruckPlanner) onNavigateToTruckPlanner(notif.batchName);
                      onClose();
                    }}
                    className={`p-4 rounded-xl transition-all border text-left flex flex-col gap-3 relative cursor-pointer ${
                      isUnread
                        ? isProjectInit
                          ? 'bg-blue-50/50 hover:bg-blue-50/80 border-blue-300 shadow-xs'
                          : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isProjectInit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            <Bell className="w-3.5 h-3.5 text-blue-700" />
                            <span>New Project Created</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Bell className="w-3.5 h-3.5 text-amber-700" />
                            <span>New Deliveries Available</span>
                          </span>
                        )}
                        
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {notif.source === 'EXCEL_IMPORT'
                            ? 'Excel Import'
                            : notif.source === 'PROJECT_CREATE'
                            ? 'Project Created'
                            : notif.source === 'MANUAL_CREATE'
                            ? 'New Batch'
                            : 'Manual Add'}
                        </span>

                        {isUnread && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isProjectInit
                              ? 'text-blue-900 bg-blue-200'
                              : 'text-amber-800 bg-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                              isProjectInit ? 'bg-blue-600' : 'bg-amber-600'
                            }`}></span>
                            Unread
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isUnread && onMarkTruckPlannerAsRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkTruckPlannerAsRead(notif.id);
                            }}
                            className="ml-2 text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Name & Client Display */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Delivery Name / Project Batch
                        </div>
                        <div className="text-base font-black text-slate-900 flex items-center gap-1.5">
                          <Boxes className={`w-4 h-4 ${isProjectInit ? 'text-blue-600' : 'text-amber-600'}`} />
                          <span>{notif.batchName}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Client: <strong>{notif.client}</strong></span>
                        </div>
                      </div>

                      {/* Dynamic Status / Progress */}
                      <div className="text-left sm:text-right">
                        {isFullyPlanned ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Completed
                            </span>
                            <div className="text-[11px] text-slate-500 mt-1">
                              All {linkedDeliveries.length} deliveries assigned to Truck Runs
                            </div>
                          </div>
                        ) : isProjectInit ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              Project Initialized
                            </span>
                            <div className="text-[11px] text-slate-500 mt-1 font-medium">
                              0 individual deliveries &bull; Ready for processing
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Ready for Truck Planning
                            </span>
                            <div className="text-[11px] text-slate-600 mt-1 font-medium">
                              <strong>{unplannedCount > 0 ? unplannedCount : notif.newDeliveriesCount}</strong> unassigned deliveries
                              {plannedCount > 0 && <span className="text-slate-400"> ({plannedCount} planned)</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Deliveries Count Summary & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-slate-700 font-medium">
                        {notif.message || (isProjectInit ? 'The project is ready for delivery processing.' : `${notif.newDeliveriesCount} new individual deliveries ready for Truck Planning.`)}
                      </p>

                      <button
                        type="button"
                        id={`btn-view-deliveries-${notif.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMarkTruckPlannerAsRead) {
                            onMarkTruckPlannerAsRead(notif.id);
                          }
                          if (onNavigateToTruckPlanner) {
                            onNavigateToTruckPlanner(notif.batchName);
                          }
                          onClose();
                        }}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all ${
                          isFullyPlanned
                            ? 'bg-slate-800 hover:bg-slate-900 text-white'
                            : isProjectInit
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        <span>
                          {isProjectInit
                            ? 'Open in Truck Planner'
                            : isFullyPlanned
                            ? 'View in Truck Planner'
                            : 'View Deliveries'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB CONTENT 2: POD SLA NOTIFICATIONS                               */}
        {/* ------------------------------------------------------------------ */}
        {activeSection === 'pod' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100 space-y-2">
            {filteredPodNotifications.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Notifications Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {filterType === 'UNREAD' 
                    ? 'Great job! You have no unread POD notifications.' 
                    : 'All POD deadlines are up to date and monitored.'}
                </p>
              </div>
            ) : (
              filteredPodNotifications.map((notif) => {
                const isUnread = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    id={`notif-card-${notif.id}`}
                    onClick={() => {
                      if (isUnread) onMarkAsRead(notif.id);
                    }}
                    className={`p-4 rounded-lg transition-all border text-left cursor-pointer flex flex-col gap-2 relative ${
                      isUnread
                        ? 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-200 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Top Row: Type Badge + Title + Coordinator + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(notif.type)}
                        <h4 className="text-sm font-bold text-slate-900">
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread notification" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getSlaBadge(notif.podSla)}
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notif.id);
                            }}
                            className="text-[11px] font-medium text-blue-700 hover:text-blue-900 underline px-1 cursor-pointer"
                            title="Mark as read"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Main Message */}
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {notif.message}
                    </p>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded border border-slate-200/70">
                      <div>
                        <span className="text-slate-400 block font-normal">Client:</span>
                        <strong className="text-slate-800 font-semibold truncate block">
                          {notif.client}
                        </strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-normal">Consignee & Area:</span>
                        <span className="font-semibold text-slate-900 block truncate">
                          {notif.consignee || '—'} {notif.area ? `(${notif.area})` : ''}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-normal">
                          {notif.type === 'DELIVERY_COMPLETED' ? 'Assigned Driver:' : 'Assigned Coordinator:'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-900 truncate">
                          <User className="w-3 h-3 text-blue-600 shrink-0" />
                          {notif.type === 'DELIVERY_COMPLETED' && notif.driverName ? notif.driverName : (notif.coordinator || 'Unassigned')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-normal">
                          {notif.type === 'DELIVERY_COMPLETED' ? 'Receiver & Date:' : 'POD Due Date:'}
                        </span>
                        <span className="font-medium text-slate-900 block truncate">
                          {notif.type === 'DELIVERY_COMPLETED' 
                            ? `${notif.receiverName || 'Received'} • ${notif.dateReceived || notif.actualDeliveryDate || '—'}`
                            : (notif.podReturnDueDateFormatted || notif.podReturnDueDate || '—')
                          }
                        </span>
                      </div>
                    </div>

                    {/* Bottom Footer: Delivery Date, Return Date & Action Link */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>Delivered: <strong>{notif.actualDeliveryDate || '—'}</strong></span>
                        {notif.vehicle && (
                          <span>Vehicle: <strong className="text-slate-800 font-mono">{notif.vehicle} ({notif.plateNumber || '—'})</strong></span>
                        )}
                        {notif.actualPodReturnDate && (
                          <span>Returned: <strong>{notif.actualPodReturnDate}</strong></span>
                        )}
                        <span>Status: <strong className="text-slate-800">{notif.podStatus}</strong></span>
                      </div>

                      {onSelectRecord && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUnread) onMarkAsRead(notif.id);
                            onSelectRecord(notif.recordId);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 cursor-pointer ml-auto"
                        >
                          <span>View Shipment Record</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            {activeSection === 'encoder' ? (
              <span>Showing <strong>{filteredEncoderNotifications.length}</strong> of <strong>{encoderNotifications.length}</strong> dispatch notifications ready for daily monitoring</span>
            ) : activeSection === 'planner' ? (
              <span>Showing <strong>{filteredPlannerNotifications.length}</strong> of <strong>{truckPlannerNotifications.length}</strong> delivery notifications</span>
            ) : (
              <span>Showing <strong>{filteredPodNotifications.length}</strong> of <strong>{podNotifications.length}</strong> alerts</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
