"""
TrojanGuard — Pydantic v2 schemas.

Defines request/response models for all 4 tables, composite reports,
health status, and API error envelopes.
"""
from typing import Literal, Any
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Strict Literal types as specified
# ---------------------------------------------------------------------------
Classification = Literal["Benign", "Suspicious", "Trojan-like"]
RiskLevel = Literal["Low", "Medium", "High", "Critical"]
AnalysisSource = Literal["upload", "demo", "seed_demo"]
Severity = Literal["low", "medium", "high", "critical"]
IocType = Literal["hash", "ip", "domain", "port"]


# ---------------------------------------------------------------------------
# 1. analyses table models
# ---------------------------------------------------------------------------
class AnalysisBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    filename: str
    sha256: str
    file_size: int = Field(ge=0)
    file_type: str = "unknown"
    timestamp: str  # ISO-8601 UTC
    classification: Classification
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    analysis_source: AnalysisSource = "upload"
    summary: str = ""
    features_json: str | None = None


class AnalysisCreate(AnalysisBase):
    """Data required to insert an analysis record."""
    pass


class AnalysisRecord(AnalysisBase):
    """Saved analysis record including primary key."""
    id: int


class AnalysisListItem(BaseModel):
    """
    Summary analysis record for history listings and tables.
    Omits the large features_json payload.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    sha256: str
    file_size: int = Field(ge=0)
    file_type: str = "unknown"
    timestamp: str  # ISO-8601 UTC
    classification: Classification
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    analysis_source: AnalysisSource = "upload"
    summary: str = ""


# ---------------------------------------------------------------------------
# 2. behavior_events table models
# ---------------------------------------------------------------------------
class BehaviorEventBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: str
    event_type: str
    description: str
    severity: Severity
    is_simulated: int = 1


class BehaviorEventCreate(BehaviorEventBase):
    """Payload to insert a behavior event (analysis_id assigned by parent)."""
    analysis_id: int | None = None


class BehaviorEventRecord(BehaviorEventBase):
    id: int
    analysis_id: int


# ---------------------------------------------------------------------------
# 3. network_events table models
# ---------------------------------------------------------------------------
class NetworkEventBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: str
    source: str
    destination: str
    port: int = Field(ge=0, le=65535)
    protocol: str
    event_type: str
    is_simulated: int = 1


class NetworkEventCreate(NetworkEventBase):
    """Payload to insert a network event (analysis_id assigned by parent)."""
    analysis_id: int | None = None


class NetworkEventRecord(NetworkEventBase):
    id: int
    analysis_id: int


# ---------------------------------------------------------------------------
# 4. iocs table models
# ---------------------------------------------------------------------------
class IocBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: IocType
    value: str
    is_simulated: int = 1


class IocCreate(IocBase):
    """Payload to insert an IOC record (analysis_id assigned by parent)."""
    analysis_id: int | None = None


class IocRecord(IocBase):
    id: int
    analysis_id: int


# ---------------------------------------------------------------------------
# Composite Analysis Report & Evidence Items
# ---------------------------------------------------------------------------
class EvidenceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    indicator: str
    observed_value: Any
    points_contributed: float
    source: Literal["static", "static_simulated", "behavior", "network", "classifier"]
    is_simulated: bool = False


class ContextItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    indicator: str
    observed_value: Any
    description: str
    source: Literal["static", "static_simulated", "behavior", "network", "classifier"]
    is_simulated: bool = False


class AnalysisReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis: AnalysisRecord
    behavior_events: list[BehaviorEventRecord] = Field(default_factory=list)
    network_events: list[NetworkEventRecord] = Field(default_factory=list)
    iocs: list[IocRecord] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    context: list[ContextItem] = Field(default_factory=list)
    raw_points: float = 0.0
    classifier_agrees: bool = True
    classifier_disagreement_reason: str | None = None


# ---------------------------------------------------------------------------
# Pagination and List responses
# ---------------------------------------------------------------------------
class PaginatedAnalyses(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    limit: int
    offset: int
    items: list[AnalysisListItem]


# ---------------------------------------------------------------------------
# Health and Error models
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    database_reachable: bool
    table_count: int
    model_status: str
    model_version: str | None = None
    trained_on_synthetic: bool = True
    python_version: str
    app_version: str


class ErrorResponse(BaseModel):
    error: str
    detail: str | list[str] | dict | None = None
    code: int = 500
