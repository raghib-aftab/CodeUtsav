"""
SteelSight V2 - ArUco Marker Generator
Generates high-resolution, printable ArUco markers from DICT_4X4_50
with scale rulers and reference labels for physical setup.
"""

import cv2
import numpy as np
import os

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


def generate_printable_marker(
    marker_id: int,
    physical_size_mm: float = 80.0,
    dpi: int = 300,
    label: str = "STEELSIGHT V2 CALIBRATION TAG"
) -> np.ndarray:
    """
    Generates a printable marker card image with:
    - 4x4 ArUco tag matching physical_size_mm
    - Millimeter tick ruler marks on borders
    - Verification instructions and ID label
    """
    # 300 DPI -> 1 inch = 25.4 mm -> pixels per mm = 300 / 25.4 ~ 11.81 px/mm
    px_per_mm = dpi / 25.4
    tag_px = int(round(physical_size_mm * px_per_mm))
    
    # Card canvas size with 20mm margin all around
    margin_mm = 20.0
    margin_px = int(round(margin_mm * px_per_mm))
    card_w = tag_px + (margin_px * 2)
    card_h = tag_px + (margin_px * 2) + int(15.0 * px_per_mm)  # Extra space for text

    # White canvas
    canvas = np.full((card_h, card_w, 3), 255, dtype=np.uint8)

    # Generate ArUco marker
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker_raw = cv2.aruco.generateImageMarker(d, marker_id, tag_px)
    marker_bgr = cv2.cvtColor(marker_raw, cv2.COLOR_GRAY2BGR)

    # Place marker in center
    x_offset = margin_px
    y_offset = margin_px + int(12.0 * px_per_mm)
    canvas[y_offset:y_offset + tag_px, x_offset:x_offset + tag_px] = marker_bgr

    # Draw border around tag
    cv2.rectangle(canvas, (x_offset - 2, y_offset - 2), (x_offset + tag_px + 2, y_offset + tag_px + 2), (0, 0, 0), 2)

    # Header text
    cv2.putText(canvas, label, (margin_px, int(7.0 * px_per_mm)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    sub = f"ArUco DICT_4X4_50 | Marker ID: {marker_id} | Reference Size: {physical_size_mm:.1f} mm x {physical_size_mm:.1f} mm"
    cv2.putText(canvas, sub, (margin_px, int(10.5 * px_per_mm)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)

    # Draw mm ruler marks along bottom of tag
    ruler_y = y_offset + tag_px + 10
    cv2.line(canvas, (x_offset, ruler_y), (x_offset + tag_px, ruler_y), (0, 0, 0), 2)
    
    # 10mm ticks
    num_ticks = int(physical_size_mm / 10.0)
    for i in range(num_ticks + 1):
        tick_x = int(x_offset + (i * 10.0 * px_per_mm))
        cv2.line(canvas, (tick_x, ruler_y), (tick_x, ruler_y + 12), (0, 0, 0), 2)
        cv2.putText(canvas, f"{i*10}", (tick_x - 8, ruler_y + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)

    footer = "Print at 100% Scale (Do not fit/shrink to page). Verify ruler with physical caliper."
    cv2.putText(canvas, footer, (margin_px, card_h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 120, 120), 1)

    return canvas


def ensure_static_markers():
    """Generates and saves the standard ID 42 (80mm) and ID 10 tags."""
    os.makedirs(STATIC_DIR, exist_ok=True)
    m42_path = os.path.join(STATIC_DIR, "marker_42_80mm.png")
    m10_path = os.path.join(STATIC_DIR, "marker_10_batch.png")

    if not os.path.exists(m42_path):
        card42 = generate_printable_marker(42, 80.0, 300, "STEELSIGHT V2 CALIBRATION REFERENCE TAG")
        cv2.imwrite(m42_path, card42)

    if not os.path.exists(m10_path):
        card10 = generate_printable_marker(10, 50.0, 300, "STEELSIGHT V2 BATCH IDENTIFICATION TAG")
        cv2.imwrite(m10_path, card10)
