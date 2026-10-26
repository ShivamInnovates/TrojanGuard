"""
TrojanGuard — Random Forest Model Predictor.

Responsibilities:
----------------
- Safely load the trained Random Forest model from ml/model.pkl.
- Validate model metadata (feature order matching config.FEATURE_NAMES and sklearn version).
- Validate input feature vectors (order, length, types, NaN/Inf).
- Enforce the static-only non-applicability rule:
  If behavioral or network telemetry is unobserved, return applicable=False with
  explanation rather than treating unobserved zero features as benign evidence.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Mapping

import joblib
import numpy as np
import sklearn
from sklearn.ensemble import RandomForestClassifier

from app.config import FEATURE_NAMES, MODEL_PATH
from app.analysis.feature_extractor import FeatureVector

META_PATH: Path = MODEL_PATH.parent / "model_meta.json"

CLASS_MAPPING: dict[int, str] = {0: "Benign", 1: "Suspicious", 2: "Trojan-like"}

# Behavioral and network features required for the ML model to be applicable
TELEMETRY_REQUIRED_FEATURES: tuple[str, ...] = (
    "process_count",
    "file_events",
    "network_connections",
    "dns_requests",
    "repeated_connections",
    "persistence_indicator",
)

# Cached singleton instances
_CACHED_MODEL: RandomForestClassifier | None = None
_CACHED_META: dict[str, Any] | None = None


def load_model(
    model_path: Path | str | None = None,
    meta_path: Path | str | None = None,
    force_reload: bool = False,
) -> tuple[RandomForestClassifier, dict[str, Any]]:
    """
    Load the trained model and verify metadata integrity.
    Only loads from verified local artifacts; never accepts model paths from user input.

    Parameters
    ----------
    model_path:
        Path to model.pkl (defaults to config.MODEL_PATH).
    meta_path:
        Path to model_meta.json (defaults to ml/model_meta.json).
    force_reload:
        If True, reloads bypassing the in-memory cache.

    Returns
    -------
    tuple[RandomForestClassifier, dict]:
        Loaded model and verified metadata.

    Raises
    ------
    FileNotFoundError:
        If model or metadata artifact does not exist.
    RuntimeError:
        If metadata validation fails (feature order mismatch or incompatible sklearn version).
    """
    global _CACHED_MODEL, _CACHED_META

    m_path = Path(model_path) if model_path else MODEL_PATH
    meta_p = Path(meta_path) if meta_path else META_PATH

    if not force_reload and _CACHED_MODEL is not None and _CACHED_META is not None:
        return _CACHED_MODEL, _CACHED_META

    if not m_path.exists():
        raise FileNotFoundError(f"Model artifact not found at {m_path}. Run ml/train.py first.")
    if not meta_p.exists():
        raise FileNotFoundError(f"Model metadata not found at {meta_p}. Run ml/train.py first.")

    # 1. Parse and validate metadata
    with open(meta_p, "r", encoding="utf-8") as f:
        meta = json.load(f)

    meta_features = meta.get("feature_order")
    if meta_features != list(FEATURE_NAMES):
        raise RuntimeError(
            f"Model feature order mismatch!\nExpected: {list(FEATURE_NAMES)}\nFound in meta: {meta_features}"
        )

    # Verify scikit-learn major.minor version compatibility
    meta_sklearn_ver = meta.get("sklearn_version", "")
    current_sklearn_ver = sklearn.__version__
    meta_major_minor = ".".join(meta_sklearn_ver.split(".")[:2])
    current_major_minor = ".".join(current_sklearn_ver.split(".")[:2])
    if meta_major_minor != current_major_minor:
        raise RuntimeError(
            f"scikit-learn version mismatch: model trained on {meta_sklearn_ver}, "
            f"current environment is {current_sklearn_ver}."
        )

    # 2. Load model from disk
    model = joblib.load(m_path)

    _CACHED_MODEL = model
    _CACHED_META = meta

    return model, meta


def validate_feature_input(
    features: FeatureVector | list[float] | dict[str, float] | Any,
) -> list[float]:
    """
    Validate feature input names, order, length, numeric types, and absence of NaN/Inf.

    Returns
    -------
    list[float]:
        Ordered list of 9 validated float values matching FEATURE_NAMES.

    Raises
    ------
    ValueError:
        If feature length, order, type, or values (NaN/Inf) are invalid.
    """
    if isinstance(features, FeatureVector):
        raw_list = features.feature_list
    elif isinstance(features, (list, tuple)):
        raw_list = list(features)
    elif isinstance(features, Mapping):
        # Validate all required feature names are present
        missing = [f for f in FEATURE_NAMES if f not in features]
        if missing:
            raise ValueError(f"Feature dictionary missing required features: {missing}")
        raw_list = [features[f] for f in FEATURE_NAMES]
    else:
        raise ValueError(
            f"Unsupported feature input type '{type(features).__name__}'. "
            f"Expected FeatureVector, list, or dict."
        )

    if len(raw_list) != len(FEATURE_NAMES):
        raise ValueError(
            f"Expected exactly {len(FEATURE_NAMES)} features, got {len(raw_list)}."
        )

    validated: list[float] = []
    for i, (name, val) in enumerate(zip(FEATURE_NAMES, raw_list)):
        if not isinstance(val, (int, float, np.number)):
            raise ValueError(
                f"Feature '{name}' (index {i}) must be numeric, got {type(val).__name__} ({val!r})."
            )
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            raise ValueError(f"Feature '{name}' (index {i}) contains invalid non-finite value: {f_val}")
        validated.append(f_val)

    return validated


def predict(
    features: FeatureVector | list[float] | dict[str, float],
    observed_mask: dict[str, bool] | None = None,
    model: RandomForestClassifier | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Produce classification prediction with confidence and applicability check.

    If behavioral or network features are unobserved (the static-only upload case),
    returns applicable=False with an explanatory reason and NO prediction.

    Parameters
    ----------
    features:
        Feature vector as FeatureVector instance, list of 9 floats, or dict.
    observed_mask:
        Mapping of feature name -> bool indicating if the feature was genuinely observed.
        If features is a FeatureVector, its internal observed_mask is used if this is None.
    model:
        Optional loaded model (defaults to cached loaded model).
    meta:
        Optional model metadata.

    Returns
    -------
    dict:
        {
            "applicable": bool,
            "predicted_class": int | None,
            "predicted_label": str | None,
            "class_probabilities": dict[str, float] | None,
            "confidence": float | None,
            "note": str,
        }
    """
    # Extract mask if FeatureVector was passed
    mask = observed_mask
    if mask is None and isinstance(features, FeatureVector):
        mask = features.observed_mask

    # 1. Check Telemetry Applicability
    # If mask is provided and any behavioral or network feature is unobserved,
    # the classifier cannot make a responsible prediction.
    if mask is not None:
        unobserved_telemetry = [f for f in TELEMETRY_REQUIRED_FEATURES if not mask.get(f, False)]
        if unobserved_telemetry:
            return {
                "applicable": False,
                "predicted_class": None,
                "predicted_label": None,
                "class_probabilities": None,
                "confidence": None,
                "note": "classifier requires behavioral and network telemetry; only static data available",
            }

    # 2. Validate input feature vector
    validated_list = validate_feature_input(features)

    # 3. Load model if not passed
    if model is None or meta is None:
        clf, loaded_meta = load_model()
    else:
        clf = model
        loaded_meta = meta

    # 4. Predict
    import pandas as pd
    X = pd.DataFrame([validated_list], columns=list(FEATURE_NAMES))
    probs = clf.predict_proba(X)[0]
    pred_idx = int(np.argmax(probs))
    pred_label = CLASS_MAPPING.get(pred_idx, f"Class_{pred_idx}")
    confidence = round(float(probs[pred_idx]), 4)

    prob_dict = {
        CLASS_MAPPING[i]: round(float(p), 4)
        for i, p in enumerate(probs)
    }

    return {
        "applicable": True,
        "predicted_class": pred_idx,
        "predicted_label": pred_label,
        "class_probabilities": prob_dict,
        "confidence": confidence,
        "note": f"Model classified as {pred_label} with {confidence * 100:.1f}% confidence on synthetic feature model.",
    }
