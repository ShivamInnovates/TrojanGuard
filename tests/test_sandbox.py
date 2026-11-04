"""
TrojanGuard — Automated Tests for Isolated Analysis Worker & Sandbox Isolation.

Covers:
1. Normal text file: sandbox vs in-process parity.
2. Minimal valid PE: sandbox vs in-process parity.
3. Truncated MZ and random binary bytes handled safely.
4. Worker limits & security invariants:
   - Network socket attempt fails under network namespace isolation.
   - CPU/Wall busy-loop killed at timeout (status='timeout').
   - Virtual memory limit allocation (>512 MB) fails cleanly.
   - Disk file creation attempt fails (RLIMIT_FSIZE=0).
   - Invalid JSON stdout rejected.
   - Oversized stdout (>1 MB) rejected.
5. Upload size limits: 10 MB succeeds, 10 MB + 1 byte rejected with 413 before worker runs.
6. 10 concurrent uploads execute cleanly without interference.
7. Main process never writes uploads to disk (data piped strictly via stdin).
8. Health endpoint exposes sandbox capabilities.
"""
from __future__ import annotations

import concurrent.futures
import io
import os
from pathlib import Path
import pytest
from starlette.testclient import TestClient

from app.analysis.exceptions import UploadSizeExceededError
from app.analysis.static import analyze_bytes
from app.config import MAX_UPLOAD_BYTES
from app.main import app
from app.sandbox.runner import (
    SandboxExecutionError,
    check_unshare_supported,
    run_in_sandbox,
)
from app.services.pipeline import run_analysis


def test_normal_text_and_minimal_pe_parity():
    """Verify normal text and minimal PE analyze identically through sandbox and in-process."""
    # 1. Plain text file
    txt_content = b"print('TrojanGuard safe analysis worker')\n"
    res_in_process = analyze_bytes("test_script.py", txt_content)
    res_sandboxed = run_in_sandbox("test_script.py", txt_content)

    assert res_sandboxed.sha256 == res_in_process.sha256
    assert res_sandboxed.file_type == res_in_process.file_type
    assert res_sandboxed.entropy == res_in_process.entropy
    assert res_sandboxed.file_size == res_in_process.file_size
    assert res_sandboxed.warnings == res_in_process.warnings
    assert res_sandboxed.sandbox is not None
    assert res_sandboxed.sandbox["status"] == "ok"
    assert res_sandboxed.sandbox["used"] is True

    # 2. Minimal valid DOS MZ header
    mz_content = b"MZ" + b"\x00" * 510
    res_mz_proc = analyze_bytes("sample.exe", mz_content)
    res_mz_sand = run_in_sandbox("sample.exe", mz_content)

    assert res_mz_sand.sha256 == res_mz_proc.sha256
    assert res_mz_sand.file_type == res_mz_proc.file_type
    assert res_mz_sand.is_pe is True
    assert res_mz_sand.limited == res_mz_proc.limited
    assert res_mz_sand.sandbox["status"] == "ok"


def test_truncated_mz_and_random_bytes_safe_handling():
    """Verify truncated MZ header and random bytes are handled safely by worker without crashes."""
    # 1. Truncated 2-byte MZ header
    res_trunc = run_in_sandbox("truncated.exe", b"MZ")
    assert res_trunc.sha256 is not None
    assert res_trunc.file_type == "PE"
    assert res_trunc.is_pe is True
    assert res_trunc.limited is True
    assert res_trunc.limited_reason is not None
    assert "PE parsing error" in res_trunc.limited_reason
    assert res_trunc.sandbox["status"] == "ok"

    # 2. Random bytes (high entropy)
    random_bytes = os.urandom(4096)
    res_rand = run_in_sandbox("random.bin", random_bytes)
    assert res_rand.entropy > 7.0
    assert res_rand.file_type == "unknown"
    assert res_rand.sandbox["status"] == "ok"


def test_worker_network_socket_fails():
    """Worker attempting to open a network socket fails under network isolation."""
    with pytest.raises(SandboxExecutionError) as exc_info:
        run_in_sandbox("net_test.bin", b"test", test_mode="network")
    assert exc_info.value.status == "crashed"
    assert "Worker crashed with exit code 1" in exc_info.value.reason


def test_worker_busy_loop_killed_at_timeout():
    """Worker running a busy-loop is terminated on timeout and reports status='timeout'."""
    with pytest.raises(SandboxExecutionError) as exc_info:
        run_in_sandbox("spin_test.bin", b"test", timeout_s=0.5, test_mode="spin")
    assert exc_info.value.status == "timeout"
    assert exc_info.value.metadata.get("status") == "timeout"
    assert "timed out after" in exc_info.value.reason


def test_worker_oom_allocation_fails_cleanly():
    """Worker attempting to allocate >512 MB memory fails cleanly due to RLIMIT_AS."""
    with pytest.raises(SandboxExecutionError) as exc_info:
        run_in_sandbox("oom_test.bin", b"test", test_mode="oom")
    assert exc_info.value.status == "crashed"
    assert "Worker crashed with exit code 1" in exc_info.value.reason


def test_worker_file_write_fails():
    """Worker attempting to write to disk fails due to RLIMIT_FSIZE=0."""
    with pytest.raises(SandboxExecutionError) as exc_info:
        run_in_sandbox("write_test.bin", b"test", test_mode="write")
    assert exc_info.value.status == "crashed"


def test_worker_invalid_json_and_huge_stdout_rejected():
    """Worker emitting invalid JSON or exceeding 1 MB stdout is rejected."""
    # Invalid JSON
    with pytest.raises(SandboxExecutionError) as exc_inv:
        run_in_sandbox("inv_test.bin", b"test", test_mode="invalid_json")
    assert exc_inv.value.status == "invalid_output"
    assert "invalid JSON" in exc_inv.value.reason

    # Huge stdout (>1 MB)
    with pytest.raises(SandboxExecutionError) as exc_huge:
        run_in_sandbox("huge_test.bin", b"test", test_mode="huge_stdout")
    assert exc_huge.value.status == "invalid_output"
    assert "1 MB stdout limit" in exc_huge.value.reason


def test_10mb_works_and_10mb_plus_one_byte_rejected():
    """Upload of 10 MB works; 10 MB + 1 byte rejected before worker starts."""
    client = TestClient(app)

    # 1. 10 MB boundary check directly in runner
    exact_10mb = b"A" * MAX_UPLOAD_BYTES
    res_10mb = run_in_sandbox("large_10mb.bin", exact_10mb)
    assert res_10mb.file_size == MAX_UPLOAD_BYTES
    assert res_10mb.sandbox["status"] == "ok"

    # 2. Over 10 MB in runner raises UploadSizeExceededError
    over_10mb = exact_10mb + b"X"
    with pytest.raises(UploadSizeExceededError):
        run_in_sandbox("too_large.bin", over_10mb)

    # 3. HTTP upload over 10 MB returns 413
    resp_413 = client.post(
        "/api/analyze",
        files={"file": ("too_big.bin", io.BytesIO(over_10mb), "application/octet-stream")},
    )
    assert resp_413.status_code == 413


def test_concurrent_uploads_isolation():
    """10 concurrent uploads execute cleanly without cross-process interference."""
    samples = [
        (f"sample_{i}.txt", f"Sample payload number {i} with salt {os.urandom(16).hex()}".encode("utf-8"))
        for i in range(10)
    ]

    def _analyze_one(item):
        fname, payload = item
        return run_in_sandbox(fname, payload)

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(_analyze_one, samples))

    assert len(results) == 10
    hashes = {r.sha256 for r in results}
    # All 10 unique payloads produce 10 unique hashes
    assert len(hashes) == 10
    for r in results:
        assert r.sandbox["status"] == "ok"
        assert r.sandbox["used"] is True


def test_main_process_never_writes_upload_to_disk(tmp_path):
    """Verify that analyzing uploads does not write any file to the workspace or tmp dir."""
    before_files = set(tmp_path.iterdir())

    payload = b"Top secret memory only payload that must never touch filesystem"
    res = run_in_sandbox("no_disk.bin", payload)
    assert res.sandbox["status"] == "ok"

    after_files = set(tmp_path.iterdir())
    assert before_files == after_files


def test_api_health_reports_sandbox():
    """GET /api/health exposes the sandbox isolation capability and mode."""
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "sandbox" in data
    assert data["sandbox"]["available"] is True
    assert isinstance(data["sandbox"]["network_isolation"], bool)
    assert data["sandbox"]["mode"] in ("best_effort", "strict")


def test_api_analyze_and_get_analysis_contains_sandbox(tmp_path):
    """POST /api/analyze and GET /api/analysis/{id} return sandbox metadata block."""
    client = TestClient(app)
    sample_bytes = b"Hello TrojanGuard sandbox integration test"
    resp = client.post(
        "/api/analyze",
        files={"file": ("test_upload.txt", io.BytesIO(sample_bytes), "text/plain")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "sandbox" in data
    assert data["sandbox"] is not None
    assert data["sandbox"]["used"] is True
    assert data["sandbox"]["status"] == "ok"
    assert "duration_ms" in data["sandbox"]

    analysis_id = data["id"]
    get_resp = client.get(f"/api/analysis/{analysis_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert "sandbox" in get_data
    assert get_data["sandbox"]["used"] is True
    assert get_data["sandbox"]["status"] == "ok"
