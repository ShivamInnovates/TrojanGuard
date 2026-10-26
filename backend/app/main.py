"""
TrojanGuard — FastAPI application entry point.

Configures CORS, startup routines, global exception handlers,
and mounts API routers.
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import CORS_ORIGINS
from app.database import init_db
from app.models.schemas import ErrorResponse

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise database schema on startup
    init_db()
    yield


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
    lifespan=lifespan,
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
# Global Exception Handlers (no stack traces leak to client)
# ---------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail if isinstance(exc.detail, str) else "HTTP Exception",
            detail=exc.detail,
            code=exc.status_code,
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error="Request validation failed",
            detail=exc.errors(),
            code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log exception internally, return clean error to client
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc) if app.debug else "An unexpected error occurred. Please contact the administrator.",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ).model_dump(),
    )




# ---------------------------------------------------------------------------
# Routers (mounted as each phase is completed)
# ---------------------------------------------------------------------------
# Phase 2
from app.api.health import router as health_router  # noqa: E402
app.include_router(health_router, prefix="/api")

# Phase 5 routers
from app.api.dashboard import router as dashboard_router  # noqa: E402
from app.api.analysis import router as analysis_router    # noqa: E402
from app.api.history import router as history_router      # noqa: E402
from app.api.threats import router as threats_router      # noqa: E402
from app.api.iocs import router as iocs_router            # noqa: E402
from app.api.demo import router as demo_router            # noqa: E402

app.include_router(dashboard_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(threats_router, prefix="/api")
app.include_router(iocs_router, prefix="/api")
app.include_router(demo_router, prefix="/api")

# Phase 5b (model_router mounted in Phase 5b):
# from app.api.model import router as model_router
