# TrojanGuard — System Architecture & Data Flow

This document details the architectural design, component interactions, security boundaries, and end-to-end data pipelines within the TrojanGuard system.

---

## 1. High-Level Architectural Overview

TrojanGuard is structured into five distinct operational tiers:

```
+-------------------------------------------------------------------------------+
|                                PRESENTATION TIER                              |
|   React 18 + Vite SPA, Tailwind CSS Design System, Lucide React Iconography   |
|   Pages: Dashboard (/), Analyze (/analyze), Demo Lab (/demo), History, Model  |
+-------------------------------------------------------------------------------+
                                      │ ▲  HTTP / REST JSON
                                      ▼ │  (Vite Proxy :5173 -> :8001)
+-------------------------------------------------------------------------------+
|                                  API TIER                                     |
|   FastAPI Application (app.main), CORS Middleware, Pydantic v2 Serialization  |
|   Endpoints: /api/health, /api/analyze, /api/demo/*, /api/model/*, /api/history|
+-------------------------------------------------------------------------------+
                                      │ ▲
                                      ▼ │
+-------------------------------------------------------------------------------+
|                             PIPELINE & CORE LOGIC                             |
|   Safe In-Memory Static Parser, Scenario Telemetry Generator, ML Predictor,   |
|   Heuristic Risk Scoring Engine (100 Pts), Decision & Arbitration Matrix      |
+-------------------------------------------------------------------------------+
                 │                                                ▲
                 ▼                                                │
+---------------------------------+              +------------------------------+
|        PERSISTENCE TIER         |              |       MACHINE LEARNING       |
|   SQLite 3 with WAL Mode        |              |  Random Forest Classifiers   |
|   Tables: analyses, behavior,   |              |  - Synthetic (9 Features)    |
|   network, iocs                 |              |  - CIC-MalMem-2022 (51 Feat) |
+---------------------------------+              +------------------------------+
```

---

## 2. End-to-End Data Flow Pipeline

The unified detection pipeline follows a deterministic data flow from raw input to stored intelligence:

```
[ Uploaded PE / Binary ]        [ Demo Lab Scenario Choice ]
           │                                 │
           ▼                                 ▼
   static.analyze_bytes()          scenarios.get_scenario_telemetry()
   - SHA-256 calculation           - Simulated Process Events
   - PE header inspection          - Registry Persistence Events
   - Shannon section entropy       - Memory Injection Events
   - Import Address Table (IAT)    - RFC 5737 Outbound C2 Beacons
           │                                 │
           └────────────────┬────────────────┘
                            ▼
           feature_extractor.extract_features()
           - 9-dimensional normalized feature vector
           - observed_mask boolean array (1=observed, 0=unobserved)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      predictor.predict()         risk_engine.calculate_risk_score()
      - Random Forest inference   - Static evidence points (+0 to +34)
      - Class probability & conf  - Behavioral evidence points (+0 to +46)
      - Telemetry applicability   - Network evidence points (+0 to +20)
              │                           │
              └─────────────┬─────────────┘
                            ▼
              arbitration.arbitrate()
              - Priority 1: Trojan-like (Score >=80 OR Persistence+Beacon)
              - Priority 2: Suspicious (Score >=40 OR Entropy>7.0 OR Imports>=3)
              - Priority 3: Benign (Default fallback)
              - Guardrail: Static upload cannot exceed 'Suspicious'
              - Evaluate Classifier Agreement & Document Rationale
                            │
                            ▼
              repository.insert_analysis()
              - Atomic SQLite transaction (PRAGMA foreign_keys = ON)
              - Insert into `analyses` (generates analysis_id)
              - Batch insert child records into `behavior_events`
              - Batch insert child records into `network_events`
              - Batch insert extracted indicators into `iocs`
                            │
                            ▼
              FastAPI Route Handler
              - Serializes to AnalysisReport Pydantic schema
                            │
                            ▼
              React UI Presentation
              - Renders Gauge, Evidence Breakdown, Telemetry Tabs, IOC Badges
```

---

## 3. Component Breakdown

### 3.1 Ingestion & Static Analysis Engine (`app/analysis/static.py`)
- **Memory Safety**: Uses `UploadFile.read()` into an in-memory buffer.
- **Crypto Hashing**: Direct streaming through Python `hashlib.sha256()`.
- **Entropy Analysis**: Calculates byte-frequency distribution across 256 possible byte values:
  $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
  Sections with $H(X) > 7.0$ trigger packing/encryption alerts.
- **PE Header Parsing**: Invokes `pefile.PE(data=bytes, fast_load=True)`. Safely extracts section names, virtual sizes, and checks the Import Address Table against high-risk Windows APIs (`VirtualAllocEx`, `WriteProcessMemory`, `CreateRemoteThread`, `InternetOpenA`, `RegSetValueExA`).

### 3.2 Simulation Engine (`app/demo/scenarios.py`)
- Emulates realistic malware telemetry across three deterministic scenarios:
  1. `normal`: Emulates benign background Windows services (`svchost.exe`, `explorer.exe`).
  2. `suspicious`: Emulates obfuscated script execution (`powershell.exe -enc`) and packed headers.
  3. `trojan`: Multi-stage kill-chain simulation (Registry RunKey persistence, memory injection, outbound C2 beaconing).
- Uses reserved RFC 5737 IP ranges (`192.0.2.0/24`, `198.51.100.0/24`) to ensure simulation traffic can never route over the public Internet.

### 3.3 Feature Extraction & Telemetry Masking (`app/analysis/feature_extractor.py`)
- Bridges raw inspection data with statistical models.
- Generates an `observed_mask` flag for each feature:
  - When analyzing uploaded files without dynamic execution, host and network telemetry features are marked unobserved (`observed_mask[i] = 0`).
  - This prevents the ML predictor from fabricating false certainty when dynamic data is absent.

### 3.4 Heuristic Scoring & Rule Arbitration (`app/services/risk_engine.py`)
- Calculates cumulative threat points across 8 distinct signals.
- Disagreement Arbitration: The rule matrix acts as a deterministic safety supervisor. If a machine learning model outputs "Benign" for a sample exhibiting both Registry persistence and C2 beaconing, the rule matrix forces the final classification to `Trojan-like`, flags `classifier_agrees: false`, and documents `classifier_disagreement_reason: "High risk score (>=80) or dual presence of persistence and C2 beaconing overrides model output."`

### 3.5 Persistence Layer (`app/database.py`, `app/services/repository.py`)
- SQLite 3 running in Write-Ahead Logging (`WAL`) mode to support concurrent read and write operations without database locking.
- Normalized across 4 tables with `ON DELETE CASCADE` foreign keys.
- Search indexing on `sha256`, `timestamp`, `classification`, and `risk_score` ensures sub-millisecond query response on dashboards and historical records.

---

## 4. Security & Safety Boundaries

```
[ EXTERNAL WORLD / UNTRUSTED FILE ]
               │
═══════════════╪═════════════════════════════════════════════════════ (Boundary 1: Upload Limiter)
               ▼
       10 MB File Size Filter (HTTP 413 rejection)
               │
═══════════════╪═════════════════════════════════════════════════════ (Boundary 2: Memory Isolation)
               ▼
       In-Memory Byte Inspection (BytesIO)
       - 0 calls to subprocess / os.system
       - 0 calls to eval / exec / pickle.loads
       - 0 execution permissions on disk
               │
═══════════════╪═════════════════════════════════════════════════════ (Boundary 3: Network Isolation)
               ▼
       RFC 5737 Documentation IP Address Ranges
       - Zero outbound socket connections to external Internet
       - Purely simulated telemetry
```
