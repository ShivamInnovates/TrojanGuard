"""
TrojanGuard — Phase 5b Real Data Model Tests.

Tests:
1. prepare_dataset() logic with tiny synthetic CSV: filtering Benign & Trojan,
   ignoring Ransomware/Spyware, parsing category strings, removing exact duplicates
   and zero-variance columns.
2. real_predictor feature validation: rejects missing columns, extra invalid types, NaN/Inf.
3. Probability band mapping [0.35, 0.65].
4. API endpoints:
   - GET /api/model/real/metrics: 200 after training, 404 when metrics file absent.
   - POST /api/model/real/predict: valid JSON prediction, valid CSV prediction,
     422 on missing/invalid columns, 422 on empty file, 413 on >10 MB file.
"""
import io
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.ml.real_predictor import (
    determine_probability_band,
    get_real_feature_names,
    predict_real_features,
)
from ml.real.prepare import parse_category_string, prepare_dataset


def test_parse_category_string():
    """Verify parsing of category strings into type, family, hash, run_id."""
    benign_type, benign_family, benign_hash, benign_run = parse_category_string("Benign")
    assert benign_type == "Benign"
    assert benign_family == "Benign"
    assert benign_hash == ""
    assert benign_run == ""

    t_type, t_family, t_hash, t_run = parse_category_string(
        "Trojan-Emotet-a1b2c3d4e5f6-7.raw"
    )
    assert t_type == "Trojan"
    assert t_family == "Emotet"
    assert t_hash == "a1b2c3d4e5f6"
    assert t_run == "7"


def test_prepare_filtering_with_synthetic_csv(tmp_path):
    """Verify prepare_dataset filtering on a tiny synthetic dataset."""
    fake_csv = tmp_path / "tiny_malmem.csv"
    # Create CSV with 5 rows: 1 Benign, 2 Trojans (1 duplicate), 1 Ransomware, 1 Spyware
    header = "Category,Class,feat1,feat2,feat_zero_var\n"
    rows = [
        "Benign,Benign,10.0,20.0,5.0\n",
        "Trojan-Emotet-hash1-1.raw,Malware,15.0,25.0,5.0\n",
        "Trojan-Emotet-hash1-2.raw,Malware,15.0,25.0,5.0\n",  # exact duplicate features
        "Ransomware-WannaCry-hash2-1.raw,Malware,50.0,60.0,5.0\n",  # should be excluded
        "Spyware-Gator-hash3-1.raw,Malware,70.0,80.0,5.0\n",       # should be excluded
    ]
    fake_csv.write_text(header + "".join(rows), encoding="utf-8")

    df_cleaned, active_features, meta = prepare_dataset(
        csv_path=fake_csv,
        export_cleaned=False,
    )

    assert meta["total_raw_rows"] == 5
    # Ransomware and Spyware excluded -> 3 rows before dedup
    assert meta["filtered_rows_before_dedup"] == 3
    # 1 duplicate dropped -> 2 final clean rows
    assert meta["dropped_duplicates"] == 1
    assert len(df_cleaned) == 2
    # feat_zero_var dropped
    assert "feat_zero_var" in meta["zero_variance_columns"]
    assert "feat_zero_var" not in active_features
    assert "feat1" in active_features
    assert "feat2" in active_features


def test_probability_band_mapping():
    """Verify calibrated probability band boundaries."""
    band_low, _ = determine_probability_band(0.10)
    assert band_low == "Benign"

    band_edge_low, _ = determine_probability_band(0.349)
    assert band_edge_low == "Benign"

    band_mid_1, _ = determine_probability_band(0.35)
    assert band_mid_1 == "Suspicious"

    band_mid_2, _ = determine_probability_band(0.65)
    assert band_mid_2 == "Suspicious"

    band_high, _ = determine_probability_band(0.651)
    assert band_high == "Trojan-like"

    band_max, _ = determine_probability_band(1.0)
    assert band_max == "Trojan-like"


def test_predict_real_features_validation():
    """Verify feature vector validation rejects missing features or NaN/Inf."""
    expected_features = get_real_feature_names()
    assert len(expected_features) == 51

    # Missing features
    incomplete_dict = {f: 1.0 for f in expected_features[:20]}
    with pytest.raises(ValueError, match="Missing.*required memory-forensics features"):
        predict_real_features(incomplete_dict)

    # Valid complete dictionary
    valid_dict = {f: 1.0 for f in expected_features}
    result = predict_real_features(valid_dict)
    assert "trojan_probability" in result
    assert "probability_band" in result
    assert result["features_evaluated"] == 51

    # NaN value rejection
    nan_dict = {f: 1.0 for f in expected_features}
    nan_dict[expected_features[0]] = float("nan")
    with pytest.raises(ValueError, match="invalid value"):
        predict_real_features(nan_dict)

    # Inf value rejection
    inf_dict = {f: 1.0 for f in expected_features}
    inf_dict[expected_features[1]] = float("inf")
    with pytest.raises(ValueError, match="invalid value"):
        predict_real_features(inf_dict)


def test_api_real_metrics_endpoint(test_client: TestClient):
    """Verify GET /api/model/real/metrics returns structured evaluations."""
    resp = test_client.get("/api/model/real/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "dataset" in data
    assert "evaluations" in data
    assert "eval_a_random_stratified" in data["evaluations"]
    assert "eval_b_grouped_sample_hash" in data["evaluations"]
    assert "headline_recommendation" in data
    assert "robustness_ablation" in data
    assert "eval_b_comparison" in data["robustness_ablation"]
    assert "eval_c_comparison" in data["robustness_ablation"]
    assert "artifact_verification_stats" in data["dataset"]


def test_api_real_metrics_404_when_missing(monkeypatch, test_client: TestClient):
    """Verify GET /api/model/real/metrics returns 404 when metrics are absent."""
    import app.ml.real_predictor as rp
    monkeypatch.setattr(rp, "get_real_metrics", lambda: None)
    resp = test_client.get("/api/model/real/metrics")
    assert resp.status_code == 404
    assert "not available" in resp.json()["detail"].lower()


def test_api_real_predict_json(test_client: TestClient):
    """Verify POST /api/model/real/predict with JSON payload."""
    features = {f: 1.0 for f in get_real_feature_names()}
    # Test wrapped format: { "features": { ... } }
    resp = test_client.post("/api/model/real/predict", json={"features": features})
    assert resp.status_code == 200
    data = resp.json()
    assert "trojan_probability" in data
    assert "probability_band" in data
    assert data["features_evaluated"] == 51

    # Missing column -> 422
    del features[get_real_feature_names()[0]]
    resp_bad = test_client.post("/api/model/real/predict", json={"features": features})
    assert resp_bad.status_code == 422


def test_api_real_predict_csv_upload(test_client: TestClient):
    """Verify POST /api/model/real/predict with CSV file upload."""
    feature_names = get_real_feature_names()
    header = ",".join(feature_names) + "\n"
    values = ",".join(["1.0"] * len(feature_names)) + "\n"
    csv_bytes = (header + values).encode("utf-8")

    files = {"file": ("features.csv", csv_bytes, "text/csv")}
    resp = test_client.post("/api/model/real/predict", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert "trojan_probability" in data
    assert data["features_evaluated"] == 51

    # Empty file -> 422
    empty_files = {"file": ("empty.csv", b"", "text/csv")}
    resp_empty = test_client.post("/api/model/real/predict", files=empty_files)
    assert resp_empty.status_code == 422

    # Oversized file (>10 MB) -> 413
    huge_bytes = b"0" * (10 * 1024 * 1024 + 1024)
    huge_files = {"file": ("huge.csv", huge_bytes, "text/csv")}
    resp_huge = test_client.post("/api/model/real/predict", files=huge_files)
    assert resp_huge.status_code == 413


def test_ablation_test_set_sizes_match_evaluations(test_client: TestClient):
    """Assert that the ablation test-set sizes equal the corresponding evaluation's test-set sizes."""
    resp = test_client.get("/api/model/real/metrics")
    assert resp.status_code == 200
    data = resp.json()

    # Evaluation B comparison test-set sizes
    eval_b = data["evaluations"]["eval_b_grouped_sample_hash"]
    eval_b_test_size = eval_b["test_size"]
    cm_b = eval_b["confusion_matrix"]
    expected_benign_b = cm_b[0][0] + cm_b[0][1]
    expected_trojan_b = cm_b[1][0] + cm_b[1][1]
    assert expected_benign_b + expected_trojan_b == eval_b_test_size

    # Must equal Evaluation B's grouped split counts (5855 benign and 1825 trojan)
    assert expected_benign_b == 5855
    assert expected_trojan_b == 1825

    ablation_b = data["robustness_ablation"]["eval_b_comparison"]
    assert ablation_b["test_total_count"] == eval_b_test_size
    assert ablation_b["test_benign_count"] == expected_benign_b
    assert ablation_b["test_trojan_count"] == expected_trojan_b

    # Verify each condition within Evaluation B ablation shares the exact same test-set sizes
    for cond in ["full_features", "no_svcscan", "no_top5"]:
        assert ablation_b[cond]["test_benign_count"] == expected_benign_b
        assert ablation_b[cond]["test_trojan_count"] == expected_trojan_b

    # Evaluation C comparison test-set sizes
    eval_c = data["evaluations"]["eval_c_leave_one_family_out"]
    ablation_c = data["robustness_ablation"]["eval_c_comparison"]
    for family, res in eval_c["per_family_results"].items():
        assert ablation_c["full_features"]["per_family_test_counts"][family] == res["test_count"]
        assert ablation_c["no_svcscan"]["per_family_test_counts"][family] == res["test_count"]
        assert ablation_c["no_top5"]["per_family_test_counts"][family] == res["test_count"]

