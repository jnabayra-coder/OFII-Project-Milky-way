import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Info
} from 'lucide-react';
import { ImportHistoryRecord } from '../types';

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ImportHistoryRecord[];
  onClearHistory?: () => void;
}

export const ImportHistoryModal: React.FC<ImportHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((h) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      h.fileName.toLowerCase().includes(q) ||
      h.importedBy.toLowerCase().includes(q) ||
      h.status.toLowerCase().includes(q) ||
      h.importedAt.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-emerald-600/30 border border-emerald-500/40 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Excel Import Audit History</h2>
              <p className="text-xs text-slate-400">
                Log of bulk shipment batches uploaded into the OFII Monitoring System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear audit log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Log</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search file name, user, status..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="text-xs text-slate-600 font-medium">
            Total Batches: <span className="font-bold text-slate-900">{history.length}</span>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No Excel import history found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                When employees upload Excel shipment batches, audit records with full row statistics will appear here.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Imported By</th>
                    <th className="py-2.5 px-3 text-center">Total Rows</th>
                    <th className="py-2.5 px-3 text-center">Imported</th>
                    <th className="py-2.5 px-3 text-center">Warnings</th>
                    <th className="py-2.5 px-3 text-center">Skipped</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={item.fileName}>
                              {item.fileName}
                            </span>
                            {item.fileSize && (
                              <span className="text-[10px] text-slate-400">{item.fileSize}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {item.importedAt}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {item.importedBy}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                        {item.totalRows}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                        {item.successfullyImported}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-amber-700">
                        {item.warnings}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {item.skipped}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Partially Completed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>OFII Audited Import Log • Local & Cloud Storage Synchronized</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
