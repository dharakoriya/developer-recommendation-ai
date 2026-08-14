from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.database import verify_database_connection

router = APIRouter()


@router.get("/health", summary="Basic Health Check Endpoint")
def get_health():
    """
    Health check endpoint returning system status and PostgreSQL connectivity state.
    Satisfies Milestone 1 requirement for REST API health verification.
    """
    db_status = verify_database_connection()
    
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status
    }
