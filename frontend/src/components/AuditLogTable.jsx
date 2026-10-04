import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Download,
  Calendar,
  Layers
} from 'lucide-react';

export default function AuditLogTable({ 
  logs, 
  onRefresh, 
  isLoading 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');

  const filteredLogs = (logs || []).filter(item => {
    const matchesSearch = 
      item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.batch_id).includes(searchTerm) ||
      item.batch_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVerdict = 
      verdictFilter === 'ALL' || item.verdict?.toUpperCase() === verdictFilter;

    return matchesSearch && matchesVerdict;
  });

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      
      {/* Table Header Bar */}
      <div className="p-4 lg:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100 tracking-tight">
              Metrology Quality Control Audit Log
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {logs?.length || 0} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Non-blocking synchronized audit log persisted to <code className="text-cyan-300">inspections_log.xlsx</code>
          </p>
        </div>

        {/* Action Controls & Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Export Excel Button */}
          <a
            id="btn-export-excel"
            href="/api/logs/export/excel"
            download="SteelSight_Inspections_Log.xlsx"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/40 rounded-lg transition shadow-sm"
            title="Download formatted Excel workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel (.xlsx)</span>
          </a>

          {/* Export CSV Button */}
          <a
            id="btn-export-csv"
            href="/api/logs/export/csv"
            download="SteelSight_Inspections_Log.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            title="Download comma-separated values (.csv)"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </a>

          {/* Refresh Log */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh Audit Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 px-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Record ID or Batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
          />
        </div>

        {/* Verdict Filter Buttons */}
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <span className="text-slate-500 mr-1 font-medium">Verdict:</span>
          {['ALL', 'PASS', 'REWORK', 'REJECT'].map((v) => (
            <button
              key={v}
              onClick={() => setVerdictFilter(v)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                verdictFilter === v
                  ? v === 'PASS'
                    ? 'bg-emerald-500 text-slate-950'
                    : v === 'REWORK'
                      ? 'bg-amber-400 text-slate-950'
                      : v === 'REJECT'
                        ? 'bg-rose-500 text-white'
                        : 'bg-cyan-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 sticky top-0 uppercase font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Record ID / Time</th>
              <th className="py-2.5 px-3 font-semibold">Batch</th>
              <th className="py-2.5 px-3 font-semibold text-center">Measured (L x B x H)</th>
              <th className="py-2.5 px-3 font-semibold text-center">Target (L x B x H)</th>
              <th className="py-2.5 px-3 font-semibold text-center">Max Error</th>
              <th className="py-2.5 px-3 font-semibold text-center">Verdict</th>
              <th className="py-2.5 px-4 font-semibold">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((item, idx) => {
                const isPass = item.verdict?.toUpperCase() === 'PASS';
                const isRework = item.verdict?.toUpperCase() === 'REWORK';
                const isReject = item.verdict?.toUpperCase() === 'REJECT';

                const m = item.measured || {};
                const t = item.target || {};
                const d = item.deltas || {};

                return (
                  <tr 
                    key={item.id || idx}
                    className="hover:bg-slate-900/40 transition"
                  >
                    {/* Record ID & Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-cyan-300 text-xs">{item.id}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{item.timestamp}</span>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">Batch #{item.batch_id}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {item.batch_name}
                      </div>
                    </td>

                    {/* Measured */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-slate-100">
                        {m.L != null ? Number(m.L).toFixed(1) : '-'} x {m.B != null ? Number(m.B).toFixed(1) : '-'} x {m.H != null ? Number(m.H).toFixed(1) : '-'}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">mm</span>
                    </td>

                    {/* Target */}
                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-400">
                      <span>
                        {t.L != null ? Number(t.L).toFixed(1) : '-'} x {t.B != null ? Number(t.B).toFixed(1) : '-'} x {t.H != null ? Number(t.H).toFixed(1) : '-'}
                      </span>
                      <span className="text-[10px] text-cyan-500 ml-1">(±{t.tol || 1.0}mm)</span>
                    </td>

                    {/* Max Error */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`font-bold ${
                        d.max_error <= (t.tol || 1.0) ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {d.max_error != null ? `${Number(d.max_error).toFixed(2)} mm` : '-'}
                      </span>
                    </td>

                    {/* Verdict */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isPass 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : isRework 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {isPass && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {isRework && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        {isReject && <XCircle className="w-3 h-3 text-rose-400" />}
                        <span>{item.verdict}</span>
                      </span>
                    </td>

                    {/* Audit Notes */}
                    <td className="py-3 px-4 text-xs font-sans text-slate-400 max-w-xs truncate">
                      {item.verdict_reason || 'Verified under automated metrology pipeline.'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No inspection records match filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
