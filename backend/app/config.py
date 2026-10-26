"""
TrojanGuard — Central configuration.

All tunable constants live here.  Never import from this module
in the ML training scripts (use ml/feature_names.json directly).
"""
import os
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Server / Port
# ---------------------------------------------------------------------------
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# Repo root (two levels up from this file: backend/app/config.py)
REPO_ROOT: Path = Path(__file__).resolve().parent.parent.parent

DB_PATH: Path = REPO_ROOT / "backend" / "trojanguard.db"

ML_DIR: Path = REPO_ROOT / "ml"
MODEL_PATH: Path = ML_DIR / "model.pkl"
FEATURE_NAMES_PATH: Path = ML_DIR / "feature_names.json"

REAL_ML_DIR: Path = ML_DIR / "real"
REAL_MODEL_PATH: Path = REAL_ML_DIR / "model_real.pkl"
REAL_FEATURE_NAMES_PATH: Path = REAL_ML_DIR / "feature_names_real.json"
REAL_METRICS_PATH: Path = REAL_ML_DIR / "metrics_real.json"

# ---------------------------------------------------------------------------
# ML / reproducibility
# ---------------------------------------------------------------------------
RANDOM_SEED: int = 42

# ---------------------------------------------------------------------------
# Upload safety
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB hard limit

# ---------------------------------------------------------------------------
# Risk-score thresholds & Classification Rules
# Levels: 0-30 Low, 31-60 Medium, 61-80 High, 81-100 Critical.
# ---------------------------------------------------------------------------
RISK_LEVEL_LOW_MAX: int = 30
RISK_LEVEL_MEDIUM_MAX: int = 60
RISK_LEVEL_HIGH_MAX: int = 80
# Above 80 → Critical

CLASSIFICATION_THRESHOLDS: dict[str, Any] = {
    "low_max": 30,          # 0-30: Low
    "medium_max": 60,       # 31-60: Medium
    "high_max": 80,         # 61-80: High
    "critical_min": 81,     # 81-100: Critical
    "trojan_min_score": 61, # Trojan requires score >= 61 plus behavioral or network indicators
    "rules": [
        {
            "class": "Benign",
            "score_band": "0 - 30",
            "risk_level": "Low",
            "deciding_factors": "Score <= 30; baseline host and network activity (single connection / DNS query) contributes 0 points and is listed in context.",
            "static_only_allowed": True,
        },
        {
            "class": "Suspicious",
            "score_band": "31 - 60",
            "risk_level": "Medium / High",
            "deciding_factors": "Score between 31 and 60; or any static-only upload scoring > 30 (since static-only lacks behavioral telemetry and caps at Suspicious).",
            "static_only_allowed": True,
        },
        {
            "class": "Trojan-like",
            "score_band": "61 - 100",
            "risk_level": "High / Critical",
            "deciding_factors": "Score >= 61 AND requires observed dynamic host or network telemetry (process injection/manipulation, persistence, or beacon-like repeated connections).",
            "static_only_allowed": False,
        },
    ],
}

# ---------------------------------------------------------------------------
# ML Feature Names (locked in exact order)
# ---------------------------------------------------------------------------
FEATURE_NAMES: list[str] = [
    "file_entropy",
    "import_count",
    "suspicious_imports",
    "process_count",
    "file_events",
    "network_connections",
    "dns_requests",
    "repeated_connections",
    "persistence_indicator",
]

# ---------------------------------------------------------------------------
# Suspicious Imports Whitelist / Flags (case-insensitive)
# Well-known API names that defenders and heuristic engines flag
# ---------------------------------------------------------------------------
SUSPICIOUS_IMPORTS: set[str] = {
    # Process Injection / Memory Manipulation
    "virtualalloc",
    "virtualallocex",
    "virtualprotect",
    "virtualprotectex",
    "writeprocessmemory",
    "readprocessmemory",
    "createremotethread",
    "openprocess",
    "queueuserapc",
    "ntqueueapcthread",
    "setwindowshookexa",
    "setwindowshookexw",
    "ntmapviewofsection",
    "zwmapviewofsection",
    "suspendthread",
    "resumethread",
    "getthreadcontext",
    "setthreadcontext",
    # Dynamic Loading / Linking
    "loadlibrarya",
    "loadlibraryw",
    "loadlibraryexa",
    "loadlibraryexw",
    "getprocaddress",
    "ldrloaddll",
    # Process Execution
    "winexec",
    "shellexecutea",
    "shellexecutew",
    "shellexecuteexa",
    "shellexecuteexw",
    "createprocessa",
    "createprocessw",
    "createprocessinternalw",
    # Network / Download APIs
    "urldownloadtofilea",
    "urldownloadtofilew",
    "urldownloadtocachefilea",
    "urldownloadtocachefilew",
    "internetopena",
    "internetopenw",
    "internetopenurla",
    "internetopenurlw",
    "internetconnecta",
    "internetconnectw",
    "httpsendrequesta",
    "httpsendrequestw",
    "wsastartup",
    "connect",
    "send",
    "recv",
    # Registry / Persistence
    "regsetvalueexa",
    "regsetvalueexw",
    "regcreatekeyexa",
    "regcreatekeyexw",
    "regopenkeyexa",
    "regopenkeyexw",
    "regdeletevaluea",
    "regdeletevaluew",
    # Evasion / Anti-Analysis
    "isdebuggerpresent",
    "checkremotedebuggerpresent",
    "outputdebugstringa",
    "outputdebugstringw",
    "ntqueryinformationprocess",
    # Token / Privilege Manipulation
    "adjusttokenprivileges",
    "lookupprivilegevaluea",
    "lookupprivilegevaluew",
    "openprocesstoken",
    "impersonateself",
}

# ---------------------------------------------------------------------------
# Risk-engine feature weights
# Each weight is the maximum contribution that indicator can add.
# Weights must sum to 100 or be scaled; the engine clamps the total to [0,100].
# ---------------------------------------------------------------------------
RISK_WEIGHTS: dict[str, float] = {
    "file_entropy":          10.0,  # high entropy → packed/encrypted
    "import_count":           8.0,  # many imports → broad attack surface
    "suspicious_imports":    16.0,  # API names associated with malicious use
    "process_count":          8.0,  # unusual process spawning
    "file_events":            8.0,  # file modification activity
    "network_connections":   10.0,  # outbound connection volume
    "dns_requests":           6.0,  # DNS query volume
    "repeated_connections":  14.0,  # C2-like repeated polling (beacon_like_repeated_connections)
    "persistence_indicator": 12.0,  # startup/registry-like persistence (persistence_like_event)
}

# ---------------------------------------------------------------------------
# Demo scenario real-model probability bands (Phase 5b)
# ---------------------------------------------------------------------------
REAL_MODEL_SUSPICIOUS_LOW: float = 0.35
REAL_MODEL_SUSPICIOUS_HIGH: float = 0.65

# ---------------------------------------------------------------------------
# CORS — restrict to local frontend dev origin
# ---------------------------------------------------------------------------
CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# ---------------------------------------------------------------------------
# Seed demo marker
# ---------------------------------------------------------------------------
SEED_DEMO_SOURCE: str = "seed_demo"
