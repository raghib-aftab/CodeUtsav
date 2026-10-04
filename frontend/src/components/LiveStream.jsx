import React, { useState } from 'react';
import { 
  Camera, 
  RefreshCw, 
  Maximize2, 
  Sliders, 
  Sparkles, 
  AlertCircle,
  Eye,
  RotateCw,
  Crosshair,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function LiveStream({ 
  status, 
  onCaptureTop, 
  onCaptureSide, 
  isCapturing,
  onCalibrateGolden,
  isCalibrating,
  onUpdateSimulation,
  currentStep
}) {
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [showSimControls, setShowSimControls] = useState(true);

  const streamUrl = `/api/stream?t=${streamKey}`;
  const isSim = status?.use_simulation;

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(Date.now());
  };

  // Quick simulation scenarios
  const applyPreset = (preset) => {
    if (preset === 'pass') {
      onUpdateSimulation({
        view_type: 'top',
        length_mm: 100.2,
        breadth_mm: 25.1,
        height_mm: 25.2,
        batch_id: 10
      });
    } else if (preset === 'rework') {
      onUpdateSimulation({
        view_type: 'top',
        length_mm: 101.6,
        breadth_mm: 26.4,
        height_mm: 25.2,
        batch_id: 10
      });
    } else if (preset === 'reject_dim') {
      onUpdateSimulation({
        view_type: 'top',
        length_mm: 104.5,
        breadth_mm: 28.5,
        height_mm: 25.2,
        batch_id: 10
      });
    } else if (preset === 'reject_mismatch') {
      onUpdateSimulation({
        view_type: 'top',
        length_mm: 100.0,
        breadth_mm: 25.0,
        height_mm: 25.0,
        batch_id: 10
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl relative">
      
      {/* Panel Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-mono">
            Overhead Optical Feed
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
            DirectShow cv2.CAP_DSHOW
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSim && (
            <button
              onClick={() => setShowSimControls(!showSimControls)}
              className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
              title="Show simulated billet test bench controls"
            >
              <Sliders className="w-3 h-3" />
              <span>Sim Test Bench</span>
            </button>
          )}

          <button
            onClick={handleRefreshStream}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Reload Video Stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        
        {/* The Live MJPEG Stream */}
        {!streamError ? (
          <img
            key={streamKey}
            src={streamUrl}
            alt="Live Metrology Camera Stream"
            className="w-full h-full object-contain select-none"
            onError={() => setStreamError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-slate-200">Video Stream Offline</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Ensure the FastAPI backend is running at http://localhost:8000 and DirectShow camera index is valid.
            </p>
            <button
              onClick={handleRefreshStream}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reconnect Stream</span>
            </button>
          </div>
        )}

        {/* HUD Target Reticles & Alignment Brackets */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-500/60 rounded-tl" />
            <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-500/60 rounded-tr" />
          </div>
          
          {/* Center Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
            <Crosshair className="w-10 h-10 text-cyan-400" />
          </div>

          <div className="flex justify-between items-end">
            <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-500/60 rounded-bl" />
            <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-500/60 rounded-br" />
          </div>
        </div>

        {/* Warning Toast if ID 42 is not visible */}
        {status?.warning && !isSim && (
          <div className="absolute top-4 left-4 right-4 bg-amber-950/90 border border-amber-500/40 text-amber-200 px-3 py-2 rounded-lg text-xs backdrop-blur-md flex items-center gap-2 shadow-lg">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{status.warning}</span>
          </div>
        )}

      </div>

      {/* Simulation Jig Quick Controls Bar (Appears when in simulation mode) */}
      {isSim && showSimControls && (
        <div className="bg-slate-900/95 border-t border-slate-800/80 p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Sim View:
            </span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                onClick={() => onUpdateSimulation({ view_type: 'top' })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  status?.sim_settings?.view_type === 'top'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top View (100x25)
              </button>
              <button
                onClick={() => onUpdateSimulation({ view_type: 'side' })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  status?.sim_settings?.view_type === 'side'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Side View (Rotate 90°)
              </button>
            </div>
          </div>

          {/* Quick Scenario Preset Injections */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-medium mr-1">Inject Test:</span>
            <button
              onClick={() => applyPreset('pass')}
              className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-[11px]"
              title="Sets simulated billet to 100.2 x 25.1 mm (Tol 1.0 -> PASS)"
            >
              Nominal (PASS)
            </button>
            <button
              onClick={() => applyPreset('rework')}
              className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition text-[11px]"
              title="Sets simulated billet to 101.6 mm (+1.6mm error -> REWORK)"
            >
              Shear Burr (REWORK)
            </button>
            <button
              onClick={() => applyPreset('reject_dim')}
              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition text-[11px]"
              title="Sets simulated billet to 104.5 mm (+4.5mm error -> REJECT)"
            >
              Over-length (REJECT)
            </button>
          </div>
        </div>
      )}

      {/* Golden Sample Calibration Action Banner */}
      <div className="p-3.5 px-4 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Golden Sample Calibration (100mm)
              </span>
              {status?.calibrated && status?.px_per_mm ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {status.px_per_mm.toFixed(2)} px/mm
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  CALIBRATION REQUIRED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Place the 100.0 mm reference billet in FOV and trigger one-click auto-calibration.
            </p>
          </div>
        </div>

        <button
          id="btn-calibrate-golden"
          onClick={onCalibrateGolden}
          disabled={isCalibrating}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
          <span>{isCalibrating ? 'Calibrating...' : 'Calibrate Golden Sample (100mm)'}</span>
        </button>
      </div>

      {/* Control Action Buttons (Sequential Inspection Trigger) */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Capture Top View */}
        <button
          id="btn-capture-top"
          onClick={onCaptureTop}
          disabled={isCapturing}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition shadow-lg ${
            currentStep === 1
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/25 ring-2 ring-cyan-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Camera className="w-4 h-4 text-cyan-300" />
          <span>Capture Top View</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/30 font-mono text-cyan-200">
            L x B
          </span>
        </button>

        {/* Capture Side View */}
        <button
          id="btn-capture-side"
          onClick={onCaptureSide}
          disabled={isCapturing}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition shadow-lg ${
            currentStep === 2
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 ring-2 ring-blue-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <RotateCw className="w-4 h-4 text-blue-300" />
          <span>Capture Side View (Flip 90°)</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/30 font-mono text-blue-200">
            L x H
          </span>
        </button>

      </div>

    </div>
  );
}
