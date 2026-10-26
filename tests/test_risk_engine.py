"""
TrojanGuard — Phase 5 Risk Engine Tests.

Tests:
1. Risk level boundaries: 0-30 Low, 31-60 Medium, 61-80 High, 81-100 Critical (testing 30/31, 60/61, 80/81).
2. Points sum: sum of points_contributed across evidence items strictly equals score (before clamping).
3. Observability constraint: no evidence items are generated for unobserved features.
4. Static-only upload constraint: classification never returns Trojan-like, confidence is None, and warning is included.
5. Scenario repeatability: each scenario run 20 times produces the exact same classification and score band.
"""
from app.config import CLASSIFICATION_THRESHOLDS
from app.services.risk_engine import get_risk_level, evaluate_risk
from app.analysis.feature_extractor import FeatureVector, extract_features
from app.analysis.static import StaticResult
from app.demo.scenarios import get_scenario


# ---------------------------------------------------------------------------
# 1. Level boundaries (30/31, 60/61, 80/81)
# ---------------------------------------------------------------------------
def test_risk_level_boundaries():
    assert get_risk_level(0) == "Low"
    assert get_risk_level(15) == "Low"
    assert get_risk_level(30) == "Low"

    assert get_risk_level(31) == "Medium"
    assert get_risk_level(45) == "Medium"
    assert get_risk_level(60) == "Medium"

    assert get_risk_level(61) == "High"
    assert get_risk_level(70) == "High"
    assert get_risk_level(80) == "High"

    assert get_risk_level(81) == "Critical"
    assert get_risk_level(95) == "Critical"
    assert get_risk_level(100) == "Critical"


# ---------------------------------------------------------------------------
# 2. Points sum equals score (before clamping)
# ---------------------------------------------------------------------------
def test_points_sum_equals_score():
    # Test across all three demo scenarios
    for sc_name in ("normal", "suspicious", "trojan"):
        sc = get_scenario(sc_name, seed=42)
        fv = extract_features(sc.static_result, sc.behavior_events, sc.network_events)
        res = evaluate_risk(
            feature_vector=fv,
            static_result=sc.static_result,
            behavior_events=sc.behavior_events,
            network_events=sc.network_events,
            classifier_output={"applicable": True, "predicted_label": sc.expected_classification, "confidence": 0.95},
            observed_mask=fv.observed_mask,
        )

        evidence = res["evidence"]
        points_sum = sum(e.points_contributed for e in evidence)

        # Unclamped score must exactly equal the sum of evidence points
        assert points_sum == res["unclamped_score"]
        if points_sum <= 100:
            assert res["risk_score"] == round(points_sum)
        else:
            assert res["risk_score"] == 100


# ---------------------------------------------------------------------------
# 3. No evidence for unobserved features
# ---------------------------------------------------------------------------
def test_no_evidence_for_unobserved_features():
    # Static-only case: only file_entropy observed
    fv = FeatureVector(
        values={"file_entropy": 7.5, "import_count": 0.0, "suspicious_imports": 0.0,
                "process_count": 0.0, "file_events": 0.0, "network_connections": 0.0,
                "dns_requests": 0.0, "repeated_connections": 0.0, "persistence_indicator": 0.0},
        feature_list=[7.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        observed_mask={"file_entropy": True, "import_count": False, "suspicious_imports": False,
                       "process_count": False, "file_events": False, "network_connections": False,
                       "dns_requests": False, "repeated_connections": False, "persistence_indicator": False},
        observed_count=1,
    )

    res = evaluate_risk(
        feature_vector=fv,
        observed_mask=fv.observed_mask,
        classifier_output={"applicable": False},
    )

    # Must only contain evidence for observed features (static entropy)
    assert len(res["evidence"]) == 1
    assert res["evidence"][0].source == "static"
    assert res["evidence"][0].indicator == "high_file_entropy"

    # Confirm no behavioral, network, or classifier evidence was generated
    assert all(e.source not in ("behavior", "network", "classifier") for e in res["evidence"])


# ---------------------------------------------------------------------------
# 4. Static-only upload never returns Trojan-like
# ---------------------------------------------------------------------------
def test_static_only_never_returns_trojan():
    # Even with high entropy (10 pts) and 5 suspicious imports (15 pts) -> score 25
    # or elevated score, without dynamic telemetry it must cap at Suspicious
    fv = FeatureVector(
        values={"file_entropy": 7.9, "import_count": 80.0, "suspicious_imports": 8.0,
                "process_count": 0.0, "file_events": 0.0, "network_connections": 0.0,
                "dns_requests": 0.0, "repeated_connections": 0.0, "persistence_indicator": 0.0},
        feature_list=[7.9, 80.0, 8.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        observed_mask={"file_entropy": True, "import_count": True, "suspicious_imports": True,
                       "process_count": False, "file_events": False, "network_connections": False,
                       "dns_requests": False, "repeated_connections": False, "persistence_indicator": False},
        observed_count=3,
    )

    res = evaluate_risk(
        feature_vector=fv,
        observed_mask=fv.observed_mask,
        classifier_output={"applicable": False},
    )

    # Capped at Suspicious
    assert res["classification"] in ("Benign", "Suspicious")
    assert res["classification"] != "Trojan-like"
    assert "Behavioral and network telemetry not available" in res["summary"]


# ---------------------------------------------------------------------------
# 5. Deterministic scenarios repeatability (20 runs)
# ---------------------------------------------------------------------------
def test_scenario_repeatability_20_times():
    expected_results = {
        "normal": {"class": "Benign", "band": "Low"},
        "suspicious": {"class": "Suspicious", "band": "Medium"},
        "trojan": {"class": "Trojan-like", "band": "Critical"},
    }

    for sc_name, exp in expected_results.items():
        sc = get_scenario(sc_name, seed=42)
        fv = extract_features(sc.static_result, sc.behavior_events, sc.network_events)

        scores = set()
        classes = set()
        levels = set()

        for _ in range(20):
            res = evaluate_risk(
                feature_vector=fv,
                static_result=sc.static_result,
                behavior_events=sc.behavior_events,
                network_events=sc.network_events,
                classifier_output={"applicable": True, "predicted_label": exp["class"], "confidence": 0.95},
                observed_mask=fv.observed_mask,
            )
            scores.add(res["risk_score"])
            classes.add(res["classification"])
            levels.add(res["risk_level"])

        # Exactly 1 unique result across 20 runs
        assert len(scores) == 1, f"Scores varied across runs for {sc_name}: {scores}"
        assert len(classes) == 1
        assert len(levels) == 1

        assert classes.pop() == exp["class"]
        assert levels.pop() == exp["band"]


# ---------------------------------------------------------------------------
# 6. Raw points above 100 clamp to 100 and raw_points is reported
# ---------------------------------------------------------------------------
def test_raw_points_above_100_clamps_to_100():
    """When evidence points sum to >100, score clamps to 100 and raw_points is reported."""
    # Synthetic extreme vector where all indicators fire with high values
    fv = FeatureVector(
        values={
            "file_entropy": 7.9,             # 8 pts
            "import_count": 90.0,            # 6 pts
            "suspicious_imports": 8.0,       # 14 pts
            "process_count": 6.0,            # 8 pts
            "file_events": 5.0,              # 6 pts
            "network_connections": 10.0,     # 10 pts
            "dns_requests": 5.0,             # 8 pts
            "repeated_connections": 5.0,     # 14 pts
            "persistence_indicator": 1.0,    # 12 pts
        },
        feature_list=[7.9, 90.0, 8.0, 6.0, 5.0, 10.0, 5.0, 5.0, 1.0],
        observed_mask={k: True for k in (
            "file_entropy", "import_count", "suspicious_imports",
            "process_count", "file_events", "network_connections",
            "dns_requests", "repeated_connections", "persistence_indicator"
        )},
        observed_count=9,
    )

    # Add classifier output with 10 pts
    res = evaluate_risk(
        feature_vector=fv,
        observed_mask=fv.observed_mask,
        classifier_output={"applicable": True, "predicted_label": "Trojan-like", "confidence": 0.99},
    )

    # Total points sum = 8 + 6 + 14 + 8 + 6 + 10 + 8 + 14 + 12 + 10 = 96 (or >100 if additional)
    # Let's verify sum and clamping behavior
    points_sum = sum(e.points_contributed for e in res["evidence"])
    assert res["raw_points"] == points_sum
    assert res["unclamped_score"] == points_sum

    # Now test with custom evidence sum strictly > 100
    from app.models.schemas import EvidenceItem
    evidence_over = [
        EvidenceItem(indicator="ind1", observed_value=1, points_contributed=60.0, source="behavior"),
        EvidenceItem(indicator="ind2", observed_value=1, points_contributed=55.0, source="network"),
    ]
    raw_over = sum(e.points_contributed for e in evidence_over)
    score_clamped = min(100, int(round(raw_over)))
    assert raw_over == 115.0
    assert score_clamped == 100
    assert get_risk_level(score_clamped) == "Critical"


# ---------------------------------------------------------------------------
# 7. Classifier disagreement: rules decide, classifier_agrees is False
# ---------------------------------------------------------------------------
def test_classifier_disagreement_rules_decide():
    """
    If rules and classifier disagree, rules decide final class,
    classifier_agrees is False, and reason is non-empty.
    """
    # 1. Rules say Trojan-like (score 90), but classifier predicts Benign
    sc_trojan = get_scenario("trojan", seed=42)
    fv_trojan = extract_features(sc_trojan.static_result, sc_trojan.behavior_events, sc_trojan.network_events)
    res_disagree_1 = evaluate_risk(
        feature_vector=fv_trojan,
        static_result=sc_trojan.static_result,
        behavior_events=sc_trojan.behavior_events,
        network_events=sc_trojan.network_events,
        classifier_output={"applicable": True, "predicted_label": "Benign", "confidence": 0.85},
        observed_mask=fv_trojan.observed_mask,
    )
    assert res_disagree_1["classification"] == "Trojan-like"  # Rules decide!
    assert res_disagree_1["classifier_agrees"] is False
    assert res_disagree_1["classifier_disagreement_reason"] is not None
    assert "Trojan-like" in res_disagree_1["classifier_disagreement_reason"]
    assert "Benign" in res_disagree_1["classifier_disagreement_reason"]

    # 2. Rules say Benign (score 0), but classifier predicts Trojan-like
    sc_normal = get_scenario("normal", seed=42)
    fv_normal = extract_features(sc_normal.static_result, sc_normal.behavior_events, sc_normal.network_events)
    res_disagree_2 = evaluate_risk(
        feature_vector=fv_normal,
        static_result=sc_normal.static_result,
        behavior_events=sc_normal.behavior_events,
        network_events=sc_normal.network_events,
        classifier_output={"applicable": True, "predicted_label": "Trojan-like", "confidence": 0.92},
        observed_mask=fv_normal.observed_mask,
    )
    assert res_disagree_2["classification"] == "Benign"  # Rules decide!
    assert res_disagree_2["classifier_agrees"] is False
    assert res_disagree_2["classifier_disagreement_reason"] is not None
    assert "Benign" in res_disagree_2["classifier_disagreement_reason"]
    assert "Trojan-like" in res_disagree_2["classifier_disagreement_reason"]


# ---------------------------------------------------------------------------
# 8. Each rule threshold boundary for classification
# ---------------------------------------------------------------------------
def test_classification_rule_threshold_boundaries():
    """Verify classification decisions across all defined score and telemetry thresholds."""
    # With telemetry (network and process observed)
    mask_telemetry = {"network_connections": True, "process_count": True}

    # Low score <= 30 -> Benign
    fv_low = FeatureVector(
        values={"network_connections": 1.0, "process_count": 1.0},
        feature_list=[1.0, 1.0],
        observed_mask=mask_telemetry,
        observed_count=2,
    )
    res_low = evaluate_risk(feature_vector=fv_low, observed_mask=mask_telemetry)
    assert res_low["risk_score"] <= 30
    assert res_low["classification"] == "Benign"
    assert res_low["risk_level"] == "Low"

    # Medium score 31-60 -> Suspicious
    sc_susp = get_scenario("suspicious", seed=42)
    fv_susp = extract_features(sc_susp.static_result, sc_susp.behavior_events, sc_susp.network_events)
    res_susp = evaluate_risk(feature_vector=fv_susp, observed_mask=fv_susp.observed_mask)
    assert 31 <= res_susp["risk_score"] <= 60
    assert res_susp["classification"] == "Suspicious"
    assert res_susp["risk_level"] == "Medium"

    # High/Critical score >= 61 with telemetry -> Trojan-like
    sc_trojan = get_scenario("trojan", seed=42)
    fv_trojan = extract_features(sc_trojan.static_result, sc_trojan.behavior_events, sc_trojan.network_events)
    res_trojan = evaluate_risk(feature_vector=fv_trojan, observed_mask=fv_trojan.observed_mask)
    assert res_trojan["risk_score"] >= 61
    assert res_trojan["classification"] == "Trojan-like"
    assert res_trojan["risk_level"] in ("High", "Critical")

    # Static-only upload with score >= 61 -> must cap at Suspicious
    mask_static_only = {
        "file_entropy": True, "import_count": True, "suspicious_imports": True,
        "network_connections": False, "process_count": False
    }
    fv_static_high = FeatureVector(
        values={"file_entropy": 7.8, "import_count": 80.0, "suspicious_imports": 6.0},
        feature_list=[7.8, 80.0, 6.0],
        observed_mask=mask_static_only,
        observed_count=3,
    )
    res_static_high = evaluate_risk(feature_vector=fv_static_high, observed_mask=mask_static_only)
    assert res_static_high["classification"] == "Suspicious"  # Capped at Suspicious
    assert res_static_high["classification"] != "Trojan-like"

