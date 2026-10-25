# TrojanGuard — Build Progress

> Source of truth: `PROJECT_SPEC.md`
> Updated as each phase completes.

---

## Phases

- [ ] **Phase 1 — Workspace Bootstrap & Project Skeleton**
- [ ] **Phase 2 — Backend Core (FastAPI + SQLite + Schemas)**
- [ ] **Phase 3 — Analysis Pipeline (Static + Behavioral + Network)**
- [ ] **Phase 4 — ML Training & Inference Pipeline**
- [ ] **Phase 5 — Detection & Risk Engine + Demo Scenarios**
- [ ] **Phase 6 — Frontend (Pages + Components + Design System)**
- [ ] **Phase 7 — Integration, Tests & Bug Fixes**
- [ ] **Phase 8 — Documentation, README & Viva Notes**

---

## Phase 1 — Workspace Bootstrap & Project Skeleton

**Goal:** Lay out the full directory tree, config files, and shared boilerplate so every subsequent phase can drop files in without restructuring.

Files created:
```
.gitignore
README.md                        (stub — completed in Phase 8)
backend/requirements.txt
backend/app/__init__.py
backend/app/main.py              (FastAPI app + CORS + router mount stubs)
backend/app/database.py          (SQLite init, table creation)
backend/app/config.py            (central constants: weights, thresholds, seed)
frontend/package.json
frontend/vite.config.js
frontend/tailwind.config.js
frontend/postcss.config.js
frontend/index.html
frontend/src/main.jsx
frontend/src/App.jsx             (router skeleton)
frontend/src/index.css           (design-system tokens)
ml/dataset.csv                   (stub — populated in Phase 4)
```

---

## Phase 2 — Backend Core (FastAPI + SQLite + Schemas)

**Goal:** All four SQLite tables initialized; every required API route returning at least a valid shape; `/api/health` working.

Files created:
```
backend/app/models/__init__.py
backend/app/models/schemas.py    (Pydantic request/response models)
backend/app/models/db_models.py  (SQLAlchemy ORM models or raw DDL)
backend/app/api/__init__.py
backend/app/api/health.py        (GET /api/health)
backend/app/api/dashboard.py     (GET /api/dashboard)
backend/app/api/analysis.py      (POST /api/analyze, GET /api/analysis/{id})
backend/app/api/history.py       (GET /api/history)
backend/app/api/threats.py       (GET /api/threats)
backend/app/api/iocs.py          (GET /api/iocs/{id})
backend/app/api/demo.py          (POST /api/demo/start, GET /api/demo/{id}/events)
backend/app/services/__init__.py
backend/app/services/report.py   (orchestrates full analysis -> DB persistence)
```

---

## Phase 3 — Analysis Pipeline (Static + Behavioral + Network)

**Goal:** Real SHA-256, file-type detection, optional PE metadata, simulated behavior events, simulated network events, and IOC generation all working for any uploaded file.

Files created:
```
backend/app/analysis/__init__.py
backend/app/analysis/static.py          (SHA-256, file size, magic-byte type, pefile PE metadata)
backend/app/analysis/behavioral.py      (simulated process/file/persistence events)
backend/app/analysis/network.py         (simulated connection/DNS telemetry)
backend/app/analysis/ioc.py             (IOC record construction from observed indicators)
backend/app/analysis/feature_extractor.py  (aggregate indicators -> ML feature vector)
```

---

## Phase 4 — ML Training & Inference Pipeline

**Goal:** A reproducible Random Forest trained on synthetic data, saved to `ml/model.pkl`, loaded by the backend, and returning class + probability.

Files created:
```
ml/generate_dataset.py       (synthetic labeled CSV generator, deterministic seed)
ml/dataset.csv               (generated labeled dataset, ~1 000 rows)
ml/train.py                  (train RF, validate features, save model.pkl + scaler.pkl)
ml/model.pkl                 (joblib-serialized RandomForestClassifier)
ml/scaler.pkl                (joblib-serialized StandardScaler if used)
ml/feature_names.json        (ordered list of feature names for consistency)
ml/README.md                 (dataset limitations, how to retrain)
backend/app/ml/__init__.py
backend/app/ml/predictor.py  (load model, predict class + proba, validate feature order)
tests/test_ml.py             (train smoke-test + inference unit test)
```

---

## Phase 5 — Detection & Risk Engine + Demo Scenarios

**Goal:** Transparent rule-based risk scoring with configurable weights; three fully deterministic demo scenarios that flow through the same backend pipeline as live analyses.

Files created:
```
backend/app/services/risk_engine.py   (weighted indicator scoring, 0-100 clamp, evidence list)
backend/app/demo/__init__.py
backend/app/demo/scenarios.py         (3 scenario definitions: feature vectors + seed events)
backend/app/demo/runner.py            (executes scenario -> events -> pipeline -> DB persistence)
tests/test_risk_engine.py             (unit tests for scoring thresholds + evidence output)
tests/test_demo.py                    (each scenario produces expected classification bracket)
```

---

## Phase 6 — Frontend (Pages + Components + Design System)

**Goal:** All five pages built, routed, and styled with the SOC dark theme; all reusable components in place.

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
frontend/src/pages/Dashboard.jsx         (Page A)
frontend/src/pages/SampleAnalysis.jsx    (Page B)
frontend/src/pages/AnalysisResults.jsx   (Page C)
frontend/src/pages/DemoLab.jsx           (Page D)
frontend/src/pages/History.jsx           (Page E)
```

---

## Phase 7 — Integration, Tests & Bug Fixes

**Goal:** Backend and frontend talk to each other end-to-end; all acceptance criteria verified; no nonfunctional buttons.

Files created / modified:
```
backend/app/main.py           (seed demo data on first run if DB empty)
tests/conftest.py             (shared fixtures: temp DB, test client)
tests/test_database.py        (DB init + persistence round-trip)
tests/test_api.py             (HTTP integration tests via TestClient)
frontend/src/services/api.js  (fix any endpoint mismatches found during integration)
```

---

## Phase 8 — Documentation, README & Viva Notes

**Goal:** Complete README, VIVA_NOTES, and a final acceptance-criteria checklist.

Files created:
```
README.md              (full project README per spec section 15)
docs/VIVA_NOTES.md     (12 concise viva Q&A per spec section 15)
docs/ARCHITECTURE.md   (system diagram + data-flow notes)
docs/PROGRESS.md       (this file — marked complete)
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
