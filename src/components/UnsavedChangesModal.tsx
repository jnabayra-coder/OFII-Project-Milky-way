import React from 'react';
import { AlertCircle, ArrowLeft, Trash2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirmDiscard: () => void;
  onKeepEditing: () => void;
  title?: string;
  message?: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onConfirmDiscard,
  onKeepEditing,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Are you sure you want to leave?',
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      id="unsaved-changes-modal-overlay"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden scale-in-95 duration-150"
        id="unsaved-changes-modal-container"
      >
        {/* Modal Header */}
        <div className="bg-amber-50/80 px-6 py-4 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-amber-900">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-amber-800 font-medium">Pending modifications will be lost</p>
            </div>
          </div>
          <button
            onClick={onKeepEditing}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {message}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Any values entered in this form will not be saved to the shared system database.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onKeepEditing}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            id="unsaved-modal-keep-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Keep Editing</span>
          </button>
          
          <button
            type="button"
            onClick={onConfirmDiscard}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            id="unsaved-modal-discard-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
