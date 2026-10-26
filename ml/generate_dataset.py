"""
TrojanGuard — Synthetic Dataset Generator.

Generates a balanced 3-class dataset (~3000 rows) for the 9 locked features
defined in app.config.FEATURE_NAMES.

Features:
- file_entropy
- import_count
- suspicious_imports
- process_count
- file_events
- network_connections
- dns_requests
- repeated_connections
- persistence_indicator

Labels:
- 0 = Benign
- 1 = Suspicious
- 2 = Trojan-like

Characteristics:
- Seeded (random_state=42) for exact reproducibility.
- Overlapping class distributions reflecting realistic telemetry ambiguity.
- ~4% intentional label noise so the data is not trivially separable.
- Feature value ranges aligned with Phase 3 telemetry generators.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add repo root and backend to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import FEATURE_NAMES, RANDOM_SEED


def generate_synthetic_dataset(
    output_csv: Path | str | None = None,
    output_card: Path | str | None = None,
    n_per_class: int = 1000,
    seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    """
    Generate synthetic dataset with realistic overlap and 4% label noise.

    Parameters
    ----------
    output_csv:
        Path to save dataset.csv (defaults to ml/dataset.csv).
    output_card:
        Path to save dataset_card.md (defaults to ml/dataset_card.md).
    n_per_class:
        Number of rows per class (default 1000 -> 3000 total).
    seed:
        PRNG seed for full reproducibility.

    Returns
    -------
    pd.DataFrame:
        Generated DataFrame containing FEATURE_NAMES and 'label'.
    """
    np.random.seed(seed)

    # -----------------------------------------------------------------------
    # Class 0: Benign
    # Mostly low entropy, small import count, rare suspicious imports,
    # light network activity, low process/file counts, near-zero persistence.
    # -----------------------------------------------------------------------
    c0 = {
        "file_entropy": np.clip(np.random.normal(4.0, 1.0, n_per_class), 1.0, 7.2),
        "import_count": np.clip(np.random.normal(25, 12, n_per_class), 5, 80).astype(int),
        "suspicious_imports": np.random.choice([0, 1, 2], size=n_per_class, p=[0.85, 0.12, 0.03]),
        "process_count": np.clip(np.random.poisson(1.3, n_per_class), 1, 4),
        "file_events": np.clip(np.random.poisson(2.5, n_per_class), 1, 8),
        "network_connections": np.random.choice([0, 1, 2, 3], size=n_per_class, p=[0.40, 0.40, 0.15, 0.05]),
        "dns_requests": np.random.choice([0, 1, 2, 3], size=n_per_class, p=[0.45, 0.40, 0.12, 0.03]),
        "repeated_connections": np.random.choice([0, 1], size=n_per_class, p=[0.92, 0.08]),
        "persistence_indicator": np.random.choice([0.0, 1.0], size=n_per_class, p=[0.97, 0.03]),
        "label": np.zeros(n_per_class, dtype=int),
    }

    # -----------------------------------------------------------------------
    # Class 1: Suspicious
    # Intermediate entropy, moderate import count, some suspicious imports,
    # multiple network connections, moderate repeated connections.
    # -----------------------------------------------------------------------
    c1 = {
        "file_entropy": np.clip(np.random.normal(5.8, 0.9, n_per_class), 2.5, 7.6),
        "import_count": np.clip(np.random.normal(48, 18, n_per_class), 10, 100).astype(int),
        "suspicious_imports": np.random.choice([0, 1, 2, 3, 4], size=n_per_class, p=[0.10, 0.35, 0.35, 0.15, 0.05]),
        "process_count": np.clip(np.random.poisson(2.6, n_per_class), 1, 6),
        "file_events": np.clip(np.random.poisson(3.8, n_per_class), 1, 10),
        "network_connections": np.clip(np.random.poisson(3.0, n_per_class), 1, 7),
        "dns_requests": np.clip(np.random.poisson(1.8, n_per_class), 0, 5),
        "repeated_connections": np.random.choice([0, 1, 2, 3], size=n_per_class, p=[0.20, 0.45, 0.25, 0.10]),
        "persistence_indicator": np.random.choice([0.0, 1.0], size=n_per_class, p=[0.88, 0.12]),
        "label": np.ones(n_per_class, dtype=int),
    }

    # -----------------------------------------------------------------------
    # Class 2: Trojan-like
    # High entropy (packed/encrypted sections), numerous suspicious APIs,
    # high process spawning/injection activity, repeated C2 beaconing,
    # high frequency of persistence indicators.
    # -----------------------------------------------------------------------
    c2 = {
        "file_entropy": np.clip(np.random.normal(7.3, 0.6, n_per_class), 4.5, 7.98),
        "import_count": np.clip(np.random.normal(82, 22, n_per_class), 20, 140).astype(int),
        "suspicious_imports": np.clip(np.random.poisson(5.5, n_per_class), 1, 12),
        "process_count": np.clip(np.random.poisson(4.8, n_per_class), 2, 10),
        "file_events": np.clip(np.random.poisson(2.5, n_per_class), 0, 9),
        "network_connections": np.clip(np.random.poisson(5.5, n_per_class), 2, 12),
        "dns_requests": np.clip(np.random.poisson(2.8, n_per_class), 1, 8),
        "repeated_connections": np.clip(np.random.poisson(3.2, n_per_class), 1, 7),
        "persistence_indicator": np.random.choice([0.0, 1.0], size=n_per_class, p=[0.12, 0.88]),
        "label": np.full(n_per_class, 2, dtype=int),
    }

    # Combine into single DataFrame
    df = pd.concat([pd.DataFrame(c0), pd.DataFrame(c1), pd.DataFrame(c2)], ignore_index=True)

    # -----------------------------------------------------------------------
    # Add ~4% label noise (realistic labeling ambiguity & imperfect ground truth)
    # -----------------------------------------------------------------------
    noise_count = int(0.04 * len(df))
    noise_indices = np.random.choice(len(df), size=noise_count, replace=False)
    for idx in noise_indices:
        current_label = df.loc[idx, "label"]
        alternate_labels = [c for c in [0, 1, 2] if c != current_label]
        df.loc[idx, "label"] = np.random.choice(alternate_labels)

    # Round float features for clean representation
    df["file_entropy"] = df["file_entropy"].round(3)

    # Ensure columns strictly equal FEATURE_NAMES + ['label']
    expected_cols = list(FEATURE_NAMES) + ["label"]
    df = df[expected_cols]

    # Save CSV
    csv_path = Path(output_csv) if output_csv else (REPO_ROOT / "ml" / "dataset.csv")
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)

    # Write Dataset Card
    card_path = Path(output_card) if output_card else (REPO_ROOT / "ml" / "dataset_card.md")
    write_dataset_card(card_path, df)

    return df


def write_dataset_card(card_path: Path, df: pd.DataFrame) -> None:
    """Generate Markdown dataset card documenting generation method and limitations."""
    card_content = f"""# TrojanGuard Synthetic Dataset Card

## Overview
- **Type**: Purely Synthetic Telemetry & Static Feature Dataset
- **Total Rows**: {len(df)}
- **Class Balance**:
  - Class 0 (Benign): {(df['label'] == 0).sum()} rows ({((df['label'] == 0).sum() / len(df) * 100):.1f}%)
  - Class 1 (Suspicious): {(df['label'] == 1).sum()} rows ({((df['label'] == 1).sum() / len(df) * 100):.1f}%)
  - Class 2 (Trojan-like): {(df['label'] == 2).sum()} rows ({((df['label'] == 2).sum() / len(df) * 100):.1f}%)
- **Random Seed**: {RANDOM_SEED}
- **Label Noise**: ~4% random label assignment to simulate realistic labeling ambiguity

## Features ({len(FEATURE_NAMES)} total)
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
"""
    card_path.parent.mkdir(parents=True, exist_ok=True)
    card_path.write_text(card_content, encoding="utf-8")


if __name__ == "__main__":
    print(f"Generating synthetic dataset with seed {RANDOM_SEED}...")
    df = generate_synthetic_dataset()
    print(f"Saved {len(df)} rows to ml/dataset.csv and created ml/dataset_card.md.")
