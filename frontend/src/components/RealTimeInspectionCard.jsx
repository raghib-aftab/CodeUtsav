import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Info,
  Scale,
  Sparkles,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import BilletVisualizer from './BilletVisualizer';

export default function RealTimeInspectionCard({ 
  arbitrationResult, 
  activeBatch,
  batches
}) {
  if (!arbitrationResult) {
    const defaultBatchSpec = batches?.[activeBatch || 10] || { L: 100.0, B: 25.0, H: 25.0, tol: 1.0, name: "Batch #10" };
    return (
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-mono">
              Real-Time Inspection & Arbitration
            </h2>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            Awaiting Capture
          </span>
        </div>

        <div className="py-4">
          <BilletVisualizer target={defaultBatchSpec} />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <p className="text-xs font-medium text-slate-300">
            Target Batch Specs ({defaultBatchSpec.name}):
          </p>
          <div className="grid grid-cols-4 gap-2 mt-2 font-mono text-xs">
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">TARGET L</div>
              <div className="text-slate-200 font-bold">{defaultBatchSpec.L} mm</div>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">TARGET B</div>
              <div className="text-slate-200 font-bold">{defaultBatchSpec.B} mm</div>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">TARGET H</div>
              <div className="text-slate-200 font-bold">{defaultBatchSpec.H} mm</div>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px]">TOLERANCE</div>
              <div className="text-cyan-400 font-bold">±{defaultBatchSpec.tol} mm</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Capture Top View and Side View to trigger dimensional arbitration and generate quality verdict.
          </p>
        </div>
      </div>
    );
  }

  const {
    batch_id,
    batch_name,
    grade,
    measured,
    target,
    deltas,
    cross_view_consistent,
    verdict,
    verdict_reason,
    record_id,
    timestamp
  } = arbitrationResult;

  // Determine badge styling based on PASS / REWORK / REJECT
  let badgeStyles = {
    bg: 'bg-emerald-950/40 border-emerald-500/60 shadow-glow-emerald',
    text: 'text-emerald-400',
    banner: 'from-emerald-600 to-teal-700',
    icon: <CheckCircle2 className="w-6 h-6 text-emerald-300" />,
    title: 'INSPECTION PASSED',
    desc: 'Metrology meets all allowable engineering tolerances.'
  };

  if (verdict === 'REWORK') {
    badgeStyles = {
      bg: 'bg-amber-950/40 border-amber-500/60 shadow-glow-amber',
      text: 'text-amber-400',
      banner: 'from-amber-600 to-orange-700',
      icon: <AlertTriangle className="w-6 h-6 text-amber-300" />,
      title: 'REWORK REQUIRED',
      desc: 'Dimension out of tolerance but within 2x limit. Mechanical re-cut or grinding needed.'
    };
  } else if (verdict === 'REJECT') {
    badgeStyles = {
      bg: 'bg-rose-950/40 border-rose-500/60 shadow-glow-rose',
      text: 'text-rose-400',
      banner: 'from-rose-600 to-red-800',
      icon: <XCircle className="w-6 h-6 text-rose-300" />,
      title: 'BILLET REJECTED',
      desc: 'Critical dimension violation or cross-view mismatch exceeding limits.'
    };
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col gap-4">
      
      {/* Header with Record ID and Time */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400">
              {record_id || 'STL-CURRENT'}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Batch #{batch_id}: {batch_name}</span>
          </div>
          <p className="text-[11px] text-slate-500">{grade}</p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{timestamp || 'Just now'}</span>
        </div>
      </div>

      {/* Prominent Bold Status Badge */}
      <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${badgeStyles.bg}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-black/30 border border-white/10">
            {badgeStyles.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-extrabold tracking-wide ${badgeStyles.text}`}>
                {badgeStyles.title}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded font-black font-mono tracking-wider ${
                verdict === 'PASS' 
                  ? 'bg-emerald-500 text-slate-950'
                  : verdict === 'REWORK' 
                    ? 'bg-amber-400 text-slate-950' 
                    : 'bg-rose-500 text-white'
              }`}>
                {verdict}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{verdict_reason}</p>
          </div>
        </div>

        <div className="text-right pl-4 border-l border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Max Error</div>
          <div className={`text-xl font-black font-mono ${
            deltas.max_error <= target.tol ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {deltas.max_error.toFixed(2)} mm
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Tol ±{target.tol.toFixed(1)} mm</div>
        </div>
      </div>

      {/* 3D Isometric Schematic View */}
      <div>
        <BilletVisualizer measured={measured} target={target} verdict={verdict} deltas={deltas} />
      </div>

      {/* Comprehensive Metrology Comparison Matrix */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Dimensional Metrology Breakdown
        </h4>

        <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
          
          {/* Length Card */}
          <div className={`p-3 rounded-xl border bg-slate-950/70 ${
            deltas.dL <= target.tol ? 'border-slate-800' : 'border-amber-500/50 bg-amber-950/10'
          }`}>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="font-bold text-slate-300 text-sm">Length (L)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                deltas.dL <= target.tol ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                dL: {deltas.dL > 0 ? `+${deltas.dL}` : deltas.dL} mm
              </span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-100 my-1">
              <span>{measured.L.toFixed(1)} mm</span>
              <span className="text-xs text-slate-500 font-normal self-center">tgt {target.L.toFixed(1)}</span>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1 flex justify-between">
              <span>Top: {measured.L_top}mm</span>
              <span>Side: {measured.L_side}mm</span>
            </div>
          </div>

          {/* Breadth Card */}
          <div className={`p-3 rounded-xl border bg-slate-950/70 ${
            deltas.dB <= target.tol ? 'border-slate-800' : 'border-amber-500/50 bg-amber-950/10'
          }`}>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="font-bold text-slate-300 text-sm">Breadth (B)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                deltas.dB <= target.tol ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                dB: {deltas.dB > 0 ? `+${deltas.dB}` : deltas.dB} mm
              </span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-100 my-1">
              <span>{measured.B.toFixed(1)} mm</span>
              <span className="text-xs text-slate-500 font-normal self-center">tgt {target.B.toFixed(1)}</span>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1">
              From Top View Scan
            </div>
          </div>

          {/* Height Card */}
          <div className={`p-3 rounded-xl border bg-slate-950/70 ${
            deltas.dH <= target.tol ? 'border-slate-800' : 'border-amber-500/50 bg-amber-950/10'
          }`}>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span className="font-bold text-slate-300 text-sm">Height (H)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                deltas.dH <= target.tol ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                dH: {deltas.dH > 0 ? `+${deltas.dH}` : deltas.dH} mm
              </span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-100 my-1">
              <span>{measured.H.toFixed(1)} mm</span>
              <span className="text-xs text-slate-500 font-normal self-center">tgt {target.H.toFixed(1)}</span>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1">
              From Side View Scan
            </div>
          </div>

        </div>
      </div>

      {/* Cross-View Length Consistency Bar */}
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Cross-Camera Length Delta:</span>
          <span className="font-mono font-bold text-slate-200">
            |L_top - L_side| = {measured.length_mismatch_mm.toFixed(2)} mm
          </span>
        </div>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
          cross_view_consistent 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold'
        }`}>
          {cross_view_consistent ? 'Consistent (<= 2.0mm)' : 'Mismatch Exceeded (> 2.0mm)'}
        </span>
      </div>

    </div>
  );
}
