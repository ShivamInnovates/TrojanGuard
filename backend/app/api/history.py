"""
TrojanGuard — History API Endpoints.

Endpoints:
- GET /api/history: Search, filter, and paginate through past analysis records.
"""
from fastapi import APIRouter, Query
from app.models.schemas import PaginatedAnalyses
from app.services.repository import list_analyses

router = APIRouter(tags=["history"])


@router.get("/history", response_model=PaginatedAnalyses)
async def get_analysis_history(
    search: str | None = Query(default=None, description="Search term for filename or SHA-256"),
    classification: str | None = Query(default=None, description="Filter by classification (Benign, Suspicious, Trojan-like)"),
    severity: str | None = Query(default=None, description="Filter by risk level (Low, Medium, High, Critical)"),
    risk_level: str | None = Query(default=None, description="Alias for severity"),
    sort: str = Query(default="timestamp", description="Sort column (timestamp, risk_score, filename, etc.)"),
    order: str = Query(default="desc", description="Sort direction (asc, desc)"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
):
    """
    Retrieve paginated analysis history with SQL injection protection,
    column whitelisting, and multi-field filters.
    """
    effective_risk_level = risk_level or severity
    return list_analyses(
        search=search,
        classification=classification,
        risk_level=effective_risk_level,
        sort=sort,
        order=order,
        limit=limit,
        offset=offset,
    )
