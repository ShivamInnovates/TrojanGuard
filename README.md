# TrojanGuard

**TrojanGuard: AI-Powered Trojan Detection, Prediction & Behavioral Analysis System**

> Academic demonstration project — Network Security, Defensive Cybersecurity, Explainable ML.
> **This is a prototype. It does not execute uploaded files, contact external systems, or implement any offensive capability.**

---

*Full README written in Phase 8. See `docs/PROGRESS.md` for build status.*

## Quick start (after full build)

```bash
# Backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm run dev

# ML training
cd ml && python train.py
```

## Python environment

**Python 3.12.15** (managed via `uv`).

Python 3.14 was attempted first. `numpy==2.2.5` has no pre-built wheel for CPython 3.14
and failed to compile from source (`ninja` build error in `x86-simd-sort`).
Switched to Python 3.12.15 via `uv python install 3.12`; all packages installed
from pre-built wheels in ~10 seconds.

