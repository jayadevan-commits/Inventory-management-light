from fastapi import APIRouter

from schemas.common import ApiResponse
from schemas.dashboard import DashboardOut
from services import dashboard_service
from utils.responses import ERROR_RESPONSES, ok

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], responses=ERROR_RESPONSES)


@router.get("", response_model=ApiResponse[DashboardOut], summary="Dashboard summary")
def get_dashboard():
    return ok(dashboard_service.get_dashboard(), "Dashboard loaded successfully")
