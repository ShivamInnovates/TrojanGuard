#!/usr/bin/env python3
"""
TrojanGuard — Isolated Analysis Worker.

Runs strictly static analysis on raw bytes received via stdin.
Invariants:
- Imports NOTHING touching network, database, or server frameworks.
- NEVER writes files to disk.
- NEVER executes, runs, or imports uploaded sample bytes.
- Outputs a single JSON result to stdout.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import sys

# Optional import of pefile for Windows PE header/import inspection
try:
    import pefile
    HAS_PEFILE = True
except ImportError:
    pefile = None
    HAS_PEFILE = False


SUSPICIOUS_IMPORTS = {
    "virtualalloc", "virtualallocex", "virtualprotect", "virtualprotectex",
    "writeprocessmemory", "createremotethread", "ntcreatethreadex",
    "queueuserapc", "setwindowshookex", "setwindowshookexa", "setwindowshookexw",
    "getasynckeystate", "getkeystate", "regcreatekeyexa", "regcreatekeyexw",
    "regsetvalueexa", "regsetvalueexw", "openprocess", "adjusttokenprivileges",
    "lookupPrivilegeValuea", "lookupprivilegevaluew", "urldownloadtofilea",
    "urldownloadtofilew", "internetopena", "internetopenw", "internetopenurla",
    "internetopenurlw", "wsastartup", "connect", "send", "recv",
    "winhttprequest", "createservicea", "createservicew",
}


def calculate_entropy(data: bytes) -> float:
    """Calculate Shannon entropy: H = -sum(p * log2(p))."""
    if not data:
        return 0.0
    length = len(data)
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    entropy = 0.0
    for count in counts:
        if count > 0:
            p = count / length
            entropy -= p * math.log2(p)
    return round(entropy, 4)


def detect_file_type(data: bytes) -> str:
    """Content-based type detection from magic bytes."""
    if not data:
        return "unknown"
    if data.startswith(b"MZ"):
        return "PE"
    if data.startswith(b"\x7fELF"):
        return "ELF"
    if data.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
        return "ZIP"
    if data.startswith(b"%PDF-"):
        return "PDF"
    if data.startswith(b"#!"):
        return "script/text"

    try:
        sample = data[:8192]
        if b"\x00" not in sample:
            decoded = sample.decode("utf-8")
            printable = sum(1 for c in decoded if c.isprintable() or c in "\r\n\t")
            if len(decoded) > 0 and (printable / len(decoded)) > 0.95:
                return "script/text"
    except (UnicodeDecodeError, ValueError):
        pass

    return "unknown"


def check_extension_mismatch(filename: str, content_type: str) -> list[str]:
    """Check if filename extension contradicts content-based magic bytes."""
    warnings: list[str] = []
    ext = Path(filename).suffix.lower()
    if not ext:
        return warnings

    pe_extensions = {".exe", ".dll", ".sys", ".scr", ".ocx", ".drv", ".cpl", ".efi"}
    text_extensions = {".txt", ".py", ".sh", ".bash", ".js", ".json", ".csv", ".md", ".html", ".xml", ".yml", ".yaml", ".ini", ".conf", ".bat", ".ps1"}

    if content_type == "script/text" and ext in pe_extensions:
        warnings.append(
            f"Extension mismatch: file named with binary extension '{ext}' but content is detected as text/script."
        )
    elif content_type == "PE" and ext not in pe_extensions and ext in text_extensions:
        warnings.append(
            f"Extension spoofing warning: file has extension '{ext}' but binary content is a Windows PE executable."
        )
    elif content_type == "ELF" and ext in pe_extensions:
        warnings.append(
            f"Extension mismatch: file has PE extension '{ext}' but binary content is a Linux ELF binary."
        )

    return warnings


def handle_test_modes(test_mode: str | None) -> None:
    """Handle test error mode injections for testing worker resilience."""
    if not test_mode:
        return
    if test_mode == "network":
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        s.connect(("8.8.8.8", 53))
        s.close()
    elif test_mode == "spin":
        while True:
            pass
    elif test_mode == "oom":
        _ = bytearray(600 * 1024 * 1024)
    elif test_mode == "write":
        with open("test_forbidden.txt", "w", encoding="utf-8") as f:
            f.write("payload")
            f.flush()
    elif test_mode == "invalid_json":
        sys.stdout.write("INVALID JSON OUTPUT [[{{")
        sys.stdout.flush()
        sys.exit(0)
    elif test_mode == "huge_stdout":
        sys.stdout.write("x" * (2 * 1024 * 1024))
        sys.stdout.flush()
        sys.exit(0)


def main() -> None:
    # 1. Read input from stdin
    stdin_raw = sys.stdin.buffer.read()
    if not stdin_raw:
        # Empty input
        sys.stdout.write(json.dumps({
            "error": "empty_input",
            "message": "No data received on worker stdin"
        }))
        sys.exit(1)

    # 2. Check for optional JSON metadata header on line 1
    filename = "sample.bin"
    test_mode: str | None = None
    data = stdin_raw

    first_newline = stdin_raw.find(b"\n")
    if first_newline != -1:
        first_line = stdin_raw[:first_newline]
        try:
            meta = json.loads(first_line.decode("utf-8"))
            if isinstance(meta, dict) and ("filename" in meta or "test_mode" in meta):
                filename = meta.get("filename", "sample.bin")
                test_mode = meta.get("test_mode")
                data = stdin_raw[first_newline + 1:]
        except Exception:
            pass

    # Check for test triggers (also check environment variable fallback)
    if not test_mode:
        test_mode = os.environ.get("TROJANGUARD_TEST_MODE")

    handle_test_modes(test_mode)

    # 3. Static analysis on raw bytes
    file_size = len(data)
    sha256 = hashlib.sha256(data).hexdigest()
    entropy = calculate_entropy(data)
    file_type = detect_file_type(data)
    warnings = check_extension_mismatch(filename, file_type)
    observed_features = ["file_entropy"]

    # Non-PE analysis
    if file_type != "PE":
        result = {
            "filename": filename,
            "file_size": file_size,
            "sha256": sha256,
            "entropy": entropy,
            "file_type": file_type,
            "is_pe": False,
            "limited": True,
            "limited_reason": f"Deep static analysis (PE imports/sections) is only supported for Windows PE files; detected type is '{file_type}'.",
            "warnings": warnings,
            "import_count": 0,
            "suspicious_import_count": 0,
            "suspicious_import_names": [],
            "section_count": 0,
            "has_high_entropy_sections": False,
            "observed_features": observed_features,
        }
        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
        sys.exit(0)

    # PE analysis
    if not HAS_PEFILE:
        warnings.append("pefile library is not installed; PE deep analysis skipped.")
        result = {
            "filename": filename,
            "file_size": file_size,
            "sha256": sha256,
            "entropy": entropy,
            "file_type": "PE",
            "is_pe": True,
            "limited": True,
            "limited_reason": "pefile parser unavailable in current environment.",
            "warnings": warnings,
            "import_count": 0,
            "suspicious_import_count": 0,
            "suspicious_import_names": [],
            "section_count": 0,
            "has_high_entropy_sections": False,
            "observed_features": observed_features,
        }
        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
        sys.exit(0)

    try:
        pe = pefile.PE(data=data, fast_load=True)
        try:
            pe.parse_data_directories(directories=[
                pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_IMPORT"]
            ])
        except Exception as dir_err:
            warnings.append(f"Import directory parsing notice: {dir_err}")

        total_imports = 0
        suspicious_count = 0
        suspicious_names: list[str] = []

        if hasattr(pe, "DIRECTORY_ENTRY_IMPORT"):
            for entry in pe.DIRECTORY_ENTRY_IMPORT:
                for imp in entry.imports:
                    total_imports += 1
                    func_name = ""
                    if imp.name:
                        func_name = imp.name.decode("utf-8", errors="ignore")
                    elif imp.ordinal is not None:
                        func_name = f"Ordinal_{imp.ordinal}"

                    if func_name and func_name.lower() in SUSPICIOUS_IMPORTS:
                        suspicious_count += 1
                        if func_name not in suspicious_names:
                            suspicious_names.append(func_name)

        section_count = len(pe.sections)
        has_high_entropy_sections = False
        for s in pe.sections:
            try:
                if s.get_entropy() >= 7.2:
                    has_high_entropy_sections = True
                    break
            except Exception:
                continue

        observed_features.extend(["import_count", "suspicious_imports"])

        result = {
            "filename": filename,
            "file_size": file_size,
            "sha256": sha256,
            "entropy": entropy,
            "file_type": "PE",
            "is_pe": True,
            "limited": False,
            "limited_reason": None,
            "warnings": warnings,
            "import_count": total_imports,
            "suspicious_import_count": suspicious_count,
            "suspicious_import_names": suspicious_names,
            "section_count": section_count,
            "has_high_entropy_sections": has_high_entropy_sections,
            "observed_features": observed_features,
        }
    except Exception as pe_err:
        result = {
            "filename": filename,
            "file_size": file_size,
            "sha256": sha256,
            "entropy": entropy,
            "file_type": "PE",
            "is_pe": True,
            "limited": True,
            "limited_reason": f"PE parsing error (corrupt or truncated PE): {pe_err}",
            "warnings": warnings,
            "import_count": 0,
            "suspicious_import_count": 0,
            "suspicious_import_names": [],
            "section_count": 0,
            "has_high_entropy_sections": False,
            "observed_features": observed_features,
        }

    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()
    sys.exit(0)


if __name__ == "__main__":
    main()
