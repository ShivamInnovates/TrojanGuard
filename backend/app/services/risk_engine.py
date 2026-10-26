"""
TrojanGuard — Explainable Risk Engine.

Responsibilities:
----------------
- Evaluate weighted risk score [0, 100] and risk levels (Low, Medium, High, Critical)
  using centralized thresholds from app.config.
- Produce structured, explainable evidence items with exact points contributed.
  * Invariant: Sum of points_contributed (before clamping) equals the score.
  * Invariant: Only observed indicators produce evidence (never for unobserved features).
- Rule-based classification:
  * Static-only uploads: Capped at Suspicious because Trojan-like requires behavioral
    or network evidence; includes note explaining lack of dynamic telemetry.
  * Multi-source analysis: Classification determined by deterministic evidence rules
    and score bands; classifier prediction contributes bounded points when applicable.
  * Explicitly reports classifier_agrees (True/False) and reasons when statistical
    model and deterministic rules disagree.
"""
from __future__ import annotations

from app.config import (
    CLASSIFICATION_THRESHOLDS,
    RISK_WEIGHTS,
    RISK_LEVEL_LOW_MAX,
    RISK_LEVEL_MEDIUM_MAX,
    RISK_LEVEL_HIGH_MAX,
)
from app.analysis.feature_extractor import FeatureVector
from app.analysis.static import StaticResult
from app.models.schemas import (
    BehaviorEventCreate,
    NetworkEventCreate,
    EvidenceItem,
    ContextItem,
)


def get_risk_level(score: int) -> str:
    """
    Determine categorical risk level from score.
    Boundaries:
      0  - 30 : Low
      31 - 60 : Medium
      61 - 80 : High
      81 - 100: Critical
    """
    if score <= CLASSIFICATION_THRESHOLDS["low_max"]:
        return "Low"
    elif score <= CLASSIFICATION_THRESHOLDS["medium_max"]:
        return "Medium"
    elif score <= CLASSIFICATION_THRESHOLDS["high_max"]:
        return "High"
    else:
        return "Critical"


def evaluate_risk(
    feature_vector: FeatureVector | dict[str, float] | None,
    static_result: StaticResult | None = None,
    behavior_events: Sequence[BehaviorEventCreate] | None = None,
    network_events: Sequence[NetworkEventCreate] | None = None,
    classifier_output: dict[str, Any] | None = None,
    observed_mask: dict[str, bool] | None = None,
    is_demo: bool = False,
) -> dict[str, Any]:
    """
    Evaluate risk score, risk level, classification, and structured evidence list.

    Parameters
    ----------
    feature_vector:
        Feature values (FeatureVector instance or dict).
    static_result:
        Optional static analysis result.
    behavior_events:
        Optional behavioral telemetry events.
    network_events:
        Optional network telemetry events.
    classifier_output:
        Result from ML predictor (may have applicable=False).
    observed_mask:
        Mapping of feature name -> bool.
    is_demo:
        Whether the analysis source is a simulated demonstration scenario.

    Returns
    -------
    dict:
        {
            "classification": "Benign" | "Suspicious" | "Trojan-like",
            "risk_score": int,
            "raw_points": float,
            "unclamped_score": float,
            "risk_level": "Low" | "Medium" | "High" | "Critical",
            "evidence": list[EvidenceItem],
            "context": list[ContextItem],
            "classifier_agrees": bool,
            "classifier_disagreement_reason": str | None,
            "summary": str,
        }
    """
    # Resolve feature values and observed mask
    if isinstance(feature_vector, FeatureVector):
        f_vals = feature_vector.values
        f_mask = observed_mask if observed_mask is not None else feature_vector.observed_mask
    elif isinstance(feature_vector, dict):
        f_vals = feature_vector
        f_mask = observed_mask or {k: True for k in f_vals}
    else:
        f_vals = {}
        f_mask = observed_mask or {}

    evidence: list[EvidenceItem] = []
    context: list[ContextItem] = []

    # Evidence sources and simulated flags
    static_src = "static_simulated" if is_demo else "static"
    is_simulated = is_demo

    # -----------------------------------------------------------------------
    # 1. Static Indicators (only when observed)
    # -----------------------------------------------------------------------
    if f_mask.get("file_entropy", False):
        ent = float(f_vals.get("file_entropy", 0.0))
        if ent >= 6.8:
            evidence.append(EvidenceItem(
                indicator="high_file_entropy",
                observed_value=round(ent, 2),
                points_contributed=RISK_WEIGHTS.get("file_entropy", 10.0),
                source=static_src,
                is_simulated=is_simulated,
            ))
        elif ent >= 5.5:
            evidence.append(EvidenceItem(
                indicator="moderate_file_entropy",
                observed_value=round(ent, 2),
                points_contributed=5.0,
                source=static_src,
                is_simulated=is_simulated,
            ))
        else:
            context.append(ContextItem(
                indicator="normal_entropy",
                observed_value=round(ent, 2),
                description="File entropy within normal unpacked distribution (benign baseline).",
                source=static_src,
                is_simulated=is_simulated,
            ))

    if f_mask.get("import_count", False):
        imp = int(f_vals.get("import_count", 0))
        if imp >= 60:
            evidence.append(EvidenceItem(
                indicator="high_import_count",
                observed_value=imp,
                points_contributed=6.0,
                source=static_src,
                is_simulated=is_simulated,
            ))
        elif imp >= 35:
            evidence.append(EvidenceItem(
                indicator="moderate_import_count",
                observed_value=imp,
                points_contributed=4.0,
                source=static_src,
                is_simulated=is_simulated,
            ))
        else:
            context.append(ContextItem(
                indicator="normal_import_count",
                observed_value=imp,
                description="Import table count within expected bounds.",
                source=static_src,
                is_simulated=is_simulated,
            ))

    if f_mask.get("suspicious_imports", False):
        susp = int(f_vals.get("suspicious_imports", 0))
        if susp >= 6:
            evidence.append(EvidenceItem(
                indicator="suspicious_api_imports",
                observed_value=susp,
                points_contributed=RISK_WEIGHTS.get("suspicious_imports", 16.0),
                source=static_src,
                is_simulated=is_simulated,
            ))
        elif susp >= 4:
            evidence.append(EvidenceItem(
                indicator="suspicious_api_imports",
                observed_value=susp,
                points_contributed=12.0,
                source=static_src,
                is_simulated=is_simulated,
            ))
        elif susp >= 2:
            evidence.append(EvidenceItem(
                indicator="suspicious_api_imports",
                observed_value=susp,
                points_contributed=5.0,
                source=static_src,
                is_simulated=is_simulated,
            ))
        elif susp == 1:
            evidence.append(EvidenceItem(
                indicator="suspicious_api_imports",
                observed_value=susp,
                points_contributed=3.0,
                source=static_src,
                is_simulated=is_simulated,
            ))

    # -----------------------------------------------------------------------
    # 2. Behavioral Indicators (only when observed)
    # -----------------------------------------------------------------------
    if f_mask.get("process_count", False):
        proc = int(f_vals.get("process_count", 0))
        if proc >= 4:
            evidence.append(EvidenceItem(
                indicator="high_process_activity",
                observed_value=proc,
                points_contributed=RISK_WEIGHTS.get("process_count", 8.0),
                source="behavior",
                is_simulated=is_simulated,
            ))
        elif proc >= 2:
            evidence.append(EvidenceItem(
                indicator="moderate_process_activity",
                observed_value=proc,
                points_contributed=4.0,
                source="behavior",
                is_simulated=is_simulated,
            ))
        else:
            context.append(ContextItem(
                indicator="single_process_execution",
                observed_value=proc,
                description="Single process execution; no abnormal process tree branching.",
                source="behavior",
                is_simulated=is_simulated,
            ))

    if f_mask.get("file_events", False):
        fev = int(f_vals.get("file_events", 0))
        if fev >= 3:
            evidence.append(EvidenceItem(
                indicator="suspicious_file_modifications",
                observed_value=fev,
                points_contributed=6.0,
                source="behavior",
                is_simulated=is_simulated,
            ))
        elif fev >= 1 and any("temp" in e.description.lower() for e in (behavior_events or [])):
            evidence.append(EvidenceItem(
                indicator="temp_file_staging",
                observed_value=fev,
                points_contributed=2.0,
                source="behavior",
                is_simulated=is_simulated,
            ))
        else:
            context.append(ContextItem(
                indicator="normal_file_activity",
                observed_value=fev,
                description="Low file I/O activity within ordinary process working space.",
                source="behavior",
                is_simulated=is_simulated,
            ))

    if f_mask.get("persistence_indicator", False):
        pers = float(f_vals.get("persistence_indicator", 0.0))
        if pers == 1.0:
            evidence.append(EvidenceItem(
                indicator="persistence_like_event",
                observed_value=1,
                points_contributed=RISK_WEIGHTS.get("persistence_indicator", 12.0),
                source="behavior",
                is_simulated=is_simulated,
            ))

    # -----------------------------------------------------------------------
    # 3. Network Indicators (only when observed)
    # -----------------------------------------------------------------------
    if f_mask.get("network_connections", False):
        conns = int(f_vals.get("network_connections", 0))
        if conns >= 5:
            evidence.append(EvidenceItem(
                indicator="high_outbound_connections",
                observed_value=conns,
                points_contributed=RISK_WEIGHTS.get("network_connections", 10.0),
                source="network",
                is_simulated=is_simulated,
            ))
        elif conns >= 3:
            evidence.append(EvidenceItem(
                indicator="moderate_outbound_connections",
                observed_value=conns,
                points_contributed=6.0,
                source="network",
                is_simulated=is_simulated,
            ))
        elif conns == 1:
            # Baseline benign activity is 0 points, listed in context
            context.append(ContextItem(
                indicator="single_connection",
                observed_value=1,
                description="Single outbound network connection within normal baseline parameters.",
                source="network",
                is_simulated=is_simulated,
            ))
        elif conns == 2:
            evidence.append(EvidenceItem(
                indicator="low_outbound_connections",
                observed_value=conns,
                points_contributed=3.0,
                source="network",
                is_simulated=is_simulated,
            ))

    if f_mask.get("dns_requests", False):
        dns = int(f_vals.get("dns_requests", 0))
        if dns >= 2:
            evidence.append(EvidenceItem(
                indicator="multiple_dns_queries",
                observed_value=dns,
                points_contributed=RISK_WEIGHTS.get("dns_requests", 6.0),
                source="network",
                is_simulated=is_simulated,
            ))
        elif dns == 1:
            # Baseline benign activity is 0 points, listed in context
            context.append(ContextItem(
                indicator="single_dns_query",
                observed_value=1,
                description="Single standard DNS query within normal baseline.",
                source="network",
                is_simulated=is_simulated,
            ))

    if f_mask.get("repeated_connections", False):
        rep = int(f_vals.get("repeated_connections", 0))
        if rep >= 3:
            evidence.append(EvidenceItem(
                indicator="beacon_like_repeated_connections",
                observed_value=rep,
                points_contributed=RISK_WEIGHTS.get("repeated_connections", 14.0),
                source="network",
                is_simulated=is_simulated,
            ))
        elif rep == 2:
            evidence.append(EvidenceItem(
                indicator="repeated_connection_pattern",
                observed_value=rep,
                points_contributed=8.0,
                source="network",
                is_simulated=is_simulated,
            ))
        elif rep == 1:
            evidence.append(EvidenceItem(
                indicator="occasional_repeated_connection",
                observed_value=1,
                points_contributed=4.0,
                source="network",
                is_simulated=is_simulated,
            ))

    # -----------------------------------------------------------------------
    # 4. Statistical ML Classifier Contribution (only when applicable)
    # -----------------------------------------------------------------------
    if classifier_output and classifier_output.get("applicable", False):
        pred_label = classifier_output.get("predicted_label")
        conf = classifier_output.get("confidence", 0.0)
        if pred_label == "Trojan-like":
            evidence.append(EvidenceItem(
                indicator="ml_classifier_trojan_prediction",
                observed_value=f"Trojan-like ({conf:.1%})",
                points_contributed=10.0,
                source="classifier",
                is_simulated=is_simulated,
            ))
        elif pred_label == "Suspicious":
            evidence.append(EvidenceItem(
                indicator="ml_classifier_suspicious_prediction",
                observed_value=f"Suspicious ({conf:.1%})",
                points_contributed=5.0,
                source="classifier",
                is_simulated=is_simulated,
            ))

    # Calculate exact score from evidence points
    raw_points = float(sum(e.points_contributed for e in evidence))
    risk_score = min(100, int(round(raw_points)))
    risk_level = get_risk_level(risk_score)

    # -----------------------------------------------------------------------
    # 5. Rule-based Classification Decision
    # -----------------------------------------------------------------------
    has_telemetry = (
        f_mask.get("network_connections", False) and f_mask.get("process_count", False)
    )

    if not has_telemetry:
        # Static-only uploads: Capped strictly at Suspicious
        # Trojan-like classification requires behavioral or network evidence
        if risk_score > CLASSIFICATION_THRESHOLDS["low_max"]:
            classification = "Suspicious"
            summary = (
                f"Flagged as Suspicious based on static indicators (risk score {risk_score}/100, {risk_level} risk). "
                "Behavioral and network telemetry not available; Trojan-like classification requires dynamic/behavioral evidence."
            )
        else:
            classification = "Benign"
            summary = (
                f"Classified as Benign based on static metadata (risk score {risk_score}/100, {risk_level} risk). "
                "Behavioral and network telemetry not available."
            )
    else:
        # Full multi-source analysis
        if risk_score >= CLASSIFICATION_THRESHOLDS["trojan_min_score"]:
            classification = "Trojan-like"
            summary = (
                f"Flagged as Trojan-like with critical risk score of {risk_score}/100 ({risk_level} risk) "
                "driven by observed command-and-control telemetry, process manipulation, and persistence."
            )
        elif risk_score > CLASSIFICATION_THRESHOLDS["low_max"]:
            classification = "Suspicious"
            summary = (
                f"Flagged as Suspicious with elevated risk score of {risk_score}/100 ({risk_level} risk) "
                "based on anomalous file staging, network activity, and heuristic indicators."
            )
        else:
            classification = "Benign"
            summary = (
                f"Classified as Benign (risk score {risk_score}/100, {risk_level} risk). "
                "Host telemetry and network connection patterns remain within normal parameters."
            )

    # -----------------------------------------------------------------------
    # 6. Classifier Agreement Check
    # -----------------------------------------------------------------------
    if classifier_output and classifier_output.get("applicable", False):
        clf_pred = classifier_output.get("predicted_label")
        classifier_agrees = (classification == clf_pred)
        if not classifier_agrees:
            clf_conf = classifier_output.get("confidence", 0.0)
            classifier_disagreement_reason = (
                f"Defensive rules decided '{classification}' (score: {risk_score}/100, {risk_level} risk) "
                f"based on deterministic domain rules, while ML model predicted '{clf_pred}' ({clf_conf:.1%})."
            )
        else:
            classifier_disagreement_reason = None
    else:
        # Classifier not applicable (e.g. static-only upload)
        classifier_agrees = True
        classifier_disagreement_reason = None

    return {
        "classification": classification,
        "risk_score": risk_score,
        "raw_points": raw_points,
        "unclamped_score": raw_points,
        "risk_level": risk_level,
        "evidence": evidence,
        "context": context,
        "classifier_agrees": classifier_agrees,
        "classifier_disagreement_reason": classifier_disagreement_reason,
        "summary": summary,
    }


def get_recommended_steps(classification: str, risk_score: float, evidence: list[Any] | None = None) -> list[str]:
    """
    Generate defensive next steps chosen from classification and observed evidence.
    Written as generic security guidance only.
    """
    steps = []
    indicators = set()
    if evidence:
        for item in evidence:
            ind = item.indicator if hasattr(item, "indicator") else (item.get("indicator") if isinstance(item, dict) else "")
            if ind:
                indicators.add(ind)

    if classification == "Trojan-like":
        steps.append("Isolate the host immediately from the local network to prevent lateral movement.")
        steps.append("Terminate suspicious processes and inspect persistence locations (Registry Run keys, Scheduled Tasks).")
        if any("beacon" in ind or "network" in ind or "repeated" in ind for ind in indicators):
            steps.append("Block identified C2 IP addresses and suspicious destination ports on perimeter firewalls.")
        if any("inject" in ind or "process" in ind or "memory" in ind for ind in indicators):
            steps.append("Capture volatile forensic memory to inspect for injected shellcode or DLL hollows.")
        steps.append("Revoke active user session credentials and review directory service authentication logs.")
    elif classification == "Suspicious":
        steps.append("Quarantine the suspicious file and prevent execution across other managed endpoints.")
        steps.append("Inspect user staging directories (AppData, Temp) for auxiliary payloads or droppers.")
        if any("network" in ind or "dns" in ind for ind in indicators):
            steps.append("Review outbound network flows and DNS query telemetry for abnormal domain lookups.")
        steps.append("Submit the sample to an isolated sandbox for full behavioral execution and monitoring.")
    else:  # Benign
        steps.append("No active indicators of compromise identified; sample retained in baseline audit catalog.")
        steps.append("Ensure endpoint detection signatures and operating system patches remain current.")
        steps.append("Verify publisher digital signatures before executing or deploying in production.")

    return steps

