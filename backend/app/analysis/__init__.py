"""
TrojanGuard — Analysis Package.

Modules:
- static: In-memory safe static analysis, SHA-256, entropy, PE parsing.
- behavior: Simulated deterministic host behavioral telemetry generator.
- network: Simulated deterministic network telemetry generator (RFC 5737 IPs).
- ioc: Indicators of compromise builder.
- feature_extractor: 9-feature vector extractor with observation mask.
- exceptions: Analysis errors and upload size limit exceptions.
"""
from app.analysis.static import analyze_bytes, calculate_entropy, detect_file_type, StaticResult
from app.analysis.behavior import generate_behavior_events
from app.analysis.network import generate_network_events, is_rfc5737_ip
from app.analysis.ioc import extract_iocs
from app.analysis.feature_extractor import extract_features, FeatureVector
from app.analysis.exceptions import UploadSizeExceededError, AnalysisError

__all__ = [
    "analyze_bytes",
    "calculate_entropy",
    "detect_file_type",
    "StaticResult",
    "generate_behavior_events",
    "generate_network_events",
    "is_rfc5737_ip",
    "extract_iocs",
    "extract_features",
    "FeatureVector",
    "UploadSizeExceededError",
    "AnalysisError",
]
