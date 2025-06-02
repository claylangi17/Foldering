from pydantic import BaseModel, Field
from typing import Optional

class CompanyBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255)

    class Config:
        from_attributes = True

class CompanyCreate(CompanyBase):
    company_code: int # Assuming company_code is provided on creation
    name: str = Field(..., max_length=255)

class Company(CompanyBase):
    company_code: int
    name: str # Name should be present for an existing company record
