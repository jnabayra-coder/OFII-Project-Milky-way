import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  Filter, 
  AlertOctagon, 
  ShieldAlert, 
  CheckCircle2, 
  Truck, 
  FileSpreadsheet, 
  Building2, 
  Package, 
  Clock, 
  User, 
  Calendar,
  Layers,
  ArrowUpRight,
  Info,
  Check,
  ChevronDown
} from 'lucide-react';
import { 
  DispatchRecord, 
  ShipmentRecord, 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  OperationalRecordType,
  TrashItem 
} from '../types';

interface RecentlyDeletedViewProps {
  dispatches: DispatchRecord[];
  shipments: ShipmentRecord[];
  forwardingRecords: ForwardingProgressiveRecord[];
  clients: ClientSummary[];
  onRestoreRecord: (type: OperationalRecordType, id: string) => void;
  onPermanentDeleteRecord: (type: OperationalRecordType, id: string) => void;
  onRestoreAll?: () => void;
  onRequestPermanentDelete: (type: OperationalRecordType, id: string, identifier: string, clientName: string) => void;
}

export const RecentlyDeletedView: React.FC<RecentlyDeletedViewProps> = ({
  dispatches,
  shipments,
  forwardingRecords,
  clients,
  onRestoreRecord,
  onRequestPermanentDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | OperationalRecordType>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Compile all deleted items from state
  const allTrashItems = useMemo<TrashItem[]>(() => {
    const list: TrashItem[] = [];

    // 1. Deleted Dispatches
    dispatches.filter(d => d.isDeleted).forEach(d => {
      list.push({
        id: d.id,
        recordType: 'dispatch',
        recordIdentifier: d.podNumber || d.manifestNumber || d.id,
        title: `Dispatch: ${d.podNumber} (${d.deliveryType})`,
        clientName: d.clientName || 'General Freight',
        originalDate: d.deliveryDate,
        originalStatus: d.status,
        deletedAt: d.deletedAt || '2026-08-24 10:15 AM',
        deletedBy: d.deletedBy || 'Juan Dela Cruz (Operations Officer)',
        deleteReason: d.deleteReason || 'Moved to trash from Dispatch Monitoring',
        additionalDetails: `${d.quantityCasesBoxes} ${d.unit} to ${d.destination}`,
      });
    });

    // 2. Deleted Forwarding Records
    forwardingRecords.filter(f => f.isDeleted).forEach(f => {
      list.push({
        id: f.id,
        recordType: 'forwarding_report',
        recordIdentifier: f.referenceNumber || f.podNumber || f.id,
        title: `Forwarding: ${f.referenceNumber} (${f.modeOfShipment})`,
        clientName: f.client,
        originalDate: f.actualDispatchDate,
        originalStatus: f.deliveryStatus,
        deletedAt: f.deletedAt || '2026-08-24 10:20 AM',
        deletedBy: f.deletedBy || 'Juan Dela Cruz (Operations Officer)',
        deleteReason: f.deleteReason || 'Moved to trash from Forwarding Progressive Report',
        additionalDetails: `POD: ${f.podNumber} • Dest: ${f.destinationCode} • ${f.area}`,
      });
    });

    // 3. Deleted Shipments
    shipments.filter(s => s.isDeleted).forEach(s => {
      // Avoid duplicate display if it shares same id or podNumber with already added dispatch
      const alreadyIncluded = list.some(item => item.id === s.id || (s.podNumber && item.recordIdentifier === s.podNumber));
      if (!alreadyIncluded) {
        list.push({
          id: s.id,
          recordType: 'shipment',
          recordIdentifier: s.podNumber || s.awbNumber || s.id,
          title: `Shipment: ${s.podNumber || s.id}`,
          clientName: s.client,
          originalDate: s.bookedDate || s.pickupDate,
          originalStatus: s.status,
          deletedAt: s.deletedAt || '2026-08-24 10:25 AM',
          deletedBy: s.deletedBy || 'Juan Dela Cruz (Operations Officer)',
          deleteReason: s.deleteReason || 'Moved to trash from Client Shipment Monitoring',
          additionalDetails: `Dest: ${s.destination} • Area: ${s.area}`,
        });
      }
    });

    // 4. Deleted Clients
    clients.filter(c => c.isDeleted).forEach(c => {
      list.push({
        id: c.id,
        recordType: 'client',
        recordIdentifier: c.code || c.id,
        title: `Client Account: ${c.name}`,
        clientName: c.name,
        originalDate: 'Account Registry',
        originalStatus: c.industry,
        deletedAt: c.deletedAt || '2026-08-24 10:30 AM',
        deletedBy: c.deletedBy || 'Juan Dela Cruz (Operations Officer)',
        deleteReason: 'Removed unused client account',
        additionalDetails: `Code: ${c.code} • Contact: ${c.primaryContact}`,
      });
    });

    // Sort by deleted timestamp descending
    return list.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }, [dispatches, shipments, forwardingRecords, clients]);

  // Filtered trash items
  const filteredItems = useMemo(() => {
    return allTrashItems.filter(item => {
      if (typeFilter !== 'ALL' && item.recordType !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          item.recordIdentifier.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.deletedBy.toLowerCase().includes(q) ||
          (item.additionalDetails && item.additionalDetails.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allTrashItems, typeFilter, searchQuery]);

  const handleRestore = (item: TrashItem) => {
    onRestoreRecord(item.recordType, item.id);
    setActionSuccessMsg(`Restored "${item.recordIdentifier}" (${item.clientName}) to active system.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleRestoreBatch = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => {
      const item = allTrashItems.find(t => t.id === id);
      if (item) {
        onRestoreRecord(item.recordType, item.id);
      }
    });
    setActionSuccessMsg(`Successfully restored ${selectedIds.length} records to active system.`);
    setSelectedIds([]);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const getRecordTypeBadge = (type: OperationalRecordType) => {
    switch (type) {
      case 'dispatch':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3" />
            <span>DAILY DISPATCH</span>
          </span>
        );
      case 'forwarding_report':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <FileSpreadsheet className="w-3 h-3" />
            <span>FORWARDING REPORT</span>
          </span>
        );
      case 'shipment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Package className="w-3 h-3" />
            <span>CLIENT SHIPMENT</span>
          </span>
        );
      case 'client':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Building2 className="w-3 h-3" />
            <span>CLIENT ACCOUNT</span>
          </span>
        );
    }
  };

  const dispatchDeletedCount = allTrashItems.filter(i => i.recordType === 'dispatch').length;
  const forwardingDeletedCount = allTrashItems.filter(i => i.recordType === 'forwarding_report').length;
  const clientDeletedCount = allTrashItems.filter(i => i.recordType === 'client').length;
  const deactivatedClientsCount = clients.filter(c => c.isDeactivated).length;

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner & Title */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Recently Deleted & Operational Trash</span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold border border-amber-200">
                  {allTrashItems.length} Records in Trash
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Safe Delete & Recovery Repository. Restore accidentally removed dispatches, shipments, and reports to active views.
              </p>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-semibold text-blue-900">{selectedIds.length} Selected</span>
            <button
              onClick={handleRestoreBatch}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total in Trash</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{allTrashItems.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Restorable operational items</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deleted Dispatches</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{dispatchDeletedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Daily dispatch rows</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deleted Forwarding</div>
          <div className="text-xl font-bold text-indigo-700 mt-1">{forwardingDeletedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Progressive report rows</div>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deactivated Clients</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{deactivatedClientsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Preserved historical links</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search POD #, Reference #, Client, or User..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Module Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Records ({allTrashItems.length})
            </button>
            <button
              onClick={() => setTypeFilter('dispatch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                typeFilter === 'dispatch'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dispatches ({dispatchDeletedCount})
            </button>
            <button
              onClick={() => setTypeFilter('forwarding_report')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                typeFilter === 'forwarding_report'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Forwarding ({forwardingDeletedCount})
            </button>
            <button
              onClick={() => setTypeFilter('client')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                typeFilter === 'client'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Clients ({clientDeletedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Trash is currently empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || typeFilter !== 'ALL'
                ? 'No deleted records matched your search filters.'
                : 'All operational dispatches, shipments, and progressive reports are active in production.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold text-[11px] border-b border-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-500 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">RECORD IDENTIFIER</th>
                  <th className="py-2.5 px-3">MODULE</th>
                  <th className="py-2.5 px-3">CLIENT ACCOUNT</th>
                  <th className="py-2.5 px-3">DETAILS / DESTINATION</th>
                  <th className="py-2.5 px-3">DELETED BY & TIME</th>
                  <th className="py-2.5 px-3 text-right">RECOVERY ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Identifier */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-blue-700 flex items-center gap-1.5">
                          <span>{item.recordIdentifier}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">
                          {item.title}
                        </div>
                      </td>

                      {/* Module Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getRecordTypeBadge(item.recordType)}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.clientName}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-3">
                        <div className="text-slate-700 text-[11px]">{item.additionalDetails || '—'}</div>
                        {item.originalStatus && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Status prior to deletion: <span className="font-medium text-slate-600">{item.originalStatus}</span>
                          </div>
                        )}
                      </td>

                      {/* Deleted Timestamp & Actor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.deletedAt}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-2.5 h-2.5 text-slate-400" />
                          <span>{item.deletedBy}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestore(item)}
                            title="Restore record to active system"
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>RESTORE</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRequestPermanentDelete(item.recordType, item.id, item.recordIdentifier, item.clientName)}
                            title="Permanently purge record from system"
                            className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>PURGE</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety & Compliance Policy Note */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">OFII Enterprise Data Retention & Audit Protocol</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            All records moved to Recently Deleted preserve their relational keys, historical POD references, and billing codes. Restoration returns records to Daily Dispatch, Client Shipment Monitoring, and Forwarding Progressive Reports with complete data continuity.
          </p>
        </div>
      </div>
    </div>
  );
};
