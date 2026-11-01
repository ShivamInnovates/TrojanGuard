"""
TrojanGuard — CIC-MalMem-2022 Data Preparation Pipeline (Phase 5b).

Features:
- Records raw CSV SHA-256 checksum and total rows.
- Filters strictly for Benign rows and Trojan rows (case-insensitive on Category).
- Decomposes Trojan Category strings into: malware_type, family, sample_hash, run_id.
- Validates numerical features, handles NaN / Inf values.
- Identifies and drops exact duplicate feature vectors BEFORE any split.
- Identifies and drops zero-variance features BEFORE any split.
- Exports cleaned metadata and feature names for reproducible training.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Tuple, List, Dict, Any

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_CSV_PATH = PROJECT_ROOT / "ml" / "data" / "raw" / "Obfuscated-MalMem2022.csv"
CLEAN_CSV_PATH = PROJECT_ROOT / "ml" / "real" / "dataset_cleaned.csv"
FEATURE_NAMES_PATH = PROJECT_ROOT / "ml" / "real" / "feature_names_real.json"
PREPARE_META_PATH = PROJECT_ROOT / "ml" / "real" / "prepare_meta.json"


def compute_sha256(filepath: Path | str) -> str:
    """Compute hex SHA-256 digest of a local file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def parse_category_string(cat_str: str) -> Tuple[str, str, str, str]:
    """
    Parse Category into (type, family, sample_hash, run_id).
    Expected malware pattern: <Type>-<Family>-<SampleHash>-<RunId>.raw
    Benign rows return ('Benign', 'Benign', '', '')
    """
    if not isinstance(cat_str, str) or cat_str.strip().lower() == "benign":
        return "Benign", "Benign", "", ""
    parts = cat_str.strip().split("-")
    m_type = parts[0] if len(parts) > 0 else "Unknown"
    m_family = parts[1] if len(parts) > 1 else "Unknown"
    m_hash = parts[2] if len(parts) > 2 else ""
    m_run = parts[3].replace(".raw", "") if len(parts) > 3 else ""
    return m_type, m_family, m_hash, m_run


def prepare_dataset(
    csv_path: Path | str = RAW_CSV_PATH,
    export_cleaned: bool = True,
) -> Tuple[pd.DataFrame, List[str], Dict[str, Any]]:
    """
    Load, filter, clean, and preprocess the raw CIC-MalMem-2022 dataset.
    Returns: (preprocessed_df, active_feature_names, preparation_metadata)
    """
    path = Path(csv_path)
    if not path.is_file():
        raise FileNotFoundError(f"Raw dataset file not found at: {path}")

    sha256_hash = compute_sha256(path)
    print(f"[*] Reading untrusted CSV: {path.name}")
    print(f"[*] SHA-256: {sha256_hash}")

    df_raw = pd.read_csv(path)
    total_raw_rows = len(df_raw)
    total_raw_cols = len(df_raw.columns)
    print(f"[*] Raw rows: {total_raw_rows:,}, Raw columns: {total_raw_cols}")

    # Verify column presence
    if "Category" not in df_raw.columns and "Class" not in df_raw.columns:
        raise ValueError("Dataset missing required label columns ('Category' or 'Class').")

    # Filter strictly for Benign and Trojan rows (case-insensitive)
    benign_mask = (df_raw["Class"].str.lower() == "benign") | (df_raw["Category"].str.lower() == "benign")
    trojan_mask = df_raw["Category"].str.contains("trojan", case=False, na=False)
    df_filtered = df_raw[benign_mask | trojan_mask].copy().reset_index(drop=True)

    filtered_row_count = len(df_filtered)
    benign_raw_count = int(benign_mask.sum())
    trojan_raw_count = int(trojan_mask.sum())
    excluded_count = total_raw_rows - filtered_row_count
    print(f"[*] Filtered subset: {filtered_row_count:,} rows ({benign_raw_count:,} Benign, {trojan_raw_count:,} Trojan; {excluded_count:,} other malware excluded)")

    # Parse Category metadata
    parsed = df_filtered["Category"].apply(parse_category_string)
    df_filtered["malware_type"] = [p[0] for p in parsed]
    df_filtered["family"] = [p[1] for p in parsed]
    df_filtered["sample_hash"] = [p[2] for p in parsed]
    df_filtered["run_id"] = [p[3] for p in parsed]
    df_filtered["label"] = df_filtered["Category"].apply(lambda x: 0 if str(x).lower() == "benign" else 1)

    # Identify numerical feature columns
    meta_cols = {"Category", "Class", "malware_type", "family", "sample_hash", "run_id", "label"}
    raw_feature_cols = [c for c in df_raw.columns if c not in meta_cols]
    print(f"[*] Raw numerical feature columns: {len(raw_feature_cols)}")

    # Check for NaN / Inf values and sanitize
    nan_count = int(df_filtered[raw_feature_cols].isna().sum().sum())
    inf_count = int(np.isinf(df_filtered[raw_feature_cols].values).sum())
    if nan_count > 0 or inf_count > 0:
        print(f"[!] Warning: Found {nan_count} NaNs and {inf_count} Infs in feature columns. Imputing...")
        df_filtered[raw_feature_cols] = df_filtered[raw_feature_cols].replace([np.inf, -np.inf], np.nan)
        df_filtered[raw_feature_cols] = df_filtered[raw_feature_cols].fillna(df_filtered[raw_feature_cols].median())

    # Drop exact duplicate rows on raw_feature_cols BEFORE any split
    pre_dupe_count = len(df_filtered)
    df_filtered = df_filtered.drop_duplicates(subset=raw_feature_cols, keep="first").reset_index(drop=True)
    dropped_duplicates = pre_dupe_count - len(df_filtered)
    print(f"[*] Exact duplicate rows dropped: {dropped_duplicates}")

    # Drop zero-variance columns BEFORE any split
    variances = df_filtered[raw_feature_cols].var()
    zero_var_cols = variances[variances == 0].index.tolist()
    active_feature_cols = [c for c in raw_feature_cols if c not in zero_var_cols]
    print(f"[*] Zero-variance columns dropped ({len(zero_var_cols)}): {zero_var_cols}")
    print(f"[*] Active predictor features: {len(active_feature_cols)}")

    # Final class and family distribution
    final_benign = int((df_filtered["label"] == 0).sum())
    final_trojan = int((df_filtered["label"] == 1).sum())
    family_distribution = df_filtered[df_filtered["label"] == 1]["family"].value_counts().to_dict()

    print("\n[*] Final Class Balance:")
    print(f"    - Benign: {final_benign:,} ({final_benign / len(df_filtered):.2%})")
    print(f"    - Trojan: {final_trojan:,} ({final_trojan / len(df_filtered):.2%})")
    print("    - Trojan Families:", family_distribution)

    meta = {
        "dataset_name": "CIC-MalMem-2022 (Obfuscated Malware Memory Dataset)",
        "csv_filename": path.name,
        "csv_sha256": sha256_hash,
        "total_raw_rows": total_raw_rows,
        "total_raw_columns": total_raw_cols,
        "filtered_rows_before_dedup": filtered_row_count,
        "dropped_duplicates": dropped_duplicates,
        "zero_variance_columns": zero_var_cols,
        "total_active_features": len(active_feature_cols),
        "final_clean_rows": len(df_filtered),
        "class_balance": {
            "Benign": final_benign,
            "Trojan": final_trojan,
        },
        "trojan_family_distribution": family_distribution,
        "unique_trojan_hashes": int(df_filtered[df_filtered["label"] == 1]["sample_hash"].nunique()),
    }

    if export_cleaned:
        os.makedirs(FEATURE_NAMES_PATH.parent, exist_ok=True)
        with open(FEATURE_NAMES_PATH, "w", encoding="utf-8") as f:
            json.dump(active_feature_cols, f, indent=2)
        with open(PREPARE_META_PATH, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        df_filtered.to_csv(CLEAN_CSV_PATH, index=False)
        print(f"[*] Exported {len(active_feature_cols)} feature names to: {FEATURE_NAMES_PATH.name}")
        print(f"[*] Exported prepare metadata to: {PREPARE_META_PATH.name}")
        print(f"[*] Saved clean dataset to: {CLEAN_CSV_PATH.name}")

    return df_filtered, active_feature_cols, meta


if __name__ == "__main__":
    prepare_dataset()
