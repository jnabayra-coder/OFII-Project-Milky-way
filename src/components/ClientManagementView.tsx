import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit3, 
  PowerOff, 
  RotateCcw, 
  Phone, 
  User, 
  MapPin, 
  Package, 
  Truck, 
  CheckCircle2, 
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { 
  ClientSummary, 
  ShipmentRecord, 
  DispatchRecord, 
  ForwardingProgressiveRecord 
} from '../types';
import { useData } from '../context/DataContext';
import { getRolePermissions } from '../utils/roleUtils';

interface ClientManagementViewProps {
  clients: ClientSummary[];
  shipments: ShipmentRecord[];
  dispatches: DispatchRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  onOpenAddClient?: () => void;
  onOpenAddClientModal?: () => void;
  onViewClient?: (client: ClientSummary) => void;
  onSelectClient?: (client: ClientSummary) => void;
  onEditClient: (client: ClientSummary) => void;
  onDeactivateClient: (client: ClientSummary) => void;
  onReactivateClient: (client: ClientSummary) => void;
  onDeleteClient?: (client: ClientSummary) => void;
}

export const ClientManagementView: React.FC<ClientManagementViewProps> = ({
  clients,
  shipments,
  dispatches,
  forwardingRecords,
  onOpenAddClient,
  onOpenAddClientModal,
  onViewClient,
  onSelectClient,
  onEditClient,
  onDeactivateClient,
  onReactivateClient,
  onDeleteClient,
}) => {
  const { currentUserProfile } = useData();
  const permissions = getRolePermissions(currentUserProfile);
  const canModifyClients = !permissions.isReadOnly && (permissions.canManageClients === 'Full' || permissions.canManageClients === 'Operational');

  const handleOpenAdd = onOpenAddClient || onOpenAddClientModal || (() => {});
  const handleViewClient = onViewClient || onSelectClient || (() => {});
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');

  // Compute active & total shipments per client
  const clientShipmentStats = useMemo(() => {
    const statsMap: Record<string, { total: number; active: number }> = {};

    clients.forEach(c => {
      // Find master forwarding records (Single Source of Truth for Shipments)
      const matchingForwarding = (forwardingRecords || []).filter(
        f => !f.isDeleted && (
          (f.clientId && f.clientId === c.id) ||
          f.client.trim().toLowerCase() === c.name.trim().toLowerCase()
        )
      );

      // Fallback to shipments if forwarding records empty for this client
      const matchingShipments = matchingForwarding.length > 0
        ? matchingForwarding
        : (shipments || []).filter(
            s => !s.isDeleted && (
              (s.clientId && s.clientId === c.id) ||
              s.client.trim().toLowerCase() === c.name.trim().toLowerCase()
            )
          );

      // Master shipment total count
      const totalCount = matchingShipments.length > 0 
        ? matchingShipments.length 
        : ((c.activeShipments || 0) + (c.deliveredThisMonth || 0));

      // Active in-flight shipment count
      const activeCount = matchingShipments.filter(
        s => (s as any).deliveryStatus !== 'Delivered' && (s as any).status !== 'Delivered'
      ).length;

      statsMap[c.id] = {
        total: totalCount,
        active: activeCount,
      };
    });

    return statsMap;
  }, [clients, shipments, dispatches]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Exclude soft-deleted (trashed) clients from active table
      if (client.isDeleted) return false;

      // Status Filter
      if (statusFilter === 'ACTIVE' && client.isDeactivated) return false;
      if (statusFilter === 'INACTIVE' && !client.isDeactivated) return false;

      // Area Filter
      if (areaFilter !== 'ALL') {
        const clientArea = (client.area || '').toLowerCase();
        if (areaFilter === 'Luzon' && !clientArea.includes('luzon') && !clientArea.includes('ncr')) return false;
        if (areaFilter === 'Visayas' && !clientArea.includes('visayas')) return false;
        if (areaFilter === 'Mindanao' && !clientArea.includes('mindanao')) return false;
        if (areaFilter === 'NCR' && !clientArea.includes('ncr')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = client.name.toLowerCase().includes(query);
        const matchesCode = client.code.toLowerCase().includes(query);
        const matchesCoordinator = (client.assignedCoordinator || client.accountManager || '').toLowerCase().includes(query);
        const matchesContact = (client.primaryContact || '').toLowerCase().includes(query);
        const matchesPhone = (client.phone || '').toLowerCase().includes(query);
        const matchesEmail = (client.email || '').toLowerCase().includes(query);
        const matchesAddress = (client.address || '').toLowerCase().includes(query);
        const matchesRemarks = (client.remarks || client.notes || '').toLowerCase().includes(query);
        const matchesArea = (client.area || '').toLowerCase().includes(query);

        if (!matchesName && !matchesCode && !matchesCoordinator && !matchesContact && !matchesPhone && !matchesEmail && !matchesAddress && !matchesRemarks && !matchesArea) {
          return false;
        }
      }

      return true;
    });
  }, [clients, searchQuery, statusFilter, areaFilter]);

  // Overall counts for filter tabs
  const activeCount = clients.filter(c => !c.isDeleted && !c.isDeactivated).length;
  const inactiveCount = clients.filter(c => !c.isDeleted && c.isDeactivated).length;
  const totalCount = clients.filter(c => !c.isDeleted).length;

  return (
    <div className="space-y-5 pb-12">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-blue-700 text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Client Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage clients and their shipment records.
              </p>
            </div>
          </div>
        </div>

        {/* Upper-Right Prominent Button: + ADD CLIENT */}
        {canModifyClients && (
          <div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD CLIENT</span>
            </button>
          </div>
        )}
      </div>

      {/* SEARCH AND FILTERS (Compact and Organized) */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3 flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
              Status:
            </span>
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100/80 w-full text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex-1 py-1.5 px-2 rounded font-bold text-[11px] transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`flex-1 py-1.5 px-2 rounded font-bold text-[11px] transition-all cursor-pointer ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`py-1.5 px-2 rounded font-bold text-[11px] transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-blue-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({totalCount})
              </button>
            </div>
          </div>

          {/* Area Filter */}
          <div className="md:col-span-3 flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
              Area:
            </span>
            <div className="relative w-full">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Areas</option>
                <option value="Luzon">Luzon</option>
                <option value="NCR">NCR</option>
                <option value="Visayas">Visayas</option>
                <option value="Mindanao">Mindanao</option>
              </select>
            </div>
          </div>

        </div>

        {/* Filter Summary / Active Chips */}
        {(searchQuery || statusFilter !== 'ACTIVE' || areaFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Showing {filteredClients.length} of {totalCount} clients</span>
              {searchQuery && (
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              {areaFilter !== 'ALL' && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  Area: {areaFilter}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ACTIVE');
                setAreaFilter('ALL');
              }}
              className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* CLIENT TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
        
        {/* Table Top Banner */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Client Master Directory
            </h3>
          </div>
          <span className="text-xs text-slate-300 font-semibold">
            {filteredClients.length} Listed Account{filteredClients.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Mobile Client Card Layout (< md screens) */}
        <div className="md:hidden divide-y divide-slate-200 bg-slate-50/50">
          {filteredClients.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No clients match your filter criteria.</p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD CLIENT</span>
              </button>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isDeactivated = !!client.isDeactivated;
              const coordinatorName = client.assignedCoordinator || client.accountManager || '—';
              const contactPerson = client.primaryContact && client.primaryContact !== '—' ? client.primaryContact : '—';
              const contactPhone = client.phone && client.phone !== '—' ? client.phone : '—';
              const areaDisplay = client.area && client.area !== '—' ? client.area : '—';

              return (
                <div key={client.id} className={`p-4 space-y-3 bg-white ${isDeactivated ? 'opacity-80' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleViewClient(client)}
                        className="font-bold text-slate-900 hover:text-blue-700 text-left text-sm block truncate cursor-pointer"
                      >
                        {client.name}
                      </button>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {client.code}
                        </span>
                        {areaDisplay !== '—' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <MapPin className="w-2.5 h-2.5 text-slate-500" />
                            <span>{areaDisplay}</span>
                          </span>
                        )}
                        {client.industry && client.industry !== '—' && (
                          <span className="text-[10px] text-slate-500 truncate">
                            • {client.industry}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isDeactivated
                        ? 'bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isDeactivated ? 'bg-slate-500' : 'bg-emerald-600'}`} />
                      {isDeactivated ? 'Inactive' : 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Coordinator</span>
                      <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
                        <User className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{coordinatorName}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Contact</span>
                      <span className="text-slate-700 font-medium truncate block mt-0.5">
                        {contactPerson}
                      </span>
                      {contactPhone !== '—' && (
                        <span className="text-slate-500 font-mono text-[10px] block truncate">
                          {contactPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleViewClient(client)}
                      className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      VIEW
                    </button>
                    {canModifyClients && (
                      <button
                        type="button"
                        onClick={() => onEditClient(client)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                      >
                        EDIT
                      </button>
                    )}
                    {canModifyClients && (
                      isDeactivated ? (
                        <button
                          type="button"
                          onClick={() => onReactivateClient(client)}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors cursor-pointer"
                        >
                          REACTIVATE
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDeactivateClient(client)}
                          className="px-3 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 transition-colors cursor-pointer"
                        >
                          DEACTIVATE
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (>= md screens) */}
        <div className="hidden md:block overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-100/90 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Assigned Coordinator</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Contact Number</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No clients match your filter criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try searching with different terms or click &ldquo;+ ADD CLIENT&rdquo; to register a new corporate client.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ADD CLIENT</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isDeactivated = !!client.isDeactivated;
                  const coordinatorName = client.assignedCoordinator || client.accountManager || '—';
                  const contactPerson = client.primaryContact && client.primaryContact !== '—' ? client.primaryContact : '—';
                  const contactPhone = client.phone && client.phone !== '—' ? client.phone : '—';
                  const areaDisplay = client.area && client.area !== '—' ? client.area : '—';

                  return (
                    <tr 
                      key={client.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isDeactivated ? 'bg-slate-50/40 opacity-80' : ''
                      }`}
                    >
                      
                      {/* 1. Client Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleViewClient(client)}
                            className="font-bold text-slate-900 hover:text-blue-700 text-left transition-colors cursor-pointer text-xs"
                          >
                            {client.name}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {client.code}
                            </span>
                            {client.industry && client.industry !== '—' && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                • {client.industry}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Assigned Coordinator */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{coordinatorName}</span>
                        </div>
                      </td>

                      {/* 3. Contact Person */}
                      <td className="px-4 py-3.5">
                        <span className="text-slate-700 font-medium truncate max-w-[150px] inline-block">
                          {contactPerson}
                        </span>
                      </td>

                      {/* 4. Contact Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-slate-700 font-mono text-xs">
                          {contactPhone}
                        </span>
                      </td>

                      {/* 5. Area */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {areaDisplay !== '—' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{areaDisplay}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 6. Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isDeactivated
                            ? 'bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isDeactivated ? 'bg-slate-500' : 'bg-emerald-600'}`} />
                          {isDeactivated ? 'Inactive' : 'Active'}
                        </span>
                      </td>

                      {/* 7. Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          
                          {/* VIEW Action */}
                          <button
                            type="button"
                            onClick={() => handleViewClient(client)}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                          >
                            VIEW
                          </button>

                          {/* EDIT Action */}
                          {canModifyClients && (
                            <button
                              type="button"
                              onClick={() => onEditClient(client)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                            >
                              EDIT
                            </button>
                          )}

                          {/* DEACTIVATE / REACTIVATE Action */}
                          {canModifyClients && (
                            isDeactivated ? (
                              <button
                                type="button"
                                onClick={() => onReactivateClient(client)}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors cursor-pointer"
                              >
                                REACTIVATE
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onDeactivateClient(client)}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300 transition-colors cursor-pointer"
                              >
                                DEACTIVATE
                              </button>
                            )
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Single Master Client Source — Added clients sync across Dispatching, Forwarding, and Shipment Monitoring.</span>
          </div>
          <span>Historical operational records are permanently preserved.</span>
        </div>

      </div>

    </div>
  );
};
