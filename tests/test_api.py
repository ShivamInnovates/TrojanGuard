"""
TrojanGuard — API Endpoints Tests.

Tests for all Phase 5 endpoints:
- POST /api/analyze (upload limit, empty sample rejection, safe typing, static confidence null)
- GET /api/analysis/{id} (report retrieval, 404 handling)
- POST /api/demo/start & GET /api/demo/{id}/events (demo execution, polling, completion persistence)
- GET /api/dashboard (empty database zeros, SQL aggregation)
- GET /api/history (search, filters, sorting whitelist, pagination)
- GET /api/threats (Suspicious and Trojan-like filter, order)
- GET /api/iocs/{id} (IOC retrieval, 404 for missing analysis)
"""
import io
import pytest
from fastapi.testclient import TestClient


def test_empty_database_dashboard_returns_zeros(test_client: TestClient):
    """Empty database dashboard returns zeros, not an error."""
    resp = test_client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_analyses"] == 0
    assert data["threats_detected"] == 0
    assert data["benign_count"] == 0
    assert data["suspicious_count"] == 0
    assert data["trojan_count"] == 0
    assert data["avg_risk_score"] == 0.0
    assert data["total_iocs"] == 0
    assert data["analyses_by_source"]["upload"] == 0
    assert data["analyses_by_source"]["demo"] == 0


def test_oversized_upload_gives_413(test_client: TestClient):
    """Uploading >10 MB triggers HTTP 413 Request Entity Too Large."""
    # 10 MB + 1 byte
    oversized = b"X" * (10 * 1024 * 1024 + 1)
    file_payload = {"file": ("big_payload.exe", io.BytesIO(oversized), "application/octet-stream")}
    resp = test_client.post("/api/analyze", files=file_payload)
    assert resp.status_code == 413
    assert "exceeds the 10 MB upload limit" in resp.json()["detail"]


def test_empty_upload_gives_422(test_client: TestClient):
    """Uploading an empty file (0 bytes) returns HTTP 422 Unprocessable Entity."""
    empty_payload = {"file": ("empty.exe", io.BytesIO(b""), "application/octet-stream")}
    resp = test_client.post("/api/analyze", files=empty_payload)
    assert resp.status_code == 422
    assert "empty" in resp.json()["detail"]


def test_renamed_txt_claiming_exe_is_analyzed_as_text(test_client: TestClient):
    """A renamed text file claiming to be .exe is analyzed safely as text, not PE."""
    text_content = b"#!/bin/bash\necho 'This is plain text pretending to be an exe'"
    file_payload = {"file": ("malware_trap.exe", io.BytesIO(text_content), "application/octet-stream")}
    resp = test_client.post("/api/analyze", files=file_payload)
    assert resp.status_code == 200
    data = resp.json()
    # Content type is script/text despite the .exe extension
    assert data["analysis"]["file_type"] == "script/text"
    assert data["analysis"]["filename"] == "malware_trap.exe"
    # Static upload confidence must be null
    assert data["analysis"]["confidence"] is None
    # Static-only upload caps at Suspicious (never Trojan-like)
    assert data["analysis"]["classification"] in ("Benign", "Suspicious")
    assert data["analysis"]["classification"] != "Trojan-like"


def test_static_only_upload_confidence_null_and_never_trojan(test_client: TestClient):
    """Static upload never returns Trojan-like and confidence is null."""
    # Create fake PE with high entropy or suspicious strings
    fake_pe = b"MZ" + (b"\x90" * 500)
    file_payload = {"file": ("sample.pe", io.BytesIO(fake_pe), "application/octet-stream")}
    resp = test_client.post("/api/analyze", files=file_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["analysis"]["confidence"] is None
    assert data["analysis"]["classification"] in ("Benign", "Suspicious")
    assert data["analysis"]["classification"] != "Trojan-like"


def test_get_analysis_by_id_and_404(test_client: TestClient):
    """GET /api/analysis/{id} returns full report or 404 when missing."""
    # Missing ID returns 404
    missing_resp = test_client.get("/api/analysis/999999")
    assert missing_resp.status_code == 404
    assert "not found" in missing_resp.json()["detail"].lower()

    # Create an analysis via upload
    file_payload = {"file": ("doc.pdf", io.BytesIO(b"%PDF-1.5 test"), "application/pdf")}
    create_resp = test_client.post("/api/analyze", files=file_payload)
    assert create_resp.status_code == 200
    analysis_id = create_resp.json()["analysis"]["id"]

    # Retrieve by ID
    get_resp = test_client.get(f"/api/analysis/{analysis_id}")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved["analysis"]["id"] == analysis_id
    assert retrieved["analysis"]["filename"] == "doc.pdf"
    assert "evidence" in retrieved


def test_demo_start_polling_and_retrieval(test_client: TestClient):
    """
    Demo run starts, can be polled, completes with analysis_id,
    and the persisted report is retrievable via /api/analysis/{id}.
    """
    # 1. Start demo
    start_resp = test_client.post("/api/demo/start", json={"scenario": "trojan"})
    assert start_resp.status_code == 201
    demo_info = start_resp.json()
    demo_id = demo_info["demo_id"]
    assert demo_info["scenario"] == "trojan"
    assert demo_info["total_events"] > 0

    # Verify a running demo does NOT appear in /api/history, /api/threats, or /api/dashboard
    h_before = test_client.get("/api/history").json()
    assert h_before["total"] == 0
    t_before = test_client.get("/api/threats").json()
    assert len(t_before) == 0
    d_before = test_client.get("/api/dashboard").json()
    assert d_before["total_analyses"] == 0

    # 2. Poll events in normal mode (should be running or have initial events)
    poll_resp = test_client.get(f"/api/demo/{demo_id}/events")
    assert poll_resp.status_code == 200
    poll_data = poll_resp.json()
    assert poll_data["demo_id"] == demo_id
    assert poll_data["scenario"] == "trojan"

    # Still running, still not visible in history/threats/dashboard
    assert test_client.get("/api/history").json()["total"] == 0

    # 3. Poll with fast=True to simulate completion
    fast_resp = test_client.get(f"/api/demo/{demo_id}/events?fast=true")
    assert fast_resp.status_code == 200
    fast_data = fast_resp.json()
    assert fast_data["status"] == "complete"
    assert fast_data["analysis_id"] is not None
    assert len(fast_data["events"]) == demo_info["total_events"]

    # Now that it completed, it MUST appear in /api/history, /api/threats, and /api/dashboard
    assert test_client.get("/api/history").json()["total"] == 1
    assert len(test_client.get("/api/threats").json()) == 1
    assert test_client.get("/api/dashboard").json()["total_analyses"] == 1

    # 4. Verify persisted analysis is retrievable via /api/analysis/{id}
    analysis_id = fast_data["analysis_id"]
    analysis_resp = test_client.get(f"/api/analysis/{analysis_id}")
    assert analysis_resp.status_code == 200
    analysis_data = analysis_resp.json()
    assert analysis_data["analysis"]["id"] == analysis_id
    assert analysis_data["analysis"]["classification"] == "Trojan-like"
    assert len(analysis_data["behavior_events"]) > 0
    assert len(analysis_data["network_events"]) > 0
    assert len(analysis_data["evidence"]) > 0

    # 5. Invalid demo ID gives 404
    bad_demo = test_client.get("/api/demo/non-existent-id/events")
    assert bad_demo.status_code == 404


def test_history_search_filter_and_pagination(test_client: TestClient):
    """Test history API search, filtering by classification and severity, sort and pagination."""
    # Seed 3 demo analyses and complete them
    for sc in ("normal", "suspicious", "trojan"):
        start_resp = test_client.post("/api/demo/start", json={"scenario": sc})
        assert start_resp.status_code == 201
        demo_id = start_resp.json()["demo_id"]
        poll_resp = test_client.get(f"/api/demo/{demo_id}/events?fast=true")
        assert poll_resp.status_code == 200
        assert poll_resp.json()["status"] == "complete"

    # 1. Total items in history
    h_all = test_client.get("/api/history").json()
    assert h_all["total"] == 3
    assert len(h_all["items"]) == 3

    # Requirement: /api/history list items must NOT include features_json
    for item in h_all["items"]:
        assert "features_json" not in item, f"features_json unexpectedly found in history item: {item.keys()}"

    # 2. Filter by classification
    h_trojan = test_client.get("/api/history?classification=Trojan-like").json()
    assert h_trojan["total"] == 1
    assert h_trojan["items"][0]["classification"] == "Trojan-like"

    h_benign = test_client.get("/api/history?classification=Benign").json()
    assert h_benign["total"] == 1
    assert h_benign["items"][0]["classification"] == "Benign"

    # 3. Search query
    h_search = test_client.get("/api/history?search=trojan").json()
    assert h_search["total"] == 1
    assert "trojan" in h_search["items"][0]["filename"]

    # 4. Sort and order
    h_sorted = test_client.get("/api/history?sort=risk_score&order=asc").json()
    scores = [it["risk_score"] for it in h_sorted["items"]]
    assert scores == sorted(scores)

    # 5. Pagination
    h_paged = test_client.get("/api/history?limit=1&offset=1").json()
    assert h_paged["total"] == 3
    assert len(h_paged["items"]) == 1
    assert h_paged["limit"] == 1
    assert h_paged["offset"] == 1


def test_threats_endpoint_filters_suspicious_and_trojan(test_client: TestClient):
    """GET /api/threats returns only Suspicious and Trojan-like analyses, newest first."""
    # Seed normal, trojan, suspicious and complete them
    for sc in ("normal", "trojan", "suspicious"):
        s_resp = test_client.post("/api/demo/start", json={"scenario": sc})
        d_id = s_resp.json()["demo_id"]
        test_client.get(f"/api/demo/{d_id}/events?fast=true")

    resp = test_client.get("/api/threats")
    assert resp.status_code == 200
    threats = resp.json()
    # 2 threats: trojan and suspicious (normal is excluded)
    assert len(threats) == 2
    for t in threats:
        assert t["classification"] in ("Suspicious", "Trojan-like")


def test_iocs_endpoint_and_404(test_client: TestClient):
    """GET /api/iocs/{id} returns IOC list or 404 for missing analysis."""
    # 404 for missing analysis ID
    missing_resp = test_client.get("/api/iocs/888888")
    assert missing_resp.status_code == 404

    # Run trojan demo to generate IOCs
    start_resp = test_client.post("/api/demo/start", json={"scenario": "trojan"})
    demo_id = start_resp.json()["demo_id"]
    fast_resp = test_client.get(f"/api/demo/{demo_id}/events?fast=true")
    analysis_id = fast_resp.json()["analysis_id"]

    # Retrieve IOCs
    iocs_resp = test_client.get(f"/api/iocs/{analysis_id}")
    assert iocs_resp.status_code == 200
    iocs = iocs_resp.json()
    assert len(iocs) > 0
    for ioc in iocs:
        assert ioc["analysis_id"] == analysis_id
        assert ioc["type"] in ("hash", "ip", "domain", "port")


def test_demo_events_offset_never_exceeds_elapsed_time(test_client: TestClient):
    """GET /api/demo/{id}/events never returns an event whose offset exceeds elapsed time."""
    start_resp = test_client.post("/api/demo/start", json={"scenario": "trojan"})
    assert start_resp.status_code == 201
    demo_id = start_resp.json()["demo_id"]

    # Poll without fast flag (normal progressive stream)
    resp = test_client.get(f"/api/demo/{demo_id}/events")
    assert resp.status_code == 200
    data = resp.json()
    elapsed = data["elapsed_seconds"]

    # Invariant: Every revealed event MUST have offset_seconds <= elapsed
    for ev in data["events"]:
        assert ev["offset_seconds"] <= elapsed, f"Event offset {ev['offset_seconds']} exceeded elapsed time {elapsed}"


def test_polling_completed_demo_creates_exactly_one_analysis_row(test_client: TestClient):
    """
    Polling a completed demo repeatedly, including concurrent requests,
    creates exactly one analysis row in the database.
    """
    from concurrent.futures import ThreadPoolExecutor
    from app.database import get_conn

    start_resp = test_client.post("/api/demo/start", json={"scenario": "trojan"})
    assert start_resp.status_code == 201
    demo_id = start_resp.json()["demo_id"]

    # Concurrent polling requests with fast=True
    def poll_complete():
        return test_client.get(f"/api/demo/{demo_id}/events?fast=true")

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(poll_complete) for _ in range(12)]
        responses = [f.result() for f in futures]

    analysis_ids = set()
    for r in responses:
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "complete"
        assert data["analysis_id"] is not None
        analysis_ids.add(data["analysis_id"])

    # All concurrent requests returned the identical analysis_id
    assert len(analysis_ids) == 1
    final_analysis_id = analysis_ids.pop()

    # Verify SQLite database table: exactly 1 row exists with this ID
    with get_conn() as conn:
        row_count = conn.execute(
            "SELECT COUNT(*) FROM analyses WHERE id = ?",
            (final_analysis_id,),
        ).fetchone()[0]
        assert row_count == 1, f"Expected 1 analysis row for demo run, found {row_count}"


def test_demo_sha256_synthetic_identifiers(test_client: TestClient):
    """
    Derive each demo sha256 as SHA-256 of a fixed string such as
    'trojanguard-demo-trojan-v1' and label it a synthetic identifier.
    """
    import hashlib
    from app.demo.scenarios import get_scenario, SCENARIO_DEFINITIONS

    for sc_name in ("normal", "suspicious", "trojan"):
        expected_seed = f"trojanguard-demo-{sc_name}-v1"
        expected_sha = hashlib.sha256(expected_seed.encode("utf-8")).hexdigest()

        sc = get_scenario(sc_name)
        assert sc.static_result.sha256 == expected_sha
        assert sc.meta["sha256"] == expected_sha
        assert sc.meta["sha256_type"] == "synthetic_identifier"
        assert sc.meta["sha256_seed_string"] == expected_seed

        # When run via demo api, check persisted analysis summary labels it as synthetic identifier
        start_resp = test_client.post("/api/demo/start", json={"scenario": sc_name})
        assert start_resp.status_code == 201
        d_id = start_resp.json()["demo_id"]
        poll_resp = test_client.get(f"/api/demo/{d_id}/events?fast=true")
        analysis_id = poll_resp.json()["analysis_id"]

        analysis_resp = test_client.get(f"/api/analysis/{analysis_id}")
        assert analysis_resp.status_code == 200
        an_data = analysis_resp.json()
        assert an_data["analysis"]["sha256"] == expected_sha
        assert "synthetic identifier" in an_data["analysis"]["summary"].lower()


def test_analysis_endpoint_returns_structured_shape_and_dashboard_sql_aggregates(test_client: TestClient):
    """
    Verify GET /api/analysis/{id} returns structured fields (not raw features_json string):
    analysis columns, features, observed_mask, evidence (with points, source, is_simulated),
    context, raw_points, classifier_output, classifier_agrees, classifier_disagreement_reason,
    behavior_events, network_events, iocs, and recommended_steps.
    Also verify GET /api/dashboard returns complete SQL metrics including timeline and network activity.
    """
    # 1. Verify dashboard on empty database
    d_empty = test_client.get("/api/dashboard").json()
    assert d_empty["totals"]["analyses"] == 0
    assert d_empty["counts_per_classification"] == {"Benign": 0, "Suspicious": 0, "Trojan-like": 0}
    assert d_empty["counts_per_risk_level"] == {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    assert d_empty["avg_risk_score"] == 0.0
    assert d_empty["detection_timeline"] == []
    assert d_empty["network_activity"] == []

    # 2. Seed a completed demo run
    start_resp = test_client.post("/api/demo/start", json={"scenario": "trojan"})
    demo_id = start_resp.json()["demo_id"]
    poll_resp = test_client.get(f"/api/demo/{demo_id}/events?fast=true")
    analysis_id = poll_resp.json()["analysis_id"]

    # 3. Retrieve GET /api/analysis/{id}
    res = test_client.get(f"/api/analysis/{analysis_id}")
    assert res.status_code == 200
    report = res.json()

    # Verify no raw features_json string in response
    assert "features_json" not in report
    if "analysis" in report and report["analysis"]:
        assert report["analysis"].get("features_json") is None

    # Verify top-level analysis columns
    assert report["id"] == analysis_id
    assert report["filename"] == "invoice_viewer_trojan.exe"
    assert report["file_type"] == "PE"
    assert report["classification"] == "Trojan-like"
    assert report["risk_level"] == "Critical"
    assert report["risk_score"] >= 80

    # Verify structured features dictionary
    assert isinstance(report["features"], dict)
    assert "file_entropy" in report["features"]
    assert "import_count" in report["features"]

    # Verify observed mask dictionary
    assert isinstance(report["observed_mask"], dict)
    assert report["observed_mask"].get("file_entropy") is True

    # Verify evidence items with points, source, is_simulated
    assert isinstance(report["evidence"], list)
    assert len(report["evidence"]) > 0
    for ev in report["evidence"]:
        assert "indicator" in ev
        assert "observed_value" in ev
        assert "points_contributed" in ev
        assert "source" in ev
        assert "is_simulated" in ev
        assert ev["is_simulated"] is True

    # Verify context, raw points, classifier agreement & disagreement reason
    assert isinstance(report["context"], list)
    assert isinstance(report["raw_points"], (int, float))
    assert report["raw_points"] >= 80
    assert isinstance(report["classifier_agrees"], bool)
    assert report["classifier_output"] is not None

    # Verify behavior events, network events, and IOCs
    assert isinstance(report["behavior_events"], list)
    assert len(report["behavior_events"]) > 0
    assert isinstance(report["network_events"], list)
    assert len(report["network_events"]) > 0
    assert isinstance(report["iocs"], list)
    assert len(report["iocs"]) > 0

    # Verify recommended steps (generic guidance list)
    assert isinstance(report["recommended_steps"], list)
    assert len(report["recommended_steps"]) >= 3
    assert any("isolate" in s.lower() for s in report["recommended_steps"])

    # 4. Verify dashboard metrics with seeded data
    d_populated = test_client.get("/api/dashboard").json()
    assert d_populated["totals"]["analyses"] == 1
    assert d_populated["totals"]["threats"] == 1
    assert d_populated["counts_per_classification"]["Trojan-like"] == 1
    assert d_populated["counts_per_risk_level"]["Critical"] == 1
    assert d_populated["avg_risk_score"] > 0.0
    assert len(d_populated["detection_timeline"]) == 1
    assert d_populated["detection_timeline"][0]["trojan"] == 1
    assert len(d_populated["network_activity"]) == 1
    assert d_populated["network_activity"][0]["analysis_id"] == analysis_id
    assert d_populated["network_activity"][0]["connections"] > 0



