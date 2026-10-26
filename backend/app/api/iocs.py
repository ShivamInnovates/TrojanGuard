"""
TrojanGuard — IOC API Endpoints.

Endpoints:
- GET /api/iocs/{id}: Indicators of Compromise for a specific analysis ID.
"""
from fastapi import APIRouter, HTTPException, status
from app.database import get_conn
from app.models.schemas import IocRecord, ErrorResponse

router = APIRouter(tags=["iocs"])


@router.get(
    "/iocs/{id}",
    response_model=list[IocRecord],
    responses={
        404: {"description": "Analysis not found.", "model": ErrorResponse},
    },
)
async def get_analysis_iocs(id: int):
    """
    Retrieve all Indicators of Compromise associated with an analysis ID.
    Raises 404 if the analysis record does not exist.
    """
    with get_conn() as conn:
        # Verify analysis exists
        analysis_row = conn.execute("SELECT id FROM analyses WHERE id = ?", (id,)).fetchone()
        if not analysis_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Analysis record with ID {id} not found.",
            )

        ioc_rows = conn.execute(
            "SELECT * FROM iocs WHERE analysis_id = ? ORDER BY id ASC",
            (id,),
        ).fetchall()

        return [
            IocRecord(
                id=r["id"],
                analysis_id=r["analysis_id"],
                type=r["type"],
                value=r["value"],
                is_simulated=r["is_simulated"],
            )
            for r in ioc_rows
        ]
