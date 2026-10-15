import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Building2, User, Calendar, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getClientAssignedCoordinator } from '../utils/dataSync';
import { DeliveryBatch, DeliveryBatchStatus, UserProfile } from '../types';
import { isCoordinatorRole, normalizeUserRole } from '../utils/roleUtils';
import { getStoredAuthSession } from '../data/userAccounts';

interface CreateDeliveryBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCreated?: (batch: DeliveryBatch) => void;
  currentUser?: UserProfile;
}

export const CreateDeliveryBatchModal: React.FC<CreateDeliveryBatchModalProps> = ({
  isOpen,
  onClose,
  onBatchCreated,
  currentUser: propUser,
}) => {
  const { clients, createDeliveryBatch, currentUserProfile } = useData();

  const [name, setName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [createdDate, setCreatedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<DeliveryBatchStatus>('Active');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve trusted active user from prop, active session, or context profile
  const sessionUser = getStoredAuthSession();
  const activeUser = propUser || (sessionUser && sessionUser.isActive !== false ? sessionUser : currentUserProfile);

  // RBAC Permission Check: Strictly Coordinator or Admin authorized with active approval
  const isAuthorized = (
    isCoordinatorRole(activeUser) ||
    normalizeUserRole(activeUser) === 'ADMIN' ||
    isCoordinatorRole(currentUserProfile) ||
    normalizeUserRole(currentUserProfile) === 'ADMIN'
  ) && (
    (!activeUser?.approvalStatus || activeUser.approvalStatus === 'APPROVED') &&
    (!currentUserProfile?.approvalStatus || currentUserProfile.approvalStatus === 'APPROVED')
  );

  // Filter active clients
  const activeClients = clients.filter((c) => !c.isDeactivated);

  // Set default client on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      setNotes('');
      setCreatedDate(new Date().toISOString().split('T')[0]);
      setStatus('Active');

      if (activeClients.length > 0 && !selectedClient) {
        const firstClient = activeClients[0].name;
        setSelectedClient(firstClient);
        const defaultCoord = activeUser?.name || currentUserProfile?.name || 'Alodia Manalansan';
        const assignedCoord = getClientAssignedCoordinator(clients, firstClient, defaultCoord);
        setCoordinator(assignedCoord);
      }
    }
  }, [isOpen]);

  // When selectedClient changes, auto-populate coordinator based on existing Client Management
  const handleClientChange = (newClientName: string) => {
    setSelectedClient(newClientName);
    const defaultCoord = activeUser?.name || currentUserProfile?.name || 'Alodia Manalansan';
    const assignedCoord = getClientAssignedCoordinator(clients, newClientName, defaultCoord);
    setCoordinator(assignedCoord);
  };

  if (!isOpen) return null;

  if (!isAuthorized) {
    return (
      <div
        id="create-batch-access-denied-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      >
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Access Denied</h3>
          <p className="text-xs text-slate-600">
            Only an authorized <strong>Coordinator</strong> can create a New Project / Delivery Name. Truck Planners and other roles are restricted to existing batches.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthorized) {
      setError('Access Denied: Only a Coordinator is authorized to create a New Project / Delivery Name.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Delivery Name / Project Name is required (e.g. GADC AUGUST 2026 BATCH A).');
      return;
    }

    if (!selectedClient) {
      setError('Please select a client.');
      return;
    }

    setIsSubmitting(true);
    try {
      const clientObj = clients.find((c) => c.name === selectedClient);
      const created = await createDeliveryBatch({
        name: trimmedName,
        client: selectedClient,
        clientId: clientObj?.id,
        coordinator: coordinator || activeUser?.name || currentUserProfile?.name || 'Alodia Manalansan',
        createdDate,
        status,
        notes: notes.trim(),
      });

      if (onBatchCreated) {
        onBatchCreated(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create project batch. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-delivery-batch-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="create-delivery-batch-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-4 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Create New Project / Delivery Batch
              </h2>
              <p className="text-xs text-slate-300">
                Phase 1 Coordinator Delivery Name Foundation
              </p>
            </div>
          </div>
          <button
            id="close-create-batch-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Delivery Name / Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Delivery Name / Project Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="batch-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GADC AUGUST 2026 BATCH A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Represents one large batch/group that will contain individual store deliveries.
            </p>
          </div>

          {/* Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Client Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="batch-client-select"
                  value={selectedClient}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                >
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto-populated Coordinator */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Assigned Coordinator</span>
                <span className="text-[10px] text-emerald-600 font-normal">Auto-mapped</span>
              </label>
              <div className="relative">
                <input
                  id="batch-coordinator-input"
                  type="text"
                  value={coordinator}
                  onChange={(e) => setCoordinator(e.target.value)}
                  placeholder="Auto-assigned based on client"
                  className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-900 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Created Date & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Created Date <span className="text-red-500">*</span>
              </label>
              <input
                id="batch-created-date-input"
                type="date"
                value={createdDate}
                onChange={(e) => setCreatedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <select
                id="batch-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryBatchStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Project Notes (Optional)
            </label>
            <textarea
              id="batch-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Nationwide rollout for Q3 promotions"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              id="cancel-create-batch-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-batch-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Batch...' : 'Create Project Batch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
