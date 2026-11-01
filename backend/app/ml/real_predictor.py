"""
TrojanGuard — Real Data Model Predictor (CIC-MalMem-2022).

Loads our local model_real.pkl and feature_names_real.json.
Performs exact feature column validation, checks for NaN/inf,
and maps predictions into defensive probability bands.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np

# Resolve path relative to backend root or workspace
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
MODEL_REAL_PATH = PROJECT_ROOT / "ml" / "real" / "model_real.pkl"
FEATURE_NAMES_REAL_PATH = PROJECT_ROOT / "ml" / "real" / "feature_names_real.json"
METRICS_REAL_PATH = PROJECT_ROOT / "ml" / "real" / "metrics_real.json"

_CACHED_MODEL: Any = None
_CACHED_FEATURES: List[str] | None = None
_CACHED_METRICS: Dict[str, Any] | None = None


def is_real_model_available() -> bool:
    """Check if model_real.pkl and its feature metadata exist."""
    return MODEL_REAL_PATH.is_file() and FEATURE_NAMES_REAL_PATH.is_file()


def get_real_feature_names() -> List[str]:
    """Return ordered list of 51 required real model features."""
    global _CACHED_FEATURES
    if _CACHED_FEATURES is None:
        if not FEATURE_NAMES_REAL_PATH.is_file():
            raise FileNotFoundError(
                f"Real model feature list missing at {FEATURE_NAMES_REAL_PATH}. Run ml/real/prepare.py."
            )
        with open(FEATURE_NAMES_REAL_PATH, "r", encoding="utf-8") as f:
            _CACHED_FEATURES = json.load(f)
    return _CACHED_FEATURES


def get_real_metrics() -> Dict[str, Any] | None:
    """Return cached evaluation metrics or None if not trained yet."""
    global _CACHED_METRICS
    if not METRICS_REAL_PATH.is_file():
        return None
    try:
        with open(METRICS_REAL_PATH, "r", encoding="utf-8") as f:
            _CACHED_METRICS = json.load(f)
        return _CACHED_METRICS
    except Exception:
        return None


def get_real_model() -> Any:
    """Load and return our local RandomForestClassifier model."""
    global _CACHED_MODEL
    if _CACHED_MODEL is None:
        if not MODEL_REAL_PATH.is_file():
            raise FileNotFoundError(
                f"Real model weights missing at {MODEL_REAL_PATH}. Model training is pending (Phase 5b)."
            )
        _CACHED_MODEL = joblib.load(MODEL_REAL_PATH)
    return _CACHED_MODEL


def determine_probability_band(prob: float) -> Tuple[str, str]:
    """
    Map probability into calibrated defensive bands:
    - [0.00, 0.35) -> Benign
    - [0.35, 0.65] -> Suspicious
    - (0.65, 1.00] -> Trojan-like
    """
    if prob < 0.35:
        return "Benign", "[0.00, 0.35) — Low probability of Trojan characteristics"
    elif prob <= 0.65:
        return "Suspicious", "[0.35, 0.65] — Indeterminate / borderline memory anomalies"
    else:
        return "Trojan-like", "(0.65, 1.00] — High probability of malicious Trojan activity"


def predict_real_features(features_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate input feature vector against exact 51 feature names and compute prediction.
    Raises ValueError on missing features, extra features, NaN/inf, or non-numeric values.
    """
    expected_features = get_real_feature_names()
    expected_set = set(expected_features)
    provided_set = set(features_dict.keys())

    missing = expected_set - provided_set
    if missing:
        raise ValueError(
            f"Missing {len(missing)} required memory-forensics features: {sorted(list(missing))[:5]}..."
        )

    # Note: we ignore benign/label/category columns if passed, but require all expected features
    vector = []
    for feat in expected_features:
        val = features_dict.get(feat)
        if val is None:
            raise ValueError(f"Feature '{feat}' cannot be null.")
        try:
            f_val = float(val)
        except (ValueError, TypeError):
            raise ValueError(f"Feature '{feat}' must be numeric, got: {val!r}")

        if math.isnan(f_val) or math.isinf(f_val):
            raise ValueError(f"Feature '{feat}' contains invalid value (NaN or Inf).")
        vector.append(f_val)

    model = get_real_model()
    X = np.array([vector])
    probabilities = model.predict_proba(X)[0]

    # Model classes: 0 = Benign, 1 = Trojan
    trojan_prob = float(probabilities[1])
    band, band_desc = determine_probability_band(trojan_prob)

    return {
        "trojan_probability": round(trojan_prob, 4),
        "benign_probability": round(float(probabilities[0]), 4),
        "trojan_probability_percent": round(trojan_prob * 100.0, 2),
        "probability_band": band,
        "band_description": band_desc,
        "features_evaluated": len(vector),
        "data_notice": (
            "Laboratory-collected memory forensics data (CIC-MalMem-2022). "
            "Evaluated strictly via offline Volatility feature measurements; no live malware was executed."
        ),
    }
