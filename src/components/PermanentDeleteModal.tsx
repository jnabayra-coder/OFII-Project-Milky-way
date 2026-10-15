import React from 'react';
import { AlertOctagon, X, Trash2 } from 'lucide-react';
import { OperationalRecordType } from '../types';

interface PermanentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordType?: OperationalRecordType;
  recordIdentifier?: string;
  clientName?: string;
}

export const PermanentDeleteModal: React.FC<PermanentDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordType = 'dispatch',
  recordIdentifier,
  clientName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-rose-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Permanently delete this record?</h3>
              <p className="text-[11px] text-rose-700 font-semibold">
                Destructive Action • Irreversible
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
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded text-xs text-rose-900 font-medium leading-relaxed">
            Warning: This action <strong className="underline decoration-rose-500">cannot be undone</strong>. This operational record will be permanently purged from the system and cannot be restored.
          </div>

          {(recordIdentifier || clientName) && (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1 text-xs">
              {recordIdentifier && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Target Identifier:</span>
                  <span className="font-mono font-bold text-slate-900">{recordIdentifier}</span>
                </div>
              )}
              {clientName && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Associated Client:</span>
                  <span className="font-semibold text-slate-800">{clientName}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-500 italic">
            Please confirm that this record was created in error or is no longer required for any accounting, auditing, or compliance reports.
          </p>
        </div>

        {/* Footer */}
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
            className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>PERMANENTLY DELETE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
