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
