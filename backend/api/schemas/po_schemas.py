from pydantic import BaseModel, Field
from typing import Optional, List
# Assuming TGL_PO and other date fields will be datetime
from datetime import datetime

# Base model for common PO attributes


class PurchaseOrderBase(BaseModel):
    PO_No: Optional[str] = Field(None, example="PO2023-00123")
    TGL_PO: Optional[datetime] = None
    ITEM: Optional[str] = None
    ITEM_DESC: Optional[str] = None
    QTY_ORDER: Optional[float] = None
    UNIT: Optional[str] = None
    Original_PRICE: Optional[float] = None
    Currency: Optional[str] = None
    Order_Amount_IDR: Optional[float] = None
    Supplier_Name: Optional[str] = None
    company_code: Optional[int] = None
    PR_No: Optional[str] = None
    PR_Date: Optional[datetime] = None
    PR_Ref_A: Optional[str] = None
    PR_Ref_B: Optional[str] = None
    Term_Payment_at_PO: Optional[str] = None
    RECEIVED_DATE: Optional[datetime] = None
    PO_Status: Optional[str] = None
    Sum_of_Order_Amount_IDR: Optional[float] = None
    Total_Cumulative_QTY_Order: Optional[float] = None
    Total_Cumulative_IDR_Amount: Optional[float] = None
    Checklist: Optional[bool] = False
    Keterangan: Optional[str] = ""

    class Config:
        from_attributes = True


# Schema for creating a PO (fields that can be set on creation)
# This might be simpler if POs are only created via ETL
class PurchaseOrderCreate(PurchaseOrderBase):
    # Fields required for creating a PO via API.
    # Inherits other optional fields from PurchaseOrderBase.
    PO_No: str  # Make PO_No mandatory for creation
    company_code: int  # Make company_code mandatory for creation
    # ITEM, ITEM_DESC, QTY_ORDER etc. are inherited as Optional from PurchaseOrderBase.
    # If more fields are mandatory for API creation, list them here explicitly.


# Schema for updating specific fields (e.g., Checklist, Keterangan)
class PurchaseOrderUpdate(BaseModel):
    Checklist: Optional[bool] = None
    Keterangan: Optional[str] = None
    # Add other fields that are user-editable via UI if any

    class Config:
        from_attributes = True  # Replaced orm_mode


# Schema for reading/returning a PO (includes all fields, including ID from DB)
class PurchaseOrder(PurchaseOrderBase):
    id: int  # Primary key from MySQL table

    # Example of how to structure layer information if directly embedded
    # Layer1_ID: Optional[str] = None
    # Layer1_Name: Optional[str] = None
    # Layer2_ID: Optional[str] = None
    # Layer2_Name: Optional[str] = None
    # Layer3_ID: Optional[str] = None
    # Layer3_Name: Optional[str] = None


# Schema for paginated list of POs
class PurchaseOrderList(BaseModel):
    total: int
    items: List[PurchaseOrder]

# Note: The exact fields in PurchaseOrderBase need to match the columns
# coming from the PO_ListProd stored procedure and the additional columns
# created by the ETL process. User confirmation on these column names is vital.
