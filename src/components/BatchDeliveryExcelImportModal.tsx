import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw, 
  ArrowRight,
  Download,
  Info,
  Edit2,
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { DeliveryBatch } from '../types';
import { 
  parseDeliveryBatchExcel, 
  downloadDeliveryBatchTemplate, 
  ValidatedBatchDeliveryRow,
  validateBatchDeliveryRow 
} from '../utils/deliveryBatchExcel';

interface BatchDeliveryExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: DeliveryBatch;
  onImportComplete?: (count: number) => void;
}

export const BatchDeliveryExcelImportModal: React.FC<BatchDeliveryExcelImportModalProps> = ({
  isOpen,
  onClose,
  batch,
  onImportComplete,
}) => {
  const { clients, bulkImportIndividualDeliveries } = useData();

  const [currentStep, setCurrentStep] = useState<'upload' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [rows, setRows] = useState<ValidatedBatchDeliveryRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Inline editing state in preview table
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<ValidatedBatchDeliveryRow['data'] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Check extension
    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setParseError('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);

    try {
      const result = await parseDeliveryBatchExcel(selectedFile, batch, clients);
      setRows(result.rows);
      setCurrentStep('preview');
    } catch (err: any) {
      setParseError(err?.message || 'Failed to parse Excel file. Please verify format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartEdit = (row: ValidatedBatchDeliveryRow) => {
    setEditingRowIndex(row.rowIndex);
    setEditFormData({ ...row.data });
  };

  const handleSaveEdit = () => {
    if (editingRowIndex === null || !editFormData) return;

    // Revalidate modified row
    const revalidated = validateBatchDeliveryRow(editFormData, editingRowIndex, clients, batch);

    setRows((prev) =>
      prev.map((r) => (r.rowIndex === editingRowIndex ? revalidated : r))
    );
    setEditingRowIndex(null);
    setEditFormData(null);
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditFormData(null);
  };

  const handleExecuteImport = async (onlyValid: boolean = false) => {
    const targetRows = onlyValid ? validRows : validRows; // safely only commit validated
    if (targetRows.length === 0) {
      setParseError('There are no valid rows to import.');
      return;
    }

    setIsImporting(true);
    try {
      const itemsToImport = targetRows.map((r) => r.data);
      const res = await bulkImportIndividualDeliveries(batch.id, itemsToImport);

      if (onImportComplete) {
        onImportComplete(res.count);
      }
      onClose();
    } catch (err: any) {
      setParseError(err?.message || 'Failed to complete import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setFile(null);
    setRows([]);
    setParseError(null);
    setEditingRowIndex(null);
    setEditFormData(null);
  };

  return (
    <div
      id="batch-excel-import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="batch-excel-import-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Import Individual Deliveries
              </h2>
              <p className="text-xs text-slate-300">
                Batch: <span className="font-semibold text-emerald-300">{batch.name}</span> ({batch.client})
              </p>
            </div>
          </div>
          <button
            id="close-batch-import-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grow space-y-5">
          {parseError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {currentStep === 'upload' ? (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                id="batch-excel-dropzone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Click to browse or drag and drop Excel file
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports .xlsx, .xls, or .csv containing store deliveries for this batch.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/70 text-slate-700 text-xs font-medium">
                  <span>Standard Excel / CSV formats</span>
                </div>
              </div>

              {/* Notice & Template Download */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="text-xs text-slate-600">
                    Need the formatted file structure? Download the dedicated template pre-filled for this batch.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadDeliveryBatchTemplate(batch)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Strict Validation Note */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Mandatory Columns Required for Import:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
                  <li><strong>Consignee / Store</strong> (e.g. Store 114 - Robinson Antipolo)</li>
                  <li><strong>Individual Delivery POD Number</strong> (e.g. 87890)</li>
                  <li><strong>Delivery Area</strong> (Luzon, Visayas, Mindanao, NCR)</li>
                  <li><strong>Client Name</strong> (defaults to <em>{batch.client}</em> if not specified)</li>
                </ul>
              </div>
            </div>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-4">
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Total Rows</span>
                  <span className="text-lg font-bold text-slate-800">{rows.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-800">Valid Rows</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-700">{validRows.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-red-800">Invalid Rows</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">{invalidRows.length}</span>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>{invalidRows.length} row(s) have missing required fields</strong> (highlighted in red below).
                      You can click <em>Edit</em> to fix them inline, or click <em>Import Only Valid Rows</em>.
                    </span>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Delivery ID</th>
                        <th className="py-2.5 px-3">Consignee / Store *</th>
                        <th className="py-2.5 px-3">Individual POD # *</th>
                        <th className="py-2.5 px-3">Area *</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => {
                        const isEditing = editingRowIndex === row.rowIndex;

                        return (
                          <tr
                            key={row.rowIndex}
                            className={`transition-colors ${
                              !row.isValid ? 'bg-red-50/30' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {row.rowIndex + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  <Check className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                  <AlertCircle className="w-3 h-3" /> Fix Required
                                </span>
                              )}
                            </td>

                            {isEditing && editFormData ? (
                              <>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={editFormData.deliveryId}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, deliveryId: e.target.value })
                                    }
                                    className="w-20 px-2 py-1 border rounded text-xs"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={editFormData.consignee}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, consignee: e.target.value })
                                    }
                                    className={`w-40 px-2 py-1 border rounded text-xs ${
                                      !editFormData.consignee ? 'border-red-500 bg-red-50 font-bold' : ''
                                    }`}
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={editFormData.individualDeliveryPod}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        individualDeliveryPod: e.target.value,
                                      })
                                    }
                                    className={`w-28 px-2 py-1 border rounded text-xs ${
                                      !editFormData.individualDeliveryPod
                                        ? 'border-red-500 bg-red-50 font-bold'
                                        : ''
                                    }`}
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={editFormData.area}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, area: e.target.value })
                                    }
                                    className="w-24 px-1.5 py-1 border rounded text-xs"
                                  >
                                    <option value="Luzon">Luzon</option>
                                    <option value="Visayas">Visayas</option>
                                    <option value="Mindanao">Mindanao</option>
                                    <option value="NCR">NCR</option>
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={editFormData.destination}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, destination: e.target.value })
                                    }
                                    className="w-28 px-2 py-1 border rounded text-xs"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    value={editFormData.quantity}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        quantity: parseInt(e.target.value, 10) || 1,
                                      })
                                    }
                                    className="w-16 px-2 py-1 border rounded text-xs"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={editFormData.modeOfShipment}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        modeOfShipment: e.target.value,
                                      })
                                    }
                                    className="w-24 px-2 py-1 border rounded text-xs"
                                  />
                                </td>
                                <td className="py-2 px-3 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                    title="Save changes"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-3 font-medium text-slate-800">
                                  {row.data.deliveryId}
                                </td>
                                {/* Consignee cell - highlight RED if error */}
                                <td
                                  className={`py-2.5 px-3 font-medium ${
                                    row.errors.consignee
                                      ? 'bg-red-100/90 text-red-900 font-bold border border-red-400'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {row.data.consignee || (
                                    <span className="italic text-red-600">Missing Consignee</span>
                                  )}
                                </td>
                                {/* POD cell - highlight RED if error */}
                                <td
                                  className={`py-2.5 px-3 font-mono font-bold ${
                                    row.errors.individualDeliveryPod
                                      ? 'bg-red-100/90 text-red-900 border border-red-400'
                                      : 'text-blue-700'
                                  }`}
                                >
                                  {row.data.individualDeliveryPod || (
                                    <span className="italic text-red-600 font-sans text-[11px]">
                                      Missing POD #
                                    </span>
                                  )}
                                </td>
                                {/* Area cell - highlight RED if error */}
                                <td
                                  className={`py-2.5 px-3 ${
                                    row.errors.area
                                      ? 'bg-red-100/90 text-red-900 font-bold border border-red-400'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {row.data.area || (
                                    <span className="italic text-red-600">Missing Area</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]">
                                  {row.data.destination || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  {row.data.quantity}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {row.data.modeOfShipment}
                                </td>
                                <td className="py-2.5 px-3">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(row)}
                                    className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {currentStep === 'preview' ? (
            <>
              <button
                id="batch-import-back-btn"
                type="button"
                onClick={handleReset}
                disabled={isImporting}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload Another File</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  id="batch-import-cancel-btn"
                  type="button"
                  onClick={onClose}
                  disabled={isImporting}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium text-xs hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                {invalidRows.length > 0 && validRows.length > 0 && (
                  <button
                    id="batch-import-valid-only-btn"
                    type="button"
                    onClick={() => handleExecuteImport(true)}
                    disabled={isImporting}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Import Only Valid Rows ({validRows.length})
                  </button>
                )}

                <button
                  id="batch-import-all-btn"
                  type="button"
                  onClick={() => handleExecuteImport(false)}
                  disabled={isImporting || validRows.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? 'Importing Deliveries...'
                      : `Import ${validRows.length} Deliveries`}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
