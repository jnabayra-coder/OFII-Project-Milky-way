import React, { useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  ArrowRight, 
  X, 
  Building2, 
  FileText, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ShieldAlert,
  Info,
  Check
} from 'lucide-react';
import { 
  ForwardingDispatchNotification, 
  DispatchRecord 
} from '../types';

interface ForwardingDispatchNotificationPanelProps {
  notifications: ForwardingDispatchNotification[];
  dispatches: DispatchRecord[];
  onCompleteDispatch: (notification: ForwardingDispatchNotification) => void;
  onDismissNotification: (notificationId: string) => void;
  onViewExistingDispatch: (dispatch: DispatchRecord) => void;
}

export const ForwardingDispatchNotificationPanel: React.FC<ForwardingDispatchNotificationPanelProps> = ({
  notifications,
  dispatches,
  onCompleteDispatch,
  onDismissNotification,
  onViewExistingDispatch,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'unresolved' | 'all'>('unresolved');

  // Filter unresolved (NEW and IN PROGRESS, not dismissed)
  const unresolvedNotifications = notifications.filter(
    n => !n.isDismissed && (n.status === 'NEW' || n.status === 'IN PROGRESS')
  );

  const displayedNotifications = activeFilter === 'unresolved' 
    ? unresolvedNotifications 
    : notifications.filter(n => !n.isDismissed);

  // Function to check if a dispatch already exists for this notification (Duplicate Protection)
  const findMatchingDispatch = (notif: ForwardingDispatchNotification): DispatchRecord | undefined => {
    return dispatches.find(d => {
      if (d.isDeleted) return false;
      const cleanNotifPod = notif.podNumber?.trim().toLowerCase();
      const cleanDispatchPod = d.podNumber?.trim().toLowerCase();
      
      if (cleanNotifPod && cleanDispatchPod && cleanNotifPod === cleanDispatchPod) {
        return true;
      }
      
      if (notif.referenceNumber && d.manifestNumber && d.manifestNumber.toLowerCase().includes(notif.referenceNumber.toLowerCase())) {
        return true;
      }

      if (notif.referenceNumber && d.remarks && d.remarks.toLowerCase().includes(notif.referenceNumber.toLowerCase())) {
        return true;
      }

      return false;
    });
  };

  if (notifications.length === 0) {
    return null;
  }

  const unresolvedCount = unresolvedNotifications.length;

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-xs overflow-hidden">
      {/* Header Bar with Toggle and Count Indicator */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/60 border border-blue-400/40 flex items-center justify-center text-white shadow-inner">
              <Bell className="w-4 h-4 text-blue-200 animate-pulse" />
            </div>
            {unresolvedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs">
                {unresolvedCount}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                Forwarding → Dispatch Notification
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {unresolvedCount} {unresolvedCount === 1 ? 'New' : 'New'}
              </span>
            </div>
            <p className="text-xs text-blue-200/90 mt-0.5 truncate">
              Shipments logged in Forwarding Progressive Report awaiting operational dispatch completion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* View Filter Toggle */}
          <div className="inline-flex rounded bg-black/20 p-0.5 border border-white/10 text-xs">
            <button
              onClick={() => setActiveFilter('unresolved')}
              className={`min-h-[28px] px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeFilter === 'unresolved'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Pending ({unresolvedCount})
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`min-h-[28px] px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              All ({notifications.filter(n => !n.isDismissed).length})
            </button>
          </div>

          {/* Expand / Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded hover:bg-white/10 text-blue-200 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? "Collapse Panel" : "Expand Panel"}
            aria-label={isExpanded ? "Collapse Panel" : "Expand Panel"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Notification Items List */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 bg-slate-50/70 border-t border-slate-200">
          {displayedNotifications.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-lg border border-slate-200 shadow-2xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                All Forwarding Dispatches Up to Date
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                There are no pending shipments from Forwarding Progressive Report requiring dispatch completion.
              </p>
            </div>
          ) : (
            displayedNotifications.map((notification) => {
              const matchingDispatch = findMatchingDispatch(notification);
              const isDuplicate = !!matchingDispatch;
              const isCompleted = notification.status === 'COMPLETED';
              const isInProgress = notification.status === 'IN PROGRESS';

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg border transition-all duration-200 shadow-xs overflow-hidden ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : isDuplicate
                      ? 'border-amber-300 bg-amber-50/20'
                      : isInProgress
                      ? 'border-indigo-300 ring-1 ring-indigo-200'
                      : 'border-blue-200 hover:border-blue-300'
                  }`}
                >
                  {/* Item Top Status Ribbon */}
                  <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                        <span>New Shipment Added</span>
                      </span>

                      {/* Status Badges */}
                      {notification.status === 'NEW' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                          NEW
                        </span>
                      )}
                      {notification.status === 'IN PROGRESS' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300 animate-pulse">
                          IN PROGRESS
                        </span>
                      )}
                      {notification.status === 'COMPLETED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          COMPLETED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span>Source: <strong className="text-slate-700 font-semibold">{notification.source}</strong></span>
                      <span>•</span>
                      <span>{new Date(notification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    {/* Information Grid: Client, Consignee, POD Number, Reference Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Client
                        </span>
                        <div className="font-bold text-slate-900 truncate mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate" title={notification.client}>{notification.client}</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Consignee / Delivery Name
                        </span>
                        <div className="font-bold text-slate-900 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate" title={notification.consignee}>{notification.consignee}</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          POD Number
                        </span>
                        <div className="font-mono font-bold text-blue-900 mt-0.5">
                          {notification.podNumber}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Reference Number
                        </span>
                        <div className="font-mono font-semibold text-slate-700 mt-0.5">
                          {notification.referenceNumber || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Operational Instruction Message */}
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded text-xs text-blue-950 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* DUPLICATE PROTECTION ALERT BANNER */}
                    {isDuplicate && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-950 block">
                              A Dispatch record already exists for this shipment.
                            </span>
                            <span className="text-amber-800 text-[11px] block mt-0.5">
                              Dispatch ID: <strong>{matchingDispatch.id}</strong> • Plate: <strong>{matchingDispatch.plateNumber}</strong> • Status: <strong>{matchingDispatch.status}</strong> • Destination: {matchingDispatch.destination}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onViewExistingDispatch(matchingDispatch)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>VIEW DISPATCH</span>
                        </button>
                      </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 gap-2.5">
                      <div className="text-[11px] text-slate-500 italic">
                        {isCompleted 
                          ? `Completed on ${notification.completedAt ? new Date(notification.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}`
                          : 'Pre-fills known shipment information into the Add Dispatch form.'}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                        {/* Secondary Action: Dismiss */}
                        <button
                          type="button"
                          onClick={() => onDismissNotification(notification.id)}
                          className="min-h-[32px] px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          DISMISS
                        </button>

                        {/* Primary Action: Complete Dispatch Record */}
                        {!isCompleted && !isDuplicate && (
                          <button
                            type="button"
                            onClick={() => onCompleteDispatch(notification)}
                            className="min-h-[32px] inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>COMPLETE DISPATCH RECORD</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isDuplicate && (
                          <button
                            type="button"
                            onClick={() => onViewExistingDispatch(matchingDispatch)}
                            className="min-h-[32px] inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>VIEW DISPATCH</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
