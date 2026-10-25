"""
TrojanGuard — Analysis specific exceptions.
"""

class AnalysisError(Exception):
    """Base exception for analysis failures."""
    pass


class UploadSizeExceededError(ValueError, AnalysisError):
    """
    Raised when an uploaded payload exceeds MAX_UPLOAD_BYTES (10 MB).
    Maps to HTTP 413 (Payload Too Large) or 422 (Unprocessable Content).
    """
    def __init__(self, message: str = "File exceeds the 10 MB maximum upload limit."):
        super().__init__(message)
        self.message = message
        self.status_code = 413
