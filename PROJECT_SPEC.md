 MASTER PROJECT PROMPT — TROJANGUARD

Act as a senior full-stack engineer, defensive cybersecurity engineer, machine-learning engineer, and UI/UX designer. Help me build a complete, runnable college Network Security project within **2–3 days**.

Do not merely explain how to build it. Implement the application in the available workspace, create the actual files, run tests where possible, fix errors, and leave me with a working project.

## 1. Project identity

**Name:** TrojanGuard

**Full title:** TrojanGuard: AI-Powered Trojan Detection, Prediction & Behavioral Analysis System

**Category:** Network Security, Defensive Cybersecurity, Explainable Machine Learning.

**Problem statement:** Security analysts need a way to identify Trojan-like indicators, inspect behavioral and network evidence, prioritize suspicious activity, and understand why a sample was flagged.

**Solution:** Build an educational defensive security dashboard that combines safe static file metadata analysis, simulated behavioral telemetry, simulated network activity, a Random Forest demonstration classifier, explainable risk scoring, IOC display, and SQLite-backed analysis history.

This is a prototype for an academic demonstration, not a production antivirus product.

## 2. Time and scope constraints

I have only 2–3 days. Optimize for:
1. A professional, visually impressive frontend.
2. A fully working end-to-end demo.
3. A functioning FastAPI backend.
4. Persistent SQLite storage.
5. A real, reproducible ML training and inference pipeline.
6. Clear, explainable results suitable for a college viva.
7. Simple local setup on Linux.

Do not overengineer. Avoid Docker, Kubernetes, Redis, PostgreSQL, cloud services, complex microservices, multiple unnecessary models, or paid APIs.

Make reasonable implementation decisions without repeatedly asking me questions. If a feature threatens the deadline, implement a simple working version and document the limitation.

## 3. Mandatory technology stack

Frontend:
- React
- Vite
- Tailwind CSS
- Recharts
- Lucide icons
- Fetch API or a small API client

Backend:
- Python
- FastAPI
- Uvicorn
- Pydantic

Data:
- SQLite
- SQLAlchemy if useful, otherwise straightforward SQLite access

ML and analysis:
- scikit-learn
- pandas
- NumPy
- joblib
- hashlib for SHA-256
- Python standard libraries
- pefile only for safe PE metadata inspection when installed

Use compatible, stable package versions and record them in dependency files.

## 4. Safety requirements

This must remain a defensive project.

DO NOT implement or provide:
- A functional Trojan, RAT, credential stealer, or destructive payload.
- A command-and-control server.
- Malware deployment or propagation.
- Real unauthorized persistence or system modification.
- Evasion, stealth, or antivirus bypass.
- Execution of uploaded samples.
- Automatic execution of binaries or scripts.
- Real attacks against external systems.

Instead:
- Simulate all process, file, persistence-like, DNS, and network events.
- Use fictional sample names and clearly labeled synthetic telemetry.
- Never execute uploaded files.
- Treat uploaded files as untrusted data.
- Limit file size, validate file type and content, and calculate hashes safely.
- Use simulated IOCs in demo scenarios and clearly label them.
- Do not connect to actual command-and-control infrastructure.
- Avoid storing uploaded binaries unnecessarily; process them safely in memory where practical.
- Return understandable validation errors.

For this deadline, do not build a real malware sandbox.

## 5. Required application pages

### Page A: Security Dashboard

Create a dark, professional SOC-style dashboard.

Include:
- Total samples analyzed.
- Benign, suspicious, and Trojan-like classifications.
- High and critical risk counts.
- Average risk score.
- Threat distribution chart.
- Network activity chart.
- Detection timeline.
- Recent analysis table.
- Risk severity badges.
- Sidebar navigation.
- Refresh and loading indicators.
- Responsive layout.
- Empty states and error states.

Dashboard statistics must come from backend APIs and SQLite, not hardcoded constants. If seed data is provided, identify it clearly as demonstration data.

### Page B: Sample Analysis

Include:
- File upload area.
- Drag-and-drop interaction if straightforward.
- Select predefined safe demo samples.
- Filename, file size, SHA-256, and basic file type.
- Safe static metadata analysis.
- Analysis progress indicator.
- Link to the completed analysis report.

Never execute uploaded files. Unsupported formats must receive a clear explanation rather than a fabricated result.

If the uploaded file cannot support meaningful classification, report that limitation and show only evidence actually available. Do not invent PE imports or behavioral observations for arbitrary files.

### Page C: Analysis Results

Display:
- Classification: Benign, Suspicious, or Trojan-like.
- Model confidence, clearly described as the classifier's output.
- Risk score from 0–100.
- Risk severity.
- Evidence/reasons for detection.
- Static indicators.
- Behavior event timeline.
- Network event table.
- IOC list.
- Analysis timestamp.
- Recommended defensive next steps.
- Link back to history and dashboard.

Provide a visually prominent risk gauge or score visualization.

Example demo result:
- Classification: Trojan-like
- Risk score: 91/100
- Severity: Critical
- Reasons: repeated outbound connections, abnormal DNS patterns, suspicious process-related telemetry, persistence-like event
- Network activity: simulated connection and DNS counts
- IOCs: simulated hash, IP, port, and domain where applicable

This example is for the demo scenario only. The actual result must be generated by the backend pipeline.

### Page D: Demo Lab — Highest Priority

Create an interactive demo lab with three scenarios:

1. Normal System
   - Ordinary simulated process activity.
   - Normal file activity.
   - Low network activity.
   - Expected result: Benign, low risk.

2. Suspicious Activity
   - Some suspicious file events.
   - Repeated connection patterns.
   - Moderate suspicious indicators.
   - Expected result: Suspicious, medium or high risk.

3. Trojan-like Activity
   - Multiple suspicious indicators.
   - Repeated simulated outbound connections.
   - Unusual DNS patterns.
   - Persistence-like telemetry.
   - Expected result: Trojan-like, high or critical risk.

Each scenario must have:
- A Start Simulation button.
- Scenario description.
- Animated progress state.
- A simulated live event stream.
- Timestamped events.
- Event severity.
- Final classification and risk score.
- View Full Report action.
- Clear reset/re-run behavior.

Simulate event progression with backend-generated records and short-interval frontend polling. WebSockets are unnecessary unless they are trivial.

CRITICAL: All scenarios must pass through the SAME backend analysis, classification, scoring, explanation, and persistence pipeline as other analyses. Do not hardcode the final UI result independently of the backend.

The expected classifications above should be achieved through deterministic demo feature inputs and a tested detection pipeline. Do not rely on an unreliable model prediction alone to make the three scenarios behave consistently.

### Page E: Analysis History

Include:
- Paginated or reasonably limited analysis list.
- Search by filename or hash.
- Filter by classification.
- Filter by severity.
- Sort by date or risk score.
- Click a row to open its full report.
- Data loaded from SQLite.

## 6. Backend architecture

Use a simple modular FastAPI structure.

Recommended modules:
- `main.py`: application setup.
- `api/`: API route handlers.
- `database.py`: SQLite connection and initialization.
- `models/`: database models and schemas.
- `services/`: orchestration and report creation.
- `analysis/`: static, behavior, network, and feature extraction logic.
- `ml/`: training and inference.
- `demo/`: safe predefined scenarios.

Avoid creating unnecessary abstractions.

Implement these endpoints:

- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/analyze`
- `GET /api/analysis/{id}`
- `POST /api/demo/start`
- `GET /api/demo/{id}/events`
- `GET /api/history`
- `GET /api/threats`
- `GET /api/iocs/{id}`

Add proper request validation, HTTP status codes, error handling, and CORS restricted to the local frontend development origin.

Write API documentation using FastAPI's built-in OpenAPI/Swagger interface.

## 7. Database schema

Create the following SQLite tables.

### analyses
- id
- filename
- sha256
- file_size
- file_type
- timestamp
- classification
- confidence
- risk_score
- risk_level
- analysis_source
- summary

### behavior_events
- id
- analysis_id
- timestamp
- event_type
- description
- severity
- is_simulated

### network_events
- id
- analysis_id
- timestamp
- source
- destination
- port
- protocol
- event_type
- is_simulated

### iocs
- id
- analysis_id
- type
- value
- is_simulated

Use foreign keys and sensible relationships. Ensure database initialization works on a fresh clone. Use migrations only if genuinely necessary.

## 8. Machine learning requirements

Implement a reproducible Random Forest classifier with three labels:

- 0 = Benign
- 1 = Suspicious
- 2 = Trojan-like

Suggested features:
- file_entropy
- import_count
- suspicious_imports
- process_count
- file_events
- network_connections
- dns_requests
- repeated_connections
- persistence_indicator

Requirements:
1. Provide a labeled demonstration dataset or reproducible synthetic-data generator.
2. Implement `train.py`.
3. Save the trained model using joblib.
4. Load the model in the backend.
5. Validate feature names, order, and types consistently.
6. Implement a prediction service.
7. Return predicted class and the model's class probability where appropriate.
8. Explain that probability is model confidence, not guaranteed real-world accuracy.
9. Document dataset limitations.
10. Include a simple test for training and inference.

Use a deterministic random seed.

Do not claim that synthetic-data performance demonstrates real-world malware detection accuracy.

### Detection and risk engine

Build a transparent rule-based risk engine that uses observed indicators and the classifier output.

Use a centralized, configurable set of weights and thresholds.

Risk levels:
- 0–30: Low
- 31–60: Medium
- 61–80: High
- 81–100: Critical

The final risk score must be bounded between 0 and 100.

Keep classification, model confidence, and risk score as separate concepts. Document how the final classification is selected, particularly for deterministic demo scenarios.

For every score, provide a list of evidence that contributed to it. Do not create evidence that was not observed.

## 9. Static, behavioral, and network analysis

### Static analysis
- SHA-256 hash.
- File size.
- File type based on content where feasible, not filename alone.
- Basic PE metadata and import information if the file is a valid PE and pefile is installed.
- Count configured suspicious indicators when supported.
- Gracefully handle invalid or unsupported formats.

### Behavioral analysis
For the college demo, generate simulated events representing:
- Process creation.
- File modification.
- Persistence-like activity.
- Unusual application behavior.

Label all simulated observations as simulated. Never claim that actual host activity was monitored.

### Network analysis
Generate or analyze safe telemetry records representing:
- Source and destination.
- Port and protocol.
- DNS request counts.
- Repeated connection patterns.
- Event timestamps.
- Event severity.

Use fictional domains and documentation-reserved example IPs for generated data. No external network contact is required.

## 10. Frontend design expectations

The frontend must look like a polished cybersecurity SaaS/SOC dashboard, not a default starter template.

Visual direction:
- Dark navy background.
- Clear contrast and readable typography.
- Restrained cyan/blue accents.
- Green for low risk, amber for medium, orange for high, red for critical.
- Consistent spacing and reusable components.
- Compact sidebar.
- Clean cards and charts.
- Well-designed tables.
- Subtle transitions and loading animations.
- Clear badges, tooltips, and empty states.
- Responsive desktop and laptop layout.

Use Lucide icons and Recharts for charts.

Create reusable components such as:
- Sidebar
- Header
- StatCard
- SeverityBadge
- RiskGauge
- ThreatDistributionChart
- NetworkActivityChart
- EventTimeline
- EventStream
- AnalysisTable
- IocList
- LoadingState
- EmptyState
- ErrorState

Avoid excessive animations, visual clutter, fake 3D effects, and oversized typography.

Do not make every component independently styled. Establish a consistent design system.

## 11. Project structure

Use this structure unless the workspace already has a sensible equivalent:

trojanguard/
  frontend/
    src/
      components/
      pages/
      charts/
      services/
      App.jsx
      main.jsx
    package.json
  backend/
    app/
      main.py
      api/
      models/
      services/
      analysis/
      ml/
      demo/
      database.py
    requirements.txt
  ml/
    dataset.csv
    train.py
    model.pkl
  README.md
  .gitignore

Do not overwrite unrelated files in an existing workspace. First inspect the current directory and preserve useful existing code.

## 12. Development and verification workflow

Work in phases, but continue implementation rather than stopping after a plan.

Phase 1 — Inspect the workspace and identify the current state.

Phase 2 — Build the backend and database.

Phase 3 — Implement demo scenarios and the detection pipeline.

Phase 4 — Implement the ML training and inference pipeline.

Phase 5 — Build the frontend pages and shared components.

Phase 6 — Integrate frontend and backend.

Phase 7 — Run tests and fix defects.

Phase 8 — Write documentation and prepare the viva demo.

After each phase:
- Summarize files created.
- Run relevant checks where possible.
- Fix obvious errors before proceeding.
- Keep the application runnable.
- Do not leave core features as TODO comments or static mockups.

Use available workspace tools to create and edit files directly. If you cannot execute a command, state exactly what I need to run.

## 13. Minimum acceptance criteria

The project is complete only when:

1. Backend starts successfully.
2. Frontend starts successfully.
3. `/api/health` works.
4. Dashboard metrics load from the backend.
5. All three demo scenarios can be started.
6. Each scenario produces timestamped events.
7. Each scenario returns a sensible, deterministic classification and risk score.
8. A completed demo is stored in SQLite.
9. Results page shows evidence, events, risk, and IOCs.
10. History loads saved analyses.
11. ML training and inference can be demonstrated.
12. Safe file analysis computes SHA-256 and never executes the file.
13. Errors and empty states do not crash the application.
14. The README includes installation, setup, execution, architecture, limitations, and demo instructions.
15. The application has no core feature that is merely a nonfunctional button or static placeholder.

Add a few focused automated tests for risk scoring, demo scenarios, database persistence, and ML inference.

## 14. What not to build

Do not build:
- A functional Trojan or RAT.
- A real sandbox.
- A real command-and-control implementation.
- Live endpoint monitoring.
- A complex packet capture engine.
- Full MITRE ATT&CK automation.
- External threat-intelligence integrations.
- Multiple ML models unless the core project is finished.
- A PDF report unless all required functionality is working.
- Cloud deployment unless time remains.

These are possible future enhancements, not requirements.

## 15. README and viva preparation

Write a complete README covering:
- Project abstract.
- Problem statement.
- Objectives.
- Existing-system limitations.
- Proposed system.
- Architecture.
- Technology stack.
- Database schema.
- ML workflow.
- Detection and risk-scoring method.
- API endpoints.
- Installation and execution.
- Demo scenarios.
- Test commands.
- Results and limitations.
- Future scope.
- Safety statement.

Also create `docs/VIVA_NOTES.md` with concise answers to:
- What is a Trojan horse?
- How does a Trojan differ from a virus and a worm?
- What are static and behavioral analysis?
- What is an IOC?
- Why use Random Forest?
- What is a training feature?
- What is model confidence?
- What is the difference between classification and risk scoring?
- How does SQLite store results?
- How does the detection pipeline work?
- What are the project's limitations?
- What is novel about TrojanGuard?

Describe the novelty honestly: the integration of simulated behavioral/network evidence, ML-based demonstration classification, transparent risk scoring, and an interactive investigation dashboard. Do not claim the underlying techniques are individually new.

## 16. Final instructions

Start by inspecting the workspace and checking available tools and dependencies. Then implement the application.

Do not stop after generating architecture diagrams or explaining code. Create a functioning application.

Prioritize the demo lab and end-to-end integration. If a requirement is too large for the deadline, implement the smallest honest working version and document what is missing.

At the end, provide:
- Final directory structure.
- Commands to install and start the backend.
- Commands to install and start the frontend.
- How to train the model.
- How to run tests.
- Local URLs.
- A 3–5 minute demo script.
- Known limitations.
- A checklist confirming which acceptance criteria have actually been tested.

Never state that something works unless you have verified it or clearly label it as untested.