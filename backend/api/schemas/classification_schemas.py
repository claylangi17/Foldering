from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime # Added import
from .po_schemas import PurchaseOrderBase  # Import PurchaseOrderBase

# Schemas for item_classifications table

class ItemClassificationBase(BaseModel):
    item_po_id: Optional[int] = None
    item_description: Optional[str] = None
    cluster_label: Optional[str] = None
    layer_name: Optional[str] = None
    company_code: Optional[int] = None

    class Config:
        from_attributes = True

class ItemClassificationCreate(ItemClassificationBase):
    item_description: str
    company_code: int
    # item_po_id, cluster_label, and layer_name are optional at creation via this schema,
    # they might be populated by other processes or if known.

class ItemClassification(ItemClassificationBase):
    id: int
    created_at: datetime


# Schema for representing a single classification category/node within a layer


class LayerNode(BaseModel):
    # Unique ID for the layer node (e.g., cluster ID)
    id: str = Field(..., example="L1_BrandX")
    # Human-readable name for the node
    name: str = Field(..., example="Brand X")
    # Layer level (1 or 2, L3 is item list)
    level: int = Field(..., example=1, ge=1, le=2)
    # Number of items in this category
    item_count: Optional[int] = Field(None, example=150)
    total_po_count: Optional[int] = Field(None, description="Total number of POs under this layer, including all descendants", example=500)
    # ID of the parent node in the hierarchy
    parent_id: Optional[str] = Field(None, example="L0_Root_Or_Null")

    class Config:
        from_attributes = True


class LayerHierarchyResponse(BaseModel):
    parent_name: Optional[str] = Field(None, example="Parent Folder Name")
    layers: List[LayerNode]

    class Config:
        from_attributes = True


class LayerItemsResponse(BaseModel):
    layer_name: str = Field(..., example="DUPLEX 450GSM/58.5X92CM")
    items: List[PurchaseOrderBase]

    class Config:
        from_attributes = True

# Schema for returning a list of layer nodes (e.g., all L1 categories)
# This might be replaced by LayerHierarchyResponse if always returning parent_name
# class LayerNodeList(BaseModel):
#     items: List[LayerNode]
#     # Total count if paginated, or total L1/L2/L3 nodes
#     total: Optional[int] = None

# Schema for representing the full classification hierarchy for a single item
# This might not be needed if classification is purely rule-based and direct.
# class ItemClassificationInfo(BaseModel):
#     # The original item identifier (e.g., from ITEM_ID or a combined key)
#     item_id: str
#     item_name: str  # The name/description of the item
#     layer1: Optional[LayerNode] = None
#     layer2: Optional[LayerNode] = None
#     # layer3: Optional[LayerNode] = None # L3 is item list
#     # Could also include raw embedding vector if useful for frontend/debugging, but can be large
#     # embedding: Optional[List[float]] = None

#     class Config:
#         from_attributes = True

# Schema for a request to classify a new item (if different from just a string query)


class NewItemClassificationRequest(BaseModel):
    item_description: str = Field(...,
                                  example="Duplex Board 250gsm 90cm x 70cm")
    # Potentially other context if available
    # item_code: Optional[str] = None

# Schema for the response of a new item classification
# This should reflect the direct L1/L2 parsing result


class NewItemClassificationResponse(BaseModel):
    input_description: str
    l1_folder: Optional[str] = Field(None, example="DUPLEX 450GSM")
    l2_folder: Optional[str] = Field(None, example="DUPLEX 450GSM/58.5X92CM")
    # assigned_layer1: Optional[LayerNode] = None # Not returning full node objects for simple parsing
    # assigned_layer2: Optional[LayerNode] = None
    # confidence_l1: Optional[float] = None

    class Config:
        from_attributes = True

# This file can be expanded with more specific schemas as the classification logic develops.
