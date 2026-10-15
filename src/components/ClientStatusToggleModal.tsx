import React from 'react';
import { PowerOff, RotateCcw, X, Building2, ShieldCheck } from 'lucide-react';
import { ClientSummary } from '../types';

interface ClientStatusToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientSummary | null;
  mode: 'deactivate' | 'reactivate';
  onConfirm: (clientId: string) => void;
}

export const ClientStatusToggleModal: React.FC<ClientStatusToggleModalProps> = ({
  isOpen,
  onClose,
  client,
  mode,
  onConfirm,
}) => {
  if (!isOpen || !client) return null;

  const isDeactivating = mode === 'deactivate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDeactivating 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
              isDeactivating 
                ? 'bg-amber-100 border-amber-300 text-amber-700' 
                : 'bg-blue-100 border-blue-300 text-blue-700'
            }`}>
              {isDeactivating ? <PowerOff className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isDeactivating ? 'Deactivate this client?' : 'Reactivate this client?'}
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                {isDeactivating ? 'Corporate Account Deactivation' : 'Restore Operational Status'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 leading-relaxed font-normal">
            {isDeactivating 
              ? 'This client will no longer be available for new dispatches, but existing shipment and historical records will be preserved.' 
              : 'This client will become available for new dispatches again.'}
          </p>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Client Name:</span>
              <span className="font-bold text-slate-800">{client.name}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Client Code:</span>
              <span className="font-mono font-semibold text-slate-700">{client.code}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Contact Person:</span>
              <span className="text-slate-700">{client.primaryContact || '—'}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Area:</span>
              <span className="text-slate-700">{client.area || 'Luzon'}</span>
            </div>
          </div>

          {isDeactivating && (
            <div className="flex items-start gap-2 p-2.5 bg-blue-50/80 rounded border border-blue-200/80 text-[11px] text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Historical shipment records, dispatches, and reports will remain fully accessible in the system.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-xs transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          
          {isDeactivating ? (
            <button
              type="button"
              onClick={() => {
                onConfirm(client.id);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>DEACTIVATE</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onConfirm(client.id);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REACTIVATE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
