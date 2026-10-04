import React from 'react';
import { X, Printer, Download, Info, CheckCircle2 } from 'lucide-react';

export default function PrintMarkersModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                ArUco Calibration & Batch Marker Cards
              </h3>
              <p className="text-xs text-slate-400">
                DICT_4X4_50 Reference Standards for Dynamic Metrology Calibration
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

        {/* Content Body */}
        <div className="py-4 overflow-y-auto space-y-4">
          
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Important Printing Instructions:</span> Print at <strong>100% scale</strong> (uncheck "Fit to page" or "Shrink to printable area"). Verify with a physical ruler or caliper that the Reference Tag is exactly <strong>80.0 mm x 80.0 mm</strong>.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Marker 42 (Reference Scale) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
              <div className="text-xs font-bold text-emerald-400 mb-1">
                REFERENCE SCALE TAG (ID 42)
              </div>
              <div className="text-[11px] text-slate-400 mb-3">
                Size: 80.0 mm x 80.0 mm
              </div>

              <div className="w-48 h-48 bg-white rounded-lg p-2 flex items-center justify-center border border-slate-700 shadow-inner">
                <img
                  src="/api/markers/42"
                  alt="ArUco Marker 42"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <a
                href="/api/markers/42"
                download="ArUco_ID42_80mm_Reference.png"
                className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Tag #42 PNG</span>
              </a>
            </div>

            {/* Marker 10 (Batch Identifier) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
              <div className="text-xs font-bold text-cyan-400 mb-1">
                BATCH IDENTIFIER TAG (ID 10)
              </div>
              <div className="text-[11px] text-slate-400 mb-3">
                Size: 50.0 mm x 50.0 mm
              </div>

              <div className="w-48 h-48 bg-white rounded-lg p-2 flex items-center justify-center border border-slate-700 shadow-inner">
                <img
                  src="/api/markers/10"
                  alt="ArUco Marker 10"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <a
                href="/api/markers/10"
                download="ArUco_ID10_Batch_Tag.png"
                className="mt-4 w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Tag #10 PNG</span>
              </a>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
