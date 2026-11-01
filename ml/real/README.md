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

## 4. Evaluation Strategy & Realistic Metrics

Three distinct evaluation regimes are conducted to avoid academic over-claiming:

### Evaluation A: Random Stratified 80/20 Split (Naive / Optimistic)
- Evaluates standard random train/test partitioning.
- **Limitation**: Optimistic because multiple memory dumps of the same malware sample (different `run_id`s of the same `sample_hash`) land in both the training set and the test set.

### Evaluation B: Grouped Split by Sample Hash (`GroupShuffleSplit`, seed 42)
- Samples are grouped strictly by `sample_hash` for Trojans (each Benign sample gets an isolated group).
- **No sample hash present in the training set ever appears in the test set**.

### Evaluation C: Leave-One-Family-Out (Cross-Family Generalization)
- Cross-validation iterating across all 5 Trojan families: trains on 4 families + 80% Benign, and tests on the held-out 5th family + 20% Benign.
- Measures whether the model detects **novel, previously unseen Trojan variants**.

### Critical Finding: Why Headline Metrics Should Be B or C (and why scores >99% occur)
In laboratory memory dumps, clean VM snapshots typically run a uniform set of background OS services (`svcscan.nservices` ~ 395), whereas infected VMs show systematic alterations (`svcscan.nservices` ~ 389). Because of this global environment artifact, random stratified splits achieve near 100% accuracy. The **honest evaluation** must cite **Evaluation B (Grouped by Sample)** or **Evaluation C (Leave-One-Family-Out)** to demonstrate real generalization beyond sample replay.

---

## 5. Output Probability Bands
The real-data model does NOT output hardcoded verdicts. Predictions from `model_real.pkl` are mapped into defensive risk bands:
- **`[0.00, 0.35)`**: Benign (Low probability of Trojan characteristics)
- **`[0.35, 0.65]`**: Suspicious (Indeterminate / borderline memory anomalies)
- **`(0.65, 1.00]`**: Trojan-like (Strong memory-forensics indicators)
