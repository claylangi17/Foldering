from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends
from typing import List, Optional

# Import actual schemas and service functions
from ..schemas.po_schemas import PurchaseOrder as PurchaseOrderResponseSchema
from ..schemas.po_schemas import PurchaseOrderCreate as PurchaseOrderCreateSchema
from ..schemas.po_schemas import PurchaseOrderUpdate as PurchaseOrderUpdateSchema
from ..schemas import user_schemas  # For UserInDB type hint
# Assuming PurchaseOrderList is also defined in po_schemas for a paginated response
from ..schemas.po_schemas import PurchaseOrderList
from ..services import po_service
from ..core.dependencies import get_current_active_spv_user, get_current_active_user  # Import dependencies

router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"]
)

# Mock database and temporary schemas are removed.


# Using imported schema
@router.get("/", response_model=PurchaseOrderList)
async def get_all_purchase_orders(
    skip: int = Query(
        0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(
        10, ge=1, le=100, description="Maximum number of records to return"),
    search_field: Optional[str] = Query(
        None, description="Field to search in (e.g., PO_NO, Keterangan, ALL for generic search)"),
    search_value: Optional[str] = Query(
        None, description="Value to search for"),
    layer_filter: Optional[str] = Query(
        None, description="Filter by classification layer (e.g., L1_ClusterX)"),
    month_filter: Optional[int] = Query(
        None, ge=1, le=12, description="Filter by month (1-12)"),
    current_user: user_schemas.UserInDB = Depends(get_current_active_user)  # Require authentication
):
    """
    Retrieve a list of purchase orders with optional pagination, search, and filters.
    """
    print(
        f"GET /purchase-orders: skip={skip}, limit={limit}, search_field='{search_field}', search_value='{search_value}', layer='{layer_filter}', month='{month_filter}', company_code='{current_user.company_code}'")

    db_pos = po_service.fetch_all_pos_from_db(
        skip=skip,
        limit=limit,
        search_field=search_field,
        search_value=search_value,
        company_code=current_user.company_code,
        layer_filter=layer_filter # Pass the layer_filter
        # month_filter can be added similarly if needed later
    )
    # The service now returns a dict {'items': [...], 'total': ...}
    # Pydantic will validate this structure against PurchaseOrderList schema.
    return db_pos


# Using imported schema
@router.get("/{po_id}", response_model=PurchaseOrderResponseSchema)
async def get_purchase_order_by_id(po_id: int = Path(..., description="The ID of the purchase order to retrieve")):
    """
    Retrieve a specific purchase order by its ID.
    """
    print(f"GET /purchase-orders/{po_id}")
    db_po = po_service.fetch_po_by_id_from_db(po_id=po_id)
    if db_po is None:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return db_po


# Using imported schema
@router.post("/", response_model=PurchaseOrderResponseSchema, status_code=201)
# Using imported schema
async def create_purchase_order(po_data: PurchaseOrderCreateSchema = Body(...)):
    """
    Create a new purchase order.
    (Service layer for creation not yet implemented)
    """
    print(f"POST /purchase-orders with data: {po_data.dict()}")
    new_po_db = po_service.create_po_in_db(po_data=po_data)
    if not new_po_db:
        # Consider more specific error codes based on service layer feedback if available
        raise HTTPException(
            status_code=500, detail="Failed to create Purchase Order in database.")
    return new_po_db


# Using imported schema
@router.put("/{po_id}", response_model=PurchaseOrderResponseSchema)
async def update_purchase_order_fields(
    po_id: int = Path(...,
                      description="The ID of the purchase order to update"),
    # Using imported schema
    update_data: PurchaseOrderUpdateSchema = Body(...),
    current_user: user_schemas.UserInDB = Depends(
        get_current_active_user)  # Changed to allow any authenticated user
):
    """
    Update specific fields of a purchase order (e.g., Checklist, Keterangan).
    Only accessible by users with 'spv' role.
    (Service layer for update not yet implemented)
    """
    print(
        f"PUT /purchase-orders/{po_id} with data: {update_data.dict(exclude_unset=True)} by user {current_user.username} (role: {current_user.role})")

    # Check if an attempt is made to update the Checklist field
    if update_data.Checklist is not None:
        # If Checklist is being updated, ensure the user has the 'spv' role
        if current_user.role.lower() != 'spv':
            raise HTTPException(
                status_code=403,
                detail="Only SPV users can update the checklist."
            )

    updated_po_db = po_service.update_po_fields_in_db(
        po_id=po_id, update_data=update_data)
    if not updated_po_db:
        # update_po_fields_in_db returns None if PO not found after attempt,
        # or if DB error occurred.
        # A more granular error handling could be:
        # 1. Check if PO exists first.
        # 2. Then attempt update.
        # For now, a generic 404 if service returns None.
        raise HTTPException(
            status_code=404, detail=f"Purchase Order with ID {po_id} not found or update failed.")
    return updated_po_db

# Note: A DELETE endpoint might also be useful, but not explicitly requested yet.
# @router.delete("/{po_id}", status_code=204)
# async def delete_purchase_order(po_id: int):
#     if po_id not in mock_po_db:
#         raise HTTPException(status_code=404, detail="Purchase Order not found")
#     del mock_po_db[po_id]
#     return
