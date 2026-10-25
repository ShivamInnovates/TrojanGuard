"""
TrojanGuard — 9-Feature Vector Extractor.

Builds the 9-feature vector in the exact order locked in config.py FEATURE_NAMES.
Returns both numerical feature values and an observed_mask.

Critical Rule:
-------------
For uploaded files where only static analysis is available, behavioral and
network indicators are marked NOT observed (observed_mask[feat] = False, value = 0.0).
Downstream classification and risk engines must never treat an unobserved 0
as evidence of benign behavior.
"""
from __future__ import annotations

import json
from typing import Sequence
from collections import Counter
from pydantic import BaseModel, ConfigDict, Field

from app.config import FEATURE_NAMES
from app.analysis.static import StaticResult
from app.models.schemas import BehaviorEventCreate, NetworkEventCreate


class FeatureVector(BaseModel):
    """Structured 9-feature vector with explicit observability flags."""
    model_config = ConfigDict(from_attributes=True)

    feature_names: list[str] = Field(default_factory=lambda: list(FEATURE_NAMES))
    values: dict[str, float]
    feature_list: list[float]
    observed_mask: dict[str, bool]
    observed_count: int

    def to_json(self) -> str:
        """Serialize values to JSON text for storage in analyses.features_json."""
        return json.dumps(self.values, sort_keys=False)


def extract_features(
    static_result: StaticResult | None = None,
    behavior_events: Sequence[BehaviorEventCreate] | None = None,
    network_events: Sequence[NetworkEventCreate] | None = None,
) -> FeatureVector:
    """
    Extract the 9 standardized features in the exact order of FEATURE_NAMES.

    Parameters
    ----------
    static_result:
        Output of static analysis (entropy, imports, suspicious imports).
    behavior_events:
        Optional sequence of simulated/recorded host behavior events.
    network_events:
        Optional sequence of simulated/recorded network telemetry events.

    Returns
    -------
    FeatureVector:
        Locked 9-element feature list, name-to-value map, and observed mask.
    """
    values: dict[str, float] = {}
    observed_mask: dict[str, bool] = {}

    # Initialize all 9 features to 0.0 and unobserved
    for name in FEATURE_NAMES:
        values[name] = 0.0
        observed_mask[name] = False

    # -----------------------------------------------------------------------
    # 1. Static features
    # -----------------------------------------------------------------------
    if static_result is not None:
        # File entropy is observed for any analyzed byte payload
        values["file_entropy"] = float(static_result.entropy)
        observed_mask["file_entropy"] = True

        # Import metrics are observed if PE parsed successfully
        if "import_count" in static_result.observed_features:
            values["import_count"] = float(static_result.import_count)
            observed_mask["import_count"] = True

        if "suspicious_imports" in static_result.observed_features:
            values["suspicious_imports"] = float(static_result.suspicious_import_count)
            observed_mask["suspicious_imports"] = True

    # -----------------------------------------------------------------------
    # 2. Behavioral features
    # -----------------------------------------------------------------------
    if behavior_events is not None:
        # Behavioral telemetry is present (observed)
        observed_mask["process_count"] = True
        observed_mask["file_events"] = True
        observed_mask["persistence_indicator"] = True

        # Process-related count: process_create, memory_inject, thread_create, process_tamper, process_evasion
        process_ev_types = {"process_create", "thread_create", "memory_inject", "memory_write", "process_tamper", "process_evasion"}
        proc_count = sum(1 for e in behavior_events if e.event_type in process_ev_types)
        values["process_count"] = float(proc_count)

        # File-related event count
        file_ev_types = {"file_write", "file_read", "file_modify", "file_delete"}
        file_count = sum(1 for e in behavior_events if e.event_type in file_ev_types)
        values["file_events"] = float(file_count)

        # Persistence indicator (1.0 if persistence event found, else 0.0)
        has_persistence = any(
            e.event_type == "persistence" or "persistence" in e.description.lower() or "run key" in e.description.lower()
            for e in behavior_events
        )
        values["persistence_indicator"] = 1.0 if has_persistence else 0.0

    # -----------------------------------------------------------------------
    # 3. Network features
    # -----------------------------------------------------------------------
    if network_events is not None:
        # Network telemetry is present (observed)
        observed_mask["network_connections"] = True
        observed_mask["dns_requests"] = True
        observed_mask["repeated_connections"] = True

        # DNS queries
        dns_count = sum(
            1 for e in network_events
            if e.event_type == "dns_query" or e.port == 53 or e.protocol.upper() == "DNS"
        )
        values["dns_requests"] = float(dns_count)

        # Outbound network connections (excluding internal DNS lookups)
        conn_count = sum(
            1 for e in network_events
            if e.event_type != "dns_query" and e.port != 53
        )
        values["network_connections"] = float(conn_count)

        # Repeated connections (repeated calls to the same destination/port, or repeated_beacon/repeated_connection tags)
        dest_port_counts = Counter(
            (e.destination, e.port) for e in network_events
            if e.event_type != "dns_query" and e.port != 53
        )
        repeated_by_dest = sum(count - 1 for count in dest_port_counts.values() if count > 1)
        repeated_by_tag = sum(
            1 for e in network_events
            if e.event_type in ("repeated_connection", "repeated_beacon")
        )
        values["repeated_connections"] = float(max(repeated_by_dest, repeated_by_tag))

    # Build locked ordered list
    feature_list = [values[name] for name in FEATURE_NAMES]
    observed_count = sum(1 for obs in observed_mask.values() if obs)

    return FeatureVector(
        feature_names=list(FEATURE_NAMES),
        values=values,
        feature_list=feature_list,
        observed_mask=observed_mask,
        observed_count=observed_count,
    )
