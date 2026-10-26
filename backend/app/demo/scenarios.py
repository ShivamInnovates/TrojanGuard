"""
TrojanGuard — Predefined Demo Scenarios.

Defines the three deterministic demonstration scenarios:
1. normal: Benign system activity, low risk, no persistence.
2. suspicious: Elevated file and network staging activity, medium risk.
3. trojan: Malicious process injection, C2 beaconing, persistence, critical risk.

Built strictly on Phase 3 generators with fixed seed (42).
"""
from __future__ import annotations

from typing import Any
import hashlib
from app.analysis.static import StaticResult
from app.analysis.behavior import generate_behavior_events
from app.analysis.network import generate_network_events
from app.models.schemas import BehaviorEventCreate, NetworkEventCreate


def derive_simulated_sha256(scenario_id: str) -> str:
    """
    Deterministically derive a SHA-256 for a simulated demo scenario
    from a fixed string: 'trojanguard-demo-{scenario_id}-v1'.
    This is explicitly labelled as a synthetic identifier.
    """
    fixed_str = f"trojanguard-demo-{scenario_id}-v1"
    return hashlib.sha256(fixed_str.encode("utf-8")).hexdigest()


SCENARIO_DEFINITIONS: dict[str, dict[str, Any]] = {
    "normal": {
        "scenario_id": "normal",
        "name": "Normal System",
        "description": "Ordinary background service activity, benign configuration reads, and standard single HTTPS outbound connection. (Synthetic identifier: SHA-256 of 'trojanguard-demo-normal-v1')",
        "expected_classification": "Benign",
        "expected_risk_band": "Low",
        "filename": "sys_helper_clean.exe",
        "file_size": 1024,
        "sha256": derive_simulated_sha256("normal"),
        "sha256_type": "synthetic_identifier",
        "sha256_seed_string": "trojanguard-demo-normal-v1",
        "entropy": 4.20,
        "import_count": 18,
        "suspicious_import_count": 0,
    },
    "suspicious": {
        "scenario_id": "suspicious",
        "name": "Suspicious Activity",
        "description": "Auxiliary child process creation with hidden window, executable staging in temporary directories, and repeated outbound connections. (Synthetic identifier: SHA-256 of 'trojanguard-demo-suspicious-v1')",
        "expected_classification": "Suspicious",
        "expected_risk_band": "Medium",
        "filename": "update_agent_stager.exe",
        "file_size": 2048,
        "sha256": derive_simulated_sha256("suspicious"),
        "sha256_type": "synthetic_identifier",
        "sha256_seed_string": "trojanguard-demo-suspicious-v1",
        "entropy": 5.80,
        "import_count": 45,
        "suspicious_import_count": 2,
    },
    "trojan": {
        "scenario_id": "trojan",
        "name": "Trojan-like Activity",
        "description": "Memory injection into target processes via VirtualAllocEx/WriteProcessMemory, C2 beaconing over port 4444, and startup Run key persistence. (Synthetic identifier: SHA-256 of 'trojanguard-demo-trojan-v1')",
        "expected_classification": "Trojan-like",
        "expected_risk_band": "Critical",
        "filename": "invoice_viewer_trojan.exe",
        "file_size": 8192,
        "sha256": derive_simulated_sha256("trojan"),
        "sha256_type": "synthetic_identifier",
        "sha256_seed_string": "trojanguard-demo-trojan-v1",
        "entropy": 7.40,
        "import_count": 85,
        "suspicious_import_count": 5,
    },
}


class Scenario:
    """Encapsulates a fully prepared, deterministic demo scenario."""

    def __init__(self, scenario_id: str, seed: int = 42):
        norm_id = scenario_id.strip().lower()
        if "trojan" in norm_id:
            key = "trojan"
        elif "suspicious" in norm_id:
            key = "suspicious"
        else:
            key = "normal"

        self.meta = SCENARIO_DEFINITIONS[key]
        self.scenario_id = key
        self.name = self.meta["name"]
        self.description = self.meta["description"]
        self.expected_classification = self.meta["expected_classification"]
        self.expected_risk_band = self.meta["expected_risk_band"]
        self.filename = self.meta["filename"]

        # Generate static result
        self.static_result = StaticResult(
            filename=self.filename,
            file_size=self.meta["file_size"],
            sha256=self.meta["sha256"],
            entropy=self.meta["entropy"],
            file_type="PE",
            is_pe=True,
            limited=False,
            observed_features=["file_entropy", "import_count", "suspicious_imports"],
            import_count=self.meta["import_count"],
            suspicious_import_count=self.meta["suspicious_import_count"],
        )

        # Generate behavior and network events
        self.behavior_events: list[BehaviorEventCreate] = generate_behavior_events(key, seed=seed)
        self.network_events: list[NetworkEventCreate] = generate_network_events(key, seed=seed)

        # Build chronological event schedule for streaming UI polling
        self.event_schedule: list[dict[str, Any]] = self._build_schedule()
        self.total_duration_seconds = max((e["offset_seconds"] for e in self.event_schedule), default=15) + 1

    def _build_schedule(self) -> list[dict[str, Any]]:
        schedule: list[dict[str, Any]] = []

        # Behavior events offsets (approx 1s to 15s)
        for idx, b in enumerate(self.behavior_events):
            # Parse offset from timestamp or assign staggered seconds
            offset = 1 + idx * 2
            schedule.append({
                "offset_seconds": offset,
                "category": "behavior",
                "event_type": b.event_type,
                "description": b.description,
                "severity": b.severity,
                "timestamp": b.timestamp,
                "is_simulated": 1,
            })

        # Network events offsets
        for idx, n in enumerate(self.network_events):
            offset = 2 + idx * 2
            schedule.append({
                "offset_seconds": offset,
                "category": "network",
                "event_type": n.event_type,
                "description": f"{n.protocol} connection {n.source} -> {n.destination}:{n.port} ({n.event_type})",
                "severity": "high" if "beacon" in n.event_type else ("medium" if n.port != 80 and n.port != 443 else "low"),
                "timestamp": n.timestamp,
                "is_simulated": 1,
            })

        # Sort schedule strictly by offset_seconds
        schedule.sort(key=lambda x: x["offset_seconds"])
        return schedule


def get_scenario(scenario_id: str, seed: int = 42) -> Scenario:
    """Factory function returning a Scenario instance."""
    return Scenario(scenario_id, seed=seed)
