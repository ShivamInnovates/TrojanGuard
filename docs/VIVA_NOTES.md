# TrojanGuard — Academic Viva Voce & Technical Defense Notes

Comprehensive technical and conceptual reference for project evaluation, oral defense, and architectural review.

---

### Q1: What is a Trojan horse?
**Answer:** A Trojan horse is a type of malicious software that misleads users of its true intent by disguising itself as legitimate or harmless software (e.g., utility software, games, document viewers). Unlike legitimate software, it contains hidden unauthorized payloads that grant unauthorized remote access, install persistence mechanisms, exfiltrate credentials, or establish covert command-and-control (C2) communication channels.

---

### Q2: How does a Trojan differ from a virus and a worm?
**Answer:**
- **Virus**: Requires a host executable file to attach itself to. It replicates by infecting other programs or documents on the host system when the infected file is executed.
- **Worm**: A standalone program that propagates self-sufficiently across computer networks without human interaction, typically exploiting network protocol or service vulnerabilities.
- **Trojan**: Does **not** replicate or self-propagate. It relies on social engineering, deceptive naming, or trojanized software packages to trick the victim into executing it voluntarily. Once running, it drops or activates its secondary payload.

---

### Q3: What are static and behavioral analysis?
**Answer:**
- **Static Analysis**: Examining a binary file without executing it. This includes calculating cryptographic hashes (SHA-256), inspecting Portable Executable (PE) headers, measuring Shannon entropy of sections to detect packing/encryption, extracting printable strings, and reviewing import/export address tables for sensitive Windows API calls.
- **Behavioral (Dynamic) Analysis**: Observing actions performed by the program at runtime within an isolated environment. This includes tracking child process creation, filesystem writes, Windows Registry modifications (e.g., Run keys), process memory injection (`VirtualAllocEx`), and outbound network socket connections.

---

### Q4: What is an Indicator of Compromise (IOC)?
**Answer:** An IOC is forensic artifact observed on a network or in an operating system that indicates, with high confidence, that a system has been compromised by an intrusion. Examples include:
- Specific file cryptographic hashes (`SHA-256`, `MD5`).
- Malicious external IP addresses and domain names.
- Specific Registry keys or scheduled tasks used for persistence.
- Mutexes or memory injection target processes.
In TrojanGuard, IOCs are extracted strictly from observed telemetry events and labeled with an `is_simulated` flag for demonstration safety.

---

### Q5: Why use Random Forest?
**Answer:**
1. **Explainability & Feature Importance**: Random Forest naturally computes Gini importance / mean decrease in impurity, enabling SOC analysts to inspect which forensic signals drove the decision.
2. **Handling Non-linear Feature Interactions**: Security telemetry contains non-linear interactions (e.g., high entropy is benign in encrypted media files, but suspicious when combined with memory injection APIs). Tree ensembles model these interactions without manual polynomial feature engineering.
3. **Resilience to Overfitting**: By aggregating hundreds of decorrelated decision trees trained on bootstrap samples with random feature subsets, Random Forest generalizes better on structured tabular data than single decision trees or deep neural networks.

---

### Q6: What is a training feature?
**Answer:** A training feature is an individual measurable property or forensic characteristic extracted from system telemetry or binary structure. In TrojanGuard:
- **Synthetic Pipeline (9 features)**: Combines static attributes (`entropy`, `suspicious_api_imports`, `suspicious_sections`) and dynamic signals (`process_spawns`, `persistence_created`, `injection_detected`, `c2_beacons`, `unresolved_dns`, `file_type_pe`).
- **Real-Data Pipeline (51 features)**: Uses memory forensics measurements extracted via Volatility from memory dumps (e.g., process counts, thread averages, handle distributions, memory injection artifacts like `malfind.ninjections`, and loaded module anomalies).

---

### Q7: What is model confidence?
**Answer:** Model confidence is the predicted probability class distribution output by the Random Forest classifier for an input feature vector. For a forest of $N$ trees, it represents the fraction of individual decision trees that voted for a particular class (e.g., 99.7% of trees voting for Trojan).
In TrojanGuard, confidence is displayed transparently alongside the heuristic risk score. On file uploads where behavioral telemetry cannot be observed, the model confidence is explicitly recorded as `NULL` or marked "Not Applicable" rather than hallucinating high certainty.

---

### Q8: What is the difference between classification and risk scoring?
**Answer:**
- **Classification**: Categorical assignment of a sample into a discrete qualitative bucket (`Benign`, `Suspicious`, `Trojan-like`).
- **Risk Scoring**: A continuous, additive numerical score ($0–100$) reflecting cumulative threat severity.
**Why separate them?** A file might have a moderate risk score (e.g., 43 points) due to benign packing, yet still warrant a `Suspicious` classification for analyst review. Conversely, a sample with critical indicators (persistence + C2 beaconing) immediately mandates a `Trojan-like` classification even before full points are tallied.

---

### Q9: How does SQLite store results?
**Answer:** TrojanGuard uses SQLite 3 with Write-Ahead Logging (`WAL`) mode and explicit foreign key enforcement (`PRAGMA foreign_keys = ON`). It normalizes intelligence across four tables:
1. `analyses`: Root table storing sample metadata, final classification, confidence, risk score/level, summary, and a `features_json` blob.
2. `behavior_events`: Child table with foreign key `REFERENCES analyses(id) ON DELETE CASCADE` storing timestamped process/registry events.
3. `network_events`: Child table storing connection destinations, ports, and protocols.
4. `iocs`: Child table storing extracted indicators (hashes, IPs, domains).
Cascade deletion guarantees that deleting an analysis atomically purges all associated events and IOCs without leaving orphaned child records.

---

### Q10: How does the detection pipeline work?
**Answer:** The unified pipeline follows five sequential stages:
1. **Ingestion**: File bytes are analyzed in memory (or scenario telemetry is selected).
2. **Feature Extraction**: Extracts normalized features and constructs an `observed_mask` indicating which features were physically observed versus unobserved.
3. **ML Prediction**: Passes the feature vector to the Random Forest model to compute class probabilities.
4. **Heuristic Scoring & Arbitration**: The 100-point risk engine computes additive evidence points. The deterministic classification rule table determines the final class, overriding ML when defensive constraints apply (e.g., upload constraint).
5. **Persistence & Presentation**: The structured report, events, and IOCs are committed atomically to SQLite and returned via REST API to the React dashboard.

---

### Q11: What are the project's limitations?
**Answer:**
1. **No Live Kernel Sandbox**: The system does not execute live untrusted binaries or install kernel filter drivers; dynamic telemetry in the demo lab is deterministically simulated.
2. **Upload Static Boundary**: Real-data memory forensics features (e.g., Volatility handle tables) cannot be extracted from an uploaded executable without a hypervisor memory dumper.
3. **Lab Artifact Dependency**: Real-data evaluations reflect laboratory virtual machine characteristics (`svcscan.nservices` delta) and cannot be claimed to generalize to unseen real-world endpoints without retraining.

---

### Q12: What is novel about TrojanGuard?
**Answer:**
**Honest Novelty Statement**: TrojanGuard does **not** invent new machine learning algorithms, new hash functions, or new PE parsing techniques.
The novelty lies entirely in the **architectural integration**:
- Unifying in-memory static inspection, deterministic multi-stage scenario simulation, transparent additive risk scoring, and dual-ML advisory inference into a single cohesive workbench.
- Coupling a modern Security Operations Center (SOC) dashboard with deep academic honesty: exposing laboratory baseline artifacts, ablation studies, and clear separation between heuristic rules and statistical inference.

---

### Q13: Why are the real-data numbers near 100% and what does and does not prove?
**Answer:**
- **Why it occurs**: The **CIC-MalMem-2022** dataset was generated by running malware samples in identical, controlled virtual machine environments. In this environment, memory measurements create clean, linearly separable clusters between benign baseline snapshots and infected snapshots.
- **What it DOES prove**: It proves that tree-based machine learning can effectively distinguish memory forensics anomalies (handle spikes, injected memory pages, module disconnections) generated by Trojan families within that standardized laboratory setup.
- **What it DOES NOT prove**: It does **not** prove 99%+ detection on arbitrary enterprise computers in the wild. Real-world enterprise environments exhibit massive variance in background software, differing Windows versions, endpoint protection hooks, and specialized drivers that introduce significant noise absent from benchmark labs.

---

### Q14: What did the robustness ablation study show?
**Answer:**
We performed two ablation studies on the 51-feature real-data model:
1. **Ablation 1**: Completely removed all 6 `svcscan.*` features (including the laboratory artifact `svcscan.nservices`).
2. **Ablation 2**: Removed the top-5 most important features by Gini importance.
**Key Findings**:
- In both ablations, performance remained remarkably strong (Evaluation B grouped recall: 99.73%), demonstrating that the model does not collapse when the VM service artifact is stripped; it effectively falls back on memory handle and injection features.
- In both ablations, exactly **5 test samples were missed out of 1,825**.
- Deep forensic inspection revealed that **all 5 missed samples belonged to the exact same Trojan sample** (`Trojan-Scar-940031d1f698ef92d0c76c762cb41bff` across runs 1, 6, 7, 8, 9). Removing the service counts caused this borderline sample's predicted probability to drop slightly below the 0.50 decision threshold (to 0.37–0.48).

---

### Q15: Why do rules decide the class while the classifier output is shown separately?
**Answer:**
In safety-critical cybersecurity operations, machine learning models are susceptible to blind spots, out-of-distribution hallucinations, and adversarial perturbation.
- **Heuristic Rules**: Provide deterministic, non-negotiable defensive guardrails. If a binary is caught creating registry persistence and beaconing to an external server, it is unacceptable for an ML model to declare it benign due to statistical noise.
- **Separate Display**: By displaying both side-by-side, TrojanGuard avoids "automation bias". The analyst sees the deterministic decision and can inspect whether the statistical model agrees or disagrees, along with the explicit reason for any arbitration override.

---

### Q16: Why are the heuristic weights hand-tuned?
**Answer:**
The heuristic weights are hand-tuned based on established defensive threat intelligence and the MITRE ATT&CK framework.
- Threat signals do not carry equal defensive risk: a high section entropy indicates possible packing (benign in games, suspicious in utilities) and is awarded +10 points. In contrast, establishing persistence in the Windows Registry is an explicit operational objective of stealth Trojans and carries +18 points.
- Hand-tuning ensures every single point in the 100-point gauge corresponds to an interpretable, verifiable physical event that an analyst can validate in the evidence log.

---

### Q17: How is the application kept safe from uploaded files?
**Answer:**
TrojanGuard guarantees strict defensive non-execution safety and process isolation:
1. **Isolated Analysis Worker**: Untrusted uploads are processed in an isolated worker process (`backend/app/sandbox/worker.py`) running with `unshare -rn` (no network namespace/interfaces) and strict POSIX rlimits (5s CPU, 512 MB virtual RAM, 0 bytes file creation, 32 open descriptors, 10s process-group timeout).
2. **Strict Invariant on Subprocess**: `subprocess` is used **strictly** to launch our own internal worker script with a fixed, invariant argument list. Uploaded bytes and filenames are never passed in the command line or environment; uploaded data is streamed exclusively via stdin.
3. **No Shell Invocations or Arbitrary Execution**: The codebase contains **0** calls to `os.system()`, `eval()`, `exec()`, or untrusted `pickle.loads()`. Uploaded code is never executed, imported, or run.
4. **Strict Size Guard**: Uploads exceeding 10 MB are rejected immediately with HTTP 413 before the worker even starts.
5. **Safe Fallback**: Corrupt or malformed PE headers are trapped safely with limited static analysis warnings, preventing parser crashes.

---

### Q18: Why is it called an "Isolated Analysis Worker" and not a "Malware Sandbox"?
**Answer:**
Academic honesty about scope. A "malware sandbox" (like Cuckoo or CAPEv2) executes live binaries in a virtualized guest OS and observes live API hooks, kernel events, and network packets.
TrojanGuard's worker is an OS-level parser isolation boundary (namespaces + rlimits). It protects the host and backend from file parser bugs, infinite loops, and memory bombs during static inspection, but **never executes the uploaded binary**. Calling it a "malware sandbox" would be inaccurate and misleading.

---

### Q19: How is model training sandboxed?
**Answer:**
The launcher `scripts/train_real_sandboxed.sh` runs the real-data training pipeline inside an isolated Linux network namespace (`unshare -rn`), ensuring that model training cannot make outbound or inbound network calls. It also verifies dataset SHA-256 integrity against `ml/real/DATASET.sha256` prior to running, and enforces 6 GB memory and 600s CPU limits.
