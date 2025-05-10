from pydantic import BaseModel, Field
from typing import Optional, List
# Assuming TGL_PO and other date fields will be datetime
from datetime import datetime

# Base model for common PO attributes


class PurchaseOrderBase(BaseModel):
    # Field names here should match the sanitized column names in the 'purchase_orders' MySQL table
    # as created by etl_script.py.
    # Original names from SP: ['SUPPLIER_CODE', 'Supplier_Name', 'PO_No', 'PO Status', 'TGL_PO',
    # 'PO_No Line', 'ITEM', 'ITEM_DESC', 'ITEM_DESC2', 'QTY_ORDER', 'UNIT', 'CONVERTION_FACTOR',
    # 'QTY_ORDER_CONVERTION', 'Original_PRICE', 'Currency', 'Rate', 'ORDER_AMOUNT', 'IDR_PRICE',
    # 'Order Amount IDR', 'RECEIVED_NO', 'RECEIVED_DATE', 'DELIVERED_QTY', 'PR_No', 'PLAN_RECEIVED',
    # 'Term_Payment_at_PO', 'Item Group Code', 'Item Group Name', 'First2DigitItemCode', 'Supplier Tlp',
    # 'PR Ref-A', 'PR Ref-B', 'PR Created by', 'PO Created by', 'Tax Code', 'PR Date', 'ITEM_PURCHASE_TEXT']

    SUPPLIER_CODE: Optional[str] = None
    Supplier_Name: Optional[str] = None
    # Was str, making Optional for flexibility
    PO_No: Optional[str] = Field(None, example="PO2023-00123")
    PO_Status: Optional[str] = None  # Sanitized from 'PO Status'
    TGL_PO: Optional[datetime] = None
    # Sanitized from 'PO_No Line', assuming int
    PO_No_Line: Optional[int] = None
    ITEM: Optional[str] = None
    ITEM_DESC: Optional[str] = None
    ITEM_DESC2: Optional[str] = None
    QTY_ORDER: Optional[float] = None  # Was float, making Optional
    UNIT: Optional[str] = None
    CONVERTION_FACTOR: Optional[float] = None
    QTY_ORDER_CONVERTION: Optional[float] = None
    Original_PRICE: Optional[float] = None
    Currency: Optional[str] = None
    Rate: Optional[float] = None
    ORDER_AMOUNT: Optional[float] = None
    IDR_PRICE: Optional[float] = None  # Was float, making Optional
    # Sanitized from 'Order Amount IDR'
    Order_Amount_IDR: Optional[float] = None
    RECEIVED_NO: Optional[str] = None
    RECEIVED_DATE: Optional[datetime] = None
    DELIVERED_QTY: Optional[float] = None
    PR_No: Optional[str] = None
    PLAN_RECEIVED: Optional[datetime] = None
    Term_Payment_at_PO: Optional[str] = None
    Item_Group_Code: Optional[str] = None  # Sanitized
    Item_Group_Name: Optional[str] = None  # Sanitized
    First2DigitItemCode: Optional[str] = None
    Supplier_Tlp: Optional[str] = None  # Sanitized
    PR_Ref_A: Optional[str] = None  # Sanitized
    PR_Ref_B: Optional[str] = None  # Sanitized
    PR_Created_by: Optional[str] = None  # Sanitized
    PO_Created_by: Optional[str] = None  # Sanitized
    Tax_Code: Optional[str] = None  # Sanitized
    PR_Date: Optional[datetime] = None  # Sanitized
    ITEM_PURCHASE_TEXT: Optional[str] = None

    # Calculated/added fields (ensure these names are used consistently if they are part of the table)
    Sum_of_Order_Amount_IDR: Optional[float] = None
    Total_Cumulative_QTY_Order: Optional[float] = None
    Total_Cumulative_IDR_Amount: Optional[float] = None
    Checklist: Optional[bool] = False  # Default is False in ETL
    Keterangan: Optional[str] = ""  # Default is '' in ETL

    class Config:
        from_attributes = True  # Replaced orm_mode for Pydantic v2 compatibility
        # For FastAPI to handle datetime objects correctly in responses
        # json_encoders = {
        #     datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S') if v else None
        # }


# Schema for creating a PO (fields that can be set on creation)
# This might be simpler if POs are only created via ETL
class PurchaseOrderCreate(PurchaseOrderBase):
    # Typically, ID and calculated fields are not set on creation by user
    # This schema is for creating POs via API, which might not be the primary way.
    # The fields here should reflect what's minimally required or allowed for API creation.
    # For now, let's keep it simple, assuming most fields come from ETL or are optional.
    PO_No: str  # Example required field for API creation
    # Using ITEM_NAME as a proxy for ITEM_DESC or ITEM
    ITEM_NAME: Optional[str] = None
    QTY_ORDER: Optional[float] = None
    IDR_PRICE: Optional[float] = None
    # Add other fields that make sense for direct API creation


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
