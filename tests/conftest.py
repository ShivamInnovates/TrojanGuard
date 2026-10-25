"""
TrojanGuard — Pytest fixtures.

Provides isolated temporary SQLite databases per test and configured
FastAPI TestClients.
"""
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend package is in python path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import init_db
from app.main import app
import app.config as app_config
import app.database as app_database


@pytest.fixture
def temp_db_path(tmp_path: Path) -> Path:
    """Fixture providing a freshly initialized SQLite database file in a temp directory."""
    db_file = tmp_path / "test_trojanguard.db"
    init_db(db_file)
    return db_file


@pytest.fixture
def test_client(temp_db_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Fixture providing a FastAPI TestClient bound to an isolated temporary database."""
    monkeypatch.setattr(app_config, "DB_PATH", temp_db_path)
    monkeypatch.setattr(app_database, "DB_PATH", temp_db_path)
    with TestClient(app) as client:
        yield client
