# TrojanGuard — Live Demonstration Presentation Script (4–5 Minutes)

A structured, minute-by-minute presentation guide for oral examination, project showcase, and technical review.

---

## Preparation Checklist Before Starting
- [ ] Ensure backend is running on `http://127.0.0.1:8001`.
- [ ] Ensure frontend is running on `http://127.0.0.1:5173`.
- [ ] Ensure browser window is maximized (1920x1080 recommended) and console is closed.
- [ ] Keep a sample executable or text file ready in your file manager for the upload demo.

---

## Presentation Timeline

```
+-----------------------------------------------------------------------------------------+
| Minute 0:00 - 0:45 | Introduction & Problem Context (Dashboard)                         |
| Minute 0:45 - 2:00 | Demonstration Simulation Lab (Trojan-like & Normal Scenarios)      |
| Minute 2:00 - 3:00 | Investigation & Explainable Report Breakdown (/analysis/:id)        |
| Minute 3:00 - 3:45 | Safe Static File Upload (/analyze)                                 |
| Minute 3:45 - 4:30 | Real-Data Memory Forensics & Academic Honesty (/model)             |
| Minute 4:30 - 5:00 | Summary, Limitations, & Conclusion                                 |
+-----------------------------------------------------------------------------------------+
```

---

### [0:00 – 0:45] Minute 1: Introduction & Security Operations Dashboard
**URL:** `http://127.0.0.1:5173/`

**Action:**
1. Point to the SOC Dashboard header and StatCards: Total Analyses, Threats Detected, High/Critical count, and Average Risk Score.
2. Scroll briefly to show the Threat Distribution Chart and Detection Timeline.

**What to Say:**
> *"Good morning. Today I am presenting **TrojanGuard**, an AI-powered defensive security workbench designed to detect and analyze stealth Trojan malware through transparent heuristic risk scoring and explainable machine learning.*  
> *Traditional antivirus solutions rely heavily on static signatures, which malware authors easily bypass through polymorphic packing and string obfuscation. Conversely, modern neural network detectors often act as black boxes with no clear explanation.*  
> *TrojanGuard solves this by uniting in-memory static inspection, deterministic behavioral telemetry, an additive 100-point risk engine, and machine learning into a single explainable security platform. Everything you see on this dashboard is aggregated in real time from a local SQLite database."*

---

### [0:45 – 2:00] Minute 2: Demo Simulation Lab (Multi-Stage Intrusions)
**URL:** `http://127.0.0.1:5173/demo`

**Action:**
1. Click **Demo Lab** in the left sidebar.
2. Point out the three scenario cards: *Normal System Activity*, *Suspicious Activity*, and *Trojan-like Activity*.
3. Click **Start Simulation** on the **Trojan-like Activity** card.
4. Watch the progress bar animate and events stream into the live telemetry log.
5. Once complete, highlight the **Composite Risk Gauge** (92 / CRITICAL) and the classification badge.

**What to Say:**
> *"To safely demonstrate dynamic detection without executing live malware on this host, TrojanGuard includes a simulated telemetry lab. Here we have three deterministic multi-stage scenarios.*  
> *I have just launched the **Trojan-like Activity** scenario. Notice the telemetry stream: we observe high-severity events including child process spawning (`cmd.exe`), registry persistence in the `CurrentVersion\Run` key, memory injection via `VirtualAllocEx`, and outbound command-and-control beaconing to an RFC 5737 external IP.*  
> *As the run completes, the telemetry is passed to our backend detection pipeline. The pipeline calculates a deterministic risk score of 92 out of 100, placing it in the Critical tier, while our Random Forest classifier reports 99.7% confidence in the Trojan classification."*

---

### [2:00 – 3:00] Minute 3: Explainable Analysis Report & Arbitration
**URL:** Click **View Full Report** from the completed demo (or navigate to `/analysis/:id`)

**Action:**
1. In the Report Header, point out the SHA-256 hash and the **"Synthetic identifier"** badge.
2. Scroll to the **Evidence & Threat Scoring Breakdown** table.
3. Show how each signal has a clear source (Static, Behavioral, Network) and explicit points that sum exactly to the final score (e.g., Persistence +18, Injection +16, C2 Beaconing +12).
4. Point to the **Decision & Arbitration** box showing classifier agreement.
5. Click the **Network Telemetry** and **Indicators of Compromise** tabs.

**What to Say:**
> *"On the Analysis Results page, TrojanGuard demonstrates explainability. Notice the SHA-256 hash carries a 'Synthetic identifier' badge to clearly distinguish demonstration data from live file uploads.*  
> *Here in the evidence breakdown, there are no opaque numbers. Every single risk point is attributed to a verifiable signal: +18 points for Registry persistence, +16 points for memory injection, and +12 points for C2 beaconing. The sum equals the 92-point score.*  
> *Next to it, our Arbitration Engine shows that the heuristic rules and the Random Forest classifier are in complete agreement. If a conflict ever occurs—for example, if a machine learning model misclassifies a persistent beaconing binary as benign—our deterministic safety rules take precedence, preventing false negatives.*  
> *The analyst can also inspect extracted Indicators of Compromise, ready for defensive firewall blocking."*

---

### [3:00 – 3:45] Minute 4: Safe Static File Upload (In-Memory Sandbox)
**URL:** `http://127.0.0.1:5173/analyze`

**Action:**
1. Click **Sample Analysis** in the left sidebar.
2. Point out the notice: *"Defensive In-Memory Sandbox Guarantee: Uploaded files are parsed strictly in memory..."*
3. Drag and drop or browse to upload an executable or document.
4. Click **Start Analysis**. Within ~1 second, view the completed static analysis report.

**What to Say:**
> *"Now let's examine live file analysis. TrojanGuard features a strict Defensive In-Memory Sandbox Guarantee. When an analyst uploads an executable, the file is never saved with execute permissions and never passed to a subshell. The entire backend contains zero calls to `subprocess` or `exec`.*  
> *We extract headers, calculate Shannon entropy to detect packed sections, and parse the Import Address Table using `pefile`.*  
> *Because behavioral and network events cannot be observed from a static file upload, TrojanGuard enforces an architectural safety rule: static-only uploads are capped at a maximum classification of Suspicious, and dynamic telemetry features are masked with unobserved flags rather than generating false predictions."*

---

### [3:45 – 4:30] Minute 5: Real-Data Memory Forensics & Academic Honesty
**URL:** `http://127.0.0.1:5173/model`

**Action:**
1. Click **Model Architecture** in the left sidebar.
2. Show the multi-regime evaluation metrics for the **CIC-MalMem-2022** dataset:
   - Evaluation A (Random Stratified) vs Evaluation B (Grouped by sample hash) vs Evaluation C (Leave-One-Family-Out).
3. Scroll to the **Robustness Check** section showing the `svcscan.nservices` artifact verification and ablation comparison tables.
4. Click **Load Sample Trojan Vector** under the Interactive Inference Console and click **Run Real-Data Inference**. Show the calibrated probability and classification.

**What to Say:**
> *"Finally, we come to our research module. In addition to our synthetic demonstration model, TrojanGuard integrates a real-world memory forensics model trained on 38,711 records from the university-standard **CIC-MalMem-2022** dataset.*  
> *We emphasize academic honesty: naive random splits in malware datasets report near-100% accuracy due to identical sample dumps appearing in both training and test sets. To prove true generalization within the lab environment, we implemented Evaluation B, grouped by sample hash, and Evaluation C, leaving out entire Trojan families like Emotet and Zeus.*  
> *Furthermore, we audited the dataset for virtual machine baseline artifacts and discovered that Benign dumps consistently ran ~394 services while Trojan dumps ran ~388 services. To test whether the model merely learned this laboratory artifact, we ran two robustness ablations stripping the service features and the top-5 features. As shown in the table, the model maintained 99.7% recall, relying on handle distributions and injected memory structures.*  
> *Analysts can also test live feature vectors in real time through our interactive console."*

---

### [4:30 – 5:00] Conclusion & Q&A
**What to Say:**
> *"In summary, TrojanGuard delivers a robust, explainable defensive framework that bridges static parsing, simulated telemetry, and auditable machine learning without endangering host infrastructure.*  
> *Thank you, and I am now ready for your questions."*

---

## Emergency Fallback Procedures (If Backend Fails or Halts)

1. **Quick Diagnostic**:
   - Check if port 8001 is listening: `ss -tulpn | grep 8001`
   - Check backend terminal logs for unexpected tracebacks.
2. **Instant Restart**:
   ```bash
   cd ~/TrojanGuard
   PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```
3. **Database Corruption / Schema Reset**:
   ```bash
   rm -f backend/trojanguard.db*
   PYTHONPATH=backend backend/.venv/bin/python3 -c "from app.database import init_db; init_db()"
   ```
4. **Offline Talking Point (If Network Fails)**:
   > *"Notice that TrojanGuard is completely self-contained. It requires no external cloud APIs, no subscription threat intelligence, and runs entirely on a lightweight local SQLite database."*
