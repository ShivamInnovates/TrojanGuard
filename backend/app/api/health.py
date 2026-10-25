"""
TrojanGuard — Health and liveness API.

Checks database accessibility via SELECT 1, counts tables, inspects ML model
status, and reports runtime versions. Returns HTTP 503 when the database
is unreachable.
"""
import platform
from fastapi import APIRouter, Response, status
from fastapi.responses import JSONResponse
import joblib

from app.config import MODEL_PATH
from app.database import get_conn
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={
        200: {"description": "Service healthy and database reachable."},
        503: {"description": "Database unreachable or service degraded.", "model": HealthResponse},
    },
)
async def health_check():
    """Liveness & readiness probe."""
    python_ver = platform.python_version()
    app_ver = "0.1.0"

    # 1. Model inspection
    if not MODEL_PATH.exists():
        model_status = "not trained yet"
    else:
        try:
            _ = joblib.load(MODEL_PATH)
            model_status = "loaded"
        except Exception as e:
            model_status = f"error: {str(e)}"

    # 2. Database connectivity & table count
    db_reachable = False
    table_count = 0
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            row = cur.fetchone()
            if row and row[0] == 1:
                db_reachable = True

            cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            t_row = cur.fetchone()
            if t_row:
                table_count = t_row[0]
    except Exception:
        db_reachable = False

    if not db_reachable:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=HealthResponse(
                status="unhealthy",
                database_reachable=False,
                table_count=0,
                model_status=model_status,
                python_version=python_ver,
                app_version=app_ver,
            ).model_dump(),
        )

    return HealthResponse(
        status="ok",
        database_reachable=True,
        table_count=table_count,
        model_status=model_status,
        python_version=python_ver,
        app_version=app_ver,
    )
