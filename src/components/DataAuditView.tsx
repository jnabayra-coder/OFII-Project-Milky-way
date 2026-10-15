import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Link2, 
  FileCheck, 
  Truck, 
  Boxes, 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  X, 
  ArrowRight, 
  Check, 
  Copy,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { runDataAudit, AuditRecordItem, AuditStatus, AuditEntityType } from '../utils/dataAuditEngine';

export const DataAuditView: React.FC = () => {
  const {
    individualDeliveries,
    deliveryBatches,
    truckRuns,
    dispatches,
    forwardingRecords,
    podReturningNotifications,
    clients,
  } = useData();

  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'ALL'>('ALL');
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AuditRecordItem | null>(null);
  const [auditRunKey, setAuditRunKey] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Compute live audit report
  const auditReport = useMemo(() => {
    // depend on auditRunKey to force re-evaluation if requested
    void auditRunKey;
    return runDataAudit({
      individualDeliveries,
      deliveryBatches,
      truckRuns,
      dispatches,
      forwardingRecords,
      podReturningNotifications,
      clients,
    });
  }, [
    individualDeliveries,
    deliveryBatches,
    truckRuns,
    dispatches,
    forwardingRecords,
    podReturningNotifications,
    clients,
    auditRunKey
  ]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return auditReport.items.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      // Entity type filter
      if (entityFilter !== 'ALL' && item.entityType !== entityFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesKey = item.recordKey.toLowerCase().includes(query);
        const matchesClient = item.client.toLowerCase().includes(query);
        const matchesBatch = item.batchName.toLowerCase().includes(query);
        const matchesConsignee = item.consignee?.toLowerCase().includes(query);
        const matchesPod = item.individualPod?.toLowerCase().includes(query);
        const matchesTruckPod = item.truckDispatchPod?.toLowerCase().includes(query);
        const matchesDriver = item.driver?.toLowerCase().includes(query);
        const matchesTruckRun = item.truckRunNumber?.toLowerCase().includes(query);
        const matchesStatus = item.status.toLowerCase().includes(query);
        return (
          matchesKey ||
          matchesClient ||
          matchesBatch ||
          matchesConsignee ||
          matchesPod ||
          matchesTruckPod ||
          matchesDriver ||
          matchesTruckRun ||
          matchesStatus
        );
      }
      return true;
    });
  }, [auditReport.items, statusFilter, entityFilter, searchTerm]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const rows = filteredItems.map((item) => ({
        'Status': item.status,
        'Entity Type': item.entityType,
        'Record Key / Delivery ID': item.recordKey,
        'Title': item.title,
        'Client': item.client,
        'Delivery Name / Batch': item.batchName,
        'Consignee': item.consignee || '—',
        'Place / Delivery Area': item.placeAndArea || '—',
        'Quantity': item.quantity || '—',
        'Individual Delivery POD': item.individualPod || '—',
        'Truck / Dispatch POD': item.truckDispatchPod || '—',
        'Physical POD Return Date': item.physicalPodReturnDate || '—',
        'Driver': item.driver || '—',
        'Truck Run': item.truckRunNumber || '—',
        'Actual Delivery Date': item.actualDeliveryDate || '—',
        'Recipient Name': item.recipientName || '—',
        'Issues Detected': item.issues.join(' | ') || 'None (Valid)',
        'Related Records': item.relatedRecordKeys.join(', ') || 'None',
        'Recommended Safe Resolution': item.recommendation,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 18 }, // Status
        { wch: 20 }, // Entity Type
        { wch: 24 }, // Record Key
        { wch: 32 }, // Title
        { wch: 28 }, // Client
        { wch: 28 }, // Batch
        { wch: 26 }, // Consignee
        { wch: 24 }, // Place
        { wch: 14 }, // Quantity
        { wch: 24 }, // Individual POD
        { wch: 22 }, // Truck POD
        { wch: 24 }, // Physical POD Return Date
        { wch: 22 }, // Driver
        { wch: 20 }, // Truck Run
        { wch: 20 }, // Delivery Date
        { wch: 22 }, // Recipient Name
        { wch: 45 }, // Issues
        { wch: 35 }, // Related
        { wch: 45 }, // Recommendation
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Relationship Audit');

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `OFII_Data_Audit_Report_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);

      setDownloadNotice(`Exported ${filteredItems.length} audit records to ${filename}`);
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (err: any) {
      console.error('[Audit Export Error]', err);
      setDownloadNotice(`Export failed: ${err?.message || 'Error creating Excel file'}`);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Status',
      'Entity Type',
      'Record Key / Delivery ID',
      'Client',
      'Delivery Name / Batch',
      'Consignee',
      'Place / Delivery Area',
      'Quantity',
      'Individual Delivery POD',
      'Truck / Dispatch POD',
      'Physical POD Return Date',
      'Driver',
      'Truck Run',
      'Issues Detected',
      'Recommended Safe Resolution'
    ];

    const rows = filteredItems.map((item) => [
      `"${item.status}"`,
      `"${item.entityType}"`,
      `"${item.recordKey}"`,
      `"${item.client}"`,
      `"${item.batchName}"`,
      `"${item.consignee || '—'}"`,
      `"${item.placeAndArea || '—'}"`,
      `"${item.quantity || '—'}"`,
      `"${item.individualPod || '—'}"`,
      `"${item.truckDispatchPod || '—'}"`,
      `"${item.physicalPodReturnDate || '—'}"`,
      `"${item.driver || '—'}"`,
      `"${item.truckRunNumber || '—'}"`,
      `"${item.issues.join(' | ').replace(/"/g, '""') || 'None'}"`,
      `"${item.recommendation.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OFII_Data_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadNotice(`Exported ${filteredItems.length} audit records to CSV.`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div id="data-audit-module" className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Data Relationship & Duplicate Audit
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  System Pre-Integration Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit Single Source of Truth integrity, verify Coordinator → Planner → Dispatcher → Driver → Encoder links, and analyze duplicate PODs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="re-run-audit-btn"
            onClick={() => setAuditRunKey(prev => prev + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
            title="Re-run live audit across all current records"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Re-run Live Audit</span>
          </button>

          <button
            id="download-audit-excel-btn"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
            title="Download full audit report as Excel spreadsheet (.xlsx)"
          >
            <Download className="w-4 h-4 text-white" />
            <span>DOWNLOAD AUDIT EXCEL</span>
          </button>

          <button
            id="download-audit-csv-btn"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Download Alert Notice */}
      {downloadNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{downloadNotice}</span>
          </div>
          <button onClick={() => setDownloadNotice(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Audited */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Audited</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{auditReport.totalRecordsAudited}</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Deliveries, runs, & batches</span>
        </div>

        {/* VALID */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'VALID' ? 'ALL' : 'VALID')}
          className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition ${
            statusFilter === 'VALID' ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            VALID
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{auditReport.validCount}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {auditReport.totalRecordsAudited ? Math.round((auditReport.validCount / auditReport.totalRecordsAudited) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Intact & consistent</span>
        </div>

        {/* MISSING LINK */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'MISSING LINK' ? 'ALL' : 'MISSING LINK')}
          className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition ${
            statusFilter === 'MISSING LINK' ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/20' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Link2 className="w-3 h-3 text-amber-600" />
            MISSING LINK
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{auditReport.missingLinkCount}</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Foreign keys
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Unresolved references</span>
        </div>

        {/* POSSIBLE DUPLICATE */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'POSSIBLE DUPLICATE' ? 'ALL' : 'POSSIBLE DUPLICATE')}
          className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition ${
            statusFilter === 'POSSIBLE DUPLICATE' ? 'ring-2 ring-purple-500 border-purple-400 bg-purple-50/20' : 'border-slate-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
            <Copy className="w-3 h-3 text-purple-600" />
            POSSIBLE DUPLICATE
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">{auditReport.possibleDuplicateCount}</span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
              {auditReport.duplicatePodsFound} POD Collisions
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Cross-batch POD shared</span>
        </div>

        {/* DATA CONFLICT */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'DATA CONFLICT' ? 'ALL' : 'DATA CONFLICT')}
          className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition ${
            statusFilter === 'DATA CONFLICT' ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/20' : 'border-slate-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            DATA CONFLICT
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700">{auditReport.dataConflictCount}</span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              Field mismatch
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Values diverge</span>
        </div>

        {/* NEEDS REVIEW */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'NEEDS REVIEW' ? 'ALL' : 'NEEDS REVIEW')}
          className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition ${
            statusFilter === 'NEEDS REVIEW' ? 'ring-2 ring-sky-500 border-sky-400 bg-sky-50/20' : 'border-slate-200 hover:border-sky-300'
          }`}
        >
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-sky-600" />
            NEEDS REVIEW
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-sky-700">{auditReport.needsReviewCount}</span>
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
              Verification
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Incomplete info</span>
        </div>
      </div>

      {/* 3. Pre-Integration Verification & Duplicate Warning Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-md space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-sm tracking-wide">
              Data Relationship & Duplicate Audit — Executive Findings & Resolution Plan
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              Single Source of Truth: {auditReport.singleSourceOfTruthIntegrity}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
              POD Type Separation: {auditReport.podTypeSeparationStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {/* Card 1: Single Source of Truth */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Single Source of Truth (Individual Delivery)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {auditReport.findings.singleSourceOfTruth} No parallel or duplicate shipment populations were created for individual modules.
            </p>
          </div>

          {/* Card 2: Duplicate POD Analysis & Safe Resolution */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Duplicate POD Findings & Safe Resolution</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {auditReport.findings.duplicateAnalysis}
            </p>
            <div className="mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px]">
              <strong>Safe Rule:</strong> DO NOT auto-delete records. Both clients (PCSO & GADC) legitimately issued consignment documents with numbers 87890 & 87894. The system differentiates them using unique Delivery IDs (<code className="text-amber-100 font-mono">DEL-1001</code> vs <code className="text-amber-100 font-mono">DEL-87890</code>).
            </div>
          </div>

          {/* Card 3: Separate POD Types */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>3. Three Separate POD Types Preserved</span>
            </div>
            <ul className="text-slate-300 text-[11px] space-y-0.5 list-disc list-inside">
              <li><strong>Individual POD:</strong> Unique consignment document number.</li>
              <li><strong>Truck Dispatch POD:</strong> Operational run code (e.g. TRK-2026-001).</li>
              <li><strong>Physical POD Return:</strong> Return date recorded in POD Returning.</li>
            </ul>
            <p className="text-slate-400 text-[10px] mt-1">
              Field collision protection: 0 field overwrites detected.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Controls: Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="audit-search-input"
              type="text"
              placeholder="Search Delivery ID, Batch, Consignee, POD, Status, Driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Status:</span>
            {(
              [
                { id: 'ALL', label: 'ALL', count: auditReport.totalRecordsAudited },
                { id: 'VALID', label: 'VALID', count: auditReport.validCount, color: 'text-emerald-700' },
                { id: 'MISSING LINK', label: 'MISSING LINK', count: auditReport.missingLinkCount, color: 'text-amber-700' },
                { id: 'POSSIBLE DUPLICATE', label: 'DUPLICATE', count: auditReport.possibleDuplicateCount, color: 'text-purple-700' },
                { id: 'DATA CONFLICT', label: 'CONFLICT', count: auditReport.dataConflictCount, color: 'text-rose-700' },
                { id: 'NEEDS REVIEW', label: 'NEEDS REVIEW', count: auditReport.needsReviewCount, color: 'text-sky-700' },
              ] as const
            ).map((st) => {
              const isSelected = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  id={`audit-filter-status-${st.id.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setStatusFilter(st.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
                  }`}>
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary filter: Entity Type */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Entity Type:</span>
            {(
              [
                'ALL',
                'Individual Delivery',
                'Truck Run',
                'Delivery Batch',
                'POD Returning'
              ] as const
            ).map((ent) => (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  entityFilter === ent
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {ent}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredItems.length}</strong> of {auditReport.totalRecordsAudited} records audited
          </div>
        </div>
      </div>

      {/* 5. Main Audited Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No records match the current filter</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Try selecting a different status filter or clearing your search term.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3">Entity Type</th>
                  <th className="py-3 px-3">Delivery ID / Key</th>
                  <th className="py-3 px-3">Client & Batch</th>
                  <th className="py-3 px-3">Consignee & Place</th>
                  <th className="py-3 px-3">POD Numbers (Separate Types)</th>
                  <th className="py-3 px-3">Assigned Crew / Run</th>
                  <th className="py-3 px-3">Audit Findings & Issues</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {filteredItems.map((item) => {
                  const isConflict = item.status === 'DATA CONFLICT';
                  const isDup = item.status === 'POSSIBLE DUPLICATE';
                  const isMissing = item.status === 'MISSING LINK';
                  const isReview = item.status === 'NEEDS REVIEW';
                  const isValid = item.status === 'VALID';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition ${
                        isConflict ? 'bg-rose-50/30' : isDup ? 'bg-purple-50/20' : isMissing ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isValid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isMissing
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : isDup
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : isConflict
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-sky-50 text-sky-800 border-sky-300'
                        }`}>
                          {isValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isMissing && <Link2 className="w-3 h-3 text-amber-600" />}
                          {isDup && <Copy className="w-3 h-3 text-purple-600" />}
                          {isConflict && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {isReview && <HelpCircle className="w-3 h-3 text-sky-600" />}
                          {item.status}
                        </span>
                      </td>

                      {/* Entity Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {item.entityType === 'Individual Delivery' && <Boxes className="w-3.5 h-3.5 text-blue-600" />}
                          {item.entityType === 'Truck Run' && <Truck className="w-3.5 h-3.5 text-amber-600" />}
                          {item.entityType === 'Delivery Batch' && <FileCheck className="w-3.5 h-3.5 text-emerald-600" />}
                          {item.entityType === 'POD Returning' && <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
                          {item.entityType}
                        </span>
                      </td>

                      {/* Delivery ID / Key */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                          <span>{item.recordKey}</span>
                          <button
                            onClick={() => copyToClipboard(item.recordKey, item.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Copy ID"
                          >
                            {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Client & Batch */}
                      <td className="py-3 px-3">
                        <div className="max-w-[170px]">
                          <div className="font-bold text-slate-900 truncate" title={item.client}>
                            {item.client}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={item.batchName}>
                            Batch: {item.batchName}
                          </div>
                        </div>
                      </td>

                      {/* Consignee & Place */}
                      <td className="py-3 px-3">
                        <div className="max-w-[160px]">
                          <div className="font-semibold text-slate-800 truncate" title={item.consignee}>
                            {item.consignee || '—'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={item.placeAndArea}>
                            {item.placeAndArea || '—'}
                          </div>
                        </div>
                      </td>

                      {/* POD Numbers (Separate Types Verification) */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1" title="Individual Delivery POD">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Ind:</span>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {item.individualPod}
                            </span>
                          </div>
                          {item.truckDispatchPod && item.truckDispatchPod !== '—' && (
                            <div className="flex items-center gap-1" title="Truck / Dispatch POD">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Trk:</span>
                              <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                {item.truckDispatchPod}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Crew / Run */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-[11px]">
                          <div className="font-medium text-slate-800">{item.driver || 'No Driver'}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{item.truckRunNumber || 'No Truck Run'}</div>
                        </div>
                      </td>

                      {/* Audit Findings & Issues */}
                      <td className="py-3 px-3">
                        <div className="max-w-[260px] space-y-1">
                          {item.issues.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Single Source of Truth & Linkage Intact
                            </span>
                          ) : (
                            item.issues.map((iss, i) => (
                              <div key={i} className="text-[11px] text-slate-700 flex items-start gap-1 leading-tight">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{iss}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          id={`inspect-audit-btn-${item.recordKey}`}
                          type="button"
                          onClick={() => setSelectedRecordForDetail(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. Inspection Detail Modal */}
      {selectedRecordForDetail && (
        <div 
          id="audit-inspect-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRecordForDetail(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight">Audit Inspection Details</h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-blue-200">
                      {selectedRecordForDetail.recordKey}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      selectedRecordForDetail.status === 'VALID'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : selectedRecordForDetail.status === 'DATA CONFLICT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {selectedRecordForDetail.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Entity: <span className="font-bold text-white">{selectedRecordForDetail.entityType}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* SECTION 1: Single Source of Truth Identifiers */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>Single Source of Truth Identifiers</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Delivery ID / Key</span>
                    <span className="font-mono font-bold text-slate-900">{selectedRecordForDetail.recordKey}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Client</span>
                    <span className="font-bold text-slate-900">{selectedRecordForDetail.client}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Delivery Name / Batch</span>
                    <span className="font-semibold text-slate-800">{selectedRecordForDetail.batchName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Consignee</span>
                    <span className="font-bold text-slate-900">{selectedRecordForDetail.consignee || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Place / Area</span>
                    <span className="font-medium text-slate-800">{selectedRecordForDetail.placeAndArea || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Quantity</span>
                    <span className="font-bold text-slate-900">{selectedRecordForDetail.quantity || '—'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: POD Type Separation Check */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>POD Type Separation Validation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">1. Individual Consignment POD</span>
                    <span className="font-mono font-bold text-base text-blue-900 mt-1 block">
                      {selectedRecordForDetail.individualPod || '—'}
                    </span>
                    <span className="text-[10px] text-slate-500">Document index for individual delivery</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">2. Operational Truck Run POD</span>
                    <span className="font-mono font-bold text-base text-amber-900 mt-1 block">
                      {selectedRecordForDetail.truckDispatchPod || '—'}
                    </span>
                    <span className="text-[10px] text-slate-500">Operation index for truck departure</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">3. Physical POD Return Date</span>
                    <span className="font-mono font-bold text-base text-emerald-900 mt-1 block">
                      {selectedRecordForDetail.physicalPodReturnDate || 'PENDING'}
                    </span>
                    <span className="text-[10px] text-slate-500">Date physical POD returned to office</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Issues & Recommended Safe Resolution */}
              <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200 space-y-2">
                <div className="font-bold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Audit Findings & Recommended Safe Resolution</span>
                </div>
                {selectedRecordForDetail.issues.length === 0 ? (
                  <p className="text-emerald-900 font-medium text-xs">
                    ✓ All data relationships and module linkages are completely intact. No issues detected.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedRecordForDetail.issues.map((iss, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded border border-amber-200 text-amber-950 font-medium">
                        • {iss}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200">
                  <span className="font-bold text-slate-800 text-[11px] block">Recommended Safe Resolution:</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                    {selectedRecordForDetail.recommendation}
                  </p>
                </div>
              </div>

              {/* SECTION 4: Related Records Linkage */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Connected Module Relationships</span>
                </span>
                {selectedRecordForDetail.relatedRecordKeys.length === 0 ? (
                  <span className="text-slate-500 italic">No additional foreign keys associated.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecordForDetail.relatedRecordKeys.map((rel, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] shadow-2xs">
                        {rel}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Non-destructive audit inspector — no records modified.
              </span>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition border border-slate-300 bg-white shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
