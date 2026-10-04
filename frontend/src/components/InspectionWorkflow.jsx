import React from 'react';
import { 
  Check, 
  RotateCw, 
  Camera, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCcw, 
  Maximize2 
} from 'lucide-react';

export default function InspectionWorkflow({
  topMeasurement,
  sideMeasurement,
  arbitrationResult,
  currentStep,
  onArbitrate,
  onReset,
  onOpenSnapshotModal
}) {
  const hasTop = Boolean(topMeasurement?.success);
  const hasSide = Boolean(sideMeasurement?.success);
  const isReadyToArbitrate = hasTop && hasSide && !arbitrationResult;

  return (
    <div className="glass-panel rounded-2xl p-4 lg:p-5 border border-slate-800 shadow-xl">
      
      {/* Stepper Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-mono">
            Sequential Inspection Pipeline
          </h2>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition px-2 py-1 rounded bg-slate-900 border border-slate-800"
          title="Reset current captures and begin fresh inspection"
        >
          <RefreshCcw className="w-3 h-3" />
          <span>New Inspection</span>
        </button>
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Step 1: Top View */}
        <div className={`rounded-xl p-3 border transition-all ${
          hasTop 
            ? 'bg-emerald-950/20 border-emerald-500/40' 
            : currentStep === 1 
              ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-lg' 
              : 'bg-slate-900/60 border-slate-800/80 opacity-75'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-400">
              Step 1: Top View
            </span>
            {hasTop && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>

          <p className="text-xs text-slate-400 mb-2">
            Align billet under overhead camera. Capture Length (L) & Breadth (B).
          </p>

          {hasTop ? (
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">L (Top):</span>
                <span className="font-mono font-bold text-cyan-300">{topMeasurement.dim1_mm} mm</span>
              </div>
              <div className="flex justify-between items-baseline text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">B (Breadth):</span>
                <span className="font-mono font-bold text-cyan-300">{topMeasurement.dim2_mm} mm</span>
              </div>

              {topMeasurement.annotated_image_base64 && (
                <button
                  onClick={() => onOpenSnapshotModal('Top View Snapshot', topMeasurement.annotated_image_base64)}
                  className="w-full mt-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Maximize2 className="w-3 h-3 text-cyan-400" />
                  <span>Audit Snapshot</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs">
              Awaiting Snapshot 1
            </div>
          )}
        </div>

        {/* Step 2: Side View */}
        <div className={`rounded-xl p-3 border transition-all ${
          hasSide 
            ? 'bg-emerald-950/20 border-emerald-500/40' 
            : currentStep === 2 
              ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/40 shadow-lg' 
              : 'bg-slate-900/60 border-slate-800/80 opacity-75'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400">
              Step 2: Side View
            </span>
            {hasSide && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>

          <p className="text-xs text-slate-400 mb-2">
            Rotate billet 90 degrees. Capture Length (L) & Height (H).
          </p>

          {hasSide ? (
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">L (Side):</span>
                <span className="font-mono font-bold text-blue-300">{sideMeasurement.dim1_mm} mm</span>
              </div>
              <div className="flex justify-between items-baseline text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400">H (Height):</span>
                <span className="font-mono font-bold text-blue-300">{sideMeasurement.dim2_mm} mm</span>
              </div>

              {sideMeasurement.annotated_image_base64 && (
                <button
                  onClick={() => onOpenSnapshotModal('Side View Snapshot', sideMeasurement.annotated_image_base64)}
                  className="w-full mt-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Maximize2 className="w-3 h-3 text-blue-400" />
                  <span>Audit Snapshot</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs">
              Awaiting Snapshot 2
            </div>
          )}
        </div>

        {/* Step 3: 3D Synthesis */}
        <div className={`rounded-xl p-3 border transition-all ${
          arbitrationResult 
            ? arbitrationResult.verdict === 'PASS'
              ? 'bg-emerald-950/30 border-emerald-500/50'
              : arbitrationResult.verdict === 'REWORK'
                ? 'bg-amber-950/30 border-amber-500/50'
                : 'bg-rose-950/30 border-rose-500/50'
            : isReadyToArbitrate
              ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg'
              : 'bg-slate-900/60 border-slate-800/80 opacity-75'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400">
              Step 3: 3D Synthesis
            </span>
            {arbitrationResult && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                arbitrationResult.verdict === 'PASS' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : arbitrationResult.verdict === 'REWORK'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {arbitrationResult.verdict}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-2">
            Synthesize 3D (L, B, H), evaluate tolerances, and log audit trail.
          </p>

          {arbitrationResult ? (
            <div className="space-y-1 text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Dimensions:</span>
                <span className="font-mono text-slate-200">
                  {arbitrationResult.measured.L} x {arbitrationResult.measured.B} x {arbitrationResult.measured.H} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Delta:</span>
                <span className={`font-mono font-bold ${
                  arbitrationResult.deltas.max_error <= arbitrationResult.target.tol
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {arbitrationResult.deltas.max_error} mm (tol ±{arbitrationResult.target.tol}mm)
                </span>
              </div>
            </div>
          ) : (
            <button
              id="btn-run-arbitrate"
              onClick={onArbitrate}
              disabled={!isReadyToArbitrate}
              className={`w-full h-16 rounded-lg font-semibold text-xs flex flex-col items-center justify-center gap-1 transition ${
                isReadyToArbitrate
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/20 animate-pulse'
                  : 'bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span>Run 3D Arbitration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-normal opacity-80">
                {isReadyToArbitrate ? 'Ready to evaluate' : 'Complete Steps 1 & 2 first'}
              </span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
