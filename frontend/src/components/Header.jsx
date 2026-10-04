import React from 'react';
import { 
  Camera, 
  Activity, 
  Settings, 
  Printer, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  status, 
  onOpenSettings, 
  onOpenBatchModal, 
  onOpenMarkersModal 
}) {
  const isSim = status?.use_simulation;
  const isConnected = status?.camera_connected;
  const isCalibrated = status?.calibrated;
  const pxPerMm = status?.px_per_mm || 0;
  const activeBatch = status?.active_batch_in_fov;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & System Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                SteelSight V2
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Metrology OS
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Precision Computer Vision & 3D Billet Arbitration</span>
            </p>
          </div>
        </div>

        {/* Live Telemetry Status Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Stream / Source Mode */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            isSim 
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
              : isConnected 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            <Camera className="w-3.5 h-3.5" />
            <span>
              {isSim ? 'Virtual Test Bench' : isConnected ? 'DirectShow (Live)' : 'Camera Offline'}
            </span>
            <span className="text-[10px] text-slate-400 pl-1 border-l border-slate-700/50">
              {status?.fps || 0} FPS
            </span>
          </div>

          {/* Golden Sample Calibration Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-semibold text-xs transition-all ${
            isCalibrated && pxPerMm > 0
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-glow-emerald'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/50 shadow-glow-rose animate-pulse'
          }`}>
            {isCalibrated && pxPerMm > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>CALIBRATED: {pxPerMm.toFixed(2)} px/mm</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>UNCALIBRATED</span>
              </>
            )}
          </div>

          {/* Active Batch in FOV */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Batch:</span>
            <span className="font-mono font-semibold text-cyan-300">
              {activeBatch ? `#${activeBatch}` : 'Tag #10 (Default)'}
            </span>
          </div>

        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-print-markers"
            onClick={onOpenMarkersModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 rounded-lg transition"
            title="Download printable ArUco ID 42 and ID 10 markers"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Print Tags</span>
          </button>

          <button
            id="btn-batch-specs"
            onClick={onOpenBatchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 rounded-lg transition"
            title="Configure Target Dimensions and Tolerances in BATCH_DB"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Batch Specs</span>
          </button>

          <button
            id="btn-camera-settings"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 rounded-lg transition"
            title="DirectShow Camera Source and Simulation Options"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>

      </div>
    </header>
  );
}
