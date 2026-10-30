"""
TrojanGuard — Demo Lab API Endpoints.

Endpoints:
- POST /api/demo/start: Start an interactive demonstration scenario.
- GET /api/demo/{id}/events: Polling stream for chronological events and status.
"""
from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.demo.scenarios import get_scenario, SCENARIO_DEFINITIONS
from app.models.schemas import ErrorResponse, ScenarioItem
from app.services.pipeline import run_analysis

router = APIRouter(tags=["demo"])

# In-memory store for active demo runs
DEMO_RUNS: dict[str, dict[str, Any]] = {}
DEMO_LOCK = threading.Lock()


class DemoStartRequest(BaseModel):
    scenario: str = Field(description="Scenario key: 'normal', 'suspicious', or 'trojan'")


class DemoStartResponse(BaseModel):
    demo_id: str
    scenario: str
    name: str
    status: str
    total_events: int
    total_duration_seconds: int
    started_at: str


class DemoEventsResponse(BaseModel):
    demo_id: str
    scenario: str
    status: str                         # "running" | "complete"
    analysis_id: int | None = None      # Revealed when status is complete
    events: list[dict[str, Any]]
    total_events: int
    elapsed_seconds: float


@router.get(
    "/demo/scenarios",
    response_model=list[ScenarioItem],
)
async def list_demo_scenarios():
    """
    Return catalog of available demo scenarios with duration.
    Kept in one place in the backend.
    """
    items = []
    for key in ("normal", "suspicious", "trojan"):
        sc = get_scenario(key, seed=42)
        items.append(
            ScenarioItem(
                id=key,
                name=sc.name,
                description=sc.description,
                total_duration_seconds=sc.total_duration_seconds,
            )
        )
    return items


@router.post(
    "/demo/start",
    response_model=DemoStartResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        422: {"description": "Invalid scenario name.", "model": ErrorResponse},
    },
)
async def start_demo_scenario(req: DemoStartRequest):

    """
    Start an interactive demo lab run.
    Prepares the event schedule for frontend progressive polling.
    Does NOT persist to SQLite until the demo completes.
    """
    sc_key = req.scenario.strip().lower()
    valid_keys = {"normal", "suspicious", "trojan"}
    matched_key = None
    for k in valid_keys:
        if k in sc_key:
            matched_key = k
            break

    if not matched_key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid scenario '{req.scenario}'. Expected one of: normal, suspicious, trojan.",
        )

    sc = get_scenario(matched_key, seed=42)

    demo_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)

    with DEMO_LOCK:
        DEMO_RUNS[demo_id] = {
            "demo_id": demo_id,
            "scenario": matched_key,
            "filename": sc.filename,
            "name": sc.name,
            "schedule": sc.event_schedule,
            "total_duration_seconds": sc.total_duration_seconds,
            "total_events": len(sc.event_schedule),
            "started_at": started_at,
            "analysis_id": None,  # Persisted ONLY when demo run completes
        }

    return DemoStartResponse(
        demo_id=demo_id,
        scenario=matched_key,
        name=sc.name,
        status="running",
        total_events=len(sc.event_schedule),
        total_duration_seconds=sc.total_duration_seconds,
        started_at=started_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@router.get(
    "/demo/{id}/events",
    response_model=DemoEventsResponse,
    responses={
        404: {"description": "Demo run not found.", "model": ErrorResponse},
    },
)
async def get_demo_events(
    id: str,
    fast: bool = Query(default=False, description="Instantly reveal all events (useful for tests)"),
):
    """
    Progressively stream events revealed by elapsed time since demo start.
    When complete, status='complete', the final analysis is persisted via the pipeline,
    and analysis_id is populated.
    """
    if id not in DEMO_RUNS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo run with ID '{id}' not found.",
        )

    run = DEMO_RUNS[id]
    now = datetime.now(timezone.utc)
    elapsed = (now - run["started_at"]).total_seconds()

    is_complete = fast or (elapsed >= run["total_duration_seconds"])

    if is_complete:
        with DEMO_LOCK:
            if run["analysis_id"] is None:
                report = run_analysis(
                    source="demo",
                    filename=run["filename"],
                    scenario=run["scenario"],
                )
                run["analysis_id"] = report.analysis.id

        revealed_events = run["schedule"]
        status_str = "complete"
        analysis_id = run["analysis_id"]
    else:
        revealed_events = [
            e for e in run["schedule"]
            if e["offset_seconds"] <= elapsed
        ]
        status_str = "running"
        analysis_id = None

    return DemoEventsResponse(
        demo_id=id,
        scenario=run["scenario"],
        status=status_str,
        analysis_id=analysis_id,
        events=revealed_events,
        total_events=run["total_events"],
        elapsed_seconds=round(elapsed, 2),
    )
