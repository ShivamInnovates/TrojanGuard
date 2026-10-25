"""
TrojanGuard — Behavioral module alias for backward and cross-import compatibility.
"""
from app.analysis.behavior import generate_behavior_events, normalize_scenario_name

__all__ = ["generate_behavior_events", "normalize_scenario_name"]
