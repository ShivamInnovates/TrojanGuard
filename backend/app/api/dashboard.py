"""
TrojanGuard — Dashboard API Endpoints.

Endpoints:
- GET /api/dashboard: Real-time SOC dashboard metrics computed via SQL.
"""
from typing import Any
from fastapi import APIRouter
from app.services.repository import get_dashboard_aggregates

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def get_dashboard_metrics() -> dict[str, Any]:
    """
    Retrieve real-time summary statistics from SQLite for the SOC dashboard.
    All figures are derived from parameterised SQL queries; never hardcoded constants.
    If the database is empty, returns clean zero counts without errors.
    """
    return get_dashboard_aggregates()
