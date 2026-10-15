import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { OperationalRecordType } from '../types';

interface SafeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordType?: OperationalRecordType;
  recordIdentifier?: string; // e.g. "POD-884920" or "PRJ-ISCI-049"
  clientName?: string;
  additionalInfo?: string;
}

export const SafeDeleteModal: React.FC<SafeDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordType = 'dispatch',
  recordIdentifier,
  clientName,
  additionalInfo,
}) => {
  if (!isOpen) return null;

  const getTypeLabel = () => {
    switch (recordType) {
      case 'dispatch': return 'Daily Dispatch Record';
      case 'shipment': return 'Client Shipment Record';
      case 'forwarding_report': return 'Forwarding Progressive Report Record';
      case 'client': return 'Client Profile';
      default: return 'Operational Record';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete this record?</h3>
              <p className="text-[11px] text-amber-800 font-medium">
                Safe Delete & Recovery Action
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            This record will be moved to <strong className="text-slate-800 font-semibold">Recently Deleted</strong> and can be restored later at any time without losing historical data or relationships.
          </p>

          {/* Record Identification Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Record Module:</span>
              <span className="font-semibold text-slate-800">{getTypeLabel()}</span>
            </div>
            {recordIdentifier && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Reference / Identifier:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {recordIdentifier}
                </span>
              </div>
            )}
            {clientName && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Account / Client:</span>
                <span className="font-semibold text-slate-800">{clientName}</span>
              </div>
            )}
            {additionalInfo && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Details:</span>
                <span className="text-slate-700 truncate max-w-[200px]">{additionalInfo}</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded text-[11px] text-blue-800">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              The record will be safely removed from standard active views, and its relations and audit log will be preserved.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-xs transition-colors cursor-pointer uppercase tracking-wider"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>MOVE TO TRASH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
