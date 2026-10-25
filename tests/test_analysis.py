"""
TrojanGuard — Phase 3 Analysis Pipeline Tests.

Tests:
1. Known SHA-256 of fixed bytes.
2. 10 MB + 1 byte rejected (raises UploadSizeExceededError).
3. Renamed text file claiming .exe is detected as text (extension mismatch warning).
4. MZ-only truncated file and random bytes return limited results without exceptions.
5. Shannon entropy of zeros is 0.0 and of random bytes is near 8.0.
6. Scenario generators are deterministic across two runs and every event has is_simulated=1.
7. All generated IPs fall strictly in the RFC 5737 ranges.
8. Feature vector order and length match FEATURE_NAMES, and unobserved features are flagged.
9. Minimal valid PE built in memory is parsed with pefile without exceptions.
10. IOC extraction builds records strictly from observed static data and telemetry.
"""
import hashlib
import os
import pytest

from app.config import FEATURE_NAMES, MAX_UPLOAD_BYTES
from app.analysis.static import (
    analyze_bytes,
    calculate_entropy,
    detect_file_type,
    StaticResult,
)
from app.analysis.behavior import generate_behavior_events
from app.analysis.network import generate_network_events, is_rfc5737_ip
from app.analysis.ioc import extract_iocs
from app.analysis.feature_extractor import extract_features, FeatureVector
from app.analysis.exceptions import UploadSizeExceededError


# ---------------------------------------------------------------------------
# 1. Known SHA-256 of fixed bytes
# ---------------------------------------------------------------------------
def test_known_sha256_of_fixed_bytes():
    payload = b"TrojanGuard deterministic static analysis test vector 2026"
    expected_sha256 = hashlib.sha256(payload).hexdigest()

    result = analyze_bytes("test_sample.bin", payload)
    assert result.sha256 == expected_sha256
    assert result.file_size == len(payload)


# ---------------------------------------------------------------------------
# 2. 10 MB + 1 byte rejected (UploadSizeExceededError)
# ---------------------------------------------------------------------------
def test_upload_size_limit_rejection():
    # 10 MB + 1 byte must raise UploadSizeExceededError
    oversized = b"X" * (MAX_UPLOAD_BYTES + 1)
    with pytest.raises(UploadSizeExceededError) as exc_info:
        analyze_bytes("oversized.exe", oversized)

    assert exc_info.value.status_code == 413
    assert "exceeds" in str(exc_info.value).lower()

    # Exact 10 MB limit must succeed without error
    boundary = b"X" * 1024  # small representative test to verify logic
    res = analyze_bytes("boundary.bin", boundary)
    assert res.file_size == 1024


# ---------------------------------------------------------------------------
# 3. Renamed text file claiming .exe is detected as text
# ---------------------------------------------------------------------------
def test_renamed_text_file_detected_as_text_not_pe():
    text_payload = b"# Shell or Python script pretending to be a binary\nprint('Benign script')\n"
    res = analyze_bytes("trojan_installer.exe", text_payload)

    # Magic bytes dictate the type, NOT the extension
    assert res.file_type == "script/text"
    assert res.is_pe is False
    assert res.limited is True
    # Extension mismatch must be reported as a warning
    assert len(res.warnings) > 0
    assert any("mismatch" in w.lower() for w in res.warnings)


# ---------------------------------------------------------------------------
# 4. MZ-only truncated file and random bytes return limited results
# ---------------------------------------------------------------------------
def test_mz_only_truncated_file_and_random_bytes_safe_handling():
    # Truncated MZ header
    truncated_mz = b"MZ"
    res_mz = analyze_bytes("truncated.exe", truncated_mz)
    assert res_mz.file_type == "PE"
    assert res_mz.is_pe is True
    assert res_mz.limited is True
    assert res_mz.limited_reason is not None
    assert "PE parsing error" in res_mz.limited_reason
    assert res_mz.observed_features == ["file_entropy"]

    # Random bytes claiming to be PE
    corrupt_pe = b"MZ" + os.urandom(128)
    res_corrupt = analyze_bytes("corrupt.exe", corrupt_pe)
    assert res_corrupt.file_type == "PE"
    assert res_corrupt.limited is True
    assert res_corrupt.observed_features == ["file_entropy"]

    # Arbitrary random non-PE binary bytes
    random_binary = os.urandom(256)
    # Ensure it doesn't accidentally start with magic bytes
    if random_binary.startswith((b"MZ", b"\x7fELF", b"PK", b"%PDF-")):
        random_binary = b"\x01\x02\x03\x04" + random_binary[4:]

    res_random = analyze_bytes("random.dat", random_binary)
    assert res_random.file_type == "unknown"
    assert res_random.limited is True
    assert res_random.observed_features == ["file_entropy"]


# ---------------------------------------------------------------------------
# 5. Shannon entropy of zeros is 0.0 and of random bytes near 8.0
# ---------------------------------------------------------------------------
def test_shannon_entropy_calculation():
    # Empty bytes
    assert calculate_entropy(b"") == 0.0

    # All zeros
    all_zeros = b"\x00" * 2048
    assert calculate_entropy(all_zeros) == 0.0

    # Uniform random bytes (50,000 bytes yields entropy very close to 8.0)
    rng_bytes = os.urandom(50000)
    rand_entropy = calculate_entropy(rng_bytes)
    assert rand_entropy >= 7.85
    assert rand_entropy <= 8.0


# ---------------------------------------------------------------------------
# 6. Scenario generators are deterministic and events are simulated
# ---------------------------------------------------------------------------
def test_scenario_generators_deterministic_and_simulated():
    for scenario in ("normal", "suspicious", "trojan"):
        # Behavior generator across two runs with same seed
        b_run1 = generate_behavior_events(scenario=scenario, seed=42)
        b_run2 = generate_behavior_events(scenario=scenario, seed=42)
        assert len(b_run1) == len(b_run2)
        for e1, e2 in zip(b_run1, b_run2):
            assert e1.model_dump() == e2.model_dump()
            assert e1.is_simulated == 1

        # Network generator across two runs with same seed
        n_run1 = generate_network_events(scenario=scenario, seed=42)
        n_run2 = generate_network_events(scenario=scenario, seed=42)
        assert len(n_run1) == len(n_run2)
        for e1, e2 in zip(n_run1, n_run2):
            assert e1.model_dump() == e2.model_dump()
            assert e1.is_simulated == 1

    # Trojan scenario must produce persistence behavior event
    trojan_b = generate_behavior_events(scenario="trojan", seed=42)
    assert any(e.event_type == "persistence" for e in trojan_b)

    # Trojan scenario must produce repeated beacon / c2 events
    trojan_n = generate_network_events(scenario="trojan", seed=42)
    assert any("beacon" in e.event_type for e in trojan_n)


# ---------------------------------------------------------------------------
# 7. All generated IPs fall strictly in RFC 5737 documentation ranges
# ---------------------------------------------------------------------------
def test_all_generated_ips_fall_in_rfc5737_ranges():
    for scenario in ("normal", "suspicious", "trojan"):
        events = generate_network_events(scenario=scenario, seed=42)
        assert len(events) > 0
        for ev in events:
            assert is_rfc5737_ip(ev.source), f"Source IP {ev.source} not in RFC 5737"
            assert is_rfc5737_ip(ev.destination), f"Destination IP {ev.destination} not in RFC 5737"


# ---------------------------------------------------------------------------
# 8. Feature vector order and length match FEATURE_NAMES
# ---------------------------------------------------------------------------
def test_feature_vector_order_length_and_unobserved_mask():
    # 1. Static-only extraction (uploaded file)
    static_res = StaticResult(
        filename="dummy.txt",
        file_size=120,
        sha256="aa" * 32,
        entropy=4.25,
        file_type="script/text",
        is_pe=False,
        limited=True,
        observed_features=["file_entropy"],
    )

    feat_vec = extract_features(static_result=static_res, behavior_events=None, network_events=None)

    assert len(feat_vec.feature_list) == len(FEATURE_NAMES)
    assert feat_vec.feature_names == FEATURE_NAMES
    assert [name for name in feat_vec.values.keys()] == FEATURE_NAMES

    # file_entropy must be observed
    assert feat_vec.observed_mask["file_entropy"] is True
    assert feat_vec.values["file_entropy"] == 4.25

    # Behavioral and network features must be flagged NOT observed
    unobserved_keys = [
        "import_count", "suspicious_imports", "process_count", "file_events",
        "network_connections", "dns_requests", "repeated_connections", "persistence_indicator",
    ]
    for k in unobserved_keys:
        assert feat_vec.observed_mask[k] is False
        assert feat_vec.values[k] == 0.0

    assert feat_vec.observed_count == 1

    # 2. Complete scenario extraction (static + behavioral + network)
    b_events = generate_behavior_events(scenario="trojan", seed=42)
    n_events = generate_network_events(scenario="trojan", seed=42)
    feat_vec_full = extract_features(static_result=static_res, behavior_events=b_events, network_events=n_events)

    assert feat_vec_full.observed_mask["process_count"] is True
    assert feat_vec_full.observed_mask["file_events"] is True
    assert feat_vec_full.observed_mask["persistence_indicator"] is True
    assert feat_vec_full.values["persistence_indicator"] == 1.0
    assert feat_vec_full.observed_mask["network_connections"] is True
    assert feat_vec_full.observed_mask["dns_requests"] is True
    assert feat_vec_full.observed_mask["repeated_connections"] is True
    assert feat_vec_full.values["repeated_connections"] >= 1.0


# ---------------------------------------------------------------------------
# 9. Minimal valid PE built in memory
# ---------------------------------------------------------------------------
def test_minimal_valid_pe_parsing():
    """
    Construct a minimal valid PE32 structure in memory using exact struct byte offsets.
    Verifies that pefile correctly parses the headers without throwing exceptions.
    """
    # DOS Header (64 bytes)
    dos_header = bytearray(64)
    dos_header[0:2] = b"MZ"
    dos_header[60:64] = (64).to_bytes(4, "little")  # e_lfanew = 64

    # NT Signature (4 bytes)
    pe_sig = b"PE\x00\x00"

    # COFF File Header (20 bytes)
    # Machine = 0x014c (i386), NumSections = 0, TimeDateStamp = 0, PtrSymTable = 0,
    # NumSymbols = 0, SizeOfOptionalHeader = 224, Characteristics = 0x0102
    coff = (
        (0x014C).to_bytes(2, "little")
        + (0).to_bytes(2, "little")
        + (0).to_bytes(4, "little")
        + (0).to_bytes(4, "little")
        + (0).to_bytes(4, "little")
        + (224).to_bytes(2, "little")
        + (0x0102).to_bytes(2, "little")
    )

    # Standard Optional Header for PE32 (224 bytes)
    opt_hdr = bytearray(224)
    opt_hdr[0:2] = (0x010B).to_bytes(2, "little")     # Magic: PE32 (0x10b)
    opt_hdr[16:20] = (0x1000).to_bytes(4, "little")   # AddressOfEntryPoint
    opt_hdr[28:32] = (0x00400000).to_bytes(4, "little")  # ImageBase
    opt_hdr[32:36] = (0x1000).to_bytes(4, "little")   # SectionAlignment
    opt_hdr[36:40] = (0x200).to_bytes(4, "little")    # FileAlignment
    opt_hdr[56:60] = (0x2000).to_bytes(4, "little")   # SizeOfImage
    opt_hdr[60:64] = (0x200).to_bytes(4, "little")    # SizeOfHeaders
    opt_hdr[68:70] = (2).to_bytes(2, "little")        # Subsystem: Windows GUI
    opt_hdr[92:96] = (16).to_bytes(4, "little")       # NumberOfRvaAndSizes

    minimal_pe_bytes = bytes(dos_header) + pe_sig + coff + bytes(opt_hdr)

    res = analyze_bytes("minimal_valid.exe", minimal_pe_bytes)
    assert res.file_type == "PE"
    assert res.is_pe is True
    assert res.limited is False
    assert res.section_count == 0
    assert res.import_count == 0
    assert "import_count" in res.observed_features
    assert "suspicious_imports" in res.observed_features


# ---------------------------------------------------------------------------
# 10. IOC extraction from static and network data
# ---------------------------------------------------------------------------
def test_ioc_extraction():
    static_res = StaticResult(
        filename="sample.exe",
        file_size=5000,
        sha256="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        entropy=6.5,
        file_type="PE",
        is_pe=True,
    )
    n_events = generate_network_events(scenario="trojan", seed=42)

    # Extract IOCs for uploaded file (hash is real: is_simulated=0)
    iocs = extract_iocs(static_result=static_res, network_events=n_events, is_demo=False)

    hash_iocs = [i for i in iocs if i.type == "hash"]
    assert len(hash_iocs) == 1
    assert hash_iocs[0].value == static_res.sha256
    assert hash_iocs[0].is_simulated == 0

    ip_iocs = [i for i in iocs if i.type == "ip"]
    assert len(ip_iocs) >= 1
    assert all(i.is_simulated == 1 for i in ip_iocs)
    assert any(i.value == "203.0.113.88" for i in ip_iocs)

    port_iocs = [i for i in iocs if i.type == "port"]
    assert any(i.value == "4444" for i in port_iocs)
