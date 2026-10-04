"""
SteelSight V2 - System State Manager
Maintains runtime state including Golden Sample calibration scale factor (active_px_per_mm).
"""

from typing import Optional
from datetime import datetime


class SystemState:
    def __init__(self):
        # Initial state: active_px_per_mm defaults to None (uncalibrated)
        self.active_px_per_mm: Optional[float] = None
        self.is_calibrated: bool = False
        self.calibration_timestamp: Optional[str] = None
        self.golden_sample_length_mm: float = 100.0
        self.last_major_pixel_length: Optional[float] = None
        self.last_minor_pixel_length: Optional[float] = None

    def set_golden_calibration(self, px_per_mm: float, known_length_mm: float = 100.0, major_px: float = 0.0, minor_px: float = 0.0):
        """Sets the active pixel-per-millimeter scale from a Golden Sample scan."""
        self.active_px_per_mm = round(float(px_per_mm), 4)
        self.is_calibrated = True
        self.golden_sample_length_mm = float(known_length_mm)
        self.last_major_pixel_length = round(float(major_px), 2)
        self.last_minor_pixel_length = round(float(minor_px), 2)
        self.calibration_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def reset_calibration(self):
        """Resets calibration state to uncalibrated."""
        self.active_px_per_mm = None
        self.is_calibrated = False
        self.calibration_timestamp = None
        self.last_major_pixel_length = None
        self.last_minor_pixel_length = None

    def to_dict(self):
        return {
            "is_calibrated": self.is_calibrated,
            "active_px_per_mm": self.active_px_per_mm,
            "golden_sample_length_mm": self.golden_sample_length_mm,
            "calibration_timestamp": self.calibration_timestamp,
            "last_major_pixel_length": self.last_major_pixel_length,
            "last_minor_pixel_length": self.last_minor_pixel_length,
        }


# Global singleton system state instance
system_state = SystemState()
