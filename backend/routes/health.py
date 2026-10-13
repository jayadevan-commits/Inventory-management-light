from fastapi import APIRouter

from database import check_connection
from schemas.common import ApiResponse
from utils.responses import ERROR_RESPONSES, ok

router = APIRouter(prefix="/health", tags=["Health"], responses=ERROR_RESPONSES)


@router.get("", response_model=ApiResponse[dict], summary="Check that the API and database are up")
def health_check():
    check_connection()
    return ok({"status": "healthy", "database": "connected"}, "Service is healthy")
