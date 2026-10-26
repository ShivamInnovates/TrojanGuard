"""
TrojanGuard — Analysis API Endpoints.

Endpoints:
- POST /api/analyze: Safe in-memory upload inspection and reporting.
- GET /api/analysis/{id}: Retrieve detailed consolidated report by analysis ID.
"""
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.config import MAX_UPLOAD_BYTES
from app.models.schemas import AnalysisReport, ErrorResponse
from app.services.pipeline import run_analysis
from app.services.repository import get_report

router = APIRouter(tags=["analysis"])


@router.post(
    "/analyze",
    response_model=AnalysisReport,
    status_code=status.HTTP_200_OK,
    responses={
        413: {"description": "File exceeds 10 MB limit.", "model": ErrorResponse},
        422: {"description": "File is empty or invalid.", "model": ErrorResponse},
    },
)
async def analyze_sample(file: UploadFile = File(...)):
    """
    Safely inspect an uploaded sample in memory.
    Files are never executed, written to disk, or evaluated.
    """
    filename = file.filename or "uploaded_sample.bin"
    contents = await file.read()

    # Empty file check (HTTP 422)
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty (0 bytes). Please upload a valid sample.",
        )

    # 10 MB size guard (HTTP 413)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({len(contents)} bytes) exceeds the 10 MB upload limit ({MAX_UPLOAD_BYTES} bytes).",
        )

    try:
        report = run_analysis(source="upload", filename=filename, data=contents)
        if report.analysis:
            report.analysis.features_json = None
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )


@router.get(
    "/analysis/{id}",
    response_model=AnalysisReport,
    responses={
        404: {"description": "Analysis not found.", "model": ErrorResponse},
    },
)
async def get_analysis_by_id(id: int):
    """Retrieve complete analysis report including events, IOCs, and evidence by ID."""
    report = get_report(id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record with ID {id} not found.",
        )
    if report.analysis:
        report.analysis.features_json = None
    return report

