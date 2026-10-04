"""
SteelSight V2 - Non-Blocking Metrology Audit Logger
- Excel audit trail logging via openpyxl (inspections_log.xlsx)
- Elegant formatting with status color badges (Green=PASS, Amber=REWORK, Red=REJECT)
- Thread-safe queue & resilient handling for Windows file locks (e.g. open in Excel)
- In-memory inspection cache for instant UI dashboard retrieval
- Export endpoints for .xlsx and .csv downloads
"""

import os
import time
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

LOG_DIR = os.path.join(os.path.dirname(__file__), "data")
EXCEL_PATH = os.path.join(LOG_DIR, "inspections_log.xlsx")
FALLBACK_CSV_PATH = os.path.join(LOG_DIR, "inspections_backup.csv")


class InspectionLogger:
    def __init__(self, excel_path: str = EXCEL_PATH):
        self.excel_path = excel_path
        self.lock = threading.Lock()
        self.recent_records: List[Dict[str, Any]] = []
        self._init_storage()

    def _init_storage(self):
        """Initializes the Excel spreadsheet with styled column headers if not present."""
        os.makedirs(os.path.dirname(self.excel_path), exist_ok=True)
        if not os.path.exists(self.excel_path):
            self._create_new_excel()
        else:
            self._load_recent_from_excel()

    def _create_new_excel(self):
        """Creates a brand new styled inspection log workbook."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Billet Inspections"
        ws.views.sheetView[0].showGridLines = True

        headers = [
            "Record ID",
            "Timestamp",
            "Batch ID",
            "Batch Name",
            "Measured L (mm)",
            "Measured B (mm)",
            "Measured H (mm)",
            "Target L (mm)",
            "Target B (mm)",
            "Target H (mm)",
            "Tol (+/- mm)",
            "dL Error (mm)",
            "dB Error (mm)",
            "dH Error (mm)",
            "Max Error (mm)",
            "Length Delta (mm)",
            "Verdict",
            "Audit Notes"
        ]

        # Style header row
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        ws.append(headers)
        ws.row_dimensions[1].height = 28

        for col_idx, col_name in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        # Auto-adjust column widths
        self._auto_size_columns(ws)

        try:
            wb.save(self.excel_path)
        except Exception as e:
            print(f"[InspectionLogger] Error initializing Excel file: {e}")

    def _load_recent_from_excel(self, max_items: int = 100):
        """Loads existing records from Excel into memory cache."""
        try:
            wb = openpyxl.load_workbook(self.excel_path, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) > 1:
                # Row 0 is headers
                for r in rows[1:]:
                    if r[0] is not None:
                        record = {
                            "id": str(r[0]),
                            "timestamp": str(r[1]),
                            "batch_id": r[2],
                            "batch_name": r[3],
                            "measured": {"L": r[4], "B": r[5], "H": r[6]},
                            "target": {"L": r[7], "B": r[8], "H": r[9], "tol": r[10]},
                            "deltas": {"dL": r[11], "dB": r[12], "dH": r[13], "max_error": r[14]},
                            "length_mismatch_mm": r[15],
                            "verdict": r[16],
                            "verdict_reason": r[17] if len(r) > 17 else "",
                        }
                        self.recent_records.append(record)
                # Keep most recent on top
                self.recent_records = self.recent_records[-max_items:]
        except Exception as e:
            print(f"[InspectionLogger] Notice: Could not read past logs from Excel ({e})")

    def _auto_size_columns(self, ws):
        """Adjusts column widths for readability."""
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or "")
                if len(val) > max_len:
                    max_len = len(val)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    def log(self, arbitration_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Asynchronously / non-blockingly logs an inspection arbitration result.
        Resilient against Windows file locks (PermissionError).
        """
        now = datetime.now()
        record_id = f"STL-{now.strftime('%Y%m%d-%H%M%S')}-{len(self.recent_records) + 1:03d}"
        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")

        batch_id = arbitration_result.get("batch_id")
        batch_name = arbitration_result.get("batch_name", f"Batch #{batch_id}")
        meas = arbitration_result.get("measured", {})
        tgt = arbitration_result.get("target", {})
        deltas = arbitration_result.get("deltas", {})
        verdict = arbitration_result.get("verdict", "UNKNOWN")
        reason = arbitration_result.get("verdict_reason", "")

        record = {
            "id": record_id,
            "timestamp": timestamp_str,
            "batch_id": batch_id,
            "batch_name": batch_name,
            "grade": arbitration_result.get("grade", "Steel"),
            "measured": meas,
            "target": tgt,
            "deltas": deltas,
            "length_mismatch_mm": meas.get("length_mismatch_mm", 0.0),
            "verdict": verdict,
            "verdict_reason": reason,
        }

        # Store in memory immediately
        with self.lock:
            self.recent_records.insert(0, record)
            if len(self.recent_records) > 500:
                self.recent_records.pop()

        # Threaded write to Excel to ensure zero latency for caller
        threading.Thread(target=self._append_to_excel_safe, args=(record,), daemon=True).start()

        return record

    def _append_to_excel_safe(self, record: Dict[str, Any]):
        """Safe thread-locked append with retry logic and file-lock recovery."""
        with self.lock:
            retries = 3
            while retries > 0:
                try:
                    if not os.path.exists(self.excel_path):
                        self._create_new_excel()

                    wb = openpyxl.load_workbook(self.excel_path)
                    ws = wb.active

                    row_data = [
                        record["id"],
                        record["timestamp"],
                        record["batch_id"],
                        record["batch_name"],
                        record["measured"].get("L", 0.0),
                        record["measured"].get("B", 0.0),
                        record["measured"].get("H", 0.0),
                        record["target"].get("L", 0.0),
                        record["target"].get("B", 0.0),
                        record["target"].get("H", 0.0),
                        record["target"].get("tol", 1.0),
                        record["deltas"].get("dL", 0.0),
                        record["deltas"].get("dB", 0.0),
                        record["deltas"].get("dH", 0.0),
                        record["deltas"].get("max_error", 0.0),
                        record.get("length_mismatch_mm", 0.0),
                        record["verdict"],
                        record["verdict_reason"],
                    ]

                    ws.append(row_data)
                    new_row = ws.max_row
                    ws.row_dimensions[new_row].height = 20

                    # Format Verdict cell with colored status badge
                    verdict_cell = ws.cell(row=new_row, column=17)
                    verdict = record["verdict"].upper()
                    
                    if verdict == "PASS":
                        verdict_cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                        verdict_cell.font = Font(name="Calibri", size=10, bold=True, color="166534")
                    elif verdict == "REWORK":
                        verdict_cell.fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
                        verdict_cell.font = Font(name="Calibri", size=10, bold=True, color="854D0E")
                    else:  # REJECT
                        verdict_cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                        verdict_cell.font = Font(name="Calibri", size=10, bold=True, color="991B1B")

                    verdict_cell.alignment = Alignment(horizontal="center", vertical="center")

                    # Center alignment for numeric columns
                    center_align = Alignment(horizontal="center", vertical="center")
                    for c_idx in range(5, 17):
                        ws.cell(row=new_row, column=c_idx).alignment = center_align

                    self._auto_size_columns(ws)
                    wb.save(self.excel_path)
                    return

                except PermissionError:
                    # File is currently open in Microsoft Excel by operator
                    print(f"[InspectionLogger] Excel file locked by user. Retrying in 1s... ({retries} left)")
                    time.sleep(1.0)
                    retries -= 1
                except Exception as e:
                    print(f"[InspectionLogger] Error writing to Excel: {e}")
                    break

            # If all retries failed due to file lock, append to fallback CSV
            self._append_to_fallback_csv(record)

    def _append_to_fallback_csv(self, record: Dict[str, Any]):
        """Fallback CSV appender when Excel workbook is permanently locked by Excel GUI."""
        try:
            needs_header = not os.path.exists(FALLBACK_CSV_PATH)
            with open(FALLBACK_CSV_PATH, "a", encoding="utf-8") as f:
                if needs_header:
                    f.write("Record_ID,Timestamp,Batch_ID,Measured_L,Measured_B,Measured_H,Target_L,Target_B,Target_H,Tol,Max_Error,Verdict,Notes\n")
                f.write(
                    f"{record['id']},{record['timestamp']},{record['batch_id']},"
                    f"{record['measured'].get('L')},{record['measured'].get('B')},{record['measured'].get('H')},"
                    f"{record['target'].get('L')},{record['target'].get('B')},{record['target'].get('H')},"
                    f"{record['target'].get('tol')},{record['deltas'].get('max_error')},"
                    f"{record['verdict']},\"{record['verdict_reason']}\"\n"
                )
        except Exception as e:
            print(f"[InspectionLogger] Fallback CSV write error: {e}")

    def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns the most recent inspection records."""
        with self.lock:
            return list(self.recent_records[:limit])

    def get_excel_bytes(self) -> bytes:
        """Reads the Excel file into memory for download."""
        with self.lock:
            if os.path.exists(self.excel_path):
                with open(self.excel_path, "rb") as f:
                    return f.read()
            return b""

    def get_csv_export(self) -> str:
        """Generates a CSV string representation of all recent records."""
        lines = [
            "Record ID,Timestamp,Batch ID,Batch Name,Measured L (mm),Measured B (mm),Measured H (mm),Target L (mm),Target B (mm),Target H (mm),Tolerance (mm),Max Error (mm),Verdict,Audit Notes"
        ]
        with self.lock:
            for r in self.recent_records:
                m = r.get("measured", {})
                t = r.get("target", {})
                d = r.get("deltas", {})
                reason = r.get("verdict_reason", "").replace('"', '""')
                line = (
                    f"{r.get('id')},{r.get('timestamp')},{r.get('batch_id')},\"{r.get('batch_name')}\","
                    f"{m.get('L', '')},{m.get('B', '')},{m.get('H', '')},"
                    f"{t.get('L', '')},{t.get('B', '')},{t.get('H', '')},{t.get('tol', '')},"
                    f"{d.get('max_error', '')},{r.get('verdict')},\"{reason}\""
                )
                lines.append(line)
        return "\n".join(lines)
