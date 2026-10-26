# TrojanGuard Synthetic Dataset Card

## Overview
- **Type**: Purely Synthetic Telemetry & Static Feature Dataset
- **Total Rows**: 3000
- **Class Balance**:
  - Class 0 (Benign): 998 rows (33.3%)
  - Class 1 (Suspicious): 1002 rows (33.4%)
  - Class 2 (Trojan-like): 1000 rows (33.3%)
- **Random Seed**: 42
- **Label Noise**: ~4% random label assignment to simulate realistic labeling ambiguity

## Features (9 total)
1. `file_entropy`: Shannon entropy of sample bytes [1.0 - 8.0].
2. `import_count`: Total imported functions from PE Import Address Table.
3. `suspicious_imports`: Count of imports matching known process injection/download APIs.
4. `process_count`: Count of process spawning/manipulation telemetry events.
5. `file_events`: Count of file creation, modification, or staging events.
6. `network_connections`: Count of outbound network connections.
7. `dns_requests`: Count of DNS query telemetry events.
8. `repeated_connections`: Count of repeated connections to identical destination/port.
9. `persistence_indicator`: Binary flag (0.0 or 1.0) indicating startup/run key persistence.

## Value Ranges by Class

| Feature | Benign (Class 0) | Suspicious (Class 1) | Trojan-like (Class 2) |
|---|---|---|---|
| `file_entropy` | μ ≈ 4.0 (σ=1.0) | μ ≈ 5.8 (σ=0.9) | μ ≈ 7.3 (σ=0.6) |
| `import_count` | 5 – 80 | 10 – 100 | 20 – 140 |
| `suspicious_imports` | 0 – 2 (mostly 0) | 0 – 4 (mostly 1–2) | 1 – 12 (mostly 4–7) |
| `process_count` | 1 – 4 | 1 – 6 | 2 – 10 |
| `file_events` | 1 – 8 | 1 – 10 | 0 – 9 |
| `network_connections` | 0 – 3 | 1 – 7 | 2 – 12 |
| `dns_requests` | 0 – 3 | 0 – 5 | 1 – 8 |
| `repeated_connections` | 0 – 1 | 0 – 3 | 1 – 7 |
| `persistence_indicator` | ~3% positive | ~12% positive | ~88% positive |

## Academic and Defensive Notice
> **IMPORTANT NOTICE: SYNTHETIC DATA LIMITATIONS**
> This dataset is synthetically generated using statistical distributions for the educational TrojanGuard demonstration.
> It does **not** reflect real-world malware campaign prevalences or complex evasion techniques (such as anti-sandbox stalling, API hashing, or memory-only rootkits).
> Model metrics obtained on this dataset validate the pipeline architecture and explainable feature-scoring integration, not real-world antivirus effectiveness.
