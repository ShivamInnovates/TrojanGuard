"""
GET /api/health — implemented in Phase 2.
Stub present so main.py can import the router at Phase 1.
"""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Liveness probe — returns service status. Expanded in Phase 2."""
    return {"status": "ok", "phase": "1-skeleton"}
