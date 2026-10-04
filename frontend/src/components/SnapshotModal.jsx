import React from 'react';
import { X, Maximize2, Download } from 'lucide-react';

export default function SnapshotModal({ isOpen, onClose, title, imageBase64 }) {
  if (!isOpen || !imageBase64) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-4 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono">
              {title || 'Annotated Metrology Inspection Snapshot'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageBase64}
              download={`${title || 'metrology_snapshot'}.jpg`}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
              title="Download Snapshot"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="py-3 flex-1 flex items-center justify-center overflow-hidden bg-slate-950 rounded-xl mt-2 border border-slate-800">
          <img
            src={imageBase64}
            alt="Annotated Billet Measurement"
            className="max-h-[70vh] w-auto object-contain rounded select-none"
          />
        </div>

        {/* Footer */}
        <div className="pt-3 text-[11px] text-slate-500 font-mono flex justify-between">
          <span>High-precision ArUco masking & OpenCV minAreaRect extraction</span>
          <span>100% Optical Verification</span>
        </div>

      </div>
    </div>
  );
}
