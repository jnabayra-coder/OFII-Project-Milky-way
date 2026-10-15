import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  ExternalLink,
  Phone,
  Mail,
  User, 
  Activity,
  Layers,
  ArrowUpRight,
  Plus,
  MapPin,
  X,
  PowerOff,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { ClientSummary, ShipmentRecord, ShipmentStatus } from '../types';
import { AddClientModal } from './AddClientModal';
import { useData } from '../context/DataContext';
import { getRolePermissions } from '../utils/roleUtils';

interface ClientShipmentViewProps {
  clients: ClientSummary[];
  shipments: ShipmentRecord[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  onSelectShipment: (shipment: ShipmentRecord) => void;
  onAddNewClient?: (client: ClientSummary) => void;
  onRequestDeactivateClient?: (client: ClientSummary) => void;
  onRequestDeleteShipment?: (shipment: ShipmentRecord) => void;
  onRequestReactivateClient?: (clientId: string) => void;
}

export const ClientShipmentView: React.FC<ClientShipmentViewProps> = ({
  clients,
  shipments,
  selectedClientId,
  onSelectClient,
  onSelectShipment,
  onAddNewClient,
  onRequestDeactivateClient,
  onRequestDeleteShipment,
  onRequestReactivateClient,
}) => {
  const { currentUserProfile } = useData();
  const permissions = getRolePermissions(currentUserProfile);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientStatusTab, setClientStatusTab] = useState<'active' | 'deactivated' | 'all'>('active');
  const [shipmentRefSearch, setShipmentRefSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientSuccessMsg, setNewClientSuccessMsg] = useState<string | null>(null);

  // Currently selected client object
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Filtered clients list (excluding permanently deleted or trashed clients)
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (c.isDeleted) return false;

      if (clientStatusTab === 'active' && c.isDeactivated) return false;
      if (clientStatusTab === 'deactivated' && !c.isDeactivated) return false;

      if (clientSearchQuery.trim()) {
        const q = clientSearchQuery.toLowerCase();
        const matches = 
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          (c.area && c.area.toLowerCase().includes(q)) ||
          (c.primaryContact && c.primaryContact.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [clients, clientSearchQuery, clientStatusTab]);

  const handleSaveNewClient = (newClient: ClientSummary) => {
    if (onAddNewClient) {
      onAddNewClient(newClient);
    }
    setNewClientSuccessMsg(`Client "${newClient.name}" has been successfully added to the system.`);
    setTimeout(() => {
      setNewClientSuccessMsg(null);
    }, 5000);
  };

  // Filtered shipments for selected client
  const clientShipments = useMemo(() => {
    if (!selectedClient) return [];
    return shipments.filter((s) => {
      // Exclude deleted shipments
      if (s.isDeleted) return false;

      const matchesClient =
        s.clientId === selectedClient.id ||
        s.client.trim().toLowerCase() === selectedClient.name.trim().toLowerCase();
      if (!matchesClient) {
        return false;
      }
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }
      if (shipmentRefSearch.trim()) {
        const q = shipmentRefSearch.toLowerCase();
        const matchesRef =
          s.podNumber.toLowerCase().includes(q) ||
          s.awbNumber.toLowerCase().includes(q) ||
          s.drNumber.toLowerCase().includes(q) ||
          s.sealNumber.toLowerCase().includes(q) ||
          s.billOfLandingNumber.toLowerCase().includes(q) ||
          s.manifestNumber.toLowerCase().includes(q) ||
          s.consignee.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.vanNumber.toLowerCase().includes(q) ||
          s.itemDescription.toLowerCase().includes(q);
        if (!matchesRef) return false;
      }
      return true;
    });
  }, [shipments, selectedClient, statusFilter, shipmentRefSearch]);

  // Helper to dynamically calculate real shipment statistics per client
  const getClientStats = (client: ClientSummary) => {
    const matching = shipments.filter(
      (s) => !s.isDeleted && (s.clientId === client.id || s.client.trim().toLowerCase() === client.name.trim().toLowerCase())
    );
    const active = matching.filter((s) => s.status !== 'Delivered').length;
    const delivered = matching.filter((s) => s.status === 'Delivered').length;
    const total = matching.length;
    return {
      total,
      active: total > 0 ? active : client.activeShipments,
      delivered: total > 0 ? delivered : client.deliveredThisMonth,
    };
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'Delivered':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Delivered</span>;
      case 'In Transit':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">In Transit</span>;
      case 'Delayed':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Delayed</span>;
      case 'Booked':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Booked</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case 'On-Time':
        return <span className="text-[11px] font-bold text-emerald-700">✓ On-Time</span>;
      case 'Within SLA':
        return <span className="text-[11px] font-bold text-blue-700">✓ Within SLA</span>;
      case 'Delayed':
        return <span className="text-[11px] font-bold text-rose-700">⚠ Delayed</span>;
      default:
        return <span className="text-[11px] text-slate-500">{perf}</span>;
    }
  };

  // If no client is selected, show the Client Directory / Search list
  if (!selectedClient) {
    return (
      <div className="space-y-6 pb-12">
        {/* Header & Prominent + ADD CLIENT Button */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              <span>Client Shipment Monitoring</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a dedicated corporate client account to inspect active freight runs, SLAs, and reference tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setClientStatusTab('active')}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  clientStatusTab === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({clients.filter(c => !c.isDeleted && !c.isDeactivated).length})
              </button>
              <button
                type="button"
                onClick={() => setClientStatusTab('deactivated')}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  clientStatusTab === 'deactivated'
                    ? 'bg-amber-100 text-amber-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deactivated ({clients.filter(c => !c.isDeleted && c.isDeactivated).length})
              </button>
              <button
                type="button"
                onClick={() => setClientStatusTab('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  clientStatusTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
            </div>

            {/* Search Client Field */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Client Name, Code..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs"
              />
              {clientSearchQuery && (
                <button
                  onClick={() => setClientSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Prominent + ADD CLIENT Button */}
            {!permissions.isReadOnly && (permissions.canManageClients === 'Full' || permissions.canManageClients === 'Operational') && (
              <button
                id="btn-add-client"
                onClick={() => setIsAddClientModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ ADD CLIENT</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert Banner */}
        {newClientSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{newClientSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setNewClientSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Client Directory Header & Counter */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div className="flex items-center gap-2">
            <span>Corporate Clients: <strong>{filteredClients.length}</strong> of {clients.length} accounts</span>
            {clientSearchQuery && (
              <span className="text-[11px] text-blue-700 font-medium">
                (filtered by &ldquo;{clientSearchQuery}&rdquo;)
              </span>
            )}
          </div>
          <button
            onClick={() => setIsAddClientModalOpen(true)}
            className="text-xs text-blue-700 hover:text-blue-900 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Client</span>
          </button>
        </div>

        {/* Client Directory Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => {
              const isVamsler = client.id === 'client-vamsler';
              const stats = getClientStats(client);

              return (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className={`bg-white rounded-lg border p-5 shadow-xs hover:shadow transition-all cursor-pointer flex flex-col justify-between group ${
                    isVamsler ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            {client.code}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {stats.total} {stats.total === 1 ? 'Shipment' : 'Shipments'}
                          </span>
                          {client.area && (
                            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate">
                              {client.area}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-blue-700 transition-colors truncate">
                          {client.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{client.industry}</p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Contact & Location Preview */}
                    <div className="mt-3 text-[11px] text-slate-600 space-y-1 bg-slate-50/70 p-2.5 rounded border border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{client.primaryContact || 'Operations Lead'}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-slate-500 truncate">{client.phone}</span>
                      </div>
                      {client.address && (
                        <div className="flex items-center gap-1.5 truncate text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Summary metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active</span>
                        <span className="font-mono font-bold text-sm text-blue-700">{stats.active}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Delivered</span>
                        <span className="font-mono font-bold text-sm text-emerald-700">{stats.delivered}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">On-Time</span>
                        <span className="font-mono font-bold text-sm text-slate-900">{client.onTimeRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[170px]">Mgr: {client.accountManager}</span>
                    <span className="text-blue-700 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                      <span>Open Shipments</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-10 text-center shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                No clients found matching &ldquo;{clientSearchQuery}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                The requested client is not currently registered. You can add them immediately into the OFII Monitoring System.
              </p>
            </div>
            <button
              onClick={() => setIsAddClientModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD &ldquo;{clientSearchQuery}&rdquo; AS NEW CLIENT</span>
            </button>
          </div>
        )}

        {/* Modal: Add New Client */}
        <AddClientModal
          isOpen={isAddClientModalOpen}
          onClose={() => setIsAddClientModalOpen(false)}
          onSaveClient={handleSaveNewClient}
          initialClientName={clientSearchQuery.trim()}
        />
      </div>
    );
  }

  // Selected Client Shipment Detail View
  return (
    <div className="space-y-5 pb-12">
      {/* Client Header with Back Button and Quick Add Client */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSelectClient(null)}
              className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Return to Client List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {selectedClient.code}
                </span>
                <h1 className="text-lg font-bold text-slate-900">
                  {selectedClient.name}
                </h1>
                <span className="text-xs text-slate-500">• {selectedClient.industry}</span>
                {selectedClient.area && (
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {selectedClient.area}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Key Account Manager: <strong>{selectedClient.accountManager}</strong> | Contact: {selectedClient.primaryContact} ({selectedClient.phone})
                {selectedClient.address && ` | Facility: ${selectedClient.address}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedClient.isDeactivated ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center gap-1.5">
                  <PowerOff className="w-3.5 h-3.5 text-amber-700" />
                  <span>ACCOUNT DEACTIVATED</span>
                </span>
                {!permissions.isReadOnly && permissions.canManageClients === 'Full' && onRequestReactivateClient && (
                  <button
                    type="button"
                    onClick={() => onRequestReactivateClient(selectedClient.id)}
                    className="px-3 py-1.5 rounded text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reactivate Client</span>
                  </button>
                )}
              </div>
            ) : (
              !permissions.isReadOnly && permissions.canManageClients === 'Full' && onRequestDeactivateClient && (
                <button
                  type="button"
                  onClick={() => onRequestDeactivateClient(selectedClient)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Deactivate client while preserving all historical data"
                >
                  <PowerOff className="w-3.5 h-3.5 text-amber-700" />
                  <span>Deactivate Client</span>
                </button>
              )
            )}

            {!permissions.isReadOnly && (permissions.canManageClients === 'Full' || permissions.canManageClients === 'Operational') && (
              <button
                onClick={() => setIsAddClientModalOpen(true)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Client</span>
              </button>
            )}
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded text-xs text-emerald-800 font-semibold">
              SLA Delivery Performance: {selectedClient.onTimeRate}%
            </div>
          </div>
        </div>

        {/* Client Shipment Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Shipments</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">
              {clientShipments.length} {clientShipments.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="bg-blue-50/70 p-3 rounded border border-blue-100">
            <span className="text-[11px] font-semibold text-blue-700 uppercase block">In Transit</span>
            <span className="text-xl font-bold font-mono text-blue-700 mt-0.5 block">
              {clientShipments.filter((s) => s.status === 'In Transit').length}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Delivered / Signed</span>
            <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">
              {clientShipments.filter((s) => s.status === 'Delivered').length}
            </span>
          </div>

          <div className="bg-rose-50/70 p-3 rounded border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-700 uppercase block">Exceptions / Delayed</span>
            <span className="text-xl font-bold font-mono text-rose-700 mt-0.5 block">
              {clientShipments.filter((s) => s.status === 'Delayed').length}
            </span>
          </div>
        </div>
      </div>

      {/* Reference Number Search Bar & Filter */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Universal Reference Number Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-700" />
            <input
              type="text"
              placeholder="Search Reference Numbers: POD #, AWB #, DR #, Seal #, Bill of Lading (B/L) #, Manifest #..."
              value={shipmentRefSearch}
              onChange={(e) => setShipmentRefSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Delayed">Delayed</option>
              <option value="Booked">Booked</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>Supported Reference Identifiers:</span>
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">POD</span>
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">AWB</span>
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">DR</span>
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">SEAL</span>
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">B/L</span>
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-semibold">MANIFEST</span>
          </div>

          <span>Showing {clientShipments.length} shipments</span>
        </div>
      </div>

      {/* Shipment Records Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
              <tr>
                <th className="py-2.5 px-3">POD Number</th>
                <th className="py-2.5 px-3">AWB / DR Number</th>
                <th className="py-2.5 px-3">Consignee & Destination</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Cargo Items</th>
                <th className="py-2.5 px-3 bg-blue-50/70 text-blue-900 border-l border-blue-200">Planned Delivery Date</th>
                <th className="py-2.5 px-3 bg-emerald-50/70 text-emerald-900">Delivery Date</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Status</th>
                <th className="py-2.5 px-3">TAT / SLA</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {clientShipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 bg-slate-50">
                    No shipments found matching reference criteria for {selectedClient.name}.
                  </td>
                </tr>
              ) : (
                clientShipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    onClick={() => onSelectShipment(shipment)}
                    className="hover:bg-blue-50/60 transition-colors cursor-pointer group whitespace-nowrap"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-blue-700 group-hover:underline">
                      {shipment.podNumber}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-800 font-medium">{shipment.awbNumber}</div>
                      <div className="font-mono text-[10px] text-slate-500">{shipment.drNumber}</div>
                    </td>

                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="font-semibold text-slate-900 truncate" title={shipment.consignee}>
                        {shipment.consignee}
                      </div>
                      <div className="text-slate-500 text-[11px] truncate" title={shipment.destination}>
                        {shipment.destination} ({shipment.area})
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {shipment.modeOfShipment}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-[180px]">
                      <div className="font-medium text-slate-800 truncate" title={shipment.itemDescription}>
                        {shipment.itemDescription}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {shipment.quantityBoxes} Boxes • {shipment.actualWeightKg} kg
                      </div>
                    </td>

                    {/* Planned Delivery Date | Delivery Date | Status (Adjacent) */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 bg-blue-50/30 border-l border-blue-100">
                      {shipment.plannedDeliveryDate || shipment.requestedDeliveryDate}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900 bg-emerald-50/30">
                      {shipment.actualDeliveryDate || shipment.deliveryDate}
                    </td>

                    <td className="py-3 px-3 border-r border-slate-200">
                      {getStatusBadge(shipment.status)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] font-bold text-slate-800">{shipment.tatNumber}</div>
                      <div>{getPerformanceBadge(shipment.deliveryPerformance)}</div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!permissions.isReadOnly && permissions.canDeleteRecords !== 'No' && onRequestDeleteShipment && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestDeleteShipment(shipment);
                            }}
                            title="Move shipment to Recently Deleted"
                            className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectShipment(shipment);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded border border-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Client Account: <strong className="text-slate-800">{selectedClient.name}</strong></span>
          <span>Click any shipment row to inspect all 6 structured data categories.</span>
        </div>
      </div>
    </div>
  );
};
