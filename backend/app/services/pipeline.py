"""
TrojanGuard — Single Canonical Analysis Pipeline.

The single orchestrator function `run_analysis`:
Flow:
1. Static Analysis (uploads) OR Predefined Scenario Generator (demos)
2. Feature Extraction (9-feature vector + observed_mask)
3. ML Prediction (Random Forest on observed features)
4. Explainable Risk Engine (Score, Level, Evidence points sum, Agreement)
5. IOC Builder (deduplicated hashes, IPs, ports, domains)
6. Atomic SQLite Transaction via repository.insert_analysis

Both `/api/analyze` and the demo runner call this EXACT function.
No separate code paths exist.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from app.analysis.static import analyze_bytes, StaticResult
from app.analysis.feature_extractor import extract_features, FeatureVector
from app.analysis.ioc import extract_iocs
from app.ml.predictor import predict
from app.services.risk_engine import evaluate_risk, get_recommended_steps
from app.services.repository import insert_analysis

from app.demo.scenarios import get_scenario
from app.models.schemas import AnalysisCreate, AnalysisReport, BehaviorEventCreate, NetworkEventCreate


def run_analysis(
    source: str = "upload",                      # "upload" | "demo" | "seed_demo"
    filename: str = "sample.bin",
    data: bytes | None = None,
    scenario: str | None = None,
    db_path: Path | None = None,
) -> AnalysisReport:
    """
    Run the unified detection and analysis pipeline and persist results atomically.

    Parameters
    ----------
    source:
        Origin marker ('upload', 'demo', or 'seed_demo').
    filename:
        Filename of the sample being inspected.
    data:
        Raw bytes for upload analysis. Required if source=='upload'.
    scenario:
        Scenario identifier ('normal', 'suspicious', 'trojan'). Required if source in ('demo', 'seed_demo').
    db_path:
        Optional SQLite database path override (for isolated testing).

    Returns
    -------
    AnalysisReport:
        Complete consolidated report with analysis record, events, IOCs, and evidence.
    """
    is_demo = source in ("demo", "seed_demo")
    static_result: StaticResult
    behavior_events: list[BehaviorEventCreate] | None = None
    network_events: list[NetworkEventCreate] | None = None

    # Step 1: Input resolution
    if not is_demo:
        if data is None:
            raise ValueError("File byte data must be provided for upload analysis.")
        static_result = analyze_bytes(filename=filename, data=data)
        behavior_events = None
        network_events = None
    else:
        sc_id = scenario or "normal"
        sc = get_scenario(sc_id, seed=42)
        if not filename or filename == "sample.bin":
            filename = sc.filename
        static_result = sc.static_result
        behavior_events = sc.behavior_events
        network_events = sc.network_events

    # Step 2: Feature Extraction
    fv: FeatureVector = extract_features(
        static_result=static_result,
        behavior_events=behavior_events,
        network_events=network_events,
    )

    # Step 3: Statistical Classifier Prediction
    clf_output = predict(features=fv, observed_mask=fv.observed_mask)

    # Step 4: Explainable Risk Engine Evaluation
    risk_result = evaluate_risk(
        feature_vector=fv,
        static_result=static_result,
        behavior_events=behavior_events,
        network_events=network_events,
        classifier_output=clf_output,
        observed_mask=fv.observed_mask,
        is_demo=is_demo,
    )

    # Step 5: IOC Extraction
    iocs = extract_iocs(
        static_result=static_result,
        network_events=network_events,
        behavior_events=behavior_events,
        is_demo=is_demo,
    )

    # Step 6: Serialization of features and evidence metadata into features_json
    metadata_payload = {
        "features": fv.values,
        "observed_mask": fv.observed_mask,
        "evidence": [e.model_dump() for e in risk_result["evidence"]],
        "context": [c.model_dump() for c in risk_result.get("context", [])],
        "raw_points": risk_result.get("raw_points", risk_result["risk_score"]),
        "classifier_agrees": risk_result["classifier_agrees"],
        "classifier_disagreement_reason": risk_result["classifier_disagreement_reason"],
        "classifier_output": clf_output,
    }
    features_json_str = json.dumps(metadata_payload, sort_keys=False)

    # Determine confidence field (None if classifier was not applicable)
    confidence_val = (
        float(clf_output["confidence"])
        if clf_output.get("applicable") and clf_output.get("confidence") is not None
        else None
    )

    summary_text = risk_result["summary"]
    if is_demo:
        sc_name = scenario or "demo"
        summary_text += f" [Synthetic identifier: SHA-256 of 'trojanguard-demo-{sc_name}-v1']"

    analysis_create = AnalysisCreate(
        filename=filename,
        sha256=static_result.sha256,
        file_size=static_result.file_size,
        file_type=static_result.file_type,
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        classification=risk_result["classification"],
        confidence=confidence_val,
        risk_score=risk_result["risk_score"],
        risk_level=risk_result["risk_level"],
        analysis_source=source,
        summary=summary_text,
        features_json=features_json_str,
    )

    # Step 7: Atomic insertion into SQLite
    report = insert_analysis(
        analysis_data=analysis_create,
        behavior_events=behavior_events,
        network_events=network_events,
        iocs=iocs,
        db_path=db_path,
    )

    # Attach structured fields, evidence, context & agreement fields to returned report
    report.features = fv.values
    report.observed_mask = fv.observed_mask
    report.classifier_output = clf_output
    report.evidence = risk_result["evidence"]
    report.context = risk_result.get("context", [])
    report.raw_points = risk_result.get("raw_points", risk_result["risk_score"])
    report.classifier_agrees = risk_result["classifier_agrees"]
    report.classifier_disagreement_reason = risk_result["classifier_disagreement_reason"]
    report.recommended_steps = get_recommended_steps(
        risk_result["classification"],
        risk_result["risk_score"],
        risk_result["evidence"],
    )

    return report

