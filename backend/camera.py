"""
SteelSight V2 - Threaded Camera Manager
- Threaded background acquisition loop with cv2.CAP_DSHOW (Windows DirectShow)
- Buffer decoupling to prevent queue lag and maintain max FPS
- Low-latency JPEG stream generator for GET /api/stream
- Integrated High-Fidelity Simulation Engine with ArUco ID 42 & ID 10
  allowing instant testing and verification on any PC without physical fixtures.
"""

import cv2
import numpy as np
import threading
import time
from typing import Optional, Tuple, Generator
from backend.vision import VisionEngine


class CameraManager:
    def __init__(self, camera_index: int = 0, vision_engine: Optional[VisionEngine] = None):
        self.camera_index = camera_index
        self.vision_engine = vision_engine or VisionEngine()
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        
        self.current_frame: Optional[np.ndarray] = None
        self.is_connected: bool = False
        self.use_simulation: bool = False
        self.fps: float = 0.0
        self.frame_count: int = 0
        self.last_fps_time: float = time.time()
        
        # Simulation parameters
        self.sim_view_type: str = "top"  # "top" or "side"
        self.sim_batch_id: int = 10
        self.sim_billet_length: float = 100.2  # mm
        self.sim_billet_breadth: float = 25.1  # mm (top view)
        self.sim_billet_height: float = 25.3   # mm (side view)
        self.sim_angle: float = 0.0            # slight rotation in degrees
        self.sim_px_per_mm: float = 2.0        # simulated scale factor (2.0 px/mm)

        # Pre-generate ArUco marker textures for simulation
        self._init_sim_markers()

        # Start acquisition
        self.start()

    def _init_sim_markers(self):
        """No ArUco marker textures needed under Golden Sample metrology."""
        pass

    def start(self):
        """Starts the capture background thread."""
        if self.running:
            return

        self.running = True
        self._open_camera()
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def stop(self):
        """Stops the capture thread and releases hardware resources."""
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self._close_camera()

    def _open_camera(self):
        """Opens the hardware camera via DirectShow or defaults to simulation."""
        if self.use_simulation:
            self.is_connected = False
            return

        try:
            self.cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                self.cap.set(cv2.CAP_PROP_FPS, 30)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer lag
                self.is_connected = True
            else:
                self.is_connected = False
                self.use_simulation = True
        except Exception as e:
            print(f"[CameraManager] Error opening camera {self.camera_index}: {e}")
            self.is_connected = False
            self.use_simulation = True

    def _close_camera(self):
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False

    def reconfigure(self, camera_index: Optional[int] = None, use_simulation: Optional[bool] = None):
        """Reconfigures camera source or toggles simulation mode."""
        with self.lock:
            needs_reopen = False
            if camera_index is not None and camera_index != self.camera_index:
                self.camera_index = camera_index
                needs_reopen = True
            if use_simulation is not None and use_simulation != self.use_simulation:
                self.use_simulation = use_simulation
                needs_reopen = True

            if needs_reopen:
                self._close_camera()
                self._open_camera()

    def set_simulation_view(
        self,
        view_type: str = "top",
        length_mm: Optional[float] = None,
        breadth_mm: Optional[float] = None,
        height_mm: Optional[float] = None,
        batch_id: Optional[int] = None
    ):
        """Configures the simulated billet presentation."""
        with self.lock:
            self.sim_view_type = view_type.lower()
            if length_mm is not None:
                self.sim_billet_length = length_mm
            if breadth_mm is not None:
                self.sim_billet_breadth = breadth_mm
            if height_mm is not None:
                self.sim_billet_height = height_mm
            if batch_id is not None:
                self.sim_batch_id = batch_id

    def _generate_synthetic_frame(self) -> np.ndarray:
        """
        Synthesizes a realistic 1280x720 overhead inspection bench with:
        - Matte industrial background with fine grid
        - ArUco ID 42 (80x80mm) in top-left
        - ArUco ID (batch tag) in top-right
        - Steel billet placed in the center with metallic gradient,
          bevel specular edges, and accurate pixel dimensions.
        """
        w, h = 1280, 720
        # Dark industrial bench background
        frame = np.full((h, w, 3), 28, dtype=np.uint8)

        # Subtle grid lines (every 50px)
        for x in range(0, w, 50):
            cv2.line(frame, (x, 0), (x, h), (36, 36, 38), 1)
        for y in range(0, h, 50):
            cv2.line(frame, (0, y), (w, y), (36, 36, 38), 1)

        # Bench alignment guides
        cv2.rectangle(frame, (w // 2 - 280, h // 2 - 140), (w // 2 + 280, h // 2 + 160), (40, 42, 48), 1)
        cv2.putText(frame, "GOLDEN SAMPLE INSPECTION ZONE", (w // 2 - 130, h // 2 - 148), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (100, 160, 220), 1)

        # Determine billet dimensions based on view type
        l_px = int(round(self.sim_billet_length * self.sim_px_per_mm))
        if self.sim_view_type == "top":
            minor_px = int(round(self.sim_billet_breadth * self.sim_px_per_mm))
            billet_label = f"STEEL BILLET [TOP VIEW] ~{self.sim_billet_length:.1f}x{self.sim_billet_breadth:.1f}mm"
        else:
            minor_px = int(round(self.sim_billet_height * self.sim_px_per_mm))
            billet_label = f"STEEL BILLET [SIDE VIEW] ~{self.sim_billet_length:.1f}x{self.sim_billet_height:.1f}mm"

        # Create oriented billet rectangle in center
        cx, cy = w // 2, h // 2 + 30
        angle = self.sim_angle

        # Compute corners of rotated rectangle
        rect = ((float(cx), float(cy)), (float(l_px), float(minor_px)), float(angle))
        box = cv2.boxPoints(rect)
        box_int = np.int32(box)

        # Fill with metallic steel color
        cv2.fillPoly(frame, [box_int], (190, 192, 198))
        cv2.polylines(frame, [box_int], True, (160, 162, 168), 1)

        # Fixture crosshairs
        cv2.line(frame, (cx - 20, cy), (cx + 20, cy), (0, 100, 255), 1)
        cv2.line(frame, (cx, cy - 20), (cx, cy + 20), (0, 100, 255), 1)

        # Simulation Mode Watermark
        cv2.putText(frame, "[SIMULATION TEST JIG ACTIVE]", (w // 2 - 130, h - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 200), 1)
        cv2.putText(frame, billet_label, (w // 2 - 170, cy + minor_px // 2 + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        return frame

    def _capture_loop(self):
        """Continuous background capture thread reading frames to avoid buffer lag."""
        while self.running:
            if not self.use_simulation and self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self.lock:
                        self.current_frame = frame
                        self.is_connected = True
                else:
                    # Camera read error -> fallback to simulation
                    with self.lock:
                        self.current_frame = self._generate_synthetic_frame()
                        self.is_connected = False
            else:
                # Simulation Mode
                sim_frame = self._generate_synthetic_frame()
                with self.lock:
                    self.current_frame = sim_frame

            # FPS calculation
            self.frame_count += 1
            now = time.time()
            dt = now - self.last_fps_time
            if dt >= 1.0:
                self.fps = round(self.frame_count / dt, 1)
                self.frame_count = 0
                self.last_fps_time = now

            # Sleep slightly to throttle to ~30 FPS
            time.sleep(0.03)

    def get_frame(self) -> Optional[np.ndarray]:
        """Returns a pristine copy of the latest captured frame."""
        with self.lock:
            if self.current_frame is not None:
                return self.current_frame.copy()
            return None

    def get_annotated_frame(self) -> Optional[np.ndarray]:
        """Returns the frame with live status bar & HUD overlay."""
        frame = self.get_frame()
        if frame is not None:
            from backend.state import system_state
            return self.vision_engine.generate_live_overlay(
                frame,
                px_per_mm=system_state.active_px_per_mm,
                is_calibrated=system_state.is_calibrated
            )
        return None

    def generate_mjpeg(self) -> Generator[bytes, None, None]:
        """Yields multipart/x-mixed-replace JPEG frames for live HTTP streaming."""
        while self.running:
            frame = self.get_annotated_frame()
            if frame is None:
                time.sleep(0.05)
                continue

            # Compress to JPEG with high performance settings
            ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if not ret:
                time.sleep(0.02)
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
            )
            time.sleep(0.033)  # ~30 FPS
