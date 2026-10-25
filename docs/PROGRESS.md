# TrojanGuard — Build Progress

> Source of truth: `PROJECT_SPEC.md` + amendments agreed 2026-10-25.
> Updated as each phase completes.

---

## Amendments (2026-10-25)

1. **Python venv**: try 3.14 first; fall back to 3.12 (via uv/pyenv) if
   numpy/pandas/scikit-learn/joblib/pefile fail. Note reason in README.
   Pin exact versions. Add `python-multipart`, `pytest`, `httpx`.
2. **Phase 2 scope reduced**: only `database.py`, Pydantic schemas, and
   `GET /api/health` + `tests/test_database.py`. No stub endpoints.
   Each endpoint lives in the phase that implements its real logic.
3. **Seed data**: `analysis_source="seed_demo"`, labelled "Demonstration
   data" in UI. Dashboard numbers always come from SQL queries.
4. **Tailwind CSS**: v4 with `@tailwindcss/vite` plugin + `@theme` tokens
   in CSS. Verified against Vite + Node 24 in Phase 1.
5. **New phases inserted** (after Phase 5, before frontend):
   - **Phase 5b** — Real-model on CIC-MalMem-2022: `ml/real/prepare.py`,
     `ml/real/train_real.py`, `metrics_real.json`, endpoints
     `GET /api/model/real/metrics` and `POST /api/model/real/predict`.
     Suspicious = probability band [0.35, 0.65].
6. **Demo classification rule**: final demo classification comes from the
   risk engine's rules on the fixed feature vector. ML prediction shown
   separately as "classifier output". Disagreements documented in both
   `risk_engine.py` docstrings and README.
7. **Upload safety** (`static.py`): 10 MB hard limit, read into memory,
   never write to disk, never execute, never import/eval.
8. **Single pipeline function** in `services/pipeline.py`:
   features → classifier → risk engine → evidence → persist.
   Both `/api/analyze` and the demo runner call it. No separate paths.
9. **Git commit after each phase** with documented commit message.

---

## Phases

- [ ] **Phase 1 — Workspace Bootstrap & Project Skeleton**
- [ ] **Phase 2 — Database, Schemas & /api/health**
- [ ] **Phase 3 — Analysis Pipeline (Static + Behavioral + Network)**
- [ ] **Phase 4 — ML Training & Inference Pipeline (synthetic)**
- [ ] **Phase 5 — Detection & Risk Engine + Demo Scenarios**
- [ ] **Phase 5b — Real-data Model (CIC-MalMem-2022)**
- [ ] **Phase 6 — Frontend (Pages + Components + Design System)**
- [ ] **Phase 7 — Integration, Tests & Bug Fixes**
- [ ] **Phase 8 — Documentation, README & Viva Notes**

---

## Phase 1 — Workspace Bootstrap & Project Skeleton

**Goal:** Full directory tree, Python venv (3.14 or 3.12), frontend deps
installed, config files in place, git initialised. No application logic yet.

Files created:
```
.gitignore
README.md                          (stub)
backend/requirements.txt           (pinned exact versions)
backend/app/__init__.py
backend/app/main.py                (FastAPI app + CORS + router mount stubs)
backend/app/database.py            (SQLite init + 4-table DDL with FK support)
backend/app/config.py              (weights, thresholds, seed=42, paths)
frontend/package.json
frontend/vite.config.js
frontend/index.html
frontend/src/main.jsx
frontend/src/App.jsx               (router skeleton — react-router-dom)
frontend/src/index.css             (Tailwind v4 @import + @theme tokens)
ml/data/raw/.gitkeep               (placeholder for CIC-MalMem-2022 CSV)
ml/real/.gitkeep
```

---

## Phase 2 — Database, Schemas & /api/health

**Goal:** All four SQLite tables initialized with FK enforcement; Pydantic
schemas for all domain objects; `GET /api/health` returning real status;
`tests/test_database.py` covering persistence and FK constraints.

Files created:
```
backend/app/models/__init__.py
backend/app/models/schemas.py       (Pydantic v2 models)
backend/app/api/__init__.py
backend/app/api/health.py           (GET /api/health)
tests/__init__.py
tests/conftest.py                   (shared fixtures: tmp DB path, test client)
tests/test_database.py              (init, round-trip, FK enforcement)
```

---

## Phase 3 — Analysis Pipeline (Static + Behavioral + Network)

**Goal:** Real SHA-256, 10 MB upload guard, magic-byte file-type detection,
optional PE metadata, simulated behavioral + network events, IOC construction,
feature vector extraction — all callable as pure functions.

Files created:
```
backend/app/analysis/__init__.py
backend/app/analysis/static.py          (SHA-256, size guard, magic, pefile)
backend/app/analysis/behavioral.py      (simulated process/file/persistence events)
backend/app/analysis/network.py         (simulated connection/DNS telemetry)
backend/app/analysis/ioc.py             (IOC record construction)
backend/app/analysis/feature_extractor.py  (indicators -> feature dict)
backend/app/services/__init__.py
backend/app/services/pipeline.py        (THE single pipeline function)
```

---

## Phase 4 — ML Training & Inference Pipeline (synthetic)

**Goal:** Reproducible Random Forest on synthetic data; model loadable by
backend predictor; feature names locked in JSON.

Files created:
```
ml/generate_dataset.py          (synthetic CSV, seed=42, ~1 000 rows)
ml/dataset.csv
ml/train.py                     (train RF, save artifacts)
ml/model.pkl
ml/feature_names.json           (ordered feature list)
ml/README.md                    (limitations + retrain instructions)
backend/app/ml/__init__.py
backend/app/ml/predictor.py     (load model, predict class + proba)
tests/test_ml.py                (smoke-test train + inference)
```

---

## Phase 5 — Detection & Risk Engine + Demo Scenarios + Core API

**Goal:** Risk engine with configurable weights; three deterministic demo
scenarios; single pipeline wired to `POST /api/analyze`,
`POST /api/demo/start`, `GET /api/demo/{id}/events`; dashboard and history
endpoints backed by real SQL.

Files created:
```
backend/app/services/risk_engine.py   (weighted scoring, evidence list)
backend/app/demo/__init__.py
backend/app/demo/scenarios.py         (3 scenario definitions)
backend/app/demo/runner.py            (scenario -> pipeline -> DB)
backend/app/api/dashboard.py          (GET /api/dashboard — real SQL)
backend/app/api/analysis.py           (POST /api/analyze, GET /api/analysis/{id})
backend/app/api/history.py            (GET /api/history)
backend/app/api/threats.py            (GET /api/threats)
backend/app/api/iocs.py               (GET /api/iocs/{id})
backend/app/api/demo.py               (POST /api/demo/start, GET /api/demo/{id}/events)
tests/test_risk_engine.py
tests/test_demo.py
tests/test_api.py                     (partial — grows in Phase 7)
```

---

## Phase 5b — Real-data Model (CIC-MalMem-2022)

**Goal:** Second RF trained on real memory-forensics features; separate venv;
metrics recorded; two new endpoints exposed.

Prerequisites: user places CIC-MalMem-2022 CSV in `ml/data/raw/`.

Files created:
```
ml/real/requirements_real.txt         (separate deps for real training)
ml/real/prepare.py                    (load CSV, select features, train/test split)
ml/real/train_real.py                 (train RF, save ml/real/model_real.pkl)
ml/real/metrics_real.json             (accuracy, precision, recall, F1,
                                       confusion matrix, top-15 importances)
ml/real/feature_names_real.json
backend/app/ml/real_predictor.py      (load real model, predict with band logic)
backend/app/api/model.py              (GET /api/model/real/metrics,
                                       POST /api/model/real/predict)
```

---

## Phase 6 — Frontend (Pages + Components + Design System)

**Goal:** All five pages + Model Evaluation page; all reusable components;
SOC dark theme consistent throughout.

Files created:
```
frontend/src/services/api.js
frontend/src/components/Sidebar.jsx
frontend/src/components/Header.jsx
frontend/src/components/StatCard.jsx
frontend/src/components/SeverityBadge.jsx
frontend/src/components/RiskGauge.jsx
frontend/src/components/LoadingState.jsx
frontend/src/components/EmptyState.jsx
frontend/src/components/ErrorState.jsx
frontend/src/components/IocList.jsx
frontend/src/components/EventTimeline.jsx
frontend/src/components/EventStream.jsx
frontend/src/components/AnalysisTable.jsx
frontend/src/charts/ThreatDistributionChart.jsx
frontend/src/charts/NetworkActivityChart.jsx
frontend/src/charts/DetectionTimeline.jsx
frontend/src/pages/Dashboard.jsx            (Page A)
frontend/src/pages/SampleAnalysis.jsx       (Page B)
frontend/src/pages/AnalysisResults.jsx      (Page C)
frontend/src/pages/DemoLab.jsx              (Page D — highest priority)
frontend/src/pages/History.jsx              (Page E)
frontend/src/pages/ModelEvaluation.jsx      (Phase 5b real model)
```

---

## Phase 7 — Integration, Tests & Bug Fixes

**Goal:** End-to-end verification; all 15 acceptance criteria tested.

Files created / modified:
```
tests/test_database.py     (extended)
tests/test_api.py          (full integration suite)
backend/app/main.py        (seed demo data on first run if DB empty)
```

---

## Phase 8 — Documentation, README & Viva Notes

Files created:
```
README.md               (complete per spec §15)
docs/VIVA_NOTES.md      (12 Q&A)
docs/ARCHITECTURE.md    (system diagram + data-flow)
docs/PROGRESS.md        (this file — marked complete)
```

---

## Acceptance Criteria Checklist

*(Filled in after Phase 7)*

| # | Criterion | Tested |
|---|-----------|--------|
| 1 | Backend starts successfully | [ ] |
| 2 | Frontend starts successfully | [ ] |
| 3 | `/api/health` returns 200 | [ ] |
| 4 | Dashboard metrics load from backend | [ ] |
| 5 | All three demo scenarios can be started | [ ] |
| 6 | Each scenario produces timestamped events | [ ] |
| 7 | Each scenario returns deterministic classification + risk | [ ] |
| 8 | Completed demo stored in SQLite | [ ] |
| 9 | Results page shows evidence, events, risk, IOCs | [ ] |
| 10 | History loads saved analyses | [ ] |
| 11 | ML training + inference demonstrated | [ ] |
| 12 | SHA-256 computed; file never executed | [ ] |
| 13 | Errors + empty states do not crash app | [ ] |
| 14 | README complete | [ ] |
| 15 | No nonfunctional buttons / static placeholders | [ ] |
