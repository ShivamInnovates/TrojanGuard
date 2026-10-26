"""
TrojanGuard — Threats API Endpoints.

Endpoints:
- GET /api/threats: Filter exclusively for flagged threats (Suspicious and Trojan-like).
"""
from fastapi import APIRouter, Query
from app.database import get_conn
from app.models.schemas import AnalysisRecord

router = APIRouter(tags=["threats"])


@router.get("/threats", response_model=list[AnalysisRecord])
async def get_recent_threats(
    limit: int = Query(default=50, ge=1, le=200, description="Max threats to return"),
):
    """
    Retrieve all detected threats (Suspicious and Trojan-like), ordered newest first.
    """
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM analyses
            WHERE classification IN ('Suspicious', 'Trojan-like')
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        items = [
            AnalysisRecord(
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
                features_json=r["features_json"],
            )
            for r in rows
        ]
        return items
