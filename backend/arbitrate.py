"""
SteelSight V2 - 3D Synthesis & Metrology Arbitration Engine
- BATCH_DB specification repository
- Cross-view consistency verification (|L_top - L_side| <= 2.0 mm)
- 3D Dimension reconstruction (L, B, H)
- Absolute error margin computation against tolerance specs
- Multi-tier verdict arbitration: PASS, REWORK, REJECT
"""

import os
import json
from typing import Dict, Any, Optional, Tuple

BATCH_DB_FILE = os.path.join(os.path.dirname(__file__), "data", "batches.json")

# Default standard steel billet specifications
DEFAULT_BATCH_DB: Dict[int, Dict[str, Any]] = {
    10: {
        "batch_id": 10,
        "name": "Standard Square Billet 100x25x25",
        "L": 100.0,
        "B": 25.0,
        "H": 25.0,
        "tol": 1.0,  # mm allowable tolerance
        "grade": "IS 2830 / Fe 500D",
    },
    20: {
        "batch_id": 20,
        "name": "Structural Heavy Billet 120x30x30",
        "L": 120.0,
        "B": 30.0,
        "H": 30.0,
        "tol": 1.2,
        "grade": "ASTM A36 Carbon Steel",
    },
    30: {
        "batch_id": 30,
        "name": "Forging Stock Billet 150x40x40",
        "L": 150.0,
        "B": 40.0,
        "H": 40.0,
        "tol": 1.5,
        "grade": "AISI 4140 Alloy Steel",
    },
    42: {
        "batch_id": 42,
        "name": "Reference Calibration Gauge 80x80x80",
        "L": 80.0,
        "B": 80.0,
        "H": 80.0,
        "tol": 0.5,
        "grade": "Tool Steel Reference",
    },
}


class ArbitrationEngine:
    def __init__(self, db_path: str = BATCH_DB_FILE):
        self.db_path = db_path
        self.batch_db: Dict[int, Dict[str, Any]] = {}
        self._load_batches()

    def _load_batches(self):
        """Loads batch definitions from disk or initializes defaults."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.batch_db = {int(k): v for k, v in data.items()}
                    return
            except Exception as e:
                print(f"[ArbitrationEngine] Warning loading batch file: {e}")
        
        # Fallback to default batches and save
        self.batch_db = DEFAULT_BATCH_DB.copy()
        self._save_batches()

    def _save_batches(self):
        """Persists batch database to JSON."""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump(self.batch_db, f, indent=2)
        except Exception as e:
            print(f"[ArbitrationEngine] Error saving batch file: {e}")

    def get_all_batches(self) -> Dict[int, Dict[str, Any]]:
        return self.batch_db

    def get_batch(self, batch_id: int) -> Optional[Dict[str, Any]]:
        return self.batch_db.get(int(batch_id))

    def upsert_batch(self, batch_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates or updates a batch profile."""
        bid = int(batch_id)
        spec = {
            "batch_id": bid,
            "name": data.get("name", f"Batch #{bid}"),
            "L": float(data.get("L", 100.0)),
            "B": float(data.get("B", 25.0)),
            "H": float(data.get("H", 25.0)),
            "tol": float(data.get("tol", 1.0)),
            "grade": data.get("grade", "Standard Steel"),
        }
        self.batch_db[bid] = spec
        self._save_batches()
        return spec

    def arbitrate(
        self,
        batch_id: int,
        top_view: Dict[str, Any],
        side_view: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Arbitrates 3D dimensions and quality verdict from Top & Side measurements.
        
        Parameters:
        - batch_id: int identifier of the billet batch
        - top_view: {'dim1_mm': float, 'dim2_mm': float} (dim1 is L_top, dim2 is B)
        - side_view: {'dim1_mm': float, 'dim2_mm': float} (dim1 is L_side, dim2 is H)
        """
        # Fetch Target Specs from BATCH_DB
        bid = int(batch_id) if batch_id is not None else 10
        spec = self.batch_db.get(bid)
        if not spec:
            # Fallback default target spec if batch_id is unknown
            spec = {
                "batch_id": bid,
                "name": f"Dynamic Batch #{bid}",
                "L": 100.0,
                "B": 25.0,
                "H": 25.0,
                "tol": 1.0,
                "grade": "Generic Steel",
            }

        target_L = spec["L"]
        target_B = spec["B"]
        target_H = spec["H"]
        tol = spec["tol"]

        # Extract measurements
        L_top = float(top_view.get("dim1_mm", 0.0))
        B_meas = float(top_view.get("dim2_mm", 0.0))

        L_side = float(side_view.get("dim1_mm", 0.0))
        H_meas = float(side_view.get("dim2_mm", 0.0))

        # Check cross-view length consistency (|L_top - L_side| <= 2.0 mm)
        length_mismatch = abs(L_top - L_side)
        length_consistent = length_mismatch <= 2.0

        # Synthesize composite 3D measured dimensions
        L_meas = round((L_top + L_side) / 2.0, 2)
        B_meas = round(B_meas, 2)
        H_meas = round(H_meas, 2)

        # Calculate absolute error deltas against target specifications
        dL = round(abs(L_meas - target_L), 2)
        dB = round(abs(B_meas - target_B), 2)
        dH = round(abs(H_meas - target_H), 2)
        max_error = max(dL, dB, dH)

        # Verdict arbitration rules:
        # 1. REJECT if cross-view length mismatch exceeds 2.0 mm
        # 2. PASS if max_error <= tol
        # 3. REWORK if max_error <= tol * 2.0
        # 4. REJECT if max_error > tol * 2.0
        reasons = []
        if not length_consistent:
            verdict = "REJECT"
            reasons.append(f"Cross-view length discrepancy too high: |{L_top:.1f} - {L_side:.1f}| = {length_mismatch:.2f}mm > 2.0mm limit.")
        elif max_error <= tol:
            verdict = "PASS"
            reasons.append(f"All dimensions within allowable tolerance (max error {max_error:.2f}mm <= {tol:.2f}mm).")
        elif max_error <= (tol * 2.0):
            verdict = "REWORK"
            offending = []
            if dL > tol: offending.append(f"Length dL={dL:.2f}mm (tol {tol:.1f}mm)")
            if dB > tol: offending.append(f"Breadth dB={dB:.2f}mm (tol {tol:.1f}mm)")
            if dH > tol: offending.append(f"Height dH={dH:.2f}mm (tol {tol:.1f}mm)")
            reasons.append(f"Minor out-of-tolerance condition: {', '.join(offending)}. Suitable for mechanical re-cut or grinding.")
        else:
            verdict = "REJECT"
            reasons.append(f"Critical dimension out of bounds: Max error {max_error:.2f}mm exceeds 2x tolerance limit ({tol * 2.0:.2f}mm).")

        return {
            "batch_id": bid,
            "batch_name": spec.get("name", f"Batch #{bid}"),
            "grade": spec.get("grade", "Standard Steel"),
            "target": {
                "L": target_L,
                "B": target_B,
                "H": target_H,
                "tol": tol,
            },
            "measured": {
                "L": L_meas,
                "B": B_meas,
                "H": H_meas,
                "L_top": L_top,
                "L_side": L_side,
                "length_mismatch_mm": round(length_mismatch, 2),
            },
            "deltas": {
                "dL": dL,
                "dB": dB,
                "dH": dH,
                "max_error": max_error,
            },
            "cross_view_consistent": length_consistent,
            "verdict": verdict,
            "verdict_reason": " ".join(reasons),
        }
