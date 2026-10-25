"""
TrojanGuard — Indicators of Compromise (IOC) Builder.

Builds structured IOC records (hash, ip, domain, port) strictly from
values that were actually observed in static results or simulated events.
Never creates phantom or invented IOC values.
"""
from __future__ import annotations

import re
from typing import Sequence
from app.models.schemas import IocCreate, NetworkEventCreate, BehaviorEventCreate
from app.analysis.static import StaticResult


def extract_iocs(
    static_result: StaticResult | None = None,
    network_events: Sequence[NetworkEventCreate] | None = None,
    behavior_events: Sequence[BehaviorEventCreate] | None = None,
    is_demo: bool = False,
) -> list[IocCreate]:
    """
    Construct IOC records from observed static metadata and network telemetry.

    Parameters
    ----------
    static_result:
        Analyzed file result (provides SHA-256 hash).
    network_events:
        Network telemetry events (provides remote IPs, ports, and domains).
    behavior_events:
        Behavior events (optional, scanned for embedded domains/IPs if any).
    is_demo:
        If True, marks static file hashes as simulated.
        Simulated network events are always marked is_simulated=1.

    Returns
    -------
    list[IocCreate]:
        Deduplicated list of structured IOCs.
    """
    seen: set[tuple[str, str]] = set()
    iocs: list[IocCreate] = []

    def _add_ioc(ioc_type: str, value: str, is_simulated: int) -> None:
        key = (ioc_type, value.strip())
        if key not in seen and value.strip():
            seen.add(key)
            iocs.append(IocCreate(type=ioc_type, value=value.strip(), is_simulated=is_simulated))  # type: ignore

    # 1. File Hash from Static Analysis
    if static_result and static_result.sha256:
        # Uploaded files have real computed SHA-256 (is_simulated=0), demo items marked is_simulated=1
        sim_val = 1 if is_demo else 0
        _add_ioc("hash", static_result.sha256, is_simulated=sim_val)

    # 2. Network Events: Remote Destination IPs and Ports
    if network_events:
        for net in network_events:
            # Destination IP / Host
            dst = net.destination.strip()
            if dst:
                # Check if destination is an IP address
                if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", dst):
                    _add_ioc("ip", dst, is_simulated=1)
                else:
                    _add_ioc("domain", dst, is_simulated=1)

            # Noteworthy remote ports (avoiding standard local DNS 53 if internal)
            if net.port and net.port not in (53,):
                _add_ioc("port", str(net.port), is_simulated=1)

    # 3. Behavior Events: Check for any explicit domain or IP mentions in descriptions
    if behavior_events:
        for b in behavior_events:
            # Check for domain-like strings in description (e.g. *.example, *.test)
            domain_matches = re.findall(r"\b([a-zA-Z0-9_\-]+\.(?:example|test|com|org|net))\b", b.description)
            for d in domain_matches:
                _add_ioc("domain", d, is_simulated=1)

    return iocs
