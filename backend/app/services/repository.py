"""
TrojanGuard — SQLite data access repository.

Plain functions for CRUD, transaction orchestration, pagination,
and aggregation queries.
All queries use strict parameterised SQL to prevent SQL injection.
Sort columns and directions are verified against a strict whitelist.
"""
from typing import Any, Sequence
from pathlib import Path
import sqlite3

from app.database import get_conn
from app.models.schemas import (
    AnalysisCreate,
    AnalysisRecord,
    AnalysisListItem,
    BehaviorEventCreate,
    BehaviorEventRecord,
    NetworkEventCreate,
    NetworkEventRecord,
    IocCreate,
    IocRecord,
    AnalysisReport,
    PaginatedAnalyses,
)

# Strict whitelist for sortable columns
ALLOWED_SORT_COLUMNS: dict[str, str] = {
    "id": "id",
    "filename": "filename",
    "sha256": "sha256",
    "file_size": "file_size",
    "timestamp": "timestamp",
    "classification": "classification",
    "confidence": "confidence",
    "risk_score": "risk_score",
    "risk_level": "risk_level",
}

ALLOWED_SORT_ORDERS: dict[str, str] = {
    "asc": "ASC",
    "desc": "DESC",
}


def insert_analysis(
    analysis_data: AnalysisCreate | dict[str, Any],
    behavior_events: Sequence[BehaviorEventCreate | dict[str, Any]] | None = None,
    network_events: Sequence[NetworkEventCreate | dict[str, Any]] | None = None,
    iocs: Sequence[IocCreate | dict[str, Any]] | None = None,
    db_path: Path | None = None,
    conn: sqlite3.Connection | None = None,
) -> AnalysisReport:
    """
    Insert an analysis and all child records within ONE atomic transaction.
    If any child row fails, the entire transaction rolls back.
    """
    def _execute(c: sqlite3.Connection) -> AnalysisReport:
        data = analysis_data if isinstance(analysis_data, dict) else analysis_data.model_dump()

        cur = c.cursor()
        cur.execute(
            """
            INSERT INTO analyses (
                filename, sha256, file_size, file_type, timestamp,
                classification, confidence, risk_score, risk_level,
                analysis_source, summary, features_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["filename"],
                data["sha256"],
                data["file_size"],
                data.get("file_type", "unknown"),
                data["timestamp"],
                data["classification"],
                float(data["confidence"]) if data.get("confidence") is not None else None,
                int(data["risk_score"]),
                data["risk_level"],
                data.get("analysis_source", "upload"),
                data.get("summary", ""),
                data.get("features_json"),
            ),
        )
        analysis_id = cur.lastrowid
        if analysis_id is None:
            raise RuntimeError("Failed to obtain lastrowid after inserting analysis.")

        inserted_behaviors: list[BehaviorEventRecord] = []
        if behavior_events:
            for b in behavior_events:
                b_dict = b if isinstance(b, dict) else b.model_dump()
                cur.execute(
                    """
                    INSERT INTO behavior_events (
                        analysis_id, timestamp, event_type, description, severity, is_simulated
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        analysis_id,
                        b_dict["timestamp"],
                        b_dict["event_type"],
                        b_dict["description"],
                        b_dict["severity"],
                        int(b_dict.get("is_simulated", 1)),
                    ),
                )
                b_id = cur.lastrowid
                inserted_behaviors.append(
                    BehaviorEventRecord(
                        id=b_id,
                        analysis_id=analysis_id,
                        timestamp=b_dict["timestamp"],
                        event_type=b_dict["event_type"],
                        description=b_dict["description"],
                        severity=b_dict["severity"],
                        is_simulated=int(b_dict.get("is_simulated", 1)),
                    )
                )

        inserted_networks: list[NetworkEventRecord] = []
        if network_events:
            for n in network_events:
                n_dict = n if isinstance(n, dict) else n.model_dump()
                cur.execute(
                    """
                    INSERT INTO network_events (
                        analysis_id, timestamp, source, destination, port, protocol, event_type, is_simulated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        analysis_id,
                        n_dict["timestamp"],
                        n_dict["source"],
                        n_dict["destination"],
                        int(n_dict["port"]),
                        n_dict["protocol"],
                        n_dict["event_type"],
                        int(n_dict.get("is_simulated", 1)),
                    ),
                )
                n_id = cur.lastrowid
                inserted_networks.append(
                    NetworkEventRecord(
                        id=n_id,
                        analysis_id=analysis_id,
                        timestamp=n_dict["timestamp"],
                        source=n_dict["source"],
                        destination=n_dict["destination"],
                        port=int(n_dict["port"]),
                        protocol=n_dict["protocol"],
                        event_type=n_dict["event_type"],
                        is_simulated=int(n_dict.get("is_simulated", 1)),
                    )
                )

        inserted_iocs: list[IocRecord] = []
        if iocs:
            for ioc in iocs:
                i_dict = ioc if isinstance(ioc, dict) else ioc.model_dump()
                cur.execute(
                    """
                    INSERT INTO iocs (
                        analysis_id, type, value, is_simulated
                    ) VALUES (?, ?, ?, ?)
                    """,
                    (
                        analysis_id,
                        i_dict["type"],
                        i_dict["value"],
                        int(i_dict.get("is_simulated", 1)),
                    ),
                )
                i_id = cur.lastrowid
                inserted_iocs.append(
                    IocRecord(
                        id=i_id,
                        analysis_id=analysis_id,
                        type=i_dict["type"],
                        value=i_dict["value"],
                        is_simulated=int(i_dict.get("is_simulated", 1)),
                    )
                )

        analysis_record = AnalysisRecord(
            id=analysis_id,
            filename=data["filename"],
            sha256=data["sha256"],
            file_size=data["file_size"],
            file_type=data.get("file_type", "unknown"),
            timestamp=data["timestamp"],
            classification=data["classification"],
            confidence=float(data["confidence"]) if data.get("confidence") is not None else None,
            risk_score=int(data["risk_score"]),
            risk_level=data["risk_level"],
            analysis_source=data.get("analysis_source", "upload"),
            summary=data.get("summary", ""),
            features_json=data.get("features_json"),
        )

        evidence_items: list[EvidenceItem] = []
        context_items: list[ContextItem] = []
        raw_points = float(data.get("risk_score", 0))
        classifier_agrees = True
        disagreement_reason: str | None = None
        if data.get("features_json"):
            try:
                import json
                fj = json.loads(data["features_json"]) if isinstance(data["features_json"], str) else data["features_json"]
                if isinstance(fj, dict):
                    from app.models.schemas import EvidenceItem, ContextItem
                    if "evidence" in fj:
                        evidence_items = [EvidenceItem(**e) for e in fj["evidence"]]
                    if "context" in fj:
                        context_items = [ContextItem(**c) for c in fj["context"]]
                    if "raw_points" in fj:
                        raw_points = float(fj["raw_points"])
                    elif evidence_items:
                        raw_points = float(sum(e.points_contributed for e in evidence_items))
                    classifier_agrees = fj.get("classifier_agrees", True)
                    disagreement_reason = fj.get("classifier_disagreement_reason")
            except Exception:
                pass

        return AnalysisReport(
            analysis=analysis_record,
            behavior_events=inserted_behaviors,
            network_events=inserted_networks,
            iocs=inserted_iocs,
            evidence=evidence_items,
            context=context_items,
            raw_points=raw_points,
            classifier_agrees=classifier_agrees,
            classifier_disagreement_reason=disagreement_reason,
        )

    if conn is not None:
        return _execute(conn)
    with get_conn(db_path) as c:
        return _execute(c)


def get_report(analysis_id: int, db_path: Path | None = None, conn: sqlite3.Connection | None = None) -> AnalysisReport | None:
    """Fetch complete AnalysisReport by analysis ID, or None if not found."""
    def _execute(c: sqlite3.Connection) -> AnalysisReport | None:
        row = c.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
        if not row:
            return None

        analysis = AnalysisRecord(
            id=row["id"],
            filename=row["filename"],
            sha256=row["sha256"],
            file_size=row["file_size"],
            file_type=row["file_type"],
            timestamp=row["timestamp"],
            classification=row["classification"],
            confidence=row["confidence"],
            risk_score=row["risk_score"],
            risk_level=row["risk_level"],
            analysis_source=row["analysis_source"],
            summary=row["summary"],
            features_json=row["features_json"],
        )

        b_rows = c.execute(
            "SELECT * FROM behavior_events WHERE analysis_id = ? ORDER BY id ASC",
            (analysis_id,),
        ).fetchall()
        behaviors = [
            BehaviorEventRecord(
                id=r["id"],
                analysis_id=r["analysis_id"],
                timestamp=r["timestamp"],
                event_type=r["event_type"],
                description=r["description"],
                severity=r["severity"],
                is_simulated=r["is_simulated"],
            )
            for r in b_rows
        ]

        n_rows = c.execute(
            "SELECT * FROM network_events WHERE analysis_id = ? ORDER BY id ASC",
            (analysis_id,),
        ).fetchall()
        networks = [
            NetworkEventRecord(
                id=r["id"],
                analysis_id=r["analysis_id"],
                timestamp=r["timestamp"],
                source=r["source"],
                destination=r["destination"],
                port=r["port"],
                protocol=r["protocol"],
                event_type=r["event_type"],
                is_simulated=r["is_simulated"],
            )
            for r in n_rows
        ]

        i_rows = c.execute(
            "SELECT * FROM iocs WHERE analysis_id = ? ORDER BY id ASC",
            (analysis_id,),
        ).fetchall()
        iocs = [
            IocRecord(
                id=r["id"],
                analysis_id=r["analysis_id"],
                type=r["type"],
                value=r["value"],
                is_simulated=r["is_simulated"],
            )
            for r in i_rows
        ]

        evidence_items: list[EvidenceItem] = []
        context_items: list[ContextItem] = []
        raw_points = float(analysis.risk_score)
        classifier_agrees = True
        disagreement_reason: str | None = None
        if row["features_json"]:
            try:
                import json
                fj = json.loads(row["features_json"])
                if isinstance(fj, dict):
                    from app.models.schemas import EvidenceItem, ContextItem
                    if "evidence" in fj:
                        evidence_items = [EvidenceItem(**e) for e in fj["evidence"]]
                    if "context" in fj:
                        context_items = [ContextItem(**c) for c in fj["context"]]
                    if "raw_points" in fj:
                        raw_points = float(fj["raw_points"])
                    elif evidence_items:
                        raw_points = float(sum(e.points_contributed for e in evidence_items))
                    classifier_agrees = fj.get("classifier_agrees", True)
                    disagreement_reason = fj.get("classifier_disagreement_reason")
            except Exception:
                pass

        return AnalysisReport(
            analysis=analysis,
            behavior_events=behaviors,
            network_events=networks,
            iocs=iocs,
            evidence=evidence_items,
            context=context_items,
            raw_points=raw_points,
            classifier_agrees=classifier_agrees,
            classifier_disagreement_reason=disagreement_reason,
        )

    if conn is not None:
        return _execute(conn)
    with get_conn(db_path) as c:
        return _execute(c)


def list_analyses(
    search: str | None = None,
    classification: str | None = None,
    risk_level: str | None = None,
    sort: str = "timestamp",
    order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    db_path: Path | None = None,
    conn: sqlite3.Connection | None = None,
) -> PaginatedAnalyses:
    """
    List analyses with parameterised search, filters, whitelisted sorting, and pagination.
    Protects against SQL injection by whitelisting column and order keywords,
    and binding all filter parameters with '?'.
    """
    # Whitelist sort column and direction
    sort_col = ALLOWED_SORT_COLUMNS.get(sort.lower(), "timestamp")
    sort_dir = ALLOWED_SORT_ORDERS.get(order.lower(), "DESC")

    # Bounded pagination
    safe_limit = max(1, min(limit, 200))
    safe_offset = max(0, offset)

    where_clauses: list[str] = []
    params: list[Any] = []

    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append("(filename LIKE ? OR sha256 LIKE ?)")
        params.extend([term, term])

    if classification and classification.strip():
        where_clauses.append("classification = ?")
        params.append(classification.strip())

    if risk_level and risk_level.strip():
        where_clauses.append("risk_level = ?")
        params.append(risk_level.strip())

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    def _execute(c: sqlite3.Connection) -> PaginatedAnalyses:
        count_sql = f"SELECT COUNT(*) AS total FROM analyses {where_sql}"
        total_row = c.execute(count_sql, params).fetchone()
        total = total_row["total"] if total_row else 0

        data_sql = f"""
            SELECT id, filename, sha256, file_size, file_type, timestamp,
                   classification, confidence, risk_score, risk_level,
                   analysis_source, summary
            FROM analyses
            {where_sql}
            ORDER BY {sort_col} {sort_dir}
            LIMIT ? OFFSET ?
        """
        rows = c.execute(data_sql, params + [safe_limit, safe_offset]).fetchall()

        items = [
            AnalysisListItem(
                id=r["id"],
                filename=r["filename"],
                sha256=r["sha256"],
                file_size=r["file_size"],
                file_type=r["file_type"],
                timestamp=r["timestamp"],
                classification=r["classification"],
                confidence=r["confidence"],
                risk_score=r["risk_score"],
                risk_level=r["risk_level"],
                analysis_source=r["analysis_source"],
                summary=r["summary"],
            )
            for r in rows
        ]

        return PaginatedAnalyses(
            total=total,
            limit=safe_limit,
            offset=safe_offset,
            items=items,
        )

    if conn is not None:
        return _execute(conn)
    with get_conn(db_path) as c:
        return _execute(c)


def get_dashboard_aggregates(db_path: Path | None = None, conn: sqlite3.Connection | None = None) -> dict[str, Any]:
    """
    Compute dashboard metrics directly from SQL queries.
    Never uses hardcoded constants.
    """
    def _execute(c: sqlite3.Connection) -> dict[str, Any]:
        totals_row = c.execute(
            """
            SELECT
                COUNT(*) AS total_samples,
                COALESCE(AVG(risk_score), 0.0) AS avg_risk_score,
                SUM(CASE WHEN classification = 'Benign' THEN 1 ELSE 0 END) AS benign_count,
                SUM(CASE WHEN classification = 'Suspicious' THEN 1 ELSE 0 END) AS suspicious_count,
                SUM(CASE WHEN classification = 'Trojan-like' THEN 1 ELSE 0 END) AS trojan_count,
                SUM(CASE WHEN risk_level = 'High' THEN 1 ELSE 0 END) AS high_risk_count,
                SUM(CASE WHEN risk_level = 'Critical' THEN 1 ELSE 0 END) AS critical_risk_count
            FROM analyses
            """
        ).fetchone()

        total_iocs_row = c.execute("SELECT COUNT(*) AS total_iocs FROM iocs").fetchone()

        source_dist_rows = c.execute(
            """
            SELECT analysis_source, COUNT(*) AS count
            FROM analyses
            GROUP BY analysis_source
            """
        ).fetchall()

        threat_dist_rows = c.execute(
            """
            SELECT classification, COUNT(*) AS count
            FROM analyses
            GROUP BY classification
            """
        ).fetchall()

        severity_dist_rows = c.execute(
            """
            SELECT risk_level, COUNT(*) AS count
            FROM analyses
            GROUP BY risk_level
            """
        ).fetchall()

        tot = totals_row["total_samples"] if totals_row else 0
        benign_c = totals_row["benign_count"] if totals_row and totals_row["benign_count"] else 0
        susp_c = totals_row["suspicious_count"] if totals_row and totals_row["suspicious_count"] else 0
        trojan_c = totals_row["trojan_count"] if totals_row and totals_row["trojan_count"] else 0
        threats_det = susp_c + trojan_c
        iocs_c = total_iocs_row["total_iocs"] if total_iocs_row else 0

        source_dict = {"upload": 0, "demo": 0, "seed_demo": 0}
        for r in source_dist_rows:
            source_dict[r["analysis_source"]] = r["count"]

        return {
            "total_samples": tot,
            "total_analyses": tot,
            "threats_detected": threats_det,
            "total_iocs": iocs_c,
            "avg_risk_score": round(float(totals_row["avg_risk_score"] or 0.0), 1) if totals_row else 0.0,
            "benign_count": benign_c,
            "suspicious_count": susp_c,
            "trojan_count": trojan_c,
            "high_risk_count": totals_row["high_risk_count"] if totals_row and totals_row["high_risk_count"] else 0,
            "critical_risk_count": totals_row["critical_risk_count"] if totals_row and totals_row["critical_risk_count"] else 0,
            "analyses_by_source": source_dict,
            "threat_distribution": {r["classification"]: r["count"] for r in threat_dist_rows},
            "severity_distribution": {r["risk_level"]: r["count"] for r in severity_dist_rows},
        }

    if conn is not None:
        return _execute(conn)
    with get_conn(db_path) as c:
        return _execute(c)
