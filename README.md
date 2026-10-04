# SteelSight V2 — Computer Vision Dimensional Metrology & Quality Control

**SteelSight V2** is a lightweight, industrial computer vision inspection system built for dimensional metrology and automated quality control of steel billets. Operating on Windows with a single overhead camera, it utilizes sequential snapshot acquisition (**Top View**, then **Side View** after a 90° flip) to synthesize full 3D dimensions ($L \times B \times H$) and perform automated tolerance arbitration.

---

## Key System Highlights

- **Threaded DirectShow Acquisition:** Non-blocking background capture loop with minimal buffer lag (`cv2.CAP_DSHOW`), maintaining high FPS.
- **Dynamic ArUco Calibration & Masking:** Employs OpenCV's modern `cv2.aruco.ArucoDetector` (`DICT_4X4_50`) to locate Reference Tag #42 ($80.0 \times 80.0\text{ mm}$), dynamically compute $\text{px\_per\_mm}$, extract secondary batch tags (e.g. ID 10), and mask all markers with solid black polygons (`cv2.fillPoly`).
- **Precision Metrology Engine:** Fits oriented minimum bounding rectangles (`cv2.minAreaRect`) on preprocessed billet contours to extract millimeter dimensions independent of billet orientation.
- **3D Metrology Synthesis & Arbitration:** Cross-checks $|L_{\text{top}} - L_{\text{side}}| \le 2.0\text{ mm}$, calculates absolute error margins against `BATCH_DB`, and assigns quality verdicts:
  - <span style="color: #10b981; font-weight: bold;">PASS</span>: Max error $\le$ allowable tolerance.
  - <span style="color: #f59e0b; font-weight: bold;">REWORK</span>: Max error is between tolerance and $2\times$ tolerance (e.g., minor shear burr or re-cut needed).
  - <span style="color: #ef4444; font-weight: bold;">REJECT</span>: Max error $> 2\times$ tolerance or cross-view length mismatch ($> 2.0\text{ mm}$).
- **Non-Blocking Excel Audit Logger:** Asynchronously writes every inspection record to `inspections_log.xlsx` with colored status badges, handling Windows file locks gracefully.
- **Interactive Operator Dashboard:** React + Tailwind CSS single-page interface with live MJPEG stream, 3D isometric billet visualizer, sequential stepper, and Excel/CSV download buttons.
- **Virtual Simulation Test Bench:** Integrated synthetic billet generator with ArUco ID 42 & ID 10 cards, allowing instant demonstration and testing on any PC without physical fixtures.

---

## Architecture & Directory Structure

```
d:\Games\Project\
├── backend/
│   ├── data/
│   │   ├── batches.json              # Persistent BATCH_DB specifications
│   │   ├── inspections_log.xlsx      # Formatted Excel audit trail
│   │   └── inspections_backup.csv    # Lock-resilient backup log
│   ├── static/
│   │   ├── marker_42_80mm.png        # Printable ArUco ID 42 calibration card
│   │   └── marker_10_batch.png       # Printable ArUco ID 10 batch card
│   ├── arbitrate.py                  # 3D synthesis, consistency checks, and verdicts
│   ├── camera.py                     # Threaded CameraManager & Simulation generator
│   ├── logger.py                     # Non-blocking openpyxl Excel audit logger
│   ├── main.py                       # FastAPI application & endpoints
│   ├── marker_gen.py                 # ArUco marker card renderer with mm scale
│   ├── vision.py                     # VisionEngine (ArUco, masking, minAreaRect)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuditLogTable.jsx     # Log table with search and Excel/CSV export
│   │   │   ├── BatchConfigModal.jsx  # BATCH_DB editor modal
│   │   │   ├── BilletVisualizer.jsx  # Interactive 3D isometric SVG model
│   │   │   ├── CameraSettingsModal.jsx # DirectShow / Simulation settings
│   │   │   ├── Header.jsx            # Telemetry status bar
│   │   │   ├── InspectionWorkflow.jsx# Sequential 3-step capture pipeline
│   │   │   ├── LiveStream.jsx        # MJPEG video feed with HUD reticles
│   │   │   ├── PrintMarkersModal.jsx # Printable markers viewer & download
│   │   │   ├── RealTimeInspectionCard.jsx # Verdict badges & metrology matrix
│   │   │   └── SnapshotModal.jsx     # High-resolution audit snapshot viewer
│   │   ├── App.jsx                   # Main application state and layout
│   │   ├── index.css                 # Industrial dark theme & Tailwind styles
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## Prerequisites & Installation

### 1. Backend Setup (Python 3.10+)

Open a terminal (PowerShell or Command Prompt) and install dependencies:

```powershell
# Navigate to project root
cd d:\Games\Project

# Install Python requirements
pip install fastapi uvicorn opencv-contrib-python numpy pandas openpyxl pydantic
```

### 2. Frontend Setup (Node.js 18+)

```powershell
cd d:\Games\Project\frontend
npm install
```

---

## Running the Servers

### Step 1: Start the FastAPI Backend

Run from the project root directory:

```powershell
cd d:\Games\Project
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at `http://127.0.0.1:8000`. You can test the health endpoint at `http://127.0.0.1:8000/`.

### Step 2: Start the Vite Frontend Dev Server

In a second terminal window:

```powershell
cd d:\Games\Project\frontend
npm run dev
```

Open your browser and navigate to:
**`http://127.0.0.1:5173/`**

---

## Operating Instructions & Inspection Workflow

### 1. Calibration Setup (Physical Camera Mode)
1. In the header bar, click **"Print Tags"** to view and download the official ArUco marker cards:
   - **ID 42:** Reference Tag ($80.0 \times 80.0\text{ mm}$).
   - **ID 10:** Batch Identifier Tag ($50.0 \times 50.0\text{ mm}$).
2. Print both cards at **100% scale** (without page scaling).
3. Place Tag #42 anywhere within the camera's field of view. The status bar will show <span style="color: #10b981; font-weight: bold;">CALIB: OK (~px/mm)</span>.

### 2. Virtual Simulation Test Bench Mode
If testing without a physical camera or steel billet:
1. Click **"Settings"** in the top navigation and select **"Virtual Test Bench"**.
2. An overhead industrial inspection bed will be synthesized in real time with ArUco ID 42, Batch ID 10, and a realistic steel billet.
3. Use the quick test buttons on the video stream panel:
   - **Nominal (PASS):** Billet dimensions set to $100.2 \times 25.1\text{ mm}$ (within $\pm 1.0\text{ mm}$ tolerance).
   - **Shear Burr (REWORK):** Length set to $101.6\text{ mm}$ ($+1.6\text{ mm}$ delta, triggers REWORK).
   - **Over-length (REJECT):** Length set to $104.5\text{ mm}$ ($+4.5\text{ mm}$ delta, triggers REJECT).

### 3. Sequential Snapshot Inspection Flow
1. **Capture Top View:** Align the steel billet. Click **"Capture Top View"**. The metrology engine masks ArUco tags, fits `minAreaRect`, and computes $L_{\text{top}}$ and $B$ (Breadth).
2. **Rotate 90° & Capture Side View:** Flip or rotate the billet 90°. Click **"Capture Side View (Flip 90°)"**. The engine extracts $L_{\text{side}}$ and $H$ (Height).
3. **Run 3D Arbitration:** Click **"Run 3D Arbitration"**. The system performs:
   - Cross-camera length consistency check: $|L_{\text{top}} - L_{\text{side}}| \le 2.0\text{ mm}$.
   - Delta computation against target specifications: $dL, dB, dH$.
   - Quality verdict: `PASS`, `REWORK`, or `REJECT`.
   - Automatic non-blocking write to `inspections_log.xlsx`.

### 4. Viewing and Exporting Audit Logs
- The **Audit Log Table** at the bottom of the dashboard displays all historical records with timestamp, batch ID, measured vs target values, and color-coded status badges.
- Click **"Export Excel (.xlsx)"** to download the formatted Excel workbook.
- Click **"Export CSV"** for text-based data integration.

---

## API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stream` | Multipart JPEG video stream (`multipart/x-mixed-replace; boundary=frame`) |
| `GET` | `/api/status` | System health, FPS counter, calibration scale, active batch in FOV |
| `POST` | `/api/measure` | Captures snapshot & returns `{view_type, batch_id, dim1_mm, dim2_mm, px_per_mm}` |
| `POST` | `/api/arbitrate` | Performs 3D synthesis, consistency verification, tolerance verdict & logs to Excel |
| `GET` | `/api/logs` | Fetches recent inspection records for the dashboard table |
| `GET` | `/api/logs/export/excel` | Downloads `inspections_log.xlsx` workbook |
| `GET` | `/api/logs/export/csv` | Downloads comma-separated CSV log |
| `GET` | `/api/batches` | Retrieves all configured batch specifications in `BATCH_DB` |
| `POST` | `/api/batches` | Adds or updates a batch target specification |
| `POST` | `/api/camera/config` | Switches DirectShow camera index or toggles simulation mode |
| `POST` | `/api/simulation/billet` | Updates synthetic billet parameters for testing |
| `GET` | `/api/markers/{id}` | Generates high-res printable ArUco marker PNG with millimeter scale |

---

## Quality Verdict Decision Matrix

$$\Delta_{\text{max}} = \max\left(|L_{\text{meas}} - L_{\text{tgt}}|, |B_{\text{meas}} - B_{\text{tgt}}|, |H_{\text{meas}} - H_{\text{tgt}}|\right)$$

$$\Delta_L = |L_{\text{top}} - L_{\text{side}}|$$

| Condition | Verdict | Engineering Action |
|---|---|---|
| $\Delta_L > 2.0\text{ mm}$ | **REJECT** | Severe profile distortion or measurement misalignment across cameras. Quarantine part. |
| $\Delta_{\text{max}} \le \text{Tolerance}$ | **PASS** | Billet conforms to all dimensional specifications. Approved for downstream processing. |
| $\text{Tolerance} < \Delta_{\text{max}} \le (2 \times \text{Tolerance})$ | **REWORK** | Minor out-of-spec condition (e.g. shear burr, cut variance). Route to grinding/saw station. |
| $\Delta_{\text{max}} > (2 \times \text{Tolerance})$ | **REJECT** | Critical dimensional failure. Scrap or re-melt. |
