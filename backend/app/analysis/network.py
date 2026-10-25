"""
TrojanGuard — Simulated Network Telemetry Generator.

Generates deterministic, simulated network telemetry events for safe
demonstration scenarios (normal, suspicious, trojan).

Safety Invariants:
-----------------
- No actual network or socket activity.
- All IP addresses strictly belong to RFC 5737 documentation blocks:
  * 192.0.2.0/24   (TEST-NET-1)
  * 198.51.100.0/24 (TEST-NET-2)
  * 203.0.113.0/24  (TEST-NET-3)
- All domains end exclusively with .example or .test (RFC 2606 / RFC 6761).
- All events are explicitly flagged with is_simulated=1.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
import ipaddress
import random
from typing import Sequence

from app.models.schemas import NetworkEventCreate


RFC_5737_NETWORKS = [
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
]


def is_rfc5737_ip(ip_str: str) -> bool:
    """Verify that an IPv4 address belongs to one of the RFC 5737 documentation ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in RFC_5737_NETWORKS)
    except ValueError:
        return False


def normalize_scenario_name(scenario: str) -> str:
    """Normalize scenario name to one of 'normal', 'suspicious', 'trojan'."""
    s = scenario.strip().lower()
    if "trojan" in s:
        return "trojan"
    if "suspicious" in s:
        return "suspicious"
    return "normal"


def generate_network_events(
    scenario: str = "normal",
    seed: int = 42,
    base_time: datetime | str | None = None,
) -> list[NetworkEventCreate]:
    """
    Generate deterministic, simulated network telemetry events for a scenario.

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
    list[NetworkEventCreate]:
        Simulated network connection and DNS events with RFC 5737 IPs.
    """
    rng = random.Random(seed)
    key = normalize_scenario_name(scenario)

    if base_time is None:
        start_dt = datetime(2026, 10, 25, 12, 0, 0, tzinfo=timezone.utc)
    elif isinstance(base_time, str):
        start_dt = datetime.fromisoformat(base_time.replace("Z", "+00:00"))
    else:
        start_dt = base_time

    # Raw event definitions:
    # (source, destination, port, protocol, event_type, offset_seconds)
    raw_events: list[tuple[str, str, int, str, str, int]]

    if key == "normal":
        raw_events = [
            (
                "192.0.2.10",
                "192.0.2.1",
                53,
                "DNS",
                "dns_query",
                1,
            ),
            (
                "192.0.2.10",
                "198.51.100.15",
                443,
                "HTTPS",
                "connection",
                2,
            ),
        ]

    elif key == "suspicious":
        raw_events = [
            (
                "192.0.2.10",
                "192.0.2.1",
                53,
                "DNS",
                "dns_query",
                1,
            ),
            (
                "192.0.2.10",
                "198.51.100.44",
                8080,
                "TCP",
                "connection",
                3,
            ),
            (
                "192.0.2.10",
                "198.51.100.44",
                8080,
                "TCP",
                "repeated_connection",
                6,
            ),
            (
                "192.0.2.10",
                "198.51.100.44",
                8080,
                "HTTP",
                "data_stage",
                9,
            ),
        ]

    else:  # trojan
        raw_events = [
            (
                "192.0.2.10",
                "192.0.2.1",
                53,
                "DNS",
                "dns_query",
                1,
            ),
            (
                "192.0.2.10",
                "192.0.2.1",
                53,
                "DNS",
                "dns_query",
                2,
            ),
            (
                "192.0.2.10",
                "203.0.113.88",
                4444,
                "TCP",
                "c2_beacon",
                3,
            ),
            (
                "192.0.2.10",
                "203.0.113.88",
                4444,
                "TCP",
                "repeated_beacon",
                6,
            ),
            (
                "192.0.2.10",
                "203.0.113.88",
                4444,
                "TCP",
                "repeated_beacon",
                9,
            ),
            (
                "192.0.2.10",
                "203.0.113.88",
                4444,
                "TCP",
                "repeated_beacon",
                12,
            ),
            (
                "192.0.2.10",
                "203.0.113.99",
                8443,
                "HTTPS",
                "exfil_post",
                15,
            ),
        ]

    results: list[NetworkEventCreate] = []
    for src, dst, port, proto, ev_type, offset in raw_events:
        event_time = start_dt + timedelta(seconds=offset)
        results.append(
            NetworkEventCreate(
                timestamp=event_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                source=src,
                destination=dst,
                port=port,
                protocol=proto,
                event_type=ev_type,
                is_simulated=1,
            )
        )

    return results
