"""
TrojanGuard — FastAPI application entry point.

Routers are mounted here as they are implemented in later phases.
At Phase 1, only the app and CORS are configured.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import init_db

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="TrojanGuard API",
    description=(
        "AI-Powered Trojan Detection, Prediction & Behavioral Analysis System. "
        "Academic/demonstration prototype — no offensive capability implemented."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — local frontend dev origin only
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Accept"],
)

# ---------------------------------------------------------------------------
# Startup: initialise database
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event() -> None:
    init_db()


# ---------------------------------------------------------------------------
# Routers (mounted as each phase is completed)
# ---------------------------------------------------------------------------
# Phase 2
from app.api.health import router as health_router  # noqa: E402
app.include_router(health_router, prefix="/api")

# Phase 5 routers added here in that phase:
# from app.api.dashboard import router as dashboard_router
# from app.api.analysis  import router as analysis_router
# from app.api.history   import router as history_router
# from app.api.threats   import router as threats_router
# from app.api.iocs      import router as iocs_router
# from app.api.demo      import router as demo_router
# Phase 5b:
# from app.api.model     import router as model_router
