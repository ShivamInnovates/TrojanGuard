"""
TrojanGuard — Simulated Behavioral Telemetry Generator.

Generates deterministic, simulated host and process behavioral events
for safe demonstration scenarios (normal, suspicious, trojan).

Safety Invariants:
-----------------
- Strictly simulated in-memory records.
- Does NOT interact with the OS, filesystem, registry, processes, or APIs.
- All events are explicitly flagged with is_simulated=1.
- Uses fictional process and binary names.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
import random
from typing import Sequence

from app.models.schemas import BehaviorEventCreate, Severity


def normalize_scenario_name(scenario: str) -> str:
    """Normalize scenario name to one of 'normal', 'suspicious', 'trojan'."""
    s = scenario.strip().lower()
    if "trojan" in s:
        return "trojan"
    if "suspicious" in s:
        return "suspicious"
    return "normal"


def generate_behavior_events(
    scenario: str = "normal",
    seed: int = 42,
    base_time: datetime | str | None = None,
) -> list[BehaviorEventCreate]:
    """
    Generate deterministic, simulated behavior events for a scenario.

    Parameters
    ----------
    scenario:
        One of 'normal', 'suspicious', or 'trojan'.
    seed:
        Seed for deterministic event generation.
    base_time:
        Starting UTC timestamp for event sequence. Defaults to 2026-10-25T12:00:00Z.

    Returns
    -------
    list[BehaviorEventCreate]:
        Timestamped events marked with is_simulated=1.
    """
    rng = random.Random(seed)
    key = normalize_scenario_name(scenario)

    if base_time is None:
        start_dt = datetime(2026, 10, 25, 12, 0, 0, tzinfo=timezone.utc)
    elif isinstance(base_time, str):
        # Parse ISO string
        start_dt = datetime.fromisoformat(base_time.replace("Z", "+00:00"))
    else:
        start_dt = base_time

    raw_events: list[tuple[str, str, Severity, int]]  # (event_type, description, severity, seconds_offset)

    if key == "normal":
        raw_events = [
            (
                "process_create",
                "Launched background service 'explorer_agent.dummy' (PID 1420)",
                "low",
                1,
            ),
            (
                "file_read",
                "Opened local configuration file 'config.ini' with READ access",
                "low",
                3,
            ),
            (
                "file_write",
                "Wrote routine heartbeat session log to 'session_cache.tmp'",
                "low",
                6,
            ),
            (
                "process_terminate",
                "Background service 'explorer_agent.dummy' (PID 1420) exited normally with code 0",
                "low",
                10,
            ),
        ]

    elif key == "suspicious":
        raw_events = [
            (
                "process_create",
                "Spawned auxiliary child process 'mock_updater.fake' (PID 3312) with hidden window flags",
                "medium",
                1,
            ),
            (
                "file_write",
                "Created unexpected executable file in temporary folder '%TEMP%\\update_payload.bin'",
                "medium",
                4,
            ),
            (
                "process_tamper",
                "Queried security token privileges via OpenProcessToken",
                "medium",
                7,
            ),
            (
                "file_modify",
                "Modified desktop application shortcut 'Browser.lnk' parameters",
                "medium",
                11,
            ),
            (
                "file_write",
                "Staged staging metadata file in '%APPDATA%\\Local\\Temp\\staged_meta.dat'",
                "low",
                14,
            ),
        ]

    else:  # trojan
        raw_events = [
            (
                "process_create",
                "Spawned target system binary 'calc_helper.bin' in SUSPENDED state (PID 4892)",
                "high",
                1,
            ),
            (
                "memory_inject",
                "Allocated executable memory region in target process via VirtualAllocEx (PAGE_EXECUTE_READWRITE)",
                "critical",
                3,
            ),
            (
                "memory_write",
                "Wrote shellcode payload buffer into remote process address space via WriteProcessMemory",
                "critical",
                5,
            ),
            (
                "thread_create",
                "Initiated code execution in remote process via CreateRemoteThread at entry RVA +0x1020",
                "critical",
                7,
            ),
            (
                "file_write",
                "Dropped disguised secondary loader binary to '%APPDATA%\\Roaming\\win_updater_mock.exe'",
                "high",
                9,
            ),
            (
                "persistence",
                "Created startup persistence registry key: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WinUpdater",
                "critical",
                12,
            ),
            (
                "process_evasion",
                "Executed anti-debugging check via IsDebuggerPresent to alter execution branching",
                "high",
                15,
            ),
        ]

    results: list[BehaviorEventCreate] = []
    for event_type, desc, severity, offset in raw_events:
        event_time = start_dt + timedelta(seconds=offset)
        results.append(
            BehaviorEventCreate(
                timestamp=event_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                event_type=event_type,
                description=desc,
                severity=severity,
                is_simulated=1,
            )
        )

    return results
