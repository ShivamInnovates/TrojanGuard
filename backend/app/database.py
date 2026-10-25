"""
TrojanGuard — SQLite database initialisation.

Responsibilities
----------------
* Open (or create) the SQLite database file at DB_PATH.
* Enforce foreign-key constraints (PRAGMA foreign_keys = ON).
* Create all four tables on first run via CREATE TABLE IF NOT EXISTS.
* Expose a context-manager helper ``get_conn()`` for use in route handlers
  and services.

This module intentionally uses raw sqlite3 — no ORM needed for this scope.
"""
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.config import DB_PATH


# ---------------------------------------------------------------------------
# DDL
# ---------------------------------------------------------------------------
_DDL = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS analyses (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    filename         TEXT    NOT NULL,
    sha256           TEXT    NOT NULL,
    file_size        INTEGER NOT NULL,
    file_type        TEXT    NOT NULL DEFAULT 'unknown',
    timestamp        TEXT    NOT NULL,   -- ISO-8601 UTC
    classification   TEXT    NOT NULL,   -- 'Benign' | 'Suspicious' | 'Trojan-like'
    confidence       REAL    NOT NULL,   -- model probability [0.0, 1.0]
    risk_score       INTEGER NOT NULL,   -- 0-100
    risk_level       TEXT    NOT NULL,   -- 'Low' | 'Medium' | 'High' | 'Critical'
    analysis_source  TEXT    NOT NULL DEFAULT 'upload',  -- 'upload' | 'demo' | 'seed_demo'
    summary          TEXT    NOT NULL DEFAULT '',
    features_json    TEXT    DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS behavior_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id  INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    timestamp    TEXT    NOT NULL,
    event_type   TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    severity     TEXT    NOT NULL,   -- 'low' | 'medium' | 'high' | 'critical'
    is_simulated INTEGER NOT NULL DEFAULT 1  -- always 1 for this project
);

CREATE TABLE IF NOT EXISTS network_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id  INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    timestamp    TEXT    NOT NULL,
    source       TEXT    NOT NULL,
    destination  TEXT    NOT NULL,
    port         INTEGER NOT NULL,
    protocol     TEXT    NOT NULL,
    event_type   TEXT    NOT NULL,
    is_simulated INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS iocs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id  INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    type         TEXT    NOT NULL,   -- 'hash' | 'ip' | 'domain' | 'port'
    value        TEXT    NOT NULL,
    is_simulated INTEGER NOT NULL DEFAULT 1
);

-- Indexes for performance on filtering, search, sorting, and joins
CREATE INDEX IF NOT EXISTS idx_analyses_sha256 ON analyses(sha256);
CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON analyses(timestamp);
CREATE INDEX IF NOT EXISTS idx_analyses_classification ON analyses(classification);
CREATE INDEX IF NOT EXISTS idx_analyses_risk_score ON analyses(risk_score);
CREATE INDEX IF NOT EXISTS idx_behavior_events_analysis_id ON behavior_events(analysis_id);
CREATE INDEX IF NOT EXISTS idx_network_events_analysis_id ON network_events(analysis_id);
CREATE INDEX IF NOT EXISTS idx_iocs_analysis_id ON iocs(analysis_id);
"""


def init_db(db_path: Path | None = None) -> None:
    """
    Initialise the database: create the file if absent, apply DDL.
    Safe to call on every application start (uses IF NOT EXISTS).

    Parameters
    ----------
    db_path:
        Override the default path — useful in tests.
    """
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(_DDL)
        conn.commit()


@contextmanager
def get_conn(db_path: Path | None = None):
    """
    Context manager yielding a sqlite3 connection with FK enforcement ON.

    Usage::

        with get_conn() as conn:
            rows = conn.execute("SELECT * FROM analyses").fetchall()
    """
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row       # access columns by name
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
