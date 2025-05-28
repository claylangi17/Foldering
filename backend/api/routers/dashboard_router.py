from fastapi import APIRouter, Depends, HTTPException
from ..schemas.dashboard_schemas import MiniDashboardData
from ..services import dashboard_service
# Assuming dashboard is a protected resource
from ..core.dependencies import get_current_active_user
from ..schemas import user_schemas  # For type hinting current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    # Secure all dashboard routes
    dependencies=[Depends(get_current_active_user)]
)


@router.get("/mini-summary", response_model=MiniDashboardData)
async def get_mini_dashboard_summary(current_user: user_schemas.UserInDB = Depends(get_current_active_user)):
    """
    Retrieve aggregated data for the mini dashboard.
    Requires authentication.
    """
    try:
        data = dashboard_service.get_mini_dashboard_data()
        return data
    except Exception as e:
        # Log the exception e
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve dashboard summary: {str(e)}")
