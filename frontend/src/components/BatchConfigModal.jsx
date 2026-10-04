import React, { useState } from 'react';
import { X, Database, Plus, Check, Save } from 'lucide-react';

export default function BatchConfigModal({ 
  isOpen, 
  onClose, 
  batches, 
  onSaveBatch 
}) {
  const [selectedBatchId, setSelectedBatchId] = useState(10);
  const [formData, setFormData] = useState({
    batch_id: 10,
    name: 'Standard Square Billet 100x25x25',
    L: 100.0,
    B: 25.0,
    H: 25.0,
    tol: 1.0,
    grade: 'IS 2830 / Fe 500D'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelectBatch = (bid) => {
    setSelectedBatchId(bid);
    const spec = batches[bid];
    if (spec) {
      setFormData({
        batch_id: spec.batch_id,
        name: spec.name,
        L: spec.L,
        B: spec.B,
        H: spec.H,
        tol: spec.tol,
        grade: spec.grade || 'Standard Steel'
      });
    }
  };

  const handleNewBatch = () => {
    const nextId = Math.max(...Object.keys(batches).map(Number), 0) + 10;
    setSelectedBatchId(nextId);
    setFormData({
      batch_id: nextId,
      name: `Custom Billet Batch #${nextId}`,
      L: 110.0,
      B: 28.0,
      H: 28.0,
      tol: 1.0,
      grade: 'Alloy Steel'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveBatch(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert('Failed to save batch spec: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Batch Specifications Database (BATCH_DB)
              </h3>
              <p className="text-xs text-slate-400">
                Define target dimensions (L, B, H) and allowable quality tolerance limits
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
          
          {/* Batch Selector Pill Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {Object.keys(batches || {}).map((bid) => {
                const idNum = Number(bid);
                const isSelected = selectedBatchId === idNum;
                return (
                  <button
                    key={bid}
                    onClick={() => handleSelectBatch(idNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Batch #{bid}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNewBatch}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Batch</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Batch Tag ID (ArUco ID)
                </label>
                <input
                  type="number"
                  value={formData.batch_id}
                  onChange={(e) => setFormData({ ...formData, batch_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Grade / Material
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Batch Description Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target L (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.L}
                  onChange={(e) => setFormData({ ...formData, L: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target B (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.B}
                  onChange={(e) => setFormData({ ...formData, B: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target H (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.H}
                  onChange={(e) => setFormData({ ...formData, H: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tolerance (± mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.tol}
                  onChange={(e) => setFormData({ ...formData, tol: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Specification'}</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Footer */}
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
