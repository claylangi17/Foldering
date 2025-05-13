from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Optional, Any
# Import LayerNode, LayerItemsResponse, and the new LayerHierarchyResponse schemas
from ..schemas.classification_schemas import LayerNode as LayerNodeSchema, LayerItemsResponse, LayerHierarchyResponse
# Import the base PO schema used within LayerItemsResponse
# Alias for PurchaseOrderBase
from ..schemas.po_schemas import PurchaseOrderBase as ItemDetailSchema
from ..services import classification_service

router = APIRouter(
    prefix="/classification",
    tags=["Classification Layers"]
)

# Mock data and temporary LayerSchema removed.


@router.get("/layers/{slug:path}", response_model=LayerHierarchyResponse)
async def get_layers_by_slug(
    slug: str = Path(..., description="Path representing the layer hierarchy, e.g., 'L1' or 'L1/123/L2'. '123' is a parent layer_definition primary key.")
):
    """
    Retrieve classification categories based on a hierarchical slug.
    Returns the sub-layers and the name of the direct parent layer if applicable.
    - For L1: slug = "L1" (parent_name will be null)
    - For L2 under L1 node with PK 123: slug = "L1/123/L2" (parent_name will be name of L1 node 123)

    The numeric parts of the slug are the primary keys from the 'layer_definitions' table.
    """
    print(f"GET /classification/layers/{slug}")
    parts = slug.strip("/").split("/")

    layer_level_to_fetch = 0
    parent_layer_definition_pk: Optional[int] = None

    if not parts:
        raise HTTPException(status_code=400, detail="Slug cannot be empty.")

    current_part_index = 0
    expected_level_char = ""

    # Determine target level and parent_pk from slug
    if parts[current_part_index].upper() == "L1":
        layer_level_to_fetch = 1
        expected_level_char = "L2"
        current_part_index += 1
        if current_part_index < len(parts) and parts[current_part_index].isdigit():
            parent_layer_definition_pk = int(parts[current_part_index])
            current_part_index += 1
        elif current_part_index < len(parts) and not parts[current_part_index].upper().startswith("L"):
            raise HTTPException(
                status_code=400, detail=f"Invalid slug: Expected L2 or L3 after L1 parent ID, got {parts[current_part_index]}")

    if current_part_index < len(parts) and parts[current_part_index].upper() == "L2":
        if layer_level_to_fetch == 0:  # This means L1 was not specified first
            raise HTTPException(
                status_code=400, detail="Invalid slug: L2 cannot be specified without L1 parent context.")
        if parent_layer_definition_pk is None:  # L1/L2 means L1 parent ID was missing
            raise HTTPException(
                status_code=400, detail="Invalid slug: Parent ID for L1 must be provided to fetch L2.")

        layer_level_to_fetch = 2
        expected_level_char = "L3"
        current_part_index += 1
        if current_part_index < len(parts) and parts[current_part_index].isdigit():
            # This is now the L2 parent PK for L3
            parent_layer_definition_pk = int(parts[current_part_index])
            current_part_index += 1
        elif current_part_index < len(parts) and not parts[current_part_index].upper().startswith("L"):
            raise HTTPException(
                status_code=400, detail=f"Invalid slug: Expected L3 after L2 parent ID, got {parts[current_part_index]}")

    if current_part_index < len(parts) and parts[current_part_index].upper() == "L3":
        if layer_level_to_fetch != 2:  # Must come from L2
            raise HTTPException(
                status_code=400, detail="Invalid slug: L3 must be specified after L2 parent context.")
        if parent_layer_definition_pk is None:  # L1/xxx/L2/L3 means L2 parent ID was missing
            raise HTTPException(
                status_code=400, detail="Invalid slug: Parent ID for L2 must be provided to fetch L3.")

        layer_level_to_fetch = 3
        current_part_index += 1
        # No further parent_pk for L3 children in this model

    if current_part_index < len(parts):  # Extra parts in slug
        raise HTTPException(
            status_code=400, detail=f"Invalid slug: Unexpected parts after processing: {'/'.join(parts[current_part_index:])}")

    if layer_level_to_fetch == 0:
        raise HTTPException(
            status_code=400, detail="Could not determine target layer level from slug.")

    print(
        f"Service call: fetch_distinct_layers_from_db(layer_level_to_fetch={layer_level_to_fetch}, parent_layer_definition_pk={parent_layer_definition_pk})")
    layer_data = classification_service.fetch_distinct_layers_from_db(
        layer_level_to_fetch=layer_level_to_fetch,
        parent_layer_definition_pk=parent_layer_definition_pk
    )
    return layer_data


@router.get("/item-details-by-layer-definition-pk/{layer_definition_pk}", response_model=LayerItemsResponse)
async def get_item_details_by_layer_definition_pk(
    layer_definition_pk: int = Path(
        ..., description="The primary key (id) of the layer_definition record.")
):
    """
    Retrieve item details (e.g., list of POs) associated with a specific 
    layer_definition primary key, along with the layer's name.
    """
    print(
        f"GET /classification/item-details-by-layer-definition-pk/{layer_definition_pk}")

    if layer_definition_pk <= 0:
        raise HTTPException(
            status_code=400, detail="Invalid layer_definition_pk. Must be a positive integer.")

    # The service function now returns a dict {"layer_name": str, "items": List[Dict]}
    layer_data_with_items = classification_service.fetch_items_for_layer_from_db(
        layer_definition_pk=layer_definition_pk
    )
    # FastAPI will validate the returned dict against the LayerItemsResponse model
    return layer_data_with_items
