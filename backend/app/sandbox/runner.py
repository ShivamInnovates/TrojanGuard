"""
TrojanGuard — Isolated Analysis Worker Runner.

Executes static analysis in an isolated child process with:
- OS-level network namespace isolation (via `unshare -rn` where available)
- POSIX resource limits (CPU, memory, file creation, descriptor count, process creation)
- Process-group wall-clock timeout killing all descendant processes
- Fresh empty temporary working directory
- Minimal stripped environment
- Streaming input strictly via stdin (no disk writes, no command-line user input)
- Hard output size cap and strict JSON decoding
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from typing import Any

from app.analysis.exceptions import UploadSizeExceededError
from app.analysis.static import StaticResult
from app.config import MAX_UPLOAD_BYTES, SANDBOX_MODE

logger = logging.getLogger(__name__)

WORKER_SCRIPT = Path(__file__).resolve().parent / "worker.py"
_UNSHARE_SUPPORTED: bool | None = None


def check_unshare_supported(force_recheck: bool = False) -> bool:
    """
    Check if `unshare -rn` is supported on the current system without root privileges.
    Caches the result unless force_recheck=True.
    """
    global _UNSHARE_SUPPORTED
    if _UNSHARE_SUPPORTED is not None and not force_recheck:
        return _UNSHARE_SUPPORTED

    try:
        proc = subprocess.run(
            ["unshare", "-rn", "true"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=2.0,
        )
        _UNSHARE_SUPPORTED = (proc.returncode == 0)
    except Exception:
        _UNSHARE_SUPPORTED = False

    return _UNSHARE_SUPPORTED


class SandboxExecutionError(Exception):
    """Raised when the isolated analysis worker fails, crashes, or times out."""

    def __init__(
        self,
        reason: str,
        status: str = "crashed",
        metadata: dict[str, Any] | None = None,
    ):
        super().__init__(reason)
        self.reason = reason
        self.status = status
        self.metadata = metadata or {}


def _build_preexec_fn():
    """Build preexec function configuring POSIX resource limits and a new session ID."""
    def _preexec():
        import resource
        import os

        # RLIMIT_CPU: 5 seconds CPU time
        try:
            resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
        except Exception:
            pass

        # RLIMIT_AS: 512 MB virtual memory limit
        try:
            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        except Exception:
            pass

        # RLIMIT_FSIZE: 0 bytes — worker cannot write any files to disk
        try:
            resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
        except Exception:
            pass

        # RLIMIT_NOFILE: 32 file descriptors maximum
        try:
            resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
        except Exception:
            pass

        # RLIMIT_CORE: 0 — core dumps disabled
        try:
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        except Exception:
            pass

        # RLIMIT_NPROC: restrict child processes
        try:
            resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))
        except Exception:
            pass

        # New session/process group for clean signal killing
        os.setsid()

    return _preexec


def run_in_sandbox(
    filename: str,
    data: bytes,
    timeout_s: float = 10.0,
    test_mode: str | None = None,
) -> StaticResult:
    """
    Execute static analysis inside the isolated analysis worker.

    Parameters
    ----------
    filename:
        Original or suggested filename for reporting.
    data:
        Raw file bytes in memory.
    timeout_s:
        Wall-clock timeout in seconds (default 10s).
    test_mode:
        Internal testing flag to trigger simulated failure modes in tests.

    Returns
    -------
    StaticResult:
        Validated static analysis result with `.sandbox` metadata attached.

    Raises
    ------
    UploadSizeExceededError:
        If data length exceeds MAX_UPLOAD_BYTES (10 MB).
    SandboxExecutionError:
        If worker times out, crashes, or returns invalid output.
    """
    file_size = len(data)
    if file_size > MAX_UPLOAD_BYTES:
        raise UploadSizeExceededError(
            f"Uploaded file size ({file_size} bytes) exceeds the maximum allowed limit of {MAX_UPLOAD_BYTES} bytes (10 MB)."
        )

    has_unshare = check_unshare_supported()

    if not has_unshare:
        if SANDBOX_MODE == "strict":
            meta = {
                "used": False,
                "network_isolated": False,
                "rlimits_applied": [],
                "timeout_s": int(timeout_s),
                "duration_ms": 0.0,
                "status": "unavailable",
            }
            raise SandboxExecutionError(
                "unshare network isolation unavailable on system in strict mode",
                status="unavailable",
                metadata=meta,
            )
        logger.warning(
            "unshare -rn unavailable on host; running isolated analysis worker without network namespace isolation"
        )

    network_isolated = has_unshare

    # Prepare command: strictly fixed argument list, never user input in cmd
    if network_isolated:
        cmd = ["unshare", "-rn", sys.executable, "-I", str(WORKER_SCRIPT)]
    else:
        cmd = [sys.executable, "-I", str(WORKER_SCRIPT)]

    # Minimal clean environment
    env = {
        "PYTHONHASHSEED": "42",
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
    }
    if test_mode:
        env["TROJANGUARD_TEST_MODE"] = test_mode

    rlimits_applied = [
        "RLIMIT_CPU",
        "RLIMIT_AS",
        "RLIMIT_FSIZE",
        "RLIMIT_NOFILE",
        "RLIMIT_NPROC",
        "RLIMIT_CORE",
    ]

    # Stdin payload: line 1 JSON header + raw sample bytes
    header_json = json.dumps({"filename": filename, "test_mode": test_mode})
    stdin_payload = header_json.encode("utf-8") + b"\n" + data

    t0 = time.perf_counter()

    with tempfile.TemporaryDirectory() as empty_temp_dir:
        p = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=empty_temp_dir,
            env=env,
            close_fds=True,
            preexec_fn=_build_preexec_fn(),
        )

        try:
            stdout_data, stderr_data = p.communicate(input=stdin_payload, timeout=timeout_s)
        except subprocess.TimeoutExpired:
            # Kill whole process group
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                p.communicate(timeout=1.0)
            except Exception:
                pass

            duration_ms = (time.perf_counter() - t0) * 1000.0
            meta = {
                "used": True,
                "network_isolated": network_isolated,
                "rlimits_applied": rlimits_applied,
                "timeout_s": int(timeout_s),
                "duration_ms": round(duration_ms, 2),
                "status": "timeout",
            }
            raise SandboxExecutionError(
                f"Execution timed out after {timeout_s} seconds",
                status="timeout",
                metadata=meta,
            )

    duration_ms = (time.perf_counter() - t0) * 1000.0

    # Output size guard (1 MB)
    if len(stdout_data) > 1024 * 1024:
        meta = {
            "used": True,
            "network_isolated": network_isolated,
            "rlimits_applied": rlimits_applied,
            "timeout_s": int(timeout_s),
            "duration_ms": round(duration_ms, 2),
            "status": "invalid_output",
        }
        raise SandboxExecutionError(
            "Worker output exceeded 1 MB stdout limit",
            status="invalid_output",
            metadata=meta,
        )

    # Check process return code
    if p.returncode != 0:
        err_msg = stderr_data.decode("utf-8", errors="replace").strip()
        meta = {
            "used": True,
            "network_isolated": network_isolated,
            "rlimits_applied": rlimits_applied,
            "timeout_s": int(timeout_s),
            "duration_ms": round(duration_ms, 2),
            "status": "crashed",
        }
        raise SandboxExecutionError(
            f"Worker crashed with exit code {p.returncode}: {err_msg[:200]}",
            status="crashed",
            metadata=meta,
        )

    # Parse stdout JSON
    try:
        parsed = json.loads(stdout_data.decode("utf-8"))
    except Exception as je:
        meta = {
            "used": True,
            "network_isolated": network_isolated,
            "rlimits_applied": rlimits_applied,
            "timeout_s": int(timeout_s),
            "duration_ms": round(duration_ms, 2),
            "status": "invalid_output",
        }
        raise SandboxExecutionError(
            f"Worker returned invalid JSON: {je}",
            status="invalid_output",
            metadata=meta,
        )

    # Build StaticResult
    result = StaticResult(**parsed)
    result.sandbox = {
        "used": True,
        "network_isolated": network_isolated,
        "rlimits_applied": rlimits_applied,
        "timeout_s": int(timeout_s),
        "duration_ms": round(duration_ms, 2),
        "status": "ok",
    }
    return result
