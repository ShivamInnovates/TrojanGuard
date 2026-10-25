"""
TrojanGuard — Phase 2 Database & Health API Tests.

Verifies:
1. Table existence and schema initialisation on a fresh file.
2. Row persistence across completely independent connections.
3. Foreign key constraints enforced (rejection of orphaned child rows).
4. ON DELETE CASCADE from behavior_events, network_events, and iocs to analyses.
5. Atomic transaction rollback in insert_analysis if any child record fails.
6. list_analyses filtering, pagination, sorting whitelist, and SQL injection safety.
7. GET /api/health returning 200 with correct schema when healthy.
8. GET /api/health returning 503 when database is unreachable.
"""
from pathlib import Path
import sqlite3
import pytest
from fastapi.testclient import TestClient

from app.database import init_db, get_conn
from app.services.repository import (
    insert_analysis,
    get_report,
    list_analyses,
    get_dashboard_aggregates,
)
from app.models.schemas import (
    AnalysisCreate,
    BehaviorEventCreate,
    NetworkEventCreate,
    IocCreate,
)
import app.api.health as health_module


# ---------------------------------------------------------------------------
# 1. Tables exist after init on a fresh file
# ---------------------------------------------------------------------------
def test_tables_and_indexes_exist_after_init(temp_db_path: Path):
    with get_conn(temp_db_path) as conn:
        tables = [
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()
        ]
        assert "analyses" in tables
        assert "behavior_events" in tables
        assert "network_events" in tables
        assert "iocs" in tables

        indexes = [
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
            ).fetchall()
        ]
        assert "idx_analyses_sha256" in indexes
        assert "idx_analyses_timestamp" in indexes
        assert "idx_analyses_classification" in indexes
        assert "idx_analyses_risk_score" in indexes
        assert "idx_behavior_events_analysis_id" in indexes
        assert "idx_network_events_analysis_id" in indexes
        assert "idx_iocs_analysis_id" in indexes


# ---------------------------------------------------------------------------
# 2. Row persists when read through a NEW connection
# ---------------------------------------------------------------------------
def test_persistence_across_new_connection(temp_db_path: Path):
    # Insert via connection 1
    with get_conn(temp_db_path) as conn1:
        conn1.execute(
            """
            INSERT INTO analyses (
                filename, sha256, file_size, file_type, timestamp,
                classification, confidence, risk_score, risk_level,
                analysis_source, summary, features_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "sample_persist.exe",
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                1024,
                "PE32",
                "2026-10-25T12:00:00Z",
                "Benign",
                0.95,
                15,
                "Low",
                "upload",
                "Normal system executable test",
                '{"file_entropy": 3.4, "import_count": 22}',
            ),
        )

    # Read via connection 2
    with get_conn(temp_db_path) as conn2:
        row = conn2.execute(
            "SELECT * FROM analyses WHERE filename = ?", ("sample_persist.exe",)
        ).fetchone()
        assert row is not None
        assert row["filename"] == "sample_persist.exe"
        assert row["classification"] == "Benign"
        assert row["risk_score"] == 15
        assert row["risk_level"] == "Low"
        assert row["features_json"] == '{"file_entropy": 3.4, "import_count": 22}'


def test_features_json_column_persistence_and_retrieval(temp_db_path: Path):
    """Verify storing feature vector as JSON in features_json column."""
    feat_payload = '{"file_entropy": 7.82, "network_connections": 14, "persistence_indicator": 1}'
    report = insert_analysis(
        analysis_data=AnalysisCreate(
            filename="trojan_features.exe",
            sha256="cc" * 32,
            file_size=8192,
            file_type="PE32",
            timestamp="2026-10-25T13:00:00Z",
            classification="Trojan-like",
            confidence=0.96,
            risk_score=92,
            risk_level="Critical",
            analysis_source="upload",
            summary="Features JSON test",
            features_json=feat_payload,
        ),
        db_path=temp_db_path,
    )
    assert report.analysis.features_json == feat_payload

    # Fetch through get_report
    fetched = get_report(report.analysis.id, db_path=temp_db_path)
    assert fetched is not None
    assert fetched.analysis.features_json == feat_payload

    # Fetch through list_analyses
    listed = list_analyses(search="trojan_features", db_path=temp_db_path)
    assert listed.total == 1
    assert listed.items[0].features_json == feat_payload


# ---------------------------------------------------------------------------
# 3. Foreign key constraints enforced (orphaned child rows fail)
# ---------------------------------------------------------------------------
def test_foreign_key_enforcement_rejects_orphaned_children(temp_db_path: Path):
    with get_conn(temp_db_path) as conn:
        # FK to non-existent analysis_id = 999999 must raise IntegrityError
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """
                INSERT INTO behavior_events (
                    analysis_id, timestamp, event_type, description, severity, is_simulated
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (999999, "2026-10-25T12:00:00Z", "process_create", "Spawned calc.exe", "low", 1),
            )

        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """
                INSERT INTO network_events (
                    analysis_id, timestamp, source, destination, port, protocol, event_type, is_simulated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (999999, "2026-10-25T12:00:00Z", "192.168.1.5", "198.51.100.1", 443, "TCP", "connect", 1),
            )

        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """
                INSERT INTO iocs (analysis_id, type, value, is_simulated)
                VALUES (?, ?, ?, ?)
                """,
                (999999, "ip", "198.51.100.1", 1),
            )


# ---------------------------------------------------------------------------
# 4. Deleting an analysis cascades to its children
# ---------------------------------------------------------------------------
def test_cascade_delete_removes_all_children(temp_db_path: Path):
    report = insert_analysis(
        analysis_data=AnalysisCreate(
            filename="trojan_sample.exe",
            sha256="aa" * 32,
            file_size=2048,
            file_type="PE32",
            timestamp="2026-10-25T12:00:00Z",
            classification="Trojan-like",
            confidence=0.92,
            risk_score=88,
            risk_level="Critical",
            analysis_source="demo",
            summary="Trojan test with child events",
        ),
        behavior_events=[
            BehaviorEventCreate(
                timestamp="2026-10-25T12:00:01Z",
                event_type="persistence",
                description="Registry Run key added",
                severity="critical",
            )
        ],
        network_events=[
            NetworkEventCreate(
                timestamp="2026-10-25T12:00:02Z",
                source="192.168.1.10",
                destination="203.0.113.5",
                port=4444,
                protocol="TCP",
                event_type="outbound_beacon",
            )
        ],
        iocs=[
            IocCreate(type="ip", value="203.0.113.5")
        ],
        db_path=temp_db_path,
    )

    analysis_id = report.analysis.id

    # Verify children exist
    with get_conn(temp_db_path) as conn:
        b_count = conn.execute("SELECT COUNT(*) FROM behavior_events WHERE analysis_id = ?", (analysis_id,)).fetchone()[0]
        n_count = conn.execute("SELECT COUNT(*) FROM network_events WHERE analysis_id = ?", (analysis_id,)).fetchone()[0]
        i_count = conn.execute("SELECT COUNT(*) FROM iocs WHERE analysis_id = ?", (analysis_id,)).fetchone()[0]
        assert b_count == 1
        assert n_count == 1
        assert i_count == 1

        # Delete the analysis
        conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))

    # In a new connection, verify children are cascaded away
    with get_conn(temp_db_path) as conn:
        b_count = conn.execute("SELECT COUNT(*) FROM behavior_events WHERE analysis_id = ?", (analysis_id,)).fetchone()[0]
        n_count = conn.execute("SELECT COUNT(*) FROM network_events WHERE analysis_id = ?", (analysis_id,)).fetchone()[0]
        i_count = conn.execute("SELECT COUNT(*) FROM iocs WHERE analysis_id = ?", (analysis_id,)).fetchone()[0]
        assert b_count == 0
        assert n_count == 0
        assert i_count == 0


# ---------------------------------------------------------------------------
# 5. insert_analysis rolls back fully if a child row is invalid
# ---------------------------------------------------------------------------
def test_insert_analysis_atomic_rollback_on_child_failure(temp_db_path: Path):
    # Pass an invalid behavior item that violates NOT NULL constraint (e.g. event_type=None)
    invalid_behavior = {
        "timestamp": "2026-10-25T12:00:00Z",
        "event_type": None,  # triggers NOT NULL constraint violation
        "description": "Will fail",
        "severity": "low",
        "is_simulated": 1,
    }

    initial_count = 0
    with get_conn(temp_db_path) as conn:
        initial_count = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]

    with pytest.raises(sqlite3.IntegrityError):
        insert_analysis(
            analysis_data={
                "filename": "rollback_test.exe",
                "sha256": "bb" * 32,
                "file_size": 512,
                "file_type": "ELF",
                "timestamp": "2026-10-25T12:00:00Z",
                "classification": "Suspicious",
                "confidence": 0.65,
                "risk_score": 50,
                "risk_level": "Medium",
                "analysis_source": "upload",
                "summary": "Should be rolled back",
            },
            behavior_events=[invalid_behavior],
            db_path=temp_db_path,
        )

    # Verify no partial insert remains in analyses
    with get_conn(temp_db_path) as conn:
        current_count = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
        assert current_count == initial_count
        row = conn.execute("SELECT * FROM analyses WHERE filename = 'rollback_test.exe'").fetchone()
        assert row is None


# ---------------------------------------------------------------------------
# 6. list_analyses search, filter, sort, pagination, and SQL injection safety
# ---------------------------------------------------------------------------
def test_list_analyses_search_filter_sort_and_sql_injection(temp_db_path: Path):
    # Seed 4 test records
    samples = [
        ("alpha.exe", "11" * 32, 1000, "Benign", 0.99, 10, "Low"),
        ("bravo.dll", "22" * 32, 2000, "Suspicious", 0.70, 50, "Medium"),
        ("charlie.exe", "33" * 32, 3000, "Trojan-like", 0.91, 85, "High"),
        ("delta.bin", "44" * 32, 4000, "Trojan-like", 0.98, 95, "Critical"),
    ]
    for filename, sha, size, classification, conf, score, level in samples:
        insert_analysis(
            analysis_data=AnalysisCreate(
                filename=filename,
                sha256=sha,
                file_size=size,
                file_type="PE",
                timestamp="2026-10-25T10:00:00Z",
                classification=classification,
                confidence=conf,
                risk_score=score,
                risk_level=level,
            ),
            db_path=temp_db_path,
        )

    # Filter by classification
    res = list_analyses(classification="Trojan-like", db_path=temp_db_path)
    assert res.total == 2
    assert all(item.classification == "Trojan-like" for item in res.items)

    # Filter by risk_level
    res = list_analyses(risk_level="Medium", db_path=temp_db_path)
    assert res.total == 1
    assert res.items[0].filename == "bravo.dll"

    # Search by filename
    res = list_analyses(search="alpha", db_path=temp_db_path)
    assert res.total == 1
    assert res.items[0].filename == "alpha.exe"

    # Search by SHA-256
    res = list_analyses(search="33" * 10, db_path=temp_db_path)
    assert res.total == 1
    assert res.items[0].filename == "charlie.exe"

    # Sort by risk_score asc
    res = list_analyses(sort="risk_score", order="asc", db_path=temp_db_path)
    scores = [item.risk_score for item in res.items]
    assert scores == [10, 50, 85, 95]

    # Pagination (limit 2, offset 1)
    res = list_analyses(sort="risk_score", order="asc", limit=2, offset=1, db_path=temp_db_path)
    assert res.total == 4
    assert len(res.items) == 2
    assert [item.risk_score for item in res.items] == [50, 85]

    # SQL Injection in search parameter
    sqli_search = "'; DROP TABLE analyses;--"
    res = list_analyses(search=sqli_search, db_path=temp_db_path)
    assert res.total == 0

    # Ensure table wasn't dropped
    with get_conn(temp_db_path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
        assert count == 4

    # SQL Injection attempt in sort column (must safely fall back to whitelisted column)
    sqli_sort = "risk_score; DROP TABLE analyses;--"
    res = list_analyses(sort=sqli_sort, db_path=temp_db_path)
    assert res.total == 4

    with get_conn(temp_db_path) as conn:
        count = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
        assert count == 4


# ---------------------------------------------------------------------------
# 7. GET /api/health returns 200 with real database
# ---------------------------------------------------------------------------
def test_health_check_healthy(test_client: TestClient):
    response = test_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database_reachable"] is True
    assert data["table_count"] >= 4
    assert data["model_status"] == "not trained yet"
    assert "python_version" in data
    assert data["app_version"] == "0.1.0"


# ---------------------------------------------------------------------------
# 8. GET /api/health returns 503 when database is unreachable
# ---------------------------------------------------------------------------
def test_health_check_unreachable_db(test_client: TestClient, monkeypatch: pytest.MonkeyPatch):
    # Simulate DB failure by patching get_conn to raise an operational error
    def broken_conn():
        raise sqlite3.OperationalError("Unable to open database file")

    monkeypatch.setattr(health_module, "get_conn", broken_conn)

    response = test_client.get("/api/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database_reachable"] is False
    assert data["table_count"] == 0
