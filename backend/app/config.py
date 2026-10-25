"""
TrojanGuard — Central configuration.

All tunable constants live here.  Never import from this module
in the ML training scripts (use ml/feature_names.json directly).
"""
from pathlib import Path

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
# Risk-score thresholds
# ---------------------------------------------------------------------------
RISK_LEVEL_LOW_MAX: int = 30
RISK_LEVEL_MEDIUM_MAX: int = 60
RISK_LEVEL_HIGH_MAX: int = 80
# Above 80 → Critical

# ---------------------------------------------------------------------------
# Risk-engine feature weights
# Each weight is the maximum contribution that indicator can add.
# Weights must sum to 100 or be scaled; the engine clamps the total to [0,100].
# ---------------------------------------------------------------------------
RISK_WEIGHTS: dict[str, float] = {
    "file_entropy":          10.0,  # high entropy → packed/encrypted
    "import_count":           8.0,  # many imports → broad attack surface
    "suspicious_imports":    15.0,  # API names associated with malicious use
    "process_count":          8.0,  # unusual process spawning
    "file_events":            8.0,  # file modification activity
    "network_connections":   12.0,  # outbound connection volume
    "dns_requests":          10.0,  # DNS query volume (beacon pattern)
    "repeated_connections":  15.0,  # C2-like repeated polling
    "persistence_indicator": 14.0,  # startup/registry-like persistence
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
