import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Truck, 
  Building2, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Percent, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

interface ReportsViewProps {
  onNavigateToAudit?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onNavigateToAudit }) => {
  const [reportDateRange, setReportDateRange] = useState('month-to-date');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExport = (type: string) => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-700" />
            <span>Reports & Operational Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logistics performance metrics, SLA compliance summaries, and fleet utilization records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToAudit && (
            <button
              onClick={onNavigateToAudit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>System Data Audit</span>
            </button>
          )}

          <select
            value={reportDateRange}
            onChange={(e) => setReportDateRange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 font-medium text-slate-800 focus:outline-none"
          >
            <option value="today">Today (Aug 23, 2026)</option>
            <option value="week-to-date">Week-to-Date (Aug 17 - Aug 23)</option>
            <option value="month-to-date">Month-to-Date (August 2026)</option>
            <option value="q3-2026">Q3 2026 Overview</option>
          </select>

          <button
            onClick={() => handleExport('Excel')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Operational report generated and formatted according to OFII Standard Template.</span>
        </div>
      )}

      {/* 4 Core Report Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Delivery Performance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Delivery Performance</h2>
                <p className="text-xs text-slate-500">Regional On-Time SLA Adherence</p>
              </div>
              <span className="p-1.5 rounded bg-emerald-50 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Luzon Mainland (Road Freight)</span>
                  <span className="font-mono font-bold text-emerald-700">97.8% On-Time</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '97.8%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Visayas Inter-Island (RoRo/Sea)</span>
                  <span className="font-mono font-bold text-blue-700">93.4% On-Time</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '93.4%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">Mindanao Port Linehaul</span>
                  <span className="font-mono font-bold text-indigo-700">91.6% On-Time</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '91.6%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Overall Network SLA: <strong className="text-slate-900 font-mono">95.3%</strong></span>
            <span className="text-[11px] text-slate-400">Target: ≥ 95.0%</span>
          </div>
        </div>

        {/* 2. Shipment Summary */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Shipment Summary</h2>
                <p className="text-xs text-slate-500">Volume distribution by transport mode</p>
              </div>
              <span className="p-1.5 rounded bg-blue-50 text-blue-700">
                <Truck className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Land Freight</span>
                <span className="font-mono font-bold text-base text-slate-900 mt-1 block">88</span>
                <span className="text-[10px] text-slate-400">59.5% total</span>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sea / RoRo</span>
                <span className="font-mono font-bold text-base text-blue-700 mt-1 block">48</span>
                <span className="text-[10px] text-slate-400">32.4% total</span>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Air Express</span>
                <span className="font-mono font-bold text-base text-indigo-700 mt-1 block">12</span>
                <span className="text-[10px] text-slate-400">8.1% total</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Total Active Freight Volume:</span>
            <strong className="text-slate-900 font-mono">148 Shipments (4,820 Boxes)</strong>
          </div>
        </div>

        {/* 3. Client Performance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Client Performance</h2>
                <p className="text-xs text-slate-500">Key accounts turnaround time ranking</p>
              </div>
              <span className="p-1.5 rounded bg-purple-50 text-purple-700">
                <Building2 className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-medium text-slate-800">Zuellig Pharma Corp.</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">TAT: 1.2 Days</span>
                  <span className="font-bold text-emerald-700 font-mono">99.1%</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-medium text-slate-800">VAmsler Pharma Logistics</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">TAT: 2.1 Days</span>
                  <span className="font-bold text-blue-700 font-mono">98.2%</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-medium text-slate-800">Nestlé Philippines</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">TAT: 2.8 Days</span>
                  <span className="font-bold text-slate-800 font-mono">97.8%</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-medium text-slate-800">Unilever Philippines</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">TAT: 3.4 Days</span>
                  <span className="font-bold text-slate-800 font-mono">96.5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>6 Key Corporate Client Contracts Monitored</span>
          </div>
        </div>

        {/* 4. Dispatch Summary */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Dispatch Summary</h2>
                <p className="text-xs text-slate-500">Terminal loading dock turnaround efficiency</p>
              </div>
              <span className="p-1.5 rounded bg-indigo-50 text-indigo-700">
                <Clock className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Avg Bay Loading Time</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">1 hr 18 mins</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Terminal Gate-In to Gate-Out</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">2 hrs 10 mins</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>GADC Loading Efficiency:</span>
                  <span className="font-mono font-semibold text-slate-900">96.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>ISCI Semiconductor Dispatch:</span>
                  <span className="font-mono font-semibold text-slate-900">98.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>XSEED Cross-Dock Runs:</span>
                  <span className="font-mono font-semibold text-slate-900">94.0%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Fleet Utilization: <strong className="text-slate-900 font-mono">88.4%</strong></span>
            <span className="text-[11px] text-slate-400">Station #01 Paranaque</span>
          </div>
        </div>

      </div>
    </div>
  );
};
