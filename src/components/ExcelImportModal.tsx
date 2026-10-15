import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Edit3, 
  Check, 
  Search, 
  Filter, 
  Building2, 
  User, 
  Clock, 
  Layers, 
  RefreshCw,
  CopyCheck,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { 
  ForwardingProgressiveRecord, 
  ClientSummary, 
  DispatchRecord, 
  OFIIFieldKey, 
  ImportHistoryRecord 
} from '../types';
import { 
  readExcelFile, 
  autoMapHeaders, 
  downloadSampleExcelTemplate,
  downloadOFIIExcelTemplate,
  downloadDailyDispatchTemplate,
  downloadForwardingTemplate,
  generateImportErrorReportExcel,
  OFII_FIELD_DEFINITIONS 
} from '../utils/excelParser';
import { 
  validateImportRows, 
  validateSingleRow,
  ValidationSummary, 
  ValidatedImportRow,
  RowValidationStatus 
} from '../utils/excelValidation';
import { EditImportRowModal } from './EditImportRowModal';
import { ImportErrorBoundary } from './ImportErrorBoundary';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientSummary[];
  existingForwardingRecords: ForwardingProgressiveRecord[];
  existingDispatches: DispatchRecord[];
  currentUserName: string;
  targetModule?: 'forwarding' | 'dispatch';
  onConfirmBulkImport: (
    recordsToImport: ForwardingProgressiveRecord[],
    summary: {
      fileName: string;
      fileSize: string;
      totalRows: number;
      importedCount: number;
      warningCount: number;
      skippedCount: number;
    }
  ) => Promise<void>;
  onOpenAddClientModal?: (initialName: string) => void;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'IMPORTING' | 'COMPLETE';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  clients,
  existingForwardingRecords,
  existingDispatches,
  currentUserName,
  targetModule = 'forwarding',
  onConfirmBulkImport,
  onOpenAddClientModal,
}) => {
  if (!isOpen) return null;

  const activeModule: 'forwarding' | 'dispatch' = targetModule === 'dispatch' ? 'dispatch' : 'forwarding';
  const isDispatch = activeModule === 'dispatch';

  // Multi-step State
  const [currentStep, setCurrentStep] = useState<ImportStep>('UPLOAD');

  // Step 1: Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSizeFormatted, setFileSizeFormatted] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Raw file parsed data
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRawRows, setExcelRawRows] = useState<Record<string, any>[]>([]);

  // Step 2: Column Mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, OFIIFieldKey>>({});

  // Step 3: Validation & Preview state
  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'WARNING' | 'INVALID' | 'DUPLICATE'>('ALL');
  const [previewSearch, setPreviewSearch] = useState('');
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  // Step 4 & 5: Progress & Final Summary
  const [importProgress, setImportProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [finalImportStats, setFinalImportStats] = useState<{
    totalProcessed: number;
    imported: number;
    warnings: number;
    skipped: number;
    duplicates: number;
    failed: number;
    failedRows?: { rowNumber: number; reason: string; reference?: string }[];
  } | null>(null);

  // ---------------------------------------------------------------------------
  // STEP 1 HANDLERS: FILE UPLOAD & PARSING
  // ---------------------------------------------------------------------------
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setUploadError(`Unsupported file format ".${ext || 'unknown'}". Please upload an Excel spreadsheet (.xlsx, .xls) or comma-separated file (.csv).`);
      return;
    }

    setUploadError(null);
    setIsReadingFile(true);
    setSelectedFile(file);

    try {
      const { headers, rows, fileName: fName, fileSizeFormatted: fSize } = await readExcelFile(file, activeModule);
      setFileName(fName);
      setFileSizeFormatted(fSize);
      setExcelHeaders(headers);
      setExcelRawRows(rows);

      // Intelligent Auto-Mapping tailored to target module
      const autoMap = autoMapHeaders(headers, activeModule);
      setColumnMapping(autoMap);
      setIsReadingFile(false);
    } catch (err: any) {
      setIsReadingFile(false);
      setUploadError(err.message || 'Unable to read this Excel file.');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileName('');
    setFileSizeFormatted('');
    setExcelHeaders([]);
    setExcelRawRows([]);
    setColumnMapping({});
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // STEP 2 HANDLERS: COLUMN MAPPING & PROCEED TO VALIDATION
  // ---------------------------------------------------------------------------
  const handleMappingChange = (header: string, field: OFIIFieldKey) => {
    setColumnMapping((prev) => ({
      ...prev,
      [header]: field,
    }));
  };

  const requiredFields = useMemo(() => {
    if (isDispatch) {
      // Required fields for Daily Dispatching: Date / Dispatch Date, Client Name, Delivery Area, POD, Consignee
      return OFII_FIELD_DEFINITIONS.filter((d) => 
        d.key === 'actualDispatchDate' || 
        d.key === 'client' || 
        d.key === 'area' || 
        d.key === 'podNumber' || 
        d.key === 'consignee'
      );
    }
    // Required fields for Forwarding: Client Name, Delivery Area, Mode of Shipment, Reference Number, Consignee, Actual Dispatched Date
    return OFII_FIELD_DEFINITIONS.filter((d) => 
      d.key === 'client' || 
      d.key === 'area' || 
      d.key === 'modeOfShipment' || 
      d.key === 'referenceNumber' || 
      d.key === 'consignee' || 
      d.key === 'actualDispatchDate'
    );
  }, [isDispatch]);

  const unmappedRequiredFields = useMemo(() => {
    const mappedFieldValues = new Set(Object.values(columnMapping));
    return requiredFields.filter((req) => !mappedFieldValues.has(req.key));
  }, [columnMapping, requiredFields]);

  const handleProceedToValidation = () => {
    const summary = validateImportRows(
      excelRawRows,
      columnMapping,
      clients,
      existingForwardingRecords,
      existingDispatches,
      activeModule
    );
    setValidatedRows(summary.rows);
    setCurrentStep('PREVIEW');
  };

  // ---------------------------------------------------------------------------
  // STEP 3 HANDLERS: PREVIEW, EDITING, & DUPLICATE ACTIONS
  // ---------------------------------------------------------------------------
  const handleToggleRowSelect = (rowIndex: number) => {
    setValidatedRows((prev) =>
      prev.map((r) => {
        if (r.rowIndex === rowIndex) {
          return { ...r, isSelectedForImport: !r.isSelectedForImport };
        }
        return r;
      })
    );
  };

  const handleSelectAllValid = () => {
    setValidatedRows((prev) =>
      prev.map((r) => {
        if (r.status === 'VALID') {
          return { ...r, isSelectedForImport: true };
        }
        return r;
      })
    );
  };

  const handleAllowAllWarnings = () => {
    setValidatedRows((prev) =>
      prev.map((r) => {
        if (r.status === 'WARNING') {
          return { ...r, isSelectedForImport: true };
        }
        return r;
      })
    );
  };

  const handleDeselectAllWarnings = () => {
    setValidatedRows((prev) =>
      prev.map((r) => {
        if (r.status === 'WARNING') {
          return { ...r, isSelectedForImport: false };
        }
        return r;
      })
    );
  };

  const handleToggleAllEligible = (selectAll: boolean) => {
    setValidatedRows((prev) =>
      prev.map((r) => {
        if (r.status !== 'INVALID') {
          return { ...r, isSelectedForImport: selectAll };
        }
        return r;
      })
    );
  };

  // Dynamic Critical Field Errors Summary
  const criticalFieldErrorsSummary = useMemo(() => {
    const counts: Record<string, { label: string; count: number; key: string }> = {
      client: { label: 'Client Name', count: 0, key: 'client' },
      area: { label: 'Delivery Area', count: 0, key: 'area' },
      modeOfShipment: { label: 'Mode of Shipment', count: 0, key: 'modeOfShipment' },
      actualDispatchDate: { label: 'Dispatch Date', count: 0, key: 'actualDispatchDate' },
      consignee: { label: 'Consignee', count: 0, key: 'consignee' },
      referenceNumber: { label: 'Reference Number', count: 0, key: 'referenceNumber' },
    };

    if (Array.isArray(validatedRows)) {
      validatedRows.forEach((r) => {
        if (!r) return;
        Object.keys(r.cellErrors || {}).forEach((key) => {
          if (counts[key]) {
            counts[key].count += 1;
          }
        });
      });
    }

    return Object.values(counts).filter((c) => c.count > 0);
  }, [validatedRows]);

  // Handle immediate in-place cell editing with real-time revalidation
  const handleInlineCellChange = (rowIndex: number, fieldKey: string, newValue: any) => {
    setValidatedRows((prev) => {
      const existingRefs = new Set<string>();
      const existingPods = new Set<string>();
      const existingAwbs = new Set<string>();
      existingForwardingRecords.forEach((r) => {
        if (r.referenceNumber) existingRefs.add(String(r.referenceNumber).trim().toLowerCase());
        if (r.podNumber) existingPods.add(String(r.podNumber).trim().toLowerCase());
        if (r.awbCourierRefNumber) existingAwbs.add(String(r.awbCourierRefNumber).trim().toLowerCase());
      });
      existingDispatches.forEach((d) => {
        if (d.podNumber) existingPods.add(String(d.podNumber).trim().toLowerCase());
      });

      const batchRefs = new Map<string, number>();
      const batchPods = new Map<string, number>();
      prev.forEach((r, idx) => {
        if (r.rowIndex !== rowIndex && r.mappedRecord?.referenceNumber) {
          batchRefs.set(String(r.mappedRecord.referenceNumber).trim().toLowerCase(), idx);
        }
        if (r.rowIndex !== rowIndex && r.mappedRecord?.podNumber) {
          batchPods.set(String(r.mappedRecord.podNumber).trim().toLowerCase(), idx);
        }
      });

      return prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;

        const updatedMapped: Partial<ForwardingProgressiveRecord> = {
          ...row.mappedRecord,
          [fieldKey]: newValue,
        };

        if (fieldKey === 'client') {
          const matched = clients.find(
            (c) => String(c?.name || '').trim().toLowerCase() === String(newValue || '').trim().toLowerCase()
          );
          if (matched) {
            updatedMapped.clientId = matched.id;
            updatedMapped.coordinator = matched.assignedCoordinator || matched.accountManager || 'Alodia Manalansan';
          }
        }

        const revalidated = validateSingleRow({
          rowIndex: row.rowIndex,
          originalRow: row.originalRow,
          mappedRecord: updatedMapped,
          clients,
          existingRefs,
          existingPods,
          existingAwbs,
          batchRefs,
          batchPods,
          targetModule: activeModule,
          duplicateAction: row.duplicateAction,
        });

        return {
          ...revalidated,
          isSelectedForImport: revalidated.status !== 'INVALID',
        };
      });
    });
  };

  const handleDuplicateActionChange = (rowIndex: number, action: 'skip' | 'import_anyway') => {
    setValidatedRows((prev) =>
      prev.map((r) => {
        if (r.rowIndex === rowIndex) {
          return {
            ...r,
            duplicateAction: action,
            isSelectedForImport: action === 'import_anyway',
          };
        }
        return r;
      })
    );
  };

  const handleMapRowClient = (rowIndex: number, clientName: string) => {
    handleInlineCellChange(rowIndex, 'client', clientName);
  };

  const handleSaveEditedRow = (updatedRecord: ForwardingProgressiveRecord, isRecognized: boolean) => {
    if (editingRowIndex === null) return;

    setValidatedRows((prev) => {
      const existingRefs = new Set<string>();
      const existingPods = new Set<string>();
      const existingAwbs = new Set<string>();
      existingForwardingRecords.forEach((r) => {
        if (r.referenceNumber) existingRefs.add(String(r.referenceNumber).trim().toLowerCase());
        if (r.podNumber) existingPods.add(String(r.podNumber).trim().toLowerCase());
        if (r.awbCourierRefNumber) existingAwbs.add(String(r.awbCourierRefNumber).trim().toLowerCase());
      });
      existingDispatches.forEach((d) => {
        if (d.podNumber) existingPods.add(String(d.podNumber).trim().toLowerCase());
      });

      const batchRefs = new Map<string, number>();
      const batchPods = new Map<string, number>();
      prev.forEach((r, idx) => {
        if (r.rowIndex !== editingRowIndex && r.mappedRecord?.referenceNumber) {
          batchRefs.set(String(r.mappedRecord.referenceNumber).trim().toLowerCase(), idx);
        }
        if (r.rowIndex !== editingRowIndex && r.mappedRecord?.podNumber) {
          batchPods.set(String(r.mappedRecord.podNumber).trim().toLowerCase(), idx);
        }
      });

      return prev.map((r) => {
        if (r.rowIndex === editingRowIndex) {
          const revalidated = validateSingleRow({
            rowIndex: r.rowIndex,
            originalRow: r.originalRow,
            mappedRecord: updatedRecord,
            clients,
            existingRefs,
            existingPods,
            existingAwbs,
            batchRefs,
            batchPods,
            targetModule: activeModule,
            duplicateAction: r.duplicateAction,
          });

          return {
            ...revalidated,
            isSelectedForImport: revalidated.status !== 'INVALID',
          };
        }
        return r;
      });
    });
    setEditingRowIndex(null);
  };

  // Preview Filtered Rows
  const filteredPreviewRows = useMemo(() => {
    if (!Array.isArray(validatedRows)) return [];
    return validatedRows.filter((r) => {
      if (!r) return false;
      // 1. Status Tab Filter
      if (previewFilter === 'VALID' && r.status !== 'VALID') return false;
      if (previewFilter === 'WARNING' && r.status !== 'WARNING') return false;
      if (previewFilter === 'INVALID' && r.status !== 'INVALID') return false;
      if (previewFilter === 'DUPLICATE' && r.status !== 'DUPLICATE') return false;

      // 2. Search Filter
      const search = String(previewSearch || '').trim().toLowerCase();
      if (search) {
        const clientStr = String(r.mappedRecord?.client || '').toLowerCase();
        const consigneeStr = String(r.mappedRecord?.consignee || '').toLowerCase();
        const refStr = String(r.mappedRecord?.referenceNumber || '').toLowerCase();
        const podStr = String(r.mappedRecord?.podNumber || '').toLowerCase();
        const coordStr = String(r.mappedRecord?.coordinator || '').toLowerCase();

        const matches =
          clientStr.includes(search) ||
          consigneeStr.includes(search) ||
          refStr.includes(search) ||
          podStr.includes(search) ||
          coordStr.includes(search);
        if (!matches) return false;
      }

      return true;
    });
  }, [validatedRows, previewFilter, previewSearch]);

  // Statistics
  const previewStats = useMemo(() => {
    if (!Array.isArray(validatedRows)) {
      return { total: 0, valid: 0, warning: 0, invalid: 0, duplicate: 0, readyToImport: 0 };
    }
    const total = validatedRows.length;
    const valid = validatedRows.filter((r) => r?.status === 'VALID').length;
    const warning = validatedRows.filter((r) => r?.status === 'WARNING').length;
    const invalid = validatedRows.filter((r) => r?.status === 'INVALID').length;
    const duplicate = validatedRows.filter((r) => r?.status === 'DUPLICATE').length;
    const readyToImport = validatedRows.filter((r) => r?.isSelectedForImport && r?.status !== 'INVALID').length;

    return { total, valid, warning, invalid, duplicate, readyToImport };
  }, [validatedRows]);

  // ---------------------------------------------------------------------------
  // STEP 4 & 5: CONFIRM BULK IMPORT EXECUTION
  // ---------------------------------------------------------------------------
  const handleConfirmImport = async () => {
    const selectedRows = validatedRows.filter(
      (r) => r.isSelectedForImport && r.status !== 'INVALID'
    );

    if (selectedRows.length === 0) return;

    setCurrentStep('IMPORTING');
    setImportProgress(5);
    setProcessedCount(0);

    const validRecords: ForwardingProgressiveRecord[] = [];
    const failedRows: { rowNumber: number; reason: string; reference?: string }[] = [];

    const totalToProcess = selectedRows.length;

    for (let i = 0; i < totalToProcess; i++) {
      const row = selectedRows[i];
      try {
        if (!row.mappedRecord || !row.mappedRecord.client) {
          throw new Error('Record missing critical client information');
        }
        validRecords.push(row.mappedRecord);
      } catch (err: any) {
        failedRows.push({
          rowNumber: row.rowIndex,
          reason: err?.message || 'Transformation error',
          reference: row.mappedRecord?.referenceNumber || row.mappedRecord?.podNumber,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, Math.max(12, 500 / totalToProcess)));
      setProcessedCount(i + 1);
      setImportProgress(Math.round(((i + 1) / totalToProcess) * 100));
    }

    const skippedCount = validatedRows.length - validRecords.length;
    const warningImported = selectedRows.filter((r) => r.status === 'WARNING').length;
    const duplicateCount = validatedRows.filter(
      (r) => r.status === 'DUPLICATE' && (!r.isSelectedForImport || r.duplicateAction === 'skip')
    ).length;

    // Execute through DataContext
    if (validRecords.length > 0) {
      await onConfirmBulkImport(validRecords, {
        fileName: fileName || (isDispatch ? 'Imported_Daily_Dispatch.xlsx' : 'Imported_Forwarding_Report.xlsx'),
        fileSize: fileSizeFormatted,
        totalRows: validatedRows.length,
        importedCount: validRecords.length,
        warningCount: warningImported,
        skippedCount: skippedCount,
      });
    }

    setFinalImportStats({
      totalProcessed: validatedRows.length,
      imported: validRecords.length,
      warnings: warningImported,
      skipped: skippedCount,
      duplicates: duplicateCount,
      failed: failedRows.length,
      failedRows: failedRows,
    });

    setCurrentStep('COMPLETE');
  };

  const currentlyEditingRow = editingRowIndex !== null
    ? validatedRows.find((r) => r.rowIndex === editingRowIndex) || null
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight uppercase">
                  {isDispatch ? 'IMPORT DAILY DISPATCH DATA' : 'IMPORT SHIPMENT DATA'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isDispatch
                    ? 'Upload an Excel file to import multiple daily dispatch records into Daily Dispatching Monitoring.'
                    : 'Upload an Excel file to import multiple shipment records at once.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={currentStep === 'IMPORTING'}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors disabled:opacity-40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Wizard Bar */}
          <div className="bg-slate-800/80 px-6 py-2.5 border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-1.5 ${currentStep === 'UPLOAD' ? 'text-white font-bold' : 'text-emerald-400 font-semibold'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 'UPLOAD' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  1
                </span>
                <span>Upload Excel</span>
              </div>

              <div className="w-4 h-px bg-slate-600" />

              <div className={`flex items-center gap-1.5 ${currentStep === 'MAPPING' ? 'text-white font-bold' : (['PREVIEW', 'IMPORTING', 'COMPLETE'].includes(currentStep) ? 'text-emerald-400 font-semibold' : '')}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 'MAPPING' ? 'bg-blue-600 text-white' : (['PREVIEW', 'IMPORTING', 'COMPLETE'].includes(currentStep) ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400')}`}>
                  2
                </span>
                <span>Column Mapping</span>
              </div>

              <div className="w-4 h-px bg-slate-600" />

              <div className={`flex items-center gap-1.5 ${currentStep === 'PREVIEW' ? 'text-white font-bold' : (['IMPORTING', 'COMPLETE'].includes(currentStep) ? 'text-emerald-400 font-semibold' : '')}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 'PREVIEW' ? 'bg-blue-600 text-white' : (['IMPORTING', 'COMPLETE'].includes(currentStep) ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400')}`}>
                  3
                </span>
                <span>Validation & Preview</span>
              </div>

              <div className="w-4 h-px bg-slate-600" />

              <div className={`flex items-center gap-1.5 ${['IMPORTING', 'COMPLETE'].includes(currentStep) ? 'text-white font-bold' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep === 'COMPLETE' ? 'bg-emerald-600 text-white' : (currentStep === 'IMPORTING' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400')}`}>
                  4
                </span>
                <span>Import Execution</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadSampleExcelTemplate(activeModule)}
              className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700/80 hover:bg-slate-700 border border-slate-600 transition-colors cursor-pointer"
              title="Download standardized .xlsx template with sample OFII data"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download {isDispatch ? 'Dispatch' : 'Forwarding'} Template</span>
            </button>
          </div>

          {/* Modal Main Body */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* ------------------------------------------------------------- */}
            {/* STEP 1: UPLOAD FILE */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 'UPLOAD' && (
              <div className="max-w-2xl mx-auto space-y-6 py-4">
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="excel-file-input"
                  />

                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Drop your Excel file here
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    or click the button below to browse from your computer
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadingFile}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Browse Files</span>
                  </button>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => isDispatch ? downloadDailyDispatchTemplate(clients) : downloadForwardingTemplate(clients)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDispatch ? 'Download Daily Dispatching Template (.xlsx)' : 'Download Forwarding Progressive Template (.xlsx)'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-3 font-medium">
                    Supported formats: <strong className="text-slate-600">.xlsx</strong>, <strong className="text-slate-600">.xls</strong>, and <strong className="text-slate-600">.csv</strong>
                  </p>
                </div>

                {/* Error Banner */}
                {uploadError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Upload Error</span>
                      <span>{uploadError}</span>
                    </div>
                  </div>
                )}

                {/* Selected File Card */}
                {selectedFile && !uploadError && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{fileName}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Ready
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {fileSizeFormatted} • <strong className="text-slate-800">{excelRawRows.length} rows</strong> detected • {excelHeaders.length} columns
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Information Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Safe 6-Step Bulk Import Guarantee</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Uploading an Excel file will <strong>never save records immediately</strong>. You will have full control to review column recognition, verify client matches with auto-assigned coordinators, check duplicates, and resolve any warnings prior to final database commit.
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: COLUMN MAPPING */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 'MAPPING' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recognize & Map Excel Columns</h3>
                    <p className="text-xs text-slate-500">
                      Verify how the columns in <strong className="text-slate-700">{fileName}</strong> correspond to OFII shipment fields.
                    </p>
                  </div>

                  <div className="text-xs text-slate-600">
                    Total Columns: <span className="font-bold text-slate-900">{excelHeaders.length}</span>
                  </div>
                </div>

                {/* Unmapped Required Fields Alert */}
                {unmappedRequiredFields.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Required Fields Attention</span>
                      <span>The following required fields are not yet mapped: </span>
                      <strong className="text-amber-950 font-bold">
                        {unmappedRequiredFields.map((f) => f.label).join(', ')}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Mapping Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4 w-1/3">Excel Column Header</th>
                        <th className="py-2.5 px-2 text-center w-12"></th>
                        <th className="py-2.5 px-4 w-1/3">OFII Target Field</th>
                        <th className="py-2.5 px-4">Recognition Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {excelHeaders.map((header) => {
                        const currentMappedKey = columnMapping[header] || 'none';
                        const isMapped = currentMappedKey !== 'none';
                        const def = OFII_FIELD_DEFINITIONS.find((d) => d.key === currentMappedKey);

                        return (
                          <tr key={header} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900 font-mono">{header}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                                Sample: "{String(excelRawRows[0]?.[header] ?? '') || '—'}"
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-center text-slate-400">
                              <ArrowRight className="w-3.5 h-3.5 inline-block text-blue-600" />
                            </td>

                            <td className="py-2.5 px-4">
                              <select
                                value={currentMappedKey}
                                onChange={(e) => handleMappingChange(header, e.target.value as OFIIFieldKey)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer"
                              >
                                <option value="none">-- Do Not Import / Ignore --</option>
                                <optgroup label="Required OFII Fields">
                                  {OFII_FIELD_DEFINITIONS.filter((d) => d.required).map((d) => (
                                    <option key={d.key} value={d.key}>
                                      {d.label} (Required)
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Optional OFII Fields">
                                  {OFII_FIELD_DEFINITIONS.filter((d) => !d.required).map((d) => (
                                    <option key={d.key} value={d.key}>
                                      {d.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>

                            <td className="py-2.5 px-4">
                              {isMapped ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                                    def?.required
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    <Check className="w-3 h-3" />
                                    {def?.required ? 'Required Field' : 'Mapped'}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  Unmapped / Ignored
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: VALIDATION & PREVIEW */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 'PREVIEW' && (
              <div className="space-y-4">
                {/* Dynamic Import Validation Summary Banner */}
                <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          IMPORT VALIDATION SUMMARY
                        </span>
                        {previewStats.invalid === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> All Records Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> {previewStats.invalid} Records Need Attention
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Review and correct missing or problematic cells directly inside the preview table. All changes re-validate automatically in real time.
                      </p>
                    </div>

                    {/* Quick Count Metric Badges */}
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-center min-w-[70px]">
                        <span className="text-[10px] text-slate-400 block font-medium">Total</span>
                        <span className="text-base font-bold font-mono text-white">{previewStats.total}</span>
                      </div>
                      <div className="bg-emerald-950/70 px-3 py-1.5 rounded-lg border border-emerald-600/40 text-center min-w-[70px]">
                        <span className="text-[10px] text-emerald-400 block font-medium">✓ Valid</span>
                        <span className="text-base font-bold font-mono text-emerald-300">{previewStats.valid}</span>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-lg border text-center min-w-[70px] ${
                          previewStats.invalid > 0
                            ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-sm shadow-rose-950'
                            : 'bg-slate-800/90 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span className="text-[10px] block font-medium">⚠ Attention</span>
                        <span className="text-base font-bold font-mono">{previewStats.invalid}</span>
                      </div>
                      {previewStats.warning > 0 && (
                        <div className="bg-amber-950/70 px-3 py-1.5 rounded-lg border border-amber-600/40 text-center min-w-[70px]">
                          <span className="text-[10px] text-amber-400 block font-medium">Warnings</span>
                          <span className="text-base font-bold font-mono text-amber-300">{previewStats.warning}</span>
                        </div>
                      )}
                      {previewStats.duplicate > 0 && (
                        <div className="bg-purple-950/70 px-3 py-1.5 rounded-lg border border-purple-600/40 text-center min-w-[70px]">
                          <span className="text-[10px] text-purple-400 block font-medium">Duplicates</span>
                          <span className="text-base font-bold font-mono text-purple-300">{previewStats.duplicate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Critical Fields Breakdown Chips */}
                  {criticalFieldErrorsSummary.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center flex-wrap gap-2 text-xs">
                      <span className="text-slate-400 font-semibold text-[11px]">Critical Fields Missing / Problematic:</span>
                      {criticalFieldErrorsSummary.map((item) => (
                        <span
                          key={item.key}
                          className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-200 px-2 py-0.5 rounded text-[11px] font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <strong>{item.label}</strong> — {item.count} {item.count === 1 ? 'row' : 'rows'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                  {/* Status Tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('ALL')}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                        previewFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                      }`}
                    >
                      All Records ({previewStats.total})
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewFilter('VALID')}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                        previewFilter === 'VALID'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
                      }`}
                    >
                      ✓ Valid Records ({previewStats.valid})
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewFilter('INVALID')}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                        previewFilter === 'INVALID'
                          ? 'bg-rose-700 text-white shadow-xs'
                          : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-300'
                      }`}
                    >
                      ⚠ Needs Attention ({previewStats.invalid})
                    </button>

                    {previewStats.warning > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('WARNING')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                          previewFilter === 'WARNING'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
                        }`}
                      >
                        Warnings ({previewStats.warning})
                      </button>
                    )}

                    {previewStats.duplicate > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('DUPLICATE')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                          previewFilter === 'DUPLICATE'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-300'
                        }`}
                      >
                        Duplicates ({previewStats.duplicate})
                      </button>
                    )}
                  </div>

                  {/* Search and Quick Selection Helpers */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-0.5">
                      <button
                        type="button"
                        onClick={handleSelectAllValid}
                        title="Include all valid rows"
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                      >
                        Select All Valid ({previewStats.valid})
                      </button>
                      {previewStats.warning > 0 && (
                        <>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={handleAllowAllWarnings}
                            title="Include rows with warnings"
                            className="px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          >
                            Allow Warnings
                          </button>
                        </>
                      )}
                    </div>

                    {(previewStats.invalid > 0 || previewStats.warning > 0 || previewStats.duplicate > 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          generateImportErrorReportExcel({
                            fileName: fileName || (isDispatch ? 'Daily_Dispatch_Import.xlsx' : 'Forwarding_Report_Import.xlsx'),
                            targetModule: activeModule,
                            rows: validatedRows,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="Download detailed Excel error report with affected row numbers and validation messages"
                      >
                        <Download className="w-3.5 h-3.5 text-rose-700" />
                        <span>Download Error Report (.xlsx)</span>
                      </button>
                    )}

                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        placeholder="Filter rows..."
                        className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive In-Place Preview Table */}
                <ImportErrorBoundary fallbackMessage="The import preview encountered a rendering issue on one of the rows. Click Recover Preview to refresh.">
                  <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 select-none">
                          <th className="py-2.5 px-3 text-center w-12">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                checked={
                                  previewStats.readyToImport > 0 &&
                                  previewStats.readyToImport === previewStats.valid + previewStats.warning
                                }
                                onChange={(e) => handleToggleAllEligible(e.target.checked)}
                                title="Toggle all eligible rows"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>#</span>
                            </div>
                          </th>
                          <th className="py-2.5 px-3 w-28">Row Status</th>
                          <th className="py-2.5 px-3 min-w-[220px]">
                            Client Name <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 min-w-[150px]">
                            Delivery Area <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 min-w-[150px]">
                            Mode of Shipment <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 min-w-[140px]">
                            Dispatch Date <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 min-w-[160px]">
                            Consignee <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 min-w-[150px]">
                            Reference No. <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 min-w-[140px]">POD Number</th>
                          <th className="py-2.5 px-3 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredPreviewRows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                              No records match the current filter.
                            </td>
                          </tr>
                        ) : (
                          filteredPreviewRows.map((r) => {
                            const isSelected = !!r.isSelectedForImport;
                            const isInvalid = r.status === 'INVALID';
                            const clientErr = r.cellErrors?.['client'];
                            const areaErr = r.cellErrors?.['area'];
                            const modeErr = r.cellErrors?.['modeOfShipment'];
                            const dateErr = r.cellErrors?.['actualDispatchDate'];
                            const consigneeErr = r.cellErrors?.['consignee'];
                            const refErr = r.cellErrors?.['referenceNumber'];

                            return (
                              <tr
                                key={`preview-row-${r.rowIndex}`}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  isInvalid
                                    ? 'bg-rose-50/25'
                                    : r.status === 'WARNING'
                                    ? 'bg-amber-50/20'
                                    : isSelected
                                    ? 'bg-emerald-50/15'
                                    : ''
                                }`}
                              >
                                {/* Row Index & Checkbox */}
                                <td className="py-2.5 px-3 text-center align-top">
                                  <div className="flex items-center justify-center gap-1.5 pt-1">
                                    <input
                                      type="checkbox"
                                      checked={isSelected && !isInvalid}
                                      disabled={isInvalid}
                                      onChange={() => handleToggleRowSelect(r.rowIndex)}
                                      title={
                                        isInvalid
                                          ? 'Please correct required cells before including in import'
                                          : isSelected
                                          ? 'Included in import'
                                          : 'Click to include in import'
                                      }
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    />
                                    <span className="font-mono text-slate-500 text-[11px]">{r.rowIndex}</span>
                                  </div>
                                </td>

                                {/* Row Status Badge */}
                                <td className="py-2.5 px-3 align-top">
                                  {r.status === 'VALID' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                                    </span>
                                  )}
                                  {r.status === 'WARNING' && (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Warning
                                      </span>
                                      {(r.warnings || []).map((w, i) => (
                                        <div key={i} className="text-[10px] text-amber-800 leading-tight max-w-[130px]" title={w}>
                                          {w}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {r.status === 'INVALID' && (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        {Object.keys(r.cellErrors || {}).length} Error{Object.keys(r.cellErrors || {}).length > 1 ? 's' : ''}
                                      </span>
                                      <span className="text-[10px] text-rose-600 block font-medium">Needs correction</span>
                                    </div>
                                  )}
                                  {r.status === 'DUPLICATE' && (
                                    <div className="space-y-1">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded">
                                        <CopyCheck className="w-3 h-3 text-purple-600" /> Duplicate
                                      </span>
                                      <select
                                        value={r.duplicateAction || 'skip'}
                                        onChange={(e) =>
                                          handleDuplicateActionChange(r.rowIndex, e.target.value as any)
                                        }
                                        className="text-[10px] font-bold bg-white border border-purple-300 rounded px-1 py-0.5 block w-full"
                                      >
                                        <option value="skip">Skip Row</option>
                                        <option value="import_anyway">Import Anyway</option>
                                      </select>
                                    </div>
                                  )}
                                </td>

                                {/* 1. Client Name Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div
                                    className={`rounded-md p-1.5 transition-all ${
                                      clientErr
                                        ? 'border-2 border-rose-400 bg-rose-50/90 shadow-2xs'
                                        : !r.isClientRecognized
                                        ? 'border border-amber-300 bg-amber-50/60'
                                        : 'border border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    {clientErr && (
                                      <div className="flex items-center justify-between text-[10px] font-bold text-rose-700 mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-rose-600" />
                                          MISSING
                                        </span>
                                        <span className="text-[9px] text-rose-600 font-normal">Select below</span>
                                      </div>
                                    )}
                                    {!clientErr && !r.isClientRecognized && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 mb-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        <span>Unrecognized Client</span>
                                      </div>
                                    )}

                                    <select
                                      value={r.mappedRecord?.client || ''}
                                      onChange={(e) => handleInlineCellChange(r.rowIndex, 'client', e.target.value)}
                                      className={`w-full text-xs font-semibold rounded px-2 py-1 bg-white border focus:outline-none focus:ring-1 ${
                                        clientErr
                                          ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                                          : 'border-slate-300 text-slate-900 focus:ring-blue-600'
                                      }`}
                                    >
                                      <option value="">
                                        -- Select Registered Client --
                                      </option>
                                      {clients.map((c) => (
                                        <option key={c.id} value={c.name}>
                                          {c.name}
                                        </option>
                                      ))}
                                      {r.mappedRecord?.client &&
                                        !clients.some(
                                          (c) =>
                                            String(c?.name || '').trim().toLowerCase() ===
                                            String(r.mappedRecord?.client || '').trim().toLowerCase()
                                        ) && (
                                          <option value={r.mappedRecord.client}>
                                            {r.mappedRecord.client} (Unregistered)
                                          </option>
                                        )}
                                    </select>

                                    {/* Auto-Coordinator indicator */}
                                    <div className="flex items-center gap-1 text-[10px] text-blue-900 font-semibold mt-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      <User className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                      <span className="truncate">Auto: {r.assignedCoordinator || 'Alodia Manalansan'}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Delivery Area Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div
                                    className={`rounded-md p-1.5 transition-all ${
                                      areaErr
                                        ? 'border-2 border-rose-400 bg-rose-50/90 shadow-2xs'
                                        : 'border border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    {areaErr && (
                                      <div className="flex items-center justify-between text-[10px] font-bold text-rose-700 mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-rose-600" />
                                          MISSING
                                        </span>
                                        <span className="text-[9px] text-rose-600 font-normal">Luzon/Vis/Min</span>
                                      </div>
                                    )}
                                    <select
                                      value={r.mappedRecord?.area || ''}
                                      onChange={(e) => handleInlineCellChange(r.rowIndex, 'area', e.target.value)}
                                      className={`w-full text-xs font-semibold rounded px-2 py-1 bg-white border focus:outline-none focus:ring-1 ${
                                        areaErr
                                          ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                                          : 'border-slate-300 text-slate-900 focus:ring-blue-600'
                                      }`}
                                    >
                                      <option value="">
                                        -- Select Area --
                                      </option>
                                      <option value="Luzon">Luzon</option>
                                      <option value="Visayas">Visayas</option>
                                      <option value="Mindanao">Mindanao</option>
                                      <option value="NCR">NCR (Metro Manila)</option>
                                      {r.mappedRecord?.area && !['Luzon', 'Visayas', 'Mindanao', 'NCR'].includes(r.mappedRecord.area) && (
                                        <option value={r.mappedRecord.area}>
                                          {r.mappedRecord.area} (Invalid Area)
                                        </option>
                                      )}
                                    </select>
                                    {areaErr && (
                                      <p className="text-[9px] text-rose-600 mt-1">{areaErr.message}</p>
                                    )}
                                  </div>
                                </td>

                                {/* 3. Mode of Shipment Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div
                                    className={`rounded-md p-1.5 transition-all ${
                                      modeErr
                                        ? 'border-2 border-rose-400 bg-rose-50/90 shadow-2xs'
                                        : 'border border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    {modeErr && (
                                      <div className="flex items-center justify-between text-[10px] font-bold text-rose-700 mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-rose-600" />
                                          MISSING
                                        </span>
                                        <span className="text-[9px] text-rose-600 font-normal">Air/Land/Sea</span>
                                      </div>
                                    )}
                                    <select
                                      value={r.mappedRecord?.modeOfShipment || ''}
                                      onChange={(e) =>
                                        handleInlineCellChange(r.rowIndex, 'modeOfShipment', e.target.value)
                                      }
                                      className={`w-full text-xs font-semibold rounded px-2 py-1 bg-white border focus:outline-none focus:ring-1 ${
                                        modeErr
                                          ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                                          : 'border-slate-300 text-slate-900 focus:ring-blue-600'
                                      }`}
                                    >
                                      <option value="">
                                        -- Select Mode --
                                      </option>
                                      <option value="Air Freight">Air Freight</option>
                                      <option value="Land Freight">Land Freight</option>
                                      <option value="Sea Freight">Sea Freight</option>
                                      <option value="RORO">RORO</option>
                                      {r.mappedRecord?.modeOfShipment && !['Air Freight', 'Land Freight', 'Sea Freight', 'RORO'].includes(r.mappedRecord.modeOfShipment) && (
                                        <option value={r.mappedRecord.modeOfShipment}>
                                          {r.mappedRecord.modeOfShipment} (Invalid Mode)
                                        </option>
                                      )}
                                    </select>
                                    {modeErr && (
                                      <p className="text-[9px] text-rose-600 mt-1">{modeErr.message}</p>
                                    )}
                                  </div>
                                </td>

                                {/* 4. Actual Dispatch Date Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div
                                    className={`rounded-md p-1.5 transition-all ${
                                      dateErr
                                        ? 'border-2 border-rose-400 bg-rose-50/90 shadow-2xs'
                                        : 'border border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    {dateErr && (
                                      <div className="flex items-center justify-between text-[10px] font-bold text-rose-700 mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-rose-600" />
                                          MISSING
                                        </span>
                                      </div>
                                    )}
                                    <input
                                      type="date"
                                      value={r.mappedRecord?.actualDispatchDate || ''}
                                      onChange={(e) =>
                                        handleInlineCellChange(r.rowIndex, 'actualDispatchDate', e.target.value)
                                      }
                                      className={`w-full text-xs font-mono rounded px-2 py-1 bg-white border focus:outline-none focus:ring-1 ${
                                        dateErr
                                          ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                                          : 'border-slate-300 text-slate-900 focus:ring-blue-600'
                                      }`}
                                    />
                                    {dateErr && (
                                      <p className="text-[9px] text-rose-600 mt-1">{dateErr.message}</p>
                                    )}
                                    {!dateErr && r.mappedRecord?.expectedDeliveryDateFormatted && (
                                      <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                                        Exp: {r.mappedRecord.expectedDeliveryDateFormatted}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 5. Consignee Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div
                                    className={`rounded-md p-1.5 transition-all ${
                                      consigneeErr
                                        ? 'border-2 border-rose-400 bg-rose-50/90 shadow-2xs'
                                        : 'border border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    {consigneeErr && (
                                      <div className="flex items-center justify-between text-[10px] font-bold text-rose-700 mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-rose-600" />
                                          MISSING
                                        </span>
                                      </div>
                                    )}
                                    <input
                                      type="text"
                                      value={r.mappedRecord?.consignee || ''}
                                      placeholder="Enter consignee..."
                                      onChange={(e) =>
                                        handleInlineCellChange(r.rowIndex, 'consignee', e.target.value)
                                      }
                                      className={`w-full text-xs rounded px-2 py-1 bg-white border focus:outline-none focus:ring-1 ${
                                        consigneeErr
                                          ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                                          : 'border-slate-300 text-slate-900 focus:ring-blue-600'
                                      }`}
                                    />
                                    {consigneeErr && (
                                      <p className="text-[9px] text-rose-600 mt-1">{consigneeErr.message}</p>
                                    )}
                                  </div>
                                </td>

                                {/* 6. Reference Number Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div
                                    className={`rounded-md p-1.5 transition-all ${
                                      refErr
                                        ? 'border-2 border-rose-400 bg-rose-50/90 shadow-2xs'
                                        : 'border border-slate-200 bg-white/80'
                                    }`}
                                  >
                                    {refErr && (
                                      <div className="flex items-center justify-between text-[10px] font-bold text-rose-700 mb-1">
                                        <span className="inline-flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-rose-600" />
                                          MISSING
                                        </span>
                                      </div>
                                    )}
                                    <input
                                      type="text"
                                      value={r.mappedRecord?.referenceNumber || ''}
                                      placeholder="Enter ref no..."
                                      onChange={(e) =>
                                        handleInlineCellChange(r.rowIndex, 'referenceNumber', e.target.value)
                                      }
                                      className={`w-full text-xs font-mono font-bold rounded px-2 py-1 bg-white border focus:outline-none focus:ring-1 ${
                                        refErr
                                          ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                                          : 'border-slate-300 text-blue-900 focus:ring-blue-600'
                                      }`}
                                    />
                                    {refErr && <p className="text-[9px] text-rose-600 mt-1">{refErr.message}</p>}
                                  </div>
                                </td>

                                {/* 7. POD Number Cell */}
                                <td className="py-2 px-2.5 align-top">
                                  <div className="border border-slate-200 bg-white/80 rounded-md p-1.5">
                                    <input
                                      type="text"
                                      value={r.mappedRecord?.podNumber || ''}
                                      placeholder="POD-..."
                                      onChange={(e) =>
                                        handleInlineCellChange(r.rowIndex, 'podNumber', e.target.value)
                                      }
                                      className="w-full text-xs font-mono font-semibold rounded px-2 py-1 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    />
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="py-2 px-3 text-center align-top whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setEditingRowIndex(r.rowIndex)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
                                    title="Open full row details"
                                  >
                                    <Edit3 className="w-3 h-3 text-blue-700" />
                                    <span>Full Modal</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </ImportErrorBoundary>

                {/* Bottom Attention Indicator */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-700 flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {previewStats.readyToImport} records ready to import
                    </span>
                    {previewStats.invalid > 0 && (
                      <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        {previewStats.invalid} invalid rows require correction before import
                      </span>
                    )}
                    {previewStats.duplicate > 0 && (
                      <span className="font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                        {previewStats.duplicate} duplicate records detected
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Auto-Lead Time SLA & Coordinator Rules will be applied automatically upon import.
                  </span>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 4: IMPORTING PROGRESS */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 'IMPORTING' && (
              <div className="max-w-md mx-auto py-12 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto animate-pulse">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-700" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Importing records...</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Processing: <strong className="text-slate-900 font-mono">{processedCount}</strong> / {previewStats.readyToImport}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300">
                  <div
                    className="bg-blue-600 h-full transition-all duration-150 ease-out rounded-full"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  Applying company business rules, lead time SLAs, and creating dispatch completion alerts...
                </p>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 5: IMPORT COMPLETE */}
            {/* ------------------------------------------------------------- */}
            {currentStep === 'COMPLETE' && finalImportStats && (
              <div className="max-w-xl mx-auto py-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">IMPORT COMPLETED</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    <strong className="text-slate-900">{finalImportStats.totalProcessed} records</strong> processed from <span className="font-semibold text-slate-800">{fileName}</span>
                  </p>
                </div>

                {/* Stat Breakdown Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Imported</span>
                    <span className="text-2xl font-bold font-mono text-emerald-800 mt-0.5 block">
                      {finalImportStats.imported}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Committed</span>
                  </div>

                  <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Warnings</span>
                    <span className="text-2xl font-bold font-mono text-amber-800 mt-0.5 block">
                      {finalImportStats.warnings}
                    </span>
                    <span className="text-[10px] text-amber-600 font-medium">Included</span>
                  </div>

                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Skipped</span>
                    <span className="text-2xl font-bold font-mono text-slate-700 mt-0.5 block">
                      {finalImportStats.skipped}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Unselected / Invalid</span>
                  </div>

                  <div className="bg-purple-50/80 p-3 rounded-lg border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Duplicates</span>
                    <span className="text-2xl font-bold font-mono text-purple-800 mt-0.5 block">
                      {finalImportStats.duplicates || 0}
                    </span>
                    <span className="text-[10px] text-purple-600 font-medium">Skipped</span>
                  </div>
                </div>

                {/* Partial Failure Report if any row failed */}
                {finalImportStats.failed > 0 && finalImportStats.failedRows && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-left text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <AlertCircle className="w-4 h-4 text-rose-700" />
                      <span>{finalImportStats.failed} row(s) could not be imported</span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {finalImportStats.failedRows.map((f, idx) => (
                        <div key={idx} className="text-[11px] text-rose-800 bg-white/80 p-1.5 rounded border border-rose-200">
                          Row {f.rowNumber}: {f.reason} {f.reference ? `(Ref: ${f.reference})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Excluded / Error Rows Download Option */}
                {(finalImportStats.skipped > 0 || finalImportStats.failed > 0) && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl text-left text-xs flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-amber-900">
                      <strong className="block font-bold">Need to review excluded records?</strong>
                      <span className="text-[11px] text-amber-800">
                        {finalImportStats.skipped + finalImportStats.failed} row(s) were excluded from this import. You can download an Excel error report with exact row numbers and explanations.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        generateImportErrorReportExcel({
                          fileName: fileName || (isDispatch ? 'Daily_Dispatch_Import.xlsx' : 'Forwarding_Report_Import.xlsx'),
                          targetModule: activeModule,
                          rows: validatedRows,
                          failedProcessingRows: finalImportStats.failedRows,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-700" />
                      <span>Download Excluded Rows Report (.xlsx)</span>
                    </button>
                  </div>
                )}

                {/* Notifications & Dispatch notice */}
                <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200 text-left text-xs text-blue-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <span>Live Operational State</span>
                  </div>
                  {isDispatch ? (
                    <>
                      <p className="text-[11px] leading-relaxed text-blue-800">
                        • <strong>Daily Dispatching Monitoring</strong> has been committed with all valid import records.
                      </p>
                      <p className="text-[11px] leading-relaxed text-blue-800">
                        • Synchronized with the <strong>Forwarding Progressive Report</strong> and <strong>Executive Dashboard</strong> automatically.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] leading-relaxed text-blue-800">
                        • <strong>Forwarding Progressive Report</strong> and <strong>Executive Dashboard</strong> have been committed with all valid import records.
                      </p>
                      <p className="text-[11px] leading-relaxed text-blue-800">
                        • <strong>Dispatch Action Notifications</strong> have been created for imported shipments requiring dispatch monitoring.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
            {/* Left Back / Cancel */}
            {currentStep === 'UPLOAD' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep === 'MAPPING' && (
              <button
                type="button"
                onClick={() => setCurrentStep('UPLOAD')}
                className="px-4 py-2 rounded text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Upload</span>
              </button>
            )}

            {currentStep === 'PREVIEW' && (
              <button
                type="button"
                onClick={() => setCurrentStep('MAPPING')}
                className="px-4 py-2 rounded text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Mapping</span>
              </button>
            )}

            {(currentStep === 'IMPORTING' || currentStep === 'COMPLETE') && <div />}

            {/* Right Action Button */}
            {currentStep === 'UPLOAD' && (
              <button
                type="button"
                onClick={() => setCurrentStep('MAPPING')}
                disabled={!selectedFile || excelRawRows.length === 0}
                className="px-5 py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 'MAPPING' && (
              <button
                type="button"
                onClick={handleProceedToValidation}
                className="px-5 py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Validate & Preview ({excelRawRows.length} Rows)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 'PREVIEW' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={previewStats.readyToImport === 0}
                  className="px-5 py-2 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>IMPORT {previewStats.readyToImport} VALID RECORDS</span>
                </button>
              </div>
            )}

            {currentStep === 'COMPLETE' && (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-500 font-medium">
                  Imported records safely committed to prototype data state.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    DONE
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm transition-colors cursor-pointer"
                  >
                    {isDispatch ? 'View in Daily Dispatching' : 'View in Forwarding Report'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Row Edit Modal */}
      {editingRowIndex !== null && currentlyEditingRow && (
        <EditImportRowModal
          isOpen={true}
          row={currentlyEditingRow}
          clients={clients}
          onClose={() => setEditingRowIndex(null)}
          onSaveRow={handleSaveEditedRow}
          onOpenAddClientModal={onOpenAddClientModal}
        />
      )}
    </>
  );
};
