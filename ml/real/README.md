# CIC-MalMem-2022 Real Memory-Forensics Dataset & Model

## 1. Dataset Overview

- **Dataset Name**: CIC-MalMem-2022 (Obfuscated Malware Memory Dataset)
- **Source**: Canadian Institute for Cybersecurity (CIC), University of New Brunswick (UNB), Fredericton, NB, Canada.
- **Reference URL**: [https://www.unb.ca/cic/datasets/malmem-2022.html](https://www.unb.ca/cic/datasets/malmem-2022.html)
- **Citation**:
  > Carrier, T., Victor, P., Tekeoglu, A., & Lashkari, A. H. (2022). *Detecting Obfuscated Malware using Memory Feature Engineering*. In Proceedings of the 8th International Conference on Information Systems Security and Privacy (ICISSP 2022), pages 177-188. DOI: 10.5220/0010834300003120.
- **Licence & Terms of Use**:
  > The CIC-MalMem-2022 dataset is provided publicly for academic, educational, and non-commercial cybersecurity research purposes, provided appropriate citation is given to the authors and the Canadian Institute for Cybersecurity (CIC/UNB).

---

## 2. Methodology & Scope

### In-Memory Forensics Extraction
All features in this dataset represent **volatile memory forensics measurements** extracted from memory dumps of Virtual Machines (Windows 7 32-bit) using the **Volatility Memory Forensics Framework**. 
- **Defensive Safety**: TrojanGuard processes only tabular numerical feature vectors. **No live malware executables or active payloads are ever executed, stored, or distributed.**
- **Architectural Separation**: These 55 memory-forensics features are **completely separate and NOT comparable** to the 9 static/behavioral/network telemetry features used in TrojanGuard's live Demo Lab and file analysis pipeline.

### Target Filtering (Benign vs. Trojan Only)
The raw dataset contains 58,596 rows across four categories: Benign, Trojan, Ransomware, and Spyware.
Per project requirements, TrojanGuard filters this dataset to evaluate binary Trojan classification:
- **Included**: All `Benign` rows (`29,298`) and all rows whose `Category` indicates `Trojan` (`9,487`).
- **Excluded**: All `Ransomware` (`9,791`) and `Spyware` (`10,020`) rows.
- **Trojan Families Parsed**: 5 distinct families (`Emotet`, `Reconyc`, `Refroso`, `Scar`, `Zeus`), parsed from the `Category` string `<Type>-<Family>-<SampleHash>-<RunId>.raw`.

---

## 3. Data Preprocessing (`ml/real/prepare.py`)

1. **Integrity & Verification**: Computes and verifies SHA-256 (`624ecb6c9229cf62bd3b8f65d23a2b132760e6bada458aa46eee134a313840c4`).
2. **Category Decomposition**: Extracts `malware_type`, `family`, `sample_hash`, and `run_id`.
3. **Exact Deduplication**: Drops 74 exact duplicate feature rows before any training or test splits.
4. **Zero-Variance Removal**: Drops 4 constant features (`pslist.nprocs64bit`, `handles.nport`, `svcscan.interactive_process_services`, `callbacks.ngeneric`), leaving 51 active numerical predictors.
5. **Class Balance**: 29,284 Benign (75.6%) and 9,427 Trojan (24.4%) clean rows.

---

## 4. Evaluation Strategy & Robustness Ablations

Three distinct evaluation regimes are conducted to avoid academic over-claiming:

### Evaluation A: Random Stratified 80/20 Split (Naive / Optimistic)
- Standard random train/test partitioning.
- **Limitation**: Optimistic baseline because multiple memory dumps of the exact same executable (`sample_hash` across multiple `run_id`s) land in both the training set and the test set.

### Evaluation B: Grouped Split by Sample Hash (`GroupShuffleSplit`, seed 42)
- Evaluates model performance on **unseen samples from the same laboratory environment**.
- Trojan samples are grouped strictly by `sample_hash` so that no Trojan sample hash in the training set ever appears in the test set.

### Evaluation C: Leave-One-Family-Out Cross-Validation
- Evaluates model performance on **unseen Trojan families from the same laboratory environment**.
- Iterates across all 5 Trojan families: trains on 4 families + 80% Benign, and tests on the held-out 5th family + 20% Benign.

### Critical Academic Finding: Lab Environment Artifacts vs. Real-World Generalization
Evaluations B and C must be accurately characterized as **evaluations on unseen samples and novel families within the same laboratory environment**, NOT as proof of real-world generalization to arbitrary wild machines:
1. **Benign Data Limitation**: Benign rows in CIC-MalMem-2022 do NOT possess sample, process, or session IDs. Therefore, benign rows cannot be grouped, and **benign data leakage across train and test partitions cannot be ruled out**.
2. **Laboratory Environment Fingerprint (`svcscan.nservices`)**:
   In clean testbed VMs, Windows service counts are remarkably uniform around 395, whereas malware-executing VMs experience systematic service disruptions:
   - **Benign ($n=29,231$)**: Mean = `394.205433`, Median = `395.0`, Std = `1.352629`
   - **Trojan ($n=9,480$)**: Mean = `388.752743`, Median = `389.0`, Std = `1.459964`
   The Random Forest assigned `21.29%` Gini importance to `svcscan.nservices` alone.

### Robustness Ablation Study
To verify whether the model is merely memorizing the `svcscan` service count artifact, we ablated the features and re-evaluated:
- **Baseline (Full 51 Features)**:
  - Eval B: Accuracy = `100.0%`, Recall = `100.0%`, F1 = `100.0%`
  - Eval C: Macro Recall = `99.75%`, Macro F1 = `99.88%`, Benign FPR = `0.00%`
- **Ablation 1: Removing all 6 `svcscan.*` Features (45 predictors remaining)**:
  - Eval B: Accuracy = `99.93%`, Recall = `99.73%`, F1 = `99.86%` (only 5 Trojan test samples missed)
  - Eval C: Macro Recall = `99.52%`, Macro F1 = `99.76%`, Benign FPR = `0.00%` (Reconyc recall: `98.28%`, Zeus: `99.49%`, Scar: `99.85%`, Emotet: `100.0%`, Refroso: `100.0%`)
- **Ablation 2: Removing Top-5 Most Important Features (46 predictors remaining)**:
  - Eval B: Accuracy = `99.93%`, Recall = `99.73%`, F1 = `99.86%`
  - Eval C: Macro Recall = `99.69%`, Macro F1 = `99.85%`, Benign FPR = `0.00%`

*Conclusion*: Even when `svcscan.*` is entirely removed, the model still detects unseen Trojan families at **99.52% macro recall** within this lab environment, substituting other memory anomalies (e.g., `handles.nsection`, `malfind.ninjections`, `dlllist.ndlls`). However, because benign baseline leakage cannot be prevented without benign session identifiers, this high performance reflects intra-dataset consistency, not bulletproof wild deployment.

---

## 5. Output Probability Bands
The real-data model does NOT output hardcoded verdicts. Predictions from `model_real.pkl` are mapped into defensive risk bands:
- **`[0.00, 0.35)`**: Benign (Low probability of Trojan characteristics)
- **`[0.35, 0.65]`**: Suspicious (Indeterminate / borderline memory anomalies)
- **`(0.65, 1.00]`**: Trojan-like (Strong memory-forensics indicators)
