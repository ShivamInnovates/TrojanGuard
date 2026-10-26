"""
TrojanGuard — Random Forest Model Training.

Trains a Random Forest classifier on the synthetic feature dataset with
stratified 80/20 split and balanced class weighting.
Saves:
- ml/model.pkl (joblib)
- ml/model_meta.json (reproducibility metrics and evaluation details)
- ml/feature_names.json (locked feature list)
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split

# Add backend to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import (
    FEATURE_NAMES,
    FEATURE_NAMES_PATH,
    MODEL_PATH,
    RANDOM_SEED,
)

META_PATH: Path = REPO_ROOT / "ml" / "model_meta.json"
DATASET_PATH: Path = REPO_ROOT / "ml" / "dataset.csv"

CLASS_LABELS: list[str] = ["Benign", "Suspicious", "Trojan-like"]
CLASS_MAPPING: dict[int, str] = {0: "Benign", 1: "Suspicious", 2: "Trojan-like"}

SYNTHETIC_DISCLAIMER: str = (
    "These metrics were evaluated exclusively on synthetic demonstration data with "
    "artificially simulated telemetry and intentional statistical distributions. "
    "They validate the pipeline architecture and explainable feature-scoring integration, "
    "and say nothing about real-world malware detection performance or efficacy against "
    "in-the-wild evasive malware."
)


def compute_file_sha256(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def train_model(
    dataset_path: Path | str | None = None,
    model_output_path: Path | str | None = None,
    meta_output_path: Path | str | None = None,
    seed: int = RANDOM_SEED,
) -> tuple[RandomForestClassifier, dict[str, Any]]:
    """
    Train Random Forest classifier on dataset.csv and save model artifacts.

    Returns
    -------
    tuple[RandomForestClassifier, dict]:
        Fitted model and the metadata dictionary saved to model_meta.json.
    """
    csv_file = Path(dataset_path) if dataset_path else DATASET_PATH
    model_file = Path(model_output_path) if model_output_path else MODEL_PATH
    meta_file = Path(meta_output_path) if meta_output_path else META_PATH

    if not csv_file.exists():
        raise FileNotFoundError(f"Dataset not found at {csv_file}. Run generate_dataset.py first.")

    dataset_sha256 = compute_file_sha256(csv_file)
    df = pd.read_csv(csv_file)

    # Verify all expected feature columns exist
    missing_cols = [c for c in FEATURE_NAMES if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset missing required feature columns: {missing_cols}")
    if "label" not in df.columns:
        raise ValueError("Dataset missing 'label' target column.")

    X = df[FEATURE_NAMES]
    y = df["label"].astype(int)

    # Stratified 80/20 train/test split with deterministic seed
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=seed,
        stratify=y,
    )

    # Train Random Forest classifier
    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=seed,
        class_weight="balanced",
        max_depth=12,
        min_samples_split=4,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Evaluation
    y_pred = clf.predict(X_test)
    test_acc = float(accuracy_score(y_test, y_pred))

    report = classification_report(
        y_test,
        y_pred,
        target_names=CLASS_LABELS,
        output_dict=True,
        zero_division=0,
    )

    cm = confusion_matrix(y_test, y_pred).tolist()

    # Feature importances
    importances = {
        name: round(float(imp), 4)
        for name, imp in zip(FEATURE_NAMES, clf.feature_importances_)
    }

    per_class_metrics = {}
    for label in CLASS_LABELS:
        if label in report:
            per_class_metrics[label] = {
                "precision": round(float(report[label]["precision"]), 4),
                "recall": round(float(report[label]["recall"]), 4),
                "f1_score": round(float(report[label]["f1-score"]), 4),
                "support": int(report[label]["support"]),
            }

    meta = {
        "model_type": "RandomForestClassifier",
        "random_state": seed,
        "sklearn_version": sklearn.__version__,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_sha256": dataset_sha256,
        "feature_order": list(FEATURE_NAMES),
        "class_labels": CLASS_LABELS,
        "class_mapping": {str(k): v for k, v in CLASS_MAPPING.items()},
        "row_counts": {
            "total": len(df),
            "train": len(X_train),
            "test": len(X_test),
            "per_class": {str(k): int(v) for k, v in y.value_counts().items()},
        },
        "test_accuracy": round(test_acc, 4),
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm,
        "feature_importances": importances,
        "synthetic_disclaimer": SYNTHETIC_DISCLAIMER,
    }

    # Save artifacts
    model_file.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, model_file)

    meta_file.parent.mkdir(parents=True, exist_ok=True)
    meta_file.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Also save feature_names.json for external readers
    FEATURE_NAMES_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEATURE_NAMES_PATH.write_text(json.dumps(list(FEATURE_NAMES), indent=2), encoding="utf-8")

    return clf, meta


if __name__ == "__main__":
    print(f"Training Random Forest classifier (seed={RANDOM_SEED})...")
    _, meta = train_model()
    print("Training complete.")
    print(f"Test Accuracy: {meta['test_accuracy'] * 100:.2f}%")
    print("Confusion Matrix:")
    for row in meta["confusion_matrix"]:
        print(" ", row)
    print("Feature Importances:")
    for feat, imp in meta["feature_importances"].items():
        print(f"  {feat:22s}: {imp:.4f}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metadata saved to: {META_PATH}")
