import React, { useState, useMemo } from 'react';
import { 
  FolderPlus, 
  PlusCircle, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  ArrowLeft, 
  Layers, 
  Building2, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Edit3, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Package,
  MapPin,
  Tag,
  Truck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { DeliveryBatch, IndividualDelivery, DeliveryBatchStatus } from '../types';
import { isCoordinatorRole, normalizeUserRole } from '../utils/roleUtils';
import { getStoredAuthSession } from '../data/userAccounts';
import { CreateDeliveryBatchModal } from './CreateDeliveryBatchModal';
import { AddIndividualDeliveryModal } from './AddIndividualDeliveryModal';
import { BatchDeliveryExcelImportModal } from './BatchDeliveryExcelImportModal';
import { DispatchEncodingModal } from './DispatchEncodingModal';
import { DispatchStatusBadge } from './DispatchStatusBadge';
import { 
  isDeliveryDispatched, 
  deriveDeliveryOperationalStatus 
} from '../utils/dispatchUtils';
import { downloadDeliveryBatchTemplate } from '../utils/deliveryBatchExcel';
import { getDeliveryStatusBadge } from '../utils/deliveryStatusFlow';

interface DeliveryBatchesManagerProps {
  currentCoordinatorName?: string;
  initialBatchId?: string;
}

export const DeliveryBatchesManager: React.FC<DeliveryBatchesManagerProps> = ({
  currentCoordinatorName,
  initialBatchId,
}) => {
  const {
    deliveryBatches,
    individualDeliveries,
    truckRuns,
    updateDeliveryBatch,
    deleteDeliveryBatch,
    updateIndividualDelivery,
    deleteIndividualDelivery,
    saveDeliveryDispatch,
    currentUserProfile,
  } = useData();

  // RBAC: Coordinator or Admin can create a New Project / Delivery Name
  const sessionUser = getStoredAuthSession();
  const activeUser = currentUserProfile || (sessionUser && sessionUser.isActive !== false ? sessionUser : null);
  const canCreateProject = (
    isCoordinatorRole(activeUser) || 
    normalizeUserRole(activeUser) === 'ADMIN' || 
    isCoordinatorRole(currentUserProfile) || 
    normalizeUserRole(currentUserProfile) === 'ADMIN'
  ) && (
    (!activeUser?.approvalStatus || activeUser.approvalStatus === 'APPROVED') &&
    (!currentUserProfile?.approvalStatus || currentUserProfile.approvalStatus === 'APPROVED')
  );

  // State: Opened batch (null = list view)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(initialBatchId || null);

  // Modals state
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [isAddDeliveryModalOpen, setIsAddDeliveryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [encodingDelivery, setEncodingDelivery] = useState<IndividualDelivery | null>(null);

  // Edit Batch modal state
  const [editingBatch, setEditingBatch] = useState<DeliveryBatch | null>(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchStatus, setEditBatchStatus] = useState<DeliveryBatchStatus>('Active');
  const [editBatchNotes, setEditBatchNotes] = useState('');

  // Edit Individual Delivery modal state
  const [editingDelivery, setEditingDelivery] = useState<IndividualDelivery | null>(null);

  // Batches list filters
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('ALL');

  // Individual deliveries inside opened batch filters & pagination
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryAreaFilter, setDeliveryAreaFilter] = useState<string>('ALL');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Active batch object
  const activeBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return deliveryBatches.find((b) => b.id === selectedBatchId) || null;
  }, [selectedBatchId, deliveryBatches]);

  // Counts of individual deliveries per batch
  const deliveryCountsByBatch = useMemo(() => {
    const counts: Record<string, number> = {};
    individualDeliveries.forEach((d) => {
      counts[d.batchId] = (counts[d.batchId] || 0) + 1;
    });
    return counts;
  }, [individualDeliveries]);

  // Filtered batches list
  const filteredBatches = useMemo(() => {
    return deliveryBatches.filter((batch) => {
      if (batchStatusFilter !== 'ALL' && batch.status !== batchStatusFilter) {
        return false;
      }
      if (batchSearch.trim()) {
        const q = batchSearch.toLowerCase();
        const matches =
          batch.name.toLowerCase().includes(q) ||
          batch.client.toLowerCase().includes(q) ||
          batch.coordinator.toLowerCase().includes(q) ||
          (batch.notes && batch.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [deliveryBatches, batchStatusFilter, batchSearch]);

  // Filtered individual deliveries for active batch
  const filteredDeliveries = useMemo(() => {
    if (!activeBatch) return [];
    return individualDeliveries.filter((del) => {
      if (del.batchId !== activeBatch.id) return false;

      if (deliveryAreaFilter !== 'ALL' && del.area !== deliveryAreaFilter) {
        return false;
      }

      if (deliveryStatusFilter !== 'ALL' && del.status !== deliveryStatusFilter) {
        return false;
      }

      if (deliverySearch.trim()) {
        const q = deliverySearch.toLowerCase();
        const matches =
          del.consignee.toLowerCase().includes(q) ||
          del.individualDeliveryPod.toLowerCase().includes(q) ||
          del.deliveryId.toLowerCase().includes(q) ||
          del.destinationCode.toLowerCase().includes(q) ||
          (del.destination && del.destination.toLowerCase().includes(q)) ||
          del.referenceNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [activeBatch, individualDeliveries, deliveryAreaFilter, deliveryStatusFilter, deliverySearch]);

  // Pagination for individual deliveries
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage) || 1;
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDeliveries.slice(start, start + itemsPerPage);
  }, [filteredDeliveries, currentPage, itemsPerPage]);

  const handleOpenBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setCurrentPage(1);
    setDeliverySearch('');
    setDeliveryAreaFilter('ALL');
    setDeliveryStatusFilter('ALL');
  };

  const handleStartEditBatch = (batch: DeliveryBatch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBatch(batch);
    setEditBatchName(batch.name);
    setEditBatchStatus(batch.status);
    setEditBatchNotes(batch.notes || '');
  };

  const handleSaveBatchEdit = async () => {
    if (!editingBatch) return;
    if (!editBatchName.trim()) return;

    await updateDeliveryBatch({
      ...editingBatch,
      name: editBatchName.trim(),
      status: editBatchStatus,
      notes: editBatchNotes.trim(),
    });

    setEditingBatch(null);
  };

  const handleDeleteBatch = async (batchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      'Are you sure you want to delete this Project / Delivery Batch? Individual deliveries in this batch will also be removed.'
    );
    if (!confirmed) return;

    await deleteDeliveryBatch(batchId);
    if (selectedBatchId === batchId) {
      setSelectedBatchId(null);
    }
  };

  const handleDeleteIndividualDelivery = async (deliveryId: string) => {
    const confirmed = window.confirm('Are you sure you want to remove this individual delivery?');
    if (!confirmed) return;
    await deleteIndividualDelivery(deliveryId);
  };

  return (
    <div id="delivery-batches-manager-root" className="space-y-6">
      {/* VIEW 1: OPENED BATCH DETAILS & INDIVIDUAL DELIVERIES */}
      {activeBatch ? (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top Back Navigation & Header */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <button
                  id="back-to-batches-list-btn"
                  onClick={() => setSelectedBatchId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to All Projects & Batches</span>
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                    <span>{activeBatch.name}</span>
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      activeBatch.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeBatch.status === 'Draft'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activeBatch.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Client: <strong className="text-slate-800">{activeBatch.client}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Coordinator: <strong className="text-emerald-700">{activeBatch.coordinator}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Created: {activeBatch.createdDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      Total Individual Deliveries:{' '}
                      <strong className="text-indigo-700 font-mono text-sm">
                        {deliveryCountsByBatch[activeBatch.id] || 0}
                      </strong>
                    </span>
                  </div>
                </div>

                {activeBatch.notes && (
                  <p className="text-xs text-slate-500 italic mt-1">{activeBatch.notes}</p>
                )}
              </div>

              {/* Action Buttons: Add Delivery, Import Excel, Download Template */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="add-individual-delivery-btn"
                  type="button"
                  onClick={() => setIsAddDeliveryModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>[ + Add Delivery ]</span>
                </button>

                <button
                  id="import-batch-excel-btn"
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>[ Import Excel ]</span>
                </button>

                <button
                  id="download-batch-template-btn"
                  type="button"
                  onClick={() => downloadDeliveryBatchTemplate(activeBatch)}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Download dedicated template for this batch"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>[ Download Template ]</span>
                </button>

                <button
                  id="edit-batch-header-btn"
                  type="button"
                  onClick={() => handleStartEditBatch(activeBatch)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="Edit Batch Info"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search, Filter, and View Controls */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-individual-deliveries-input"
                type="text"
                placeholder="Search store, POD #, destination, ref..."
                value={deliverySearch}
                onChange={(e) => {
                  setDeliverySearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Area:</span>
                <select
                  id="filter-delivery-area-select"
                  value={deliveryAreaFilter}
                  onChange={(e) => {
                    setDeliveryAreaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Areas</option>
                  <option value="Luzon">Luzon</option>
                  <option value="Visayas">Visayas</option>
                  <option value="Mindanao">Mindanao</option>
                  <option value="NCR">NCR</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  id="filter-delivery-status-select"
                  value={deliveryStatusFilter}
                  onChange={(e) => {
                    setDeliveryStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending Assignment">Pending Assignment</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-100 rounded-md">
                Showing <strong className="text-slate-900">{filteredDeliveries.length}</strong> of{' '}
                {deliveryCountsByBatch[activeBatch.id] || 0} deliveries
              </div>
            </div>
          </div>

          {/* Individual Deliveries Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Deliveries List</span>
              <span className="text-emerald-700 font-medium">Swipe to view all columns →</span>
            </div>
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">Delivery ID</th>
                    <th className="py-3 px-3.5">Store / Consignee</th>
                    <th className="py-3 px-3.5">Individual POD #</th>
                    <th className="py-3 px-3.5">Dest. Code</th>
                    <th className="py-3 px-3.5">Area</th>
                    <th className="py-3 px-3.5">Place / Location</th>
                    <th className="py-3 px-3.5">Qty & Mode</th>
                    <th className="py-3 px-3.5">RDD</th>
                    <th className="py-3 px-3.5">Reference #</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-14 text-center text-slate-500">
                        <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                          No individual deliveries in this project yet
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click <strong>[ + Add Delivery ]</strong> or <strong>[ Import Excel ]</strong> to add deliveries to this batch.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedDeliveries.map((del, idx) => {
                      const absoluteIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr key={del.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">
                            {absoluteIdx}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                            {del.deliveryId}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[200px] truncate">
                            {del.consignee}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold text-xs">
                              {del.individualDeliveryPod}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600">
                            {del.destinationCode || '—'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700 text-[11px]">
                              {del.area}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 max-w-[180px] truncate">
                            {del.destination || '—'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-semibold text-slate-900">{del.quantity}</span>{' '}
                            <span className="text-slate-500 text-[11px]">({del.modeOfShipment})</span>
                          </td>
                          <td className="py-3 px-3.5 font-medium text-slate-700">
                            {del.rdd || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                            {del.referenceNumber || '—'}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex flex-col gap-1 items-start">
                              {(() => {
                                const badge = getDeliveryStatusBadge(del.deliveryStatus || del.status);
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.badgeClass}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${badge.dotColor}`} />
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              {del.truckRunNumber && (
                                <span className="text-[10px] text-indigo-700 font-medium">
                                  {del.truckRunNumber} ({del.truckDispatchPod})
                                </span>
                              )}
                              <DispatchStatusBadge
                                status={
                                  del.dispatchOperationalStatus ||
                                  deriveDeliveryOperationalStatus(
                                    del.timeArrived,
                                    del.startLoadingTime,
                                    del.endLoadingTime,
                                    del.actualDeparture
                                  )
                                }
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                id={`batch-dispatch-btn-${del.deliveryId || del.id}`}
                                onClick={() => setEncodingDelivery(del)}
                                className={
                                  isDeliveryDispatched(del)
                                    ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                    : "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                }
                                title={isDeliveryDispatched(del) ? "View or edit operational dispatch" : "Encode operational dispatch for this delivery"}
                              >
                                {isDeliveryDispatched(del) ? (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    <span>VIEW / EDIT DISPATCH</span>
                                  </>
                                ) : (
                                  <>
                                    <Truck className="w-3 h-3" />
                                    <span>DISPATCH</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDelivery(del)}
                                className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Edit Delivery"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteIndividualDelivery(del.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remove Delivery"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <span className="text-slate-400">|</span>
                <span>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                  {filteredDeliveries.length} items)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-800">
                  {currentPage}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: BATCHES LIST / TABLE */
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Batches Header with [ + New Project ] Button */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>Delivery Names / Project Batches</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                One Delivery Name represents one large batch/group of deliveries (e.g. <em>GADC AUGUST 2026 BATCH A</em>).
                Click <strong>[ + New Project ]</strong> to create a new batch, or open an existing batch to manage individual deliveries.
              </p>
            </div>

            {canCreateProject && (
              <button
                id="new-project-button"
                type="button"
                onClick={() => setIsCreateBatchModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>[ + New Project ]</span>
              </button>
            )}
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-batches-input"
                type="text"
                placeholder="Search Delivery Name, Client, Coordinator..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  id="filter-batch-status-select"
                  value={batchStatusFilter}
                  onChange={(e) => setBatchStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-100 rounded-md">
                <strong className="text-slate-900">{filteredBatches.length}</strong> project batch
                {filteredBatches.length !== 1 ? 'es' : ''}
              </div>
            </div>
          </div>

          {/* Delivery Names / Batches Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Project Batches Directory</span>
              <span className="text-emerald-700 font-medium">Swipe to view all columns →</span>
            </div>
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="py-3 px-4">Delivery Name / Project Name</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Coordinator</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Total Individual Deliveries</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-500">
                        <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">No project batches found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click <strong>[ + New Project ]</strong> to create your first delivery batch.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => {
                      const count = deliveryCountsByBatch[batch.id] || 0;

                      return (
                        <tr
                          key={batch.id}
                          className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                          onClick={() => handleOpenBatch(batch.id)}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="group-hover:text-emerald-700 transition-colors">
                              {batch.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {batch.client}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-800 font-semibold">
                            {batch.coordinator}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {batch.createdDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                batch.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : batch.status === 'Draft'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-xs">
                              <Package className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{count} deliveries</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div
                              className="flex items-center justify-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenBatch(batch.id)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Open</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleStartEditBatch(batch, e)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Edit Batch"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteBatch(batch.id, e)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Batch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* CREATE BATCH MODAL */}
      <CreateDeliveryBatchModal
        isOpen={isCreateBatchModalOpen}
        onClose={() => setIsCreateBatchModalOpen(false)}
        currentUser={activeUser || undefined}
        onBatchCreated={(newBatch) => {
          setSelectedBatchId(newBatch.id);
        }}
      />

      {/* ADD INDIVIDUAL DELIVERY MODAL */}
      {activeBatch && (
        <AddIndividualDeliveryModal
          isOpen={isAddDeliveryModalOpen}
          onClose={() => setIsAddDeliveryModalOpen(false)}
          batch={activeBatch}
        />
      )}

      {/* BATCH EXCEL IMPORT MODAL */}
      {activeBatch && (
        <BatchDeliveryExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          batch={activeBatch}
        />
      )}

      {/* EDIT BATCH MODAL */}
      {editingBatch && (
        <div
          id="edit-batch-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Project / Delivery Batch</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Name / Project Name
                </label>
                <input
                  type="text"
                  value={editBatchName}
                  onChange={(e) => setEditBatchName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editBatchStatus}
                  onChange={(e) => setEditBatchStatus(e.target.value as DeliveryBatchStatus)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editBatchNotes}
                  onChange={(e) => setEditBatchNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="px-3.5 py-1.5 border rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBatchEdit}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INDIVIDUAL DELIVERY MODAL */}
      {editingDelivery && (
        <div
          id="edit-individual-delivery-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Delivery ({editingDelivery.deliveryId})
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store / Consignee</label>
                <input
                  type="text"
                  value={editingDelivery.consignee}
                  onChange={(e) =>
                    setEditingDelivery({ ...editingDelivery, consignee: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Individual Delivery POD Number
                </label>
                <input
                  type="text"
                  value={editingDelivery.individualDeliveryPod}
                  onChange={(e) =>
                    setEditingDelivery({
                      ...editingDelivery,
                      individualDeliveryPod: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold text-blue-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Code</label>
                  <input
                    type="text"
                    value={editingDelivery.destinationCode}
                    onChange={(e) =>
                      setEditingDelivery({ ...editingDelivery, destinationCode: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area</label>
                  <select
                    value={editingDelivery.area}
                    onChange={(e) =>
                      setEditingDelivery({ ...editingDelivery, area: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Luzon">Luzon</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                    <option value="NCR">NCR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editingDelivery.quantity}
                    onChange={(e) =>
                      setEditingDelivery({
                        ...editingDelivery,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingDelivery.status || 'Pending Assignment'}
                    onChange={(e) =>
                      setEditingDelivery({ ...editingDelivery, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Pending Assignment">Pending Assignment</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDelivery(null)}
                className="px-3.5 py-1.5 border rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (editingDelivery) {
                    await updateIndividualDelivery(editingDelivery);
                    setEditingDelivery(null);
                  }
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Encoding Modal for Individual Delivery from Batch Manager */}
      <DispatchEncodingModal
        isOpen={!!encodingDelivery}
        delivery={encodingDelivery}
        truckRun={
          encodingDelivery
            ? truckRuns.find((r) => r.id === encodingDelivery.truckRunId) || null
            : null
        }
        onClose={() => setEncodingDelivery(null)}
        onSave={async (deliveryId, data) => {
          await saveDeliveryDispatch(deliveryId, data);
        }}
        currentUserDispatcherName={currentUserProfile?.name || 'Eduardo G. Ramos'}
      />
    </div>
  );
};
