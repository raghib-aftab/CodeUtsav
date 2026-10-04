import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LiveStream from './components/LiveStream';
import InspectionWorkflow from './components/InspectionWorkflow';
import RealTimeInspectionCard from './components/RealTimeInspectionCard';
import AuditLogTable from './components/AuditLogTable';
import PrintMarkersModal from './components/PrintMarkersModal';
import BatchConfigModal from './components/BatchConfigModal';
import CameraSettingsModal from './components/CameraSettingsModal';
import SnapshotModal from './components/SnapshotModal';

export default function App() {
  // Telemetry & Hardware status
  const [status, setStatus] = useState(null);
  const [batches, setBatches] = useState({});
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Metrology Inspection Flow States
  const [currentStep, setCurrentStep] = useState(1); // 1: Top, 2: Side, 3: Arbitrate
  const [topMeasurement, setTopMeasurement] = useState(null);
  const [sideMeasurement, setSideMeasurement] = useState(null);
  const [arbitrationResult, setArbitrationResult] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMarkersModalOpen, setIsMarkersModalOpen] = useState(false);
  const [snapshotModal, setSnapshotModal] = useState({ isOpen: false, title: '', img: '' });

  // 1. Fetch system status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Status poll error:', err);
    }
  }, []);

  // 2. Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (err) {
      console.warn('Batches fetch error:', err);
    }
  }, []);

  // 3. Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.records || []);
      }
    } catch (err) {
      console.warn('Logs fetch error:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // Polling loop for hardware & calibration status
  useEffect(() => {
    fetchStatus();
    fetchBatches();
    fetchLogs();

    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchBatches, fetchLogs]);

  // Golden Sample Auto-Calibration (100mm)
  const handleCalibrateGolden = async () => {
    setIsCalibrating(true);
    try {
      const res = await fetch('/api/calibrate/golden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ known_length_mm: 100.0 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStatus();
        if (data.annotated_image_base64) {
          setSnapshotModal({
            isOpen: true,
            title: `Golden Sample Calibrated (${data.active_px_per_mm} px/mm)`,
            img: data.annotated_image_base64
          });
        }
      } else {
        alert(data.detail || data.error || 'Failed to calibrate with Golden Sample. Ensure billet is clearly visible.');
      }
    } catch (err) {
      alert('Error triggering Golden Sample calibration: ' + err.message);
    } finally {
      setIsCalibrating(false);
    }
  };

  // Capture Top View
  const handleCaptureTop = async () => {
    if (!status?.calibrated) {
      alert('System uncalibrated. Please run Golden Sample calibration (100mm) first.');
      return;
    }

    setIsCapturing(true);
    try {
      const res = await fetch('/api/measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view_type: 'top',
          batch_id: status?.active_batch_in_fov || 10
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTopMeasurement(data);
        setCurrentStep(2);

        // If in simulation mode, automatically set sim view to 'side' for convenience
        if (status?.use_simulation) {
          await handleUpdateSimulation({ view_type: 'side' });
        }
      } else {
        alert(data.detail || data.warning || 'Could not isolate billet contour. Check lighting/contrast.');
      }
    } catch (err) {
      alert('Error during Top View capture: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Capture Side View
  const handleCaptureSide = async () => {
    setIsCapturing(true);
    try {
      const res = await fetch('/api/measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view_type: 'side',
          batch_id: status?.active_batch_in_fov || 10
        })
      });
      const data = await res.json();
      if (data.success) {
        setSideMeasurement(data);
        setCurrentStep(3);
      } else {
        alert(data.warning || 'Could not isolate billet contour. Check lighting/contrast.');
      }
    } catch (err) {
      alert('Error during Side View capture: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Run 3D Arbitration
  const handleArbitrate = async () => {
    if (!topMeasurement || !sideMeasurement) return;

    try {
      const targetBatchId = topMeasurement.batch_id || sideMeasurement.batch_id || status?.active_batch_in_fov || 10;
      const res = await fetch('/api/arbitrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: targetBatchId,
          top_view: {
            dim1_mm: topMeasurement.dim1_mm,
            dim2_mm: topMeasurement.dim2_mm
          },
          side_view: {
            dim1_mm: sideMeasurement.dim1_mm,
            dim2_mm: sideMeasurement.dim2_mm
          }
        })
      });

      const data = await res.json();
      setArbitrationResult(data);
      // Refresh audit logs immediately
      fetchLogs();
    } catch (err) {
      alert('Arbitration error: ' + err.message);
    }
  };

  // Reset for next billet inspection
  const handleReset = () => {
    setTopMeasurement(null);
    setSideMeasurement(null);
    setArbitrationResult(null);
    setCurrentStep(1);
    // If in simulation, reset view to top
    if (status?.use_simulation) {
      handleUpdateSimulation({ view_type: 'top' });
    }
  };

  // Update simulation parameters
  const handleUpdateSimulation = async (simConfig) => {
    try {
      await fetch('/api/simulation/billet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simConfig)
      });
      fetchStatus();
    } catch (err) {
      console.warn('Simulation config error:', err);
    }
  };

  // Update camera hardware settings
  const handleUpdateCameraConfig = async (cameraConfig) => {
    const res = await fetch('/api/camera/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraConfig)
    });
    const data = await res.json();
    fetchStatus();
    return data;
  };

  // Save batch spec
  const handleSaveBatch = async (batchSpec) => {
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchSpec)
    });
    const data = await res.json();
    fetchBatches();
    return data;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Top Navigation Header */}
      <Header
        status={status}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        onOpenMarkersModal={() => setIsMarkersModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 space-y-6">
        
        {/* Upper Row: Live Video Feed & Inspection Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 7 Columns: Live Overhead Optical Feed & Sequential Pipeline */}
          <div className="lg:col-span-7 space-y-6">
            <LiveStream
              status={status}
              onCaptureTop={handleCaptureTop}
              onCaptureSide={handleCaptureSide}
              isCapturing={isCapturing}
              onCalibrateGolden={handleCalibrateGolden}
              isCalibrating={isCalibrating}
              onUpdateSimulation={handleUpdateSimulation}
              currentStep={currentStep}
            />

            <InspectionWorkflow
              topMeasurement={topMeasurement}
              sideMeasurement={sideMeasurement}
              arbitrationResult={arbitrationResult}
              currentStep={currentStep}
              onArbitrate={handleArbitrate}
              onReset={handleReset}
              onOpenSnapshotModal={(title, img) => setSnapshotModal({ isOpen: true, title, img })}
            />
          </div>

          {/* Right 5 Columns: Real-Time Metrology Card & 3D Isometric Visualizer */}
          <div className="lg:col-span-5">
            <RealTimeInspectionCard
              arbitrationResult={arbitrationResult}
              activeBatch={status?.active_batch_in_fov}
              batches={batches}
            />
          </div>

        </div>

        {/* Lower Row: Full-Width Audit Log Table */}
        <div className="w-full">
          <AuditLogTable
            logs={logs}
            onRefresh={fetchLogs}
            isLoading={isLoadingLogs}
          />
        </div>

      </main>

      {/* Modals */}
      <PrintMarkersModal
        isOpen={isMarkersModalOpen}
        onClose={() => setIsMarkersModalOpen(false)}
      />

      <BatchConfigModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        batches={batches}
        onSaveBatch={handleSaveBatch}
      />

      <CameraSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={status}
        onUpdateConfig={handleUpdateCameraConfig}
      />

      <SnapshotModal
        isOpen={snapshotModal.isOpen}
        onClose={() => setSnapshotModal({ isOpen: false, title: '', img: '' })}
        title={snapshotModal.title}
        imageBase64={snapshotModal.img}
      />

    </div>
  );
}
