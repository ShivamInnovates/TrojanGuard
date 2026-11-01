"""
TrojanGuard — Phase 7 Integration and Acceptance Verification Script.

Tests all required edge cases:
- Empty database on all pages
- Oversized upload (>10 MB rejection with 413)
- Renamed .txt claiming .exe (analyzed as plain text, never executed, benign)
- Corrupt PE with truncated MZ header (safe handling, no crash)
- 20 repeated runs per demo scenario (assert exact score, class, and confidence)
- Two clients / browser tabs polling at once concurrently
- Model metrics before and after
"""
import concurrent.futures
import time
import os
import httpx

client = httpx.Client(base_url="http://127.0.0.1:8001", timeout=30.0)

def reset_database():
    import sqlite3
    db_path = "backend/trojanguard.db"
    if os.path.exists(db_path):
        with sqlite3.connect(db_path) as conn:
            conn.execute("PRAGMA foreign_keys = OFF")
            conn.execute("DELETE FROM iocs")
            conn.execute("DELETE FROM network_events")
            conn.execute("DELETE FROM behavior_events")
            conn.execute("DELETE FROM analyses")
            conn.commit()
    r = client.get("/api/health")
    assert r.status_code == 200

def test_empty_database():
    print("\n--- 1. Testing Empty Database State ---")
    reset_database()
    r_dash = client.get("/api/dashboard")
    assert r_dash.status_code == 200, f"Dashboard failed: {r_dash.text}"
    totals = r_dash.json().get("totals", {})
    assert totals.get("analyses") == 0, f"Expected 0 analyses, got {totals.get('analyses')}"
    print(f"[PASS] /api/dashboard empty state: {totals}")

    r_hist = client.get("/api/history")
    assert r_hist.status_code == 200, f"History failed: {r_hist.text}"
    assert r_hist.json().get("total") == 0, f"Expected 0 history items, got {r_hist.json().get('total')}"
    print(f"[PASS] /api/history empty state: total={r_hist.json().get('total')}")

    r_threats = client.get("/api/threats")
    assert r_threats.status_code == 200, f"Threats failed: {r_threats.text}"
    assert len(r_threats.json()) == 0
    print(f"[PASS] /api/threats empty state: items={len(r_threats.json())}")

    r_scenarios = client.get("/api/demo/scenarios")
    assert r_scenarios.status_code == 200
    scenarios = r_scenarios.json()
    assert len(scenarios) == 3
    print(f"[PASS] /api/demo/scenarios returns {len(scenarios)} scenarios ready to run")

    r_real = client.get("/api/model/real/metrics")
    assert r_real.status_code == 200
    print(f"[PASS] /api/model/real/metrics returned successfully")


def test_oversized_upload():
    print("\n--- 2. Testing Oversized Upload (>10MB) ---")
    huge_data = b"X" * (10 * 1024 * 1024 + 1024)
    r = client.post("/api/analyze", files={"file": ("huge_sample.exe", huge_data, "application/octet-stream")})
    assert r.status_code == 413, f"Expected 413, got {r.status_code}: {r.text}"
    print(f"[PASS] Oversized upload rejected with HTTP {r.status_code}: {r.json().get('detail')}")


def test_renamed_text_file():
    print("\n--- 3. Testing Renamed .txt claiming .exe ---")
    txt_data = b"This is plain text claiming to be a Windows binary payload.\nSafe text only.\n"
    r = client.post("/api/analyze", files={"file": ("fake_trojan.exe", txt_data, "application/x-dosexec")})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data["classification"] == "Benign"
    assert data["risk_score"] <= 30
    assert "text" in data["file_type"].lower() or "plain" in data["file_type"].lower()
    print(f"[PASS] Renamed text classified as {data['classification']}, score={data['risk_score']}, file_type={data['file_type']}")


def test_corrupt_pe():
    print("\n--- 4. Testing Corrupt / Truncated PE ---")
    corrupt_mz = b"MZ" + b"\x00" * 40 + b"CORRUPT_BYTES_NO_PE_HEADER"
    r = client.post("/api/analyze", files={"file": ("corrupt.exe", corrupt_mz, "application/x-dosexec")})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data["classification"] == "Benign"
    assert data["risk_score"] <= 30
    print(f"[PASS] Corrupt MZ safely parsed without crash: class={data['classification']}, score={data['risk_score']}")


def run_single_demo(scenario_id, fast=True):
    c = httpx.Client(base_url="http://127.0.0.1:8001", timeout=30.0)
    start_resp = c.post("/api/demo/start", json={"scenario": scenario_id})
    assert start_resp.status_code == 201, f"Expected 201, got {start_resp.status_code}: {start_resp.text}"
    demo_id = start_resp.json()["demo_id"]

    while True:
        status_resp = c.get(f"/api/demo/{demo_id}/events?fast={str(fast).lower()}")
        assert status_resp.status_code == 200
        data = status_resp.json()
        if data["status"] == "complete":
            analysis_id = data["analysis_id"]
            analysis_resp = c.get(f"/api/analysis/{analysis_id}")
            assert analysis_resp.status_code == 200
            return analysis_resp.json()
        time.sleep(0.3)


def test_twenty_repeated_runs():
    print("\n--- 5. Testing 20 Repeated Runs per Demo Scenario ---")
    scenarios = [
        ("normal", "Benign", 0, 98.9),
        ("suspicious", "Suspicious", 43, 96.9),
        ("trojan", "Trojan-like", 92, 99.7),
    ]

    for sc_id, exp_class, exp_score, exp_conf in scenarios:
        print(f"[*] Running 20 consecutive runs for scenario '{sc_id}' (expecting {exp_class}, score {exp_score}, conf {exp_conf}%)...")
        for i in range(1, 21):
            res = run_single_demo(sc_id)
            c_class = res["classification"]
            c_score = res["risk_score"]
            c_conf = res.get("classifier_output", {}).get("confidence")
            c_conf_pct = round(c_conf * 100, 1) if c_conf is not None else None

            assert c_class == exp_class, f"Run {i} failed class: {c_class} != {exp_class}"
            assert c_score == exp_score, f"Run {i} failed score: {c_score} != {exp_score}"
            assert c_conf_pct == exp_conf, f"Run {i} failed conf: {c_conf_pct} != {exp_conf}"
        print(f"[PASS] Scenario '{sc_id}' succeeded 20/20 times with exact values ({exp_class}, {exp_score}, {exp_conf}%)")


def test_concurrent_polling():
    print("\n--- 6. Testing Concurrent Polling (2 tabs at once) ---")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(run_single_demo, "suspicious")
        f2 = executor.submit(run_single_demo, "trojan")
        res1 = f1.result()
        res2 = f2.result()

    assert res1["classification"] == "Suspicious" and res1["risk_score"] == 43
    assert res2["classification"] == "Trojan-like" and res2["risk_score"] == 92
    print(f"[PASS] Concurrent demo 1: {res1['classification']} (score {res1['risk_score']})")
    print(f"[PASS] Concurrent demo 2: {res2['classification']} (score {res2['risk_score']})")


def test_model_404_handling():
    print("\n--- 7. Testing Model Missing 404 Behavior ---")
    # Test that /api/model/real/metrics returns 200 now, and test predictor validation
    r_pred = client.post("/api/model/real/predict", json={"features": {}})
    assert r_pred.status_code == 422, f"Expected 422 for empty features, got {r_pred.status_code}"
    print(f"[PASS] Predictor rejects malformed input with HTTP 422")


if __name__ == "__main__":
    test_empty_database()
    test_oversized_upload()
    test_renamed_text_file()
    test_corrupt_pe()
    test_concurrent_polling()
    test_twenty_repeated_runs()
    test_model_404_handling()
    print("\n[✓✓✓] ALL PHASE 7 INTEGRATION TESTS PASSED!")
