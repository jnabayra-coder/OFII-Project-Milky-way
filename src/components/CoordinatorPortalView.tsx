import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  FileCheck, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Eye, 
  ShieldCheck, 
  ArrowRight, 
  SlidersHorizontal,
  Info,
  UserCheck,
  Phone,
  Layers,
  ChevronDown,
  FolderPlus,
  Boxes,
  AlertCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { DeliveryBatchesManager } from './DeliveryBatchesManager';
import { CreateDeliveryBatchModal } from './CreateDeliveryBatchModal';
import { 
  ForwardingProgressiveRecord, 
  DispatchRecord, 
  UserProfile, 
  ClientSummary 
} from '../types';
import { isCoordinatorRole, normalizeUserRole } from '../utils/roleUtils';

interface CoordinatorPortalViewProps {
  currentUser: UserProfile;
  forwardingRecords: ForwardingProgressiveRecord[];
  dispatches: DispatchRecord[];
  clients: ClientSummary[];
  shipments?: any[];
  onSelectForwardingRecord?: (record: ForwardingProgressiveRecord) => void;
  onSelectDispatch?: (dispatch: DispatchRecord) => void;
  onNavigateToForwarding?: () => void;
  onNavigateToShipments?: () => void;
  onNavigateToTruckPlanner?: () => void;
}

export const CoordinatorPortalView: React.FC<CoordinatorPortalViewProps> = ({
  currentUser,
  forwardingRecords,
  dispatches,
  clients,
  onSelectForwardingRecord,
  onSelectDispatch,
  onNavigateToTruckPlanner,
}) => {
  const { deliveryBatches } = useData();
  const [activeTab, setActiveTab] = useState<'batches' | 'monitoring'>('batches');
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);

  // Determine assigned clients for this coordinator
  const assignedClientNames = useMemo(() => {
    if (currentUser.assignedClients && currentUser.assignedClients.length > 0) {
      return currentUser.assignedClients;
    }
    // Fallback: match clients assigned to this coordinator by name
    const matched = clients
      .filter(c => c.assignedCoordinator?.toLowerCase() === currentUser.name.toLowerCase() || 
                   c.accountManager?.toLowerCase().includes(currentUser.name.toLowerCase()))
      .map(c => c.name);
    
    if (matched.length > 0) return matched;

    // Default to PCSO and Alexandria if coordinator has no explicit list
    return ['Philippine Charity Sweepstakes Office', 'Alexandria and Centers of Wisdom Corporation'];
  }, [currentUser, clients]);

  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<ForwardingProgressiveRecord | null>(null);

  // Filter records strictly to assigned clients
  const coordinatorRecords = useMemo(() => {
    return forwardingRecords.filter(rec => {
      // Security rule: Only assigned clients
      const isAssigned = assignedClientNames.some(
        name => name.toLowerCase() === rec.client.toLowerCase()
      );
      if (!isAssigned) return false;

      // Filter by specific client if selected
      if (selectedClientFilter !== 'ALL' && rec.client !== selectedClientFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'IN_TRANSIT' && rec.deliveryStatus !== 'In Transit') return false;
      if (statusFilter === 'DELIVERED' && rec.deliveryStatus !== 'Delivered') return false;
      if (statusFilter === 'DELAYED' && rec.deliveryPerformance !== 'MISSED' && (rec.deliveryStatus as string) !== 'Delayed') return false;
      if (statusFilter === 'PENDING_POD' && (rec.podStatus === 'Returned' || rec.podStatus === 'POD On Time')) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          rec.client.toLowerCase().includes(q) ||
          rec.consignee.toLowerCase().includes(q) ||
          rec.podNumber.toLowerCase().includes(q) ||
          rec.referenceNumber.toLowerCase().includes(q) ||
          rec.area.toLowerCase().includes(q) ||
          (rec.destination && rec.destination.toLowerCase().includes(q)) ||
          (rec.driverName && rec.driverName.toLowerCase().includes(q)) ||
          (rec.plateNumber && rec.plateNumber.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [forwardingRecords, assignedClientNames, selectedClientFilter, statusFilter, searchQuery]);

  // Key KPI stats for coordinator's assigned accounts
  const stats = useMemo(() => {
    const total = coordinatorRecords.length;
    const inTransit = coordinatorRecords.filter(r => r.deliveryStatus === 'In Transit').length;
    const delivered = coordinatorRecords.filter(r => r.deliveryStatus === 'Delivered' || r.actualDeliveryDate).length;
    const delayed = coordinatorRecords.filter(r => r.deliveryPerformance === 'MISSED' || (r.deliveryStatus as string) === 'Delayed').length;
    const hits = coordinatorRecords.filter(r => r.deliveryPerformance === 'HIT').length;
    const hitRate = delivered > 0 ? Math.round((hits / delivered) * 1000) / 10 : 100;
    const pendingPod = coordinatorRecords.filter(r => r.podStatus === 'Pending Return' || r.podStatus === 'POD Pending' || !r.dateOfPodReturn).length;

    return { total, inTransit, delivered, delayed, hitRate, pendingPod };
  }, [coordinatorRecords]);

  // Centralized role validation & approval check (Phase 6.7.3/6.7.4)
  const isAuthorizedCoordinator = isCoordinatorRole(currentUser) || normalizeUserRole(currentUser) === 'ADMIN';
  const isApproved = !currentUser?.approvalStatus || currentUser?.approvalStatus === 'APPROVED';
  const canCreateProject = (isCoordinatorRole(currentUser) || normalizeUserRole(currentUser) === 'ADMIN') && isApproved;

  // Access guard: strictly Coordinator only (with Admin system oversight)
  if (!isAuthorizedCoordinator || !isApproved) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted to Coordinators</h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          The Coordinator Portal is strictly reserved for Account Coordinators to manage client delivery names, batches, and assigned consignments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" id="coordinator-portal-root">
      {/* 1. COORDINATOR HEADER & IDENTITY */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-emerald-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
              <Building2 className="w-3.5 h-3.5" />
              Coordinator Operations Portal • Assigned Accounts
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>{currentUser.name}</span>
              <span className="text-sm font-normal text-emerald-300/80 bg-white/10 px-2.5 py-0.5 rounded-md">
                {currentUser.role || 'Senior Key Accounts Coordinator'}
              </span>
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-3xl leading-relaxed">
              Serving as the operational bridge between <span className="text-emerald-200 font-semibold">Client Company ↕ Orient Freight ↕ Consignee</span>.
              Displaying real-time shipment monitoring, RDD compliance, leadtime SLA, and POD returns for your assigned accounts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {canCreateProject && (
              <button
                id="coordinator-header-new-project-btn"
                type="button"
                onClick={() => {
                  setActiveTab('batches');
                  setIsCreateBatchModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-slate-950" />
                <span>[ + New Project ]</span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2 bg-black/30 p-3 rounded-lg border border-white/10">
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Assigned Clients:</span> {assignedClientNames.length}
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="text-xs text-emerald-300 font-medium">
                Employee ID: <span className="font-mono text-white">{currentUser.employeeId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Clients Pills */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-emerald-200/70 mr-1">Your Portfolio:</span>
          {assignedClientNames.map((clientName) => (
            <button
              key={clientName}
              onClick={() => setSelectedClientFilter(clientName === selectedClientFilter ? 'ALL' : clientName)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedClientFilter === clientName
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              {clientName}
            </button>
          ))}
          {selectedClientFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedClientFilter('ALL')}
              className="text-xs text-emerald-300 hover:text-white underline ml-2"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* 2. SECTION TABS */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-px overflow-x-auto whitespace-nowrap">
        <button
          id="coordinator-tab-batches"
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2.5 ${
            activeTab === 'batches'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Delivery Batches / Projects</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-mono font-bold">
            {deliveryBatches.length}
          </span>
        </button>

        <button
          id="coordinator-tab-monitoring"
          type="button"
          onClick={() => setActiveTab('monitoring')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2.5 ${
            activeTab === 'monitoring'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Client Consignment Monitoring</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono font-semibold">
            {coordinatorRecords.length}
          </span>
        </button>
      </div>

      {activeTab === 'batches' ? (
        <DeliveryBatchesManager currentCoordinatorName={currentUser.name} />
      ) : (
        <>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Shipments</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Assigned client freight</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">In Transit</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.inTransit}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active on road / sea / air</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.delivered}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Received by consignee</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Delayed</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{stats.delayed}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Requires client advisory</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">SLA Hit Rate</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700">{stats.hitRate}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Leadtime delivery target</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Pending POD</span>
            <FileCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.pendingPod}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting return to client</div>
        </div>
      </div>

      {/* 3. CONTROLS BAR: SEARCH, CLIENT FILTER, STATUS */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search consignee, POD #, area, plate, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Delivery Statuses</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DELAYED">Delayed / Critical</option>
            <option value="PENDING_POD">Pending POD Return</option>
          </select>

          <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-md">
            Showing <span className="text-slate-900 font-bold">{coordinatorRecords.length}</span> record{coordinatorRecords.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* 4. COORDINATOR DELIVERIES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">Client Consignment Monitoring Table</h2>
            <p className="text-xs text-slate-500">Live operational records filtered exclusively to your assigned account portfolio</p>
          </div>
        </div>

        <div className="w-full min-w-0">
          <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-slate-700">Consignment Monitoring Table</span>
            <span className="text-emerald-700 font-medium">Swipe to view all columns →</span>
          </div>
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Consignee & Destination</th>
                <th className="py-3 px-4">Delivery Area</th>
                <th className="py-3 px-4">Qty / Mode</th>
                <th className="py-3 px-4">Dispatched Date</th>
                <th className="py-3 px-4">RDD (Req. Date)</th>
                <th className="py-3 px-4">Actual Delivery</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4">Delay Status</th>
                <th className="py-3 px-4">POD Status & Return</th>
                <th className="py-3 px-4">Driver & Vehicle</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {coordinatorRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">No shipments found for current filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the client filter or search terms</p>
                  </td>
                </tr>
              ) : (
                coordinatorRecords.map((record) => {
                  const isDelayed = record.deliveryPerformance === 'MISSED' || (record.deliveryStatus as string) === 'Delayed';
                  const isDelivered = record.deliveryStatus === 'Delivered' || Boolean(record.actualDeliveryDate);

                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecordDetail(record)}
                    >
                      {/* Client Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{record.client}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ref: {record.referenceNumber || '—'}</span>
                        </div>
                      </td>

                      {/* Consignee */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{record.consignee}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {record.destination || record.destinationCode || 'Consignee Address'}
                        </div>
                      </td>

                      {/* Delivery Area */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {record.area}
                        </span>
                      </td>

                      {/* Quantity & Mode */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{record.quantity} {record.unit || 'cases'}</div>
                        <div className="text-[10px] text-slate-500">{record.modeOfShipment}</div>
                      </td>

                      {/* Actual Dispatched Date */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {record.actualDispatchDate || '—'}
                      </td>

                      {/* RDD (Requested Delivery Date) */}
                      <td className="py-3 px-4 font-mono text-indigo-700 font-medium">
                        {record.requestDeliveryDate || record.plannedDeliveryDate || '—'}
                      </td>

                      {/* Actual Delivery Date */}
                      <td className="py-3 px-4 font-mono">
                        {record.actualDeliveryDate ? (
                          <span className="text-emerald-700 font-semibold">{record.actualDeliveryDate}</span>
                        ) : (
                          <span className="text-slate-400 italic">Pending delivery</span>
                        )}
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          record.deliveryStatus === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : record.deliveryStatus === 'In Transit'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {record.deliveryStatus === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                          {record.deliveryStatus === 'In Transit' && <Truck className="w-3 h-3" />}
                          {record.deliveryStatus || 'In Transit'}
                        </span>
                      </td>

                      {/* Delay Status */}
                      <td className="py-3 px-4">
                        {isDelayed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            DELAYED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                            ON TIME
                          </span>
                        )}
                      </td>

                      {/* POD Status */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {record.podStatus || 'Pending'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {record.dateOfPodReturn ? `Ret: ${record.dateOfPodReturn}` : 'Due: ' + (record.podReturnDueDateFormatted || 'Standard SLA')}
                        </div>
                      </td>

                      {/* Driver & Vehicle */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {record.driverName || record.assignedDriver || 'Assigned Driver'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Plate: {record.plateNumber || 'TBD'}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecordDetail(record);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          title="View Coordination Details"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* 5. RECORD DETAIL DRAWER / MODAL */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">Client Consignment Profile</span>
                <h3 className="text-lg font-bold">{selectedRecordDetail.client}</h3>
              </div>
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="text-white/70 hover:text-white text-sm bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Consignee</span>
                  <p className="font-bold text-slate-900">{selectedRecordDetail.consignee}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{selectedRecordDetail.destination || selectedRecordDetail.destinationCode || 'Regional Hub'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Area & Mode</span>
                  <p className="font-bold text-slate-900">{selectedRecordDetail.area}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{selectedRecordDetail.modeOfShipment}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 font-medium">Dispatched Date</span>
                  <p className="font-mono font-bold text-slate-900">{selectedRecordDetail.actualDispatchDate || '—'}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 font-medium">RDD (Requested)</span>
                  <p className="font-mono font-bold text-indigo-700">{selectedRecordDetail.requestDeliveryDate || selectedRecordDetail.plannedDeliveryDate || '—'}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 font-medium">Actual Delivery</span>
                  <p className="font-mono font-bold text-emerald-700">{selectedRecordDetail.actualDeliveryDate || 'Pending'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-xs uppercase font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Transport & Assigned Driver
                  </h4>
                  <div className="text-xs space-y-1">
                    <p><span className="text-slate-500">Driver:</span> <strong className="text-slate-900">{selectedRecordDetail.driverName || selectedRecordDetail.assignedDriver || 'Assigned Driver'}</strong></p>
                    <p><span className="text-slate-500">Plate Number:</span> <span className="font-mono">{selectedRecordDetail.plateNumber || '—'}</span></p>
                    <p><span className="text-slate-500">Carrier / Truck:</span> {selectedRecordDetail.courier || selectedRecordDetail.truckProvider || 'OFII Dedicated Transport'}</p>
                    {selectedRecordDetail.currentLocation && (
                      <p><span className="text-slate-500">Reported Location:</span> <span className="text-emerald-700 font-semibold">{selectedRecordDetail.currentLocation}</span></p>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-xs uppercase font-bold text-slate-700 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                    Proof of Delivery (POD) Status
                  </h4>
                  <div className="text-xs space-y-1">
                    <p><span className="text-slate-500">POD Number:</span> <span className="font-mono font-bold">{selectedRecordDetail.podNumber}</span></p>
                    <p><span className="text-slate-500">Status:</span> <strong>{selectedRecordDetail.podStatus || 'Pending'}</strong></p>
                    <p><span className="text-slate-500">Target Return SLA:</span> {selectedRecordDetail.podReturnDueDateFormatted || 'Standard Working Days'}</p>
                    <p><span className="text-slate-500">Date Returned:</span> {selectedRecordDetail.dateOfPodReturn || 'Awaiting Hardcopy'}</p>
                  </div>
                </div>
              </div>

              {selectedRecordDetail.remarks && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900">
                  <span className="font-bold">Remarks:</span> {selectedRecordDetail.remarks}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* CREATE BATCH MODAL FROM HEADER BUTTON */}
      <CreateDeliveryBatchModal
        isOpen={isCreateBatchModalOpen}
        onClose={() => setIsCreateBatchModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
