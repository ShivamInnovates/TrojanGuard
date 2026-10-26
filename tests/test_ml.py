"""
TrojanGuard — Phase 4 ML Pipeline Tests.

Tests:
1. Training runs on a small temporary dataset and produces a loadable model.
2. Fixed seed yields 100% reproducible metrics (accuracy, confusion matrix, importances).
3. Predictor outputs valid probabilities summing to ~1.0 with confidence score.
4. Predictor rejects wrong feature counts, missing features, NaN, and Inf.
5. Predictor returns applicable=False when behavioral or network features are unobserved.
6. Scenario feature vectors from extract_features produce applicable predictions;
   prints which class each scenario gets without asserting specific classes.
"""
from pathlib import Path
import json
import math
import numpy as np
import pandas as pd
import pytest
import joblib

from app.config import FEATURE_NAMES, MODEL_PATH, RANDOM_SEED
from app.ml.predictor import predict, load_model, validate_feature_input
from ml.train import train_model, META_PATH
from app.analysis.static import StaticResult
from app.analysis.behavior import generate_behavior_events
from app.analysis.network import generate_network_events
from app.analysis.feature_extractor import extract_features, FeatureVector


# ---------------------------------------------------------------------------
# 1. Training runs on small temp dataset and produces loadable model
# ---------------------------------------------------------------------------
def test_training_on_temp_dataset(tmp_path: Path):
    temp_csv = tmp_path / "small_dataset.csv"
    temp_model = tmp_path / "model.pkl"
    temp_meta = tmp_path / "model_meta.json"

    # Create small 30-row balanced dataset (10 per class)
    rows = []
    for label in (0, 1, 2):
        for i in range(10):
            row = {feat: float(i + label * 2) for feat in FEATURE_NAMES}
            row["label"] = label
            rows.append(row)

    pd.DataFrame(rows).to_csv(temp_csv, index=False)

    clf, meta = train_model(
        dataset_path=temp_csv,
        model_output_path=temp_model,
        meta_output_path=temp_meta,
        seed=42,
    )

    assert temp_model.exists()
    assert temp_meta.exists()
    assert meta["row_counts"]["total"] == 30
    assert meta["row_counts"]["train"] == 24
    assert meta["row_counts"]["test"] == 6

    # Verify model is loadable
    loaded = joblib.load(temp_model)
    test_vec = [1.0] * len(FEATURE_NAMES)
    pred = loaded.predict(pd.DataFrame([test_vec], columns=FEATURE_NAMES))
    assert pred[0] in (0, 1, 2)


# ---------------------------------------------------------------------------
# 2. Fixed seed yields identical metrics across runs
# ---------------------------------------------------------------------------
def test_reproducibility_same_seed_gives_identical_metrics(tmp_path: Path):
    temp_csv = tmp_path / "repro_dataset.csv"
    m1_path = tmp_path / "m1.pkl"
    meta1_path = tmp_path / "meta1.json"
    m2_path = tmp_path / "m2.pkl"
    meta2_path = tmp_path / "meta2.json"

    # 60-row dataset
    rows = []
    for label in (0, 1, 2):
        for i in range(20):
            row = {feat: float((i * 1.5) + label) for feat in FEATURE_NAMES}
            row["label"] = label
            rows.append(row)
    pd.DataFrame(rows).to_csv(temp_csv, index=False)

    _, meta1 = train_model(temp_csv, m1_path, meta1_path, seed=42)
    _, meta2 = train_model(temp_csv, m2_path, meta2_path, seed=42)

    assert meta1["test_accuracy"] == meta2["test_accuracy"]
    assert meta1["confusion_matrix"] == meta2["confusion_matrix"]
    assert meta1["feature_importances"] == meta2["feature_importances"]
    assert meta1["per_class_metrics"] == meta2["per_class_metrics"]


# ---------------------------------------------------------------------------
# 3. Predictor outputs valid probabilities summing to ~1.0
# ---------------------------------------------------------------------------
def test_predictor_valid_probabilities_sum_to_one():
    # Pass fully observed feature vector
    mask = {f: True for f in FEATURE_NAMES}
    test_features = {
        "file_entropy": 4.5,
        "import_count": 30.0,
        "suspicious_imports": 1.0,
        "process_count": 2.0,
        "file_events": 3.0,
        "network_connections": 2.0,
        "dns_requests": 1.0,
        "repeated_connections": 0.0,
        "persistence_indicator": 0.0,
    }

    res = predict(features=test_features, observed_mask=mask)

    assert res["applicable"] is True
    assert res["predicted_class"] in (0, 1, 2)
    assert res["predicted_label"] in ("Benign", "Suspicious", "Trojan-like")
    assert 0.0 <= res["confidence"] <= 1.0

    probs = res["class_probabilities"]
    assert len(probs) == 3
    assert set(probs.keys()) == {"Benign", "Suspicious", "Trojan-like"}
    prob_sum = sum(probs.values())
    assert prob_sum == pytest.approx(1.0, abs=1e-3)


# ---------------------------------------------------------------------------
# 4. Predictor rejects wrong feature counts, missing features, NaN, and Inf
# ---------------------------------------------------------------------------
def test_predictor_validation_rejects_malformed_inputs():
    mask = {f: True for f in FEATURE_NAMES}

    # 1. Missing feature in dictionary
    incomplete_dict = {f: 1.0 for f in FEATURE_NAMES[:-1]}
    with pytest.raises(ValueError, match="missing required features"):
        predict(incomplete_dict, observed_mask=mask)

    # 2. Too few features in list
    short_list = [1.0] * 8
    with pytest.raises(ValueError, match="Expected exactly 9 features"):
        predict(short_list, observed_mask=mask)

    # 3. Too many features in list
    long_list = [1.0] * 10
    with pytest.raises(ValueError, match="Expected exactly 9 features"):
        predict(long_list, observed_mask=mask)

    # 4. NaN in feature list
    nan_list = [1.0] * 8 + [float("nan")]
    with pytest.raises(ValueError, match="invalid non-finite value"):
        predict(nan_list, observed_mask=mask)

    # 5. Inf in feature dict
    inf_dict = {f: 1.0 for f in FEATURE_NAMES}
    inf_dict["file_entropy"] = float("inf")
    with pytest.raises(ValueError, match="invalid non-finite value"):
        predict(inf_dict, observed_mask=mask)

    # 6. Non-numeric value
    str_list = [1.0] * 8 + ["bad_value"]
    with pytest.raises(ValueError, match="must be numeric"):
        predict(str_list, observed_mask=mask)


# ---------------------------------------------------------------------------
# 5. Predictor returns applicable=False when telemetry is unobserved
# ---------------------------------------------------------------------------
def test_predictor_unobserved_mask_returns_not_applicable():
    # Simulate static-only analysis: entropy & imports observed, telemetry unobserved
    static_only_mask = {
        "file_entropy": True,
        "import_count": True,
        "suspicious_imports": True,
        "process_count": False,
        "file_events": False,
        "network_connections": False,
        "dns_requests": False,
        "repeated_connections": False,
        "persistence_indicator": False,
    }
    features = [6.5, 40.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

    res = predict(features=features, observed_mask=static_only_mask)

    assert res["applicable"] is False
    assert res["predicted_class"] is None
    assert res["predicted_label"] is None
    assert res["class_probabilities"] is None
    assert res["confidence"] is None
    assert "classifier requires behavioral and network telemetry" in res["note"]


# ---------------------------------------------------------------------------
# 6. Scenario vectors from extract_features produce applicable predictions
# ---------------------------------------------------------------------------
def test_scenario_feature_vectors_predictable():
    """
    Build scenario feature vectors using extract_features and verify they produce
    applicable predictions. Prints predicted class per scenario (do not assert
    specific classes here, since the risk engine decides final classification).
    """
    scenario_configs = {
        "normal": {"size": 1024, "entropy": 4.2, "imports": 18, "susp_imports": 0},
        "suspicious": {"size": 2048, "entropy": 5.8, "imports": 45, "susp_imports": 2},
        "trojan": {"size": 8192, "entropy": 7.4, "imports": 85, "susp_imports": 6},
    }

    print("\n--- Scenario ML Predictions ---")
    for sc, cfg in scenario_configs.items():
        b_events = generate_behavior_events(sc, seed=42)
        n_events = generate_network_events(sc, seed=42)
        static_res = StaticResult(
            filename=f"demo_{sc}.exe",
            file_size=cfg["size"],
            sha256="ff" * 32,
            entropy=cfg["entropy"],
            file_type="PE",
            is_pe=True,
            observed_features=["file_entropy", "import_count", "suspicious_imports"],
            import_count=cfg["imports"],
            suspicious_import_count=cfg["susp_imports"],
        )

        fv = extract_features(static_res, b_events, n_events)
        res = predict(fv)

        assert res["applicable"] is True
        print(f"Scenario '{sc:10s}' -> Predicted: {res['predicted_label']} "
              f"(class={res['predicted_class']}, confidence={res['confidence']:.2%}, "
              f"probs={res['class_probabilities']})")
