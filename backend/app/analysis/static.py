"""
TrojanGuard — Safe Static File Analysis.

Responsibilities:
----------------
- Safe static analysis of untrusted files held strictly in memory.
- Compute SHA-256 and Shannon entropy.
- Identify content-based type from magic bytes (never trusted from filename extension).
- If PE: parse headers, sections, imports and suspicious API counts using pefile.
- Handle malformed, truncated, or unsupported formats safely (limited analysis).
- Track which features were actually OBSERVED for the sample.

Safety invariants:
-----------------
1. Hard 10 MB upload guard (raises UploadSizeExceededError).
2. Data is held in memory only — never written to disk.
3. Untrusted bytes are NEVER executed, imported, or eval'd.
"""
from __future__ import annotations

import hashlib
import math
from pathlib import Path
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.config import MAX_UPLOAD_BYTES, SUSPICIOUS_IMPORTS
from app.analysis.exceptions import UploadSizeExceededError

try:
    import pefile
    HAS_PEFILE = True
except ImportError:
    pefile = None  # type: ignore
    HAS_PEFILE = False


class StaticResult(BaseModel):
    """Result of safe in-memory static file analysis."""
    model_config = ConfigDict(from_attributes=True)

    filename: str
    file_size: int
    sha256: str
    entropy: float
    file_type: str                  # "PE", "ELF", "ZIP", "PDF", "script/text", "unknown"
    is_pe: bool = False
    limited: bool = False
    limited_reason: str | None = None
    warnings: list[str] = Field(default_factory=list)

    # PE-specific metadata (populated only when successfully parsed)
    import_count: int = 0
    suspicious_import_count: int = 0
    suspicious_import_names: list[str] = Field(default_factory=list)
    section_count: int = 0
    has_high_entropy_sections: bool = False

    # List of features actually observed for this sample
    observed_features: list[str] = Field(default_factory=list)


def calculate_entropy(data: bytes) -> float:
    """
    Calculate Shannon entropy of byte sequence: H = -sum(p * log2(p)).
    Returns a float in range [0.0, 8.0].
    """
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
    """
    Detect content-based type strictly from magic bytes.
    Never relies on filename extension.

    Supported types:
    - "PE"
    - "ELF"
    - "ZIP"
    - "PDF"
    - "script/text"
    - "unknown"
    """
    if not data:
        return "unknown"

    # 1. PE (Windows Portable Executable / DOS)
    if data.startswith(b"MZ"):
        return "PE"

    # 2. ELF (Linux Executable and Linkable Format)
    if data.startswith(b"\x7fELF"):
        return "ELF"

    # 3. ZIP archive (standard PK zip signatures)
    if data.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
        return "ZIP"

    # 4. PDF document
    if data.startswith(b"%PDF-"):
        return "PDF"

    # 5. Script or plaintext
    if data.startswith(b"#!"):
        return "script/text"

    # Check if content is printable UTF-8 / ASCII text without binary nulls
    try:
        sample = data[:8192]
        if b"\x00" not in sample:
            decoded = sample.decode("utf-8")
            # Check printable ratio
            printable = sum(1 for c in decoded if c.isprintable() or c in "\r\n\t")
            if len(decoded) > 0 and (printable / len(decoded)) > 0.95:
                return "script/text"
    except (UnicodeDecodeError, ValueError):
        pass

    return "unknown"


def check_extension_mismatch(filename: str, content_type: str) -> list[str]:
    """
    Check if the user-supplied filename extension contradicts the content-based type.
    Returns a list of warning messages.
    """
    warnings: list[str] = []
    ext = Path(filename).suffix.lower()
    if not ext:
        return warnings

    pe_extensions = {".exe", ".dll", ".sys", ".scr", ".ocx", ".drv", ".cpl", ".efi"}
    text_extensions = {".txt", ".py", ".sh", ".bash", ".js", ".json", ".csv", ".md", ".html", ".xml", ".yml", ".yaml", ".ini", ".conf", ".bat", ".ps1"}
    elf_extensions = {".elf", ".so", ".bin"}
    zip_extensions = {".zip", ".jar", ".war", ".apk"}
    pdf_extensions = {".pdf"}

    if content_type == "script/text" and ext in pe_extensions:
        warnings.append(
            f"Extension mismatch: file named with binary extension '{ext}' but content is detected as text/script."
        )
    elif content_type == "PE" and ext not in pe_extensions and ext in (text_extensions | pdf_extensions):
        warnings.append(
            f"Extension spoofing warning: file has extension '{ext}' but binary content is a Windows PE executable."
        )
    elif content_type == "ELF" and ext in pe_extensions:
        warnings.append(
            f"Extension mismatch: file has PE extension '{ext}' but binary content is a Linux ELF binary."
        )

    return warnings


def analyze_bytes(filename: str, data: bytes) -> StaticResult:
    """
    Perform safe static analysis on raw file bytes held strictly in memory.

    Parameters
    ----------
    filename:
        Original or suggested filename for reporting.
    data:
        Raw file bytes in memory.

    Returns
    -------
    StaticResult:
        Validated metadata, hashes, entropy, file type, and observed PE indicators.

    Raises
    ------
    UploadSizeExceededError:
        If data length exceeds MAX_UPLOAD_BYTES (10 MB).
    """
    file_size = len(data)
    if file_size > MAX_UPLOAD_BYTES:
        raise UploadSizeExceededError(
            f"Uploaded file size ({file_size} bytes) exceeds the maximum allowed limit of {MAX_UPLOAD_BYTES} bytes (10 MB)."
        )

    # 1. Cryptographic hash
    sha256 = hashlib.sha256(data).hexdigest()

    # 2. Shannon entropy
    entropy = calculate_entropy(data)

    # 3. Content-based type detection
    file_type = detect_file_type(data)
    warnings = check_extension_mismatch(filename, file_type)

    # Base observed features available for any valid byte stream
    observed_features: list[str] = ["file_entropy"]

    # 4. Non-PE / Unsupported types
    if file_type != "PE":
        return StaticResult(
            filename=filename,
            file_size=file_size,
            sha256=sha256,
            entropy=entropy,
            file_type=file_type,
            is_pe=False,
            limited=True,
            limited_reason=f"Deep static analysis (PE imports/sections) is only supported for Windows PE files; detected type is '{file_type}'.",
            warnings=warnings,
            import_count=0,
            suspicious_import_count=0,
            suspicious_import_names=[],
            section_count=0,
            has_high_entropy_sections=False,
            observed_features=observed_features,
        )

    # 5. PE Analysis with pefile
    if not HAS_PEFILE:
        warnings.append("pefile library is not installed; PE deep analysis skipped.")
        return StaticResult(
            filename=filename,
            file_size=file_size,
            sha256=sha256,
            entropy=entropy,
            file_type=file_type,
            is_pe=True,
            limited=True,
            limited_reason="pefile parser unavailable in current environment.",
            warnings=warnings,
            import_count=0,
            suspicious_import_count=0,
            suspicious_import_names=[],
            section_count=0,
            has_high_entropy_sections=False,
            observed_features=observed_features,
        )

    try:
        # Parse strictly from in-memory bytes with fast_load
        pe = pefile.PE(data=data, fast_load=True)

        # Parse import data directory
        try:
            pe.parse_data_directories(directories=[
                pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_IMPORT"]
            ])
        except Exception as dir_err:
            warnings.append(f"Import directory parsing notice: {dir_err}")

        # Count total and suspicious imports
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

        # Sections and section entropy
        section_count = len(pe.sections)
        has_high_entropy_sections = False
        for s in pe.sections:
            try:
                s_ent = s.get_entropy()
                if s_ent >= 7.2:
                    has_high_entropy_sections = True
                    break
            except Exception:
                continue

        # Both import_count and suspicious_imports are now verified observed
        observed_features.extend(["import_count", "suspicious_imports"])

        return StaticResult(
            filename=filename,
            file_size=file_size,
            sha256=sha256,
            entropy=entropy,
            file_type="PE",
            is_pe=True,
            limited=False,
            limited_reason=None,
            warnings=warnings,
            import_count=total_imports,
            suspicious_import_count=suspicious_count,
            suspicious_import_names=suspicious_names,
            section_count=section_count,
            has_high_entropy_sections=has_high_entropy_sections,
            observed_features=observed_features,
        )

    except Exception as pe_err:
        # Corrupt, truncated, or malformed PE
        return StaticResult(
            filename=filename,
            file_size=file_size,
            sha256=sha256,
            entropy=entropy,
            file_type="PE",
            is_pe=True,
            limited=True,
            limited_reason=f"PE parsing error (corrupt or truncated PE): {pe_err}",
            warnings=warnings,
            import_count=0,
            suspicious_import_count=0,
            suspicious_import_names=[],
            section_count=0,
            has_high_entropy_sections=False,
            observed_features=observed_features,
        )
