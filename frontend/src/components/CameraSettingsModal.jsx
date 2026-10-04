import React, { useState } from 'react';
import { X, Settings, Camera, Sparkles, Check, RefreshCw } from 'lucide-react';

export default function CameraSettingsModal({ 
  isOpen, 
  onClose, 
  status, 
  onUpdateConfig 
}) {
  const [cameraIndex, setCameraIndex] = useState(status?.camera_index || 0);
  const [useSim, setUseSim] = useState(status?.use_simulation || false);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onUpdateConfig({
        camera_index: cameraIndex,
        use_simulation: useSim
      });
      onClose();
    } catch (err) {
      alert('Error updating camera settings: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Camera Backend Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Windows DirectShow & Simulated Test Bench Options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 text-xs">
          
          {/* Operation Mode */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">
              Acquisition Source:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseSim(false)}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition ${
                  !useSim
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-5 h-5 mb-1 text-cyan-400" />
                <span className="font-bold">DirectShow Hardware</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Physical USB / Overhead Cam</span>
              </button>

              <button
                type="button"
                onClick={() => setUseSim(true)}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition ${
                  useSim
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-5 h-5 mb-1 text-amber-400" />
                <span className="font-bold">Virtual Test Bench</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Simulated ArUco + Billet Jig</span>
              </button>
            </div>
          </div>

          {/* Hardware Camera Index */}
          {!useSim && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="font-semibold text-slate-300 block">
                DirectShow Camera Index (cv2.CAP_DSHOW):
              </label>
              <div className="flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCameraIndex(idx)}
                    className={`flex-1 py-2 rounded-lg font-mono font-semibold transition ${
                      cameraIndex === idx
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Index {idx}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Index 0 is typically the primary webcam or overhead industrial lens.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {isApplying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Apply Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
}
