# TrojanGuard

**TrojanGuard: AI-Powered Trojan Detection, Prediction & Behavioral Analysis System**

> Academic demonstration project — Network Security, Defensive Cybersecurity, Explainable ML.
> **This is a prototype. It does not execute uploaded files, contact external systems, or implement any offensive capability.**

---

*Full README written in Phase 8. See `docs/PROGRESS.md` for build status.*

## Setup and Execution Commands

### Backend Setup & Execution
```bash
cd backend
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Run server (default port 8000, or BACKEND_PORT=8001 if port 8000 is occupied)
uvicorn app.main:app --port 8000
# or if port 8000 is busy:
# BACKEND_PORT=8001 uvicorn app.main:app --port 8001
```

### Frontend Setup & Execution
```bash
cd frontend
npm install

# Run frontend dev server (configured to proxy /api to BACKEND_PORT, default 8000)
# If using a custom backend port: BACKEND_PORT=8001 npm run dev
npm run dev
```

### ML Training
```bash
cd ml && python train.py
```

## Python environment

**Python 3.12.15** (managed via `uv`).

Python 3.14 was attempted first. `numpy==2.2.5` has no pre-built wheel for CPython 3.14
and failed to compile from source (`ninja` build error in `x86-simd-sort`).
Switched to Python 3.12.15 via `uv python install 3.12`; all packages installed
from pre-built wheels in ~10 seconds.

