from fastapi import APIRouter, Depends
from ..core.dependencies import get_current_active_user
from ..schemas.user_schemas import User
from typing import List

router = APIRouter(
    prefix="/companies",
    tags=["Companies"]
)


class CompanyResponse:
    """Schema for company response"""
    company_code: int
    name: str


@router.get("/", response_model=List[dict])
async def get_companies():
    """
    Get all companies for dropdown selection.
    This endpoint does not require authentication.
    """
    # In a real application, you would fetch this from the database
    # For now, returning hardcoded values from the database we saw in the screenshots
    companies = [
        {"company_code": 160, "name": "PT. Printec Perkasa Tangerang"},
        {"company_code": 170, "name": "PT. Grafitecindo Ciptaprima"},
        {"company_code": 180, "name": "PT. Printec Perkasa Cikarang"},
        {"company_code": 191, "name": "PT. IGP Internasional - Sleman"},
        {"company_code": 194, "name": "PT. IGP Internasional - Tempel"},
        {"company_code": 195, "name": "PT. IGP Internasional - Klaten"},
        {"company_code": 198, "name": "PT. IGP Internasional - Piyungan"},
        {"company_code": 199, "name": "PT. IGP Internasional - Bantul"},
        {"company_code": 491, "name": "Sansico Utama"}
    ]
    return companies
