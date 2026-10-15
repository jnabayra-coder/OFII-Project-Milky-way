import React, { useState } from 'react';
import { Building2, AlertTriangle, ShieldCheck, X, PowerOff, RotateCcw } from 'lucide-react';
import { ClientSummary } from '../types';

interface ClientDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientSummary | null;
  hasHistoricalRecords: boolean;
  historicalRecordsCount: number;
  onConfirmDeactivate: (clientId: string, reason?: string) => void;
  onConfirmReactivate?: (clientId: string) => void;
  onConfirmTrashClient?: (clientId: string) => void;
}

export const ClientDeactivateModal: React.FC<ClientDeactivateModalProps> = ({
  isOpen,
  onClose,
  client,
  hasHistoricalRecords,
  historicalRecordsCount,
  onConfirmDeactivate,
  onConfirmReactivate,
  onConfirmTrashClient,
}) => {
  const [reason, setReason] = useState('Account deactivated per management/client request.');

  if (!isOpen || !client) return null;

  const isAlreadyDeactivated = !!client.isDeactivated;

  if (isAlreadyDeactivated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reactivate Client Account?</h3>
                <p className="text-[11px] text-blue-700 font-medium">
                  Restore active operational status
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <p className="text-slate-600">
              Reactivating <strong className="text-slate-800">{client.name}</strong> will return this client to all active client selection dropdowns across Daily Dispatch, Client Monitoring, and Forwarding Reports.
            </p>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Client Code:</span>
                <span className="font-mono font-bold text-slate-800">{client.code}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Associated History:</span>
                <span className="font-semibold text-blue-700">{historicalRecordsCount} Recorded Operations</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-xs transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => {
                if (onConfirmReactivate) onConfirmReactivate(client.id);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REACTIVATE CLIENT</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <PowerOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {hasHistoricalRecords ? 'Deactivate Client Account' : 'Deactivate / Remove Client'}
              </h3>
              <p className="text-[11px] text-amber-800 font-medium">
                Data Integrity & Historical Preservation Rule
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {hasHistoricalRecords ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded text-slate-700 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Historical Preservation Rule Active</span>
                </div>
                <p className="text-[11px] text-blue-950">
                  This client has <strong className="font-semibold text-blue-900">{historicalRecordsCount} operational shipments, dispatches, and reports</strong> in the system.
                </p>
                <p className="text-[11px] text-slate-600">
                  To protect business audits and reporting integrity, clients with operational history cannot be permanently deleted. Instead, the client will be <strong>Deactivated</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Client:</span>
                  <span className="font-bold text-slate-800">{client.name} ({client.code})</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Historical Dispatches & Shipments:</span>
                  <span className="font-bold text-emerald-700">✓ All {historicalRecordsCount} records preserved</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Active Dropdowns:</span>
                  <span className="text-amber-800 font-semibold">Hidden from new bookings</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Reason for Deactivation (Optional):
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. Contract completed, account merged, or dormant..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600">
                This client (<strong className="text-slate-800">{client.name}</strong>) has no historical shipments recorded yet. You may either deactivate them or move them to Recently Deleted.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-xs transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          
          {!hasHistoricalRecords && onConfirmTrashClient && (
            <button
              type="button"
              onClick={() => {
                onConfirmTrashClient(client.id);
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded transition-colors cursor-pointer"
            >
              MOVE TO TRASH
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onConfirmDeactivate(client.id, reason);
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>DEACTIVATE CLIENT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
