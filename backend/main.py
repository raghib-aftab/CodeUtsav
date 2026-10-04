"""
SteelSight V2 - Metrology & Quality Control FastAPI Application
Provides endpoints for:
- Live DirectShow / Simulated video streaming (/api/stream)
- Golden Sample Auto-Calibration (/api/calibrate/golden)
- Dimensional measurement snapshot capture (/api/measure)
- 3D Synthesis, arbitration, and tolerance grading (/api/arbitrate)
- Non-blocking Excel audit logging & download (/api/logs)
- Batch catalog management (/api/batches)
"""

import os
import cv2
from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from backend.vision import VisionEngine
from backend.camera import CameraManager
from backend.arbitrate import ArbitrationEngine
from backend.logger import InspectionLogger
from backend.state import system_state

app = FastAPI(
    title="SteelSight V2 - Dimensional Metrology System",
    description="Automated CV inspection for steel billets using Golden Sample auto-calibration and 3D arbitration",
    version="2.1.0"
)

# Enable CORS for React frontend (Vite default is 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core subsystems
vision = VisionEngine()
camera = CameraManager(camera_index=0, vision_engine=vision)
arbitrator = ArbitrationEngine()
logger = InspectionLogger()


# --- Pydantic Request Models ---

class GoldenCalibrateRequest(BaseModel):
    known_length_mm: float = Field(default=100.0, description="Known length of Golden Sample billet in mm")


class MeasureRequest(BaseModel):
    view_type: str = Field(default="top", description="'top' or 'side'")
    batch_id: Optional[int] = Field(default=None, description="Optional override for batch ID")


class ArbitrateRequest(BaseModel):
    batch_id: int = Field(default=10, description="Batch ID for target lookup")
    top_view: Dict[str, Any] = Field(..., description="Top view measurements containing dim1_mm, dim2_mm")
    side_view: Dict[str, Any] = Field(..., description="Side view measurements containing dim1_mm, dim2_mm")


class CameraConfigRequest(BaseModel):
    camera_index: Optional[int] = Field(default=None, description="DirectShow camera index (e.g. 0, 1)")
    use_simulation: Optional[bool] = Field(default=None, description="Toggle simulated billet test bench")


class SimulationConfigRequest(BaseModel):
    view_type: str = Field(default="top", description="'top' or 'side'")
    length_mm: Optional[float] = Field(default=100.2, description="Simulated length in mm")
    breadth_mm: Optional[float] = Field(default=25.1, description="Simulated breadth in mm (top view)")
    height_mm: Optional[float] = Field(default=25.3, description="Simulated height in mm (side view)")
    batch_id: Optional[int] = Field(default=10, description="Simulated Batch ID")


class BatchSpecModel(BaseModel):
    batch_id: int
    name: str
    L: float
    B: float
    H: float
    tol: float
    grade: Optional[str] = "Standard Steel"


# --- API Routes ---

@app.get("/")
def read_root():
    return {
        "system": "SteelSight V2 Metrology System (Golden Sample Edition)",
        "status": "Online",
        "camera_connected": camera.is_connected,
        "simulation_mode": camera.use_simulation,
        "fps": camera.fps,
        "calibrated": system_state.is_calibrated,
        "active_px_per_mm": system_state.active_px_per_mm,
    }


@app.get("/api/stream")
def video_stream():
    """
    Exposes low-latency MJPEG stream (Multipart/x-mixed-replace)
    for the real-time operator dashboard.
    """
    return StreamingResponse(
        camera.generate_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/status")
def get_system_status():
    """Returns real-time health, calibration, and vision status."""
    return {
        "camera_index": camera.camera_index,
        "camera_connected": camera.is_connected,
        "use_simulation": camera.use_simulation,
        "fps": camera.fps,
        "calibrated": system_state.is_calibrated,
        "px_per_mm": system_state.active_px_per_mm,
        "golden_length_mm": system_state.golden_sample_length_mm,
        "calibration_timestamp": system_state.calibration_timestamp,
        "active_batch_in_fov": 10,
        "warning": None if system_state.is_calibrated else "System uncalibrated. Please run Golden Sample calibration first.",
        "sim_settings": {
            "view_type": camera.sim_view_type,
            "length_mm": camera.sim_billet_length,
            "breadth_mm": camera.sim_billet_breadth,
            "height_mm": camera.sim_billet_height,
            "batch_id": camera.sim_batch_id,
        }
    }


@app.post("/api/calibrate/golden")
def calibrate_golden_sample(req: GoldenCalibrateRequest = GoldenCalibrateRequest()):
    """
    Auto-calibrates scale using the Golden Sample method:
    - Grabs live frame snapshot
    - Segments the single object (Golden Billet)
    - Extracts its major pixel length
    - Calculates px_per_mm = major_pixel_length / known_length_mm
    - Saves to SystemState.active_px_per_mm and returns scale
    """
    frame = camera.get_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="No frame available from camera stream")

    result = vision.calibrate_with_golden_sample(frame, known_length_mm=req.known_length_mm)
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to isolate Golden Sample billet contour in FOV.")
        )

    px_per_mm = result["px_per_mm"]
    system_state.set_golden_calibration(
        px_per_mm=px_per_mm,
        known_length_mm=req.known_length_mm,
        major_px=result["major_px"],
        minor_px=result["minor_px"]
    )

    return {
        "success": True,
        "message": f"Successfully calibrated system with Golden Sample ({req.known_length_mm} mm)",
        "active_px_per_mm": px_per_mm,
        "known_length_mm": req.known_length_mm,
        "major_pixel_length": result["major_px"],
        "minor_pixel_length": result["minor_px"],
        "calibration_timestamp": system_state.calibration_timestamp,
        "annotated_image_base64": result.get("annotated_image_base64")
    }


@app.post("/api/calibrate/reset")
def reset_calibration():
    """Resets system calibration to uncalibrated state."""
    system_state.reset_calibration()
    return {"status": "reset", "is_calibrated": False, "active_px_per_mm": None}


@app.post("/api/measure")
def measure_snapshot(req: MeasureRequest):
    """
    Captures current frame snapshot and computes dimensional metrology:
    - Verifies SystemState.active_px_per_mm is calibrated (raises 400 if None)
    - Segments billet contour & fits oriented minAreaRect
    - Converts major and minor pixel axes to real-world millimeters using active_px_per_mm
    """
    if system_state.active_px_per_mm is None or not system_state.is_calibrated:
        raise HTTPException(
            status_code=400,
            detail="System uncalibrated. Please run Golden Sample calibration first."
        )

    frame = camera.get_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="No frame available from camera stream")

    result = vision.measure_frame(
        frame=frame,
        px_per_mm=system_state.active_px_per_mm,
        view_type=req.view_type,
        batch_id=req.batch_id or 10
    )

    if not result.get("success", False):
        return result

    return {
        "success": True,
        "view_type": result["view_type"],
        "batch_id": result["batch_id"],
        "dim1_mm": result["dim1_mm"],
        "dim2_mm": result["dim2_mm"],
        "dim1_label": result["dim1_label"],
        "dim2_label": result["dim2_label"],
        "px_per_mm": result["px_per_mm"],
        "calibrated": True,
        "warning": result.get("warning"),
        "angle_deg": result.get("angle_deg", 0.0),
        "annotated_image_base64": result.get("annotated_image_base64", None),
    }


@app.post("/api/arbitrate")
def arbitrate_3d(req: ArbitrateRequest):
    """
    Receives Top View (L, B) and Side View (L, H) measurements:
    - Cross-checks |L_top - L_side| <= 2.0 mm
    - Computes absolute error deltas against BATCH_DB
    - Determines PASS / REWORK / REJECT verdict
    - Automatically appends record to inspections_log.xlsx (non-blocking)
    """
    result = arbitrator.arbitrate(
        batch_id=req.batch_id,
        top_view=req.top_view,
        side_view=req.side_view
    )

    # Log to Excel asynchronously
    logged_record = logger.log(result)
    result["record_id"] = logged_record["id"]
    result["timestamp"] = logged_record["timestamp"]

    return result


@app.post("/api/camera/config")
def update_camera_config(req: CameraConfigRequest):
    """Updates hardware camera index or switches between DirectShow and Simulation mode."""
    camera.reconfigure(camera_index=req.camera_index, use_simulation=req.use_simulation)
    return {
        "status": "Updated",
        "camera_index": camera.camera_index,
        "use_simulation": camera.use_simulation,
        "is_connected": camera.is_connected
    }


@app.post("/api/simulation/billet")
def update_simulation_billet(req: SimulationConfigRequest):
    """
    Configures the synthetic billet generator for test bench demonstration.
    """
    camera.set_simulation_view(
        view_type=req.view_type,
        length_mm=req.length_mm,
        breadth_mm=req.breadth_mm,
        height_mm=req.height_mm,
        batch_id=req.batch_id
    )
    return {
        "status": "Simulation billet updated",
        "view_type": camera.sim_view_type,
        "L": camera.sim_billet_length,
        "B": camera.sim_billet_breadth,
        "H": camera.sim_billet_height,
        "batch_id": camera.sim_batch_id,
    }


@app.get("/api/logs")
def get_audit_logs(limit: int = Query(default=50, ge=1, le=200)):
    """Retrieves recent inspection audit records for the dashboard table."""
    return {
        "count": len(logger.recent_records),
        "records": logger.get_recent(limit=limit)
    }


@app.get("/api/logs/export/excel")
def export_excel_log():
    """Downloads the official inspections_log.xlsx file."""
    if not os.path.exists(logger.excel_path):
        logger._create_new_excel()
    return FileResponse(
        path=logger.excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="SteelSight_Inspections_Log.xlsx"
    )


@app.get("/api/logs/export/csv")
def export_csv_log():
    """Exports inspection audit log as CSV format."""
    csv_data = logger.get_csv_export()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=SteelSight_Inspections_Log.csv"}
    )


@app.get("/api/batches")
def get_batches():
    """Lists all configured billet batch profiles in BATCH_DB."""
    return arbitrator.get_all_batches()


@app.post("/api/batches")
def upsert_batch(spec: BatchSpecModel):
    """Creates or updates a batch specification."""
    updated = arbitrator.upsert_batch(spec.batch_id, spec.model_dump())
    return {"status": "success", "batch": updated}
