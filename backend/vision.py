"""
SteelSight V2 - Computer Vision Engine (Golden Sample Metrology)
- Non-ArUco Auto-Calibration via Golden Sample (Reference Billet)
- Robust contour segmentation: Grayscale, Gaussian blur, Otsu/Canny, Morphological Closing
- Oriented minimum bounding rectangle (cv2.minAreaRect)
- Direct millimeter scaling via active_px_per_mm
- High-resolution visual audit annotations
"""

import cv2
import numpy as np
import base64
from typing import Dict, Any, Optional, Tuple, List


class VisionEngine:
    def __init__(self):
        # ArUco ID 42 dependency completely removed in favor of Golden Sample calibration
        pass

    def extract_billet_contour(self, frame: np.ndarray) -> Tuple[Optional[np.ndarray], np.ndarray]:
        """
        Converts frame to grayscale, applies Gaussian blur and adaptive/Otsu thresholding,
        and extracts the largest object contour in the field of view.
        """
        if frame is None or frame.size == 0:
            return None, np.zeros((100, 100), dtype=np.uint8)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Otsu thresholding to segment steel billet against background
        _, thresh1 = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Invert if the background is brighter than the object
        h, w = gray.shape
        corner_mean = np.mean([gray[0, 0], gray[0, w - 1], gray[h - 1, 0], gray[h - 1, w - 1]])
        if corner_mean > 128:
            thresh = cv2.bitwise_not(thresh1)
        else:
            thresh = thresh1

        # Morphological closing to seal internal specular reflections and surface textures
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filter out minor noise (area < 400 px^2)
        valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > 400]

        if not valid_contours:
            # Fallback to Canny edge detector
            edges = cv2.Canny(blurred, 40, 150)
            edges_dilated = cv2.dilate(edges, kernel, iterations=1)
            contours_canny, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            valid_contours = [cnt for cnt in contours_canny if cv2.contourArea(cnt) > 400]

        if valid_contours:
            largest = max(valid_contours, key=cv2.contourArea)
            return largest, closed

        return None, closed

    def calibrate_with_golden_sample(
        self,
        frame: np.ndarray,
        known_length_mm: float = 100.0
    ) -> Dict[str, Any]:
        """
        Segments the Golden Sample billet in the FOV, extracts its major pixel length,
        and computes the calibration scale factor:
            px_per_mm = major_pixel_length / known_length_mm
        """
        if frame is None or frame.size == 0:
            return {"success": False, "error": "No image frame received from camera"}

        contour, debug_mask = self.extract_billet_contour(frame)
        if contour is None:
            return {
                "success": False,
                "error": "No Golden Sample billet detected. Ensure contrasting background and adequate lighting."
            }

        # Fit oriented minimum bounding box
        rect = cv2.minAreaRect(contour)
        (center_x, center_y), (dim_w, dim_h), angle = rect

        major_px = float(max(dim_w, dim_h))
        minor_px = float(min(dim_w, dim_h))

        if major_px < 10.0:
            return {"success": False, "error": "Detected object contour is too small for calibration"}

        # Calculate Golden Sample px_per_mm
        px_per_mm = round(major_px / float(known_length_mm), 4)

        # Generate annotated calibration card
        annotated = frame.copy()
        box_points = cv2.boxPoints(rect)
        box_points_int = np.int32(box_points)

        # Draw contour and golden bounding box
        cv2.drawContours(annotated, [contour], -1, (0, 215, 255), 2)  # Gold contour
        cv2.drawContours(annotated, [box_points_int], 0, (0, 255, 255), 2)  # Cyan bounding box
        cv2.circle(annotated, (int(center_x), int(center_y)), 5, (0, 165, 255), -1)

        # Calibration banner text
        header_text = f"GOLDEN SAMPLE CALIBRATED: {px_per_mm:.3f} px/mm"
        sub_text = f"Known: {known_length_mm:.1f} mm | Major: {major_px:.1f} px | Minor: {minor_px:.1f} px"
        
        cv2.rectangle(annotated, (20, 20), (520, 75), (15, 23, 42), -1)
        cv2.rectangle(annotated, (20, 20), (520, 75), (0, 215, 255), 2)
        cv2.putText(annotated, header_text, (35, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 215, 255), 2, cv2.LINE_AA)
        cv2.putText(annotated, sub_text, (35, 66), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1, cv2.LINE_AA)

        # Encode to Base64
        _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        img_b64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "success": True,
            "px_per_mm": px_per_mm,
            "major_px": round(major_px, 2),
            "minor_px": round(minor_px, 2),
            "known_length_mm": known_length_mm,
            "angle_deg": round(float(angle), 1),
            "center": [round(float(center_x), 1), round(float(center_y), 1)],
            "box_points": box_points.tolist(),
            "annotated_image_base64": f"data:image/jpeg;base64,{img_b64}"
        }

    def measure_frame(
        self,
        frame: np.ndarray,
        px_per_mm: float,
        view_type: str = "top",
        batch_id: int = 10
    ) -> Dict[str, Any]:
        """
        Extracts billet contour, fits minAreaRect, and converts dimensions to millimeters
        using the active_px_per_mm calibrated scale.
        """
        if frame is None or frame.size == 0:
            return {
                "success": False,
                "error": "Empty frame provided for measurement",
                "view_type": view_type,
            }

        contour, debug_mask = self.extract_billet_contour(frame)
        annotated = frame.copy()

        if contour is None:
            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            img_b64 = base64.b64encode(buffer).decode("utf-8")
            return {
                "success": False,
                "view_type": view_type.lower(),
                "batch_id": batch_id,
                "dim1_mm": 0.0,
                "dim2_mm": 0.0,
                "px_per_mm": px_per_mm,
                "calibrated": True,
                "warning": "No steel billet contour detected in FOV. Ensure contrast against background.",
                "annotated_image_base64": f"data:image/jpeg;base64,{img_b64}"
            }

        # Fit oriented minimum bounding rectangle
        rect = cv2.minAreaRect(contour)
        (center_x, center_y), (dim_w, dim_h), angle = rect

        dim_major_px = max(dim_w, dim_h)
        dim_minor_px = min(dim_w, dim_h)

        # Convert to millimeters using Golden Sample active_px_per_mm
        dim1_mm = round(dim_major_px / px_per_mm, 2)
        dim2_mm = round(dim_minor_px / px_per_mm, 2)

        box_points = cv2.boxPoints(rect)
        box_points_int = np.int32(box_points)

        # Draw contour and oriented bounding box
        cv2.drawContours(annotated, [contour], -1, (255, 100, 50), 2)
        cv2.drawContours(annotated, [box_points_int], 0, (0, 255, 255), 2)
        cv2.circle(annotated, (int(center_x), int(center_y)), 5, (0, 0, 255), -1)

        dim1_name = "L"
        dim2_name = "B" if view_type.lower() == "top" else "H"
        meas_text = f"{view_type.upper()} VIEW | {dim1_name}: {dim1_mm:.1f} mm  x  {dim2_name}: {dim2_mm:.1f} mm"

        badge_y = max(30, int(center_y) - int(dim_minor_px / 2) - 20)
        cv2.rectangle(annotated, (int(center_x) - 150, badge_y - 20), (int(center_x) + 150, badge_y + 8), (20, 20, 20), -1)
        cv2.rectangle(annotated, (int(center_x) - 150, badge_y - 20), (int(center_x) + 150, badge_y + 8), (0, 255, 255), 1)
        cv2.putText(annotated, meas_text, (int(center_x) - 140, badge_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)

        _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        img_b64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "success": True,
            "view_type": view_type.lower(),
            "batch_id": batch_id,
            "dim1_mm": dim1_mm,
            "dim2_mm": dim2_mm,
            "dim1_label": dim1_name,
            "dim2_label": dim2_name,
            "px_per_mm": round(px_per_mm, 4),
            "calibrated": True,
            "warning": None,
            "angle_deg": round(float(angle), 1),
            "center": [round(float(center_x), 1), round(float(center_y), 1)],
            "box_points": box_points.tolist(),
            "annotated_image_base64": f"data:image/jpeg;base64,{img_b64}",
        }

    def generate_live_overlay(
        self,
        frame: np.ndarray,
        px_per_mm: Optional[float] = None,
        is_calibrated: bool = False
    ) -> np.ndarray:
        """
        Draws live HUD status overlay and reticles onto the streaming feed.
        """
        if frame is None or frame.size == 0:
            return frame

        display = frame.copy()
        h, w = display.shape[:2]

        # Top banner
        cv2.rectangle(display, (0, 0), (w, 36), (15, 23, 42), -1)
        cv2.putText(display, "STEELSIGHT V2 | GOLDEN METROLOGY", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (56, 189, 248), 2, cv2.LINE_AA)

        # Calibration Pill
        if is_calibrated and px_per_mm:
            calib_str = f"CALIBRATED: {px_per_mm:.2f} px/mm"
            calib_color = (34, 197, 94)  # Green
        else:
            calib_str = "UNCALIBRATED (Place 100mm Billet)"
            calib_color = (239, 68, 68)  # Red

        cv2.putText(display, calib_str, (w - 330, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.45, calib_color, 1, cv2.LINE_AA)

        return display
