"""
TrojanGuard — Real Data Model API Endpoints (Phase 5b).

Endpoints:
- GET /api/model/real/metrics: Retrieve multi-regime evaluation metrics for CIC-MalMem-2022.
- POST /api/model/real/predict: Predict Trojan probability from pre-extracted memory-forensics features (JSON or single-row CSV).
"""
from __future__ import annotations

import csv
import io
from typing import Any, Dict
from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.ml import real_predictor
from app.models.schemas import ErrorResponse, RealModelPredictRequest, RealModelPredictResponse

router = APIRouter(prefix="/model/real", tags=["real-model"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB limit


@router.get(
    "/metrics",
    response_model=dict,
    responses={
        404: {"description": "Model metrics not available", "model": ErrorResponse},
    },
)
async def get_model_real_metrics():
    """
    Return comprehensive multi-regime evaluation metrics for the CIC-MalMem-2022 real data model.
    Returns 404 if model training has not been executed yet.
    """
    metrics = real_predictor.get_real_metrics()
    if metrics is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Real-data model metrics not available. Model training is pending (Phase 5b). Please run ml/real/train_real.py.",
        )
    return metrics


@router.post(
    "/predict",
    response_model=RealModelPredictResponse,
    responses={
        404: {"description": "Model weights not available", "model": ErrorResponse},
        413: {"description": "Payload exceeds 10 MB limit", "model": ErrorResponse},
        422: {"description": "Malformed features, NaN/Inf, or missing columns", "model": ErrorResponse},
    },
)
async def predict_model_real(
    request: Request,
    file: UploadFile | None = File(default=None),
):
    """
    Run defensive inference on volatile memory forensics features using the real-data model.
    Accepts either:
    1. JSON payload: { "features": { "pslist.nproc": 45, ... } }
    2. CSV file upload: Single row of 51 features with headers (max 10 MB).
    """
    if not real_predictor.is_real_model_available():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Real-data model (model_real.pkl) is not available. Please train the model first.",
        )

    features_dict: Dict[str, Any] = {}

    content_type = request.headers.get("content-type", "").lower()

    if file is not None:
        # File upload path
        contents = await file.read()
        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"CSV file size ({len(contents)} bytes) exceeds the 10 MB limit ({MAX_UPLOAD_SIZE} bytes).",
            )
        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded CSV file is empty (0 bytes).",
            )

        try:
            text = contents.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Uploaded CSV contains no valid data rows.",
                )
            features_dict = rows[0]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse uploaded CSV: {exc}",
            )
    elif "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict) and "features" in body and isinstance(body["features"], dict):
                features_dict = body["features"]
            elif isinstance(body, dict):
                features_dict = body
            else:
                raise ValueError("JSON body must be an object with feature key-value pairs.")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid JSON request: {exc}",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request must be application/json or multipart/form-data with a CSV file.",
        )

    try:
        result = real_predictor.predict_real_features(features_dict)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    return RealModelPredictResponse(**result)
