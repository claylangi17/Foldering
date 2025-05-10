from pydantic import BaseModel, Field
from typing import Optional, List, Dict

# Schema for representing a single classification category/node within a layer


class LayerNode(BaseModel):
    # Unique ID for the layer node (e.g., cluster ID)
    id: str = Field(..., example="L1_BrandX")
    # Human-readable name for the node
    name: str = Field(..., example="Brand X")
    level: int = Field(..., example=1, ge=1, le=3)  # Layer level (1, 2, or 3)
    # Number of items in this category
    item_count: Optional[int] = Field(None, example=150)
    # ID of the parent node in the hierarchy
    parent_id: Optional[str] = Field(None, example="L0_Root_Or_Null")

    class Config:
        from_attributes = True  # Replaced orm_mode

# Schema for returning a list of layer nodes (e.g., all L1 categories)


class LayerNodeList(BaseModel):
    items: List[LayerNode]
    # Total count if paginated, or total L1/L2/L3 nodes
    total: Optional[int] = None

# Schema for representing the full classification hierarchy for a single item


class ItemClassificationInfo(BaseModel):
    # The original item identifier (e.g., from ITEM_ID or a combined key)
    item_id: str
    item_name: str  # The name/description of the item
    layer1: Optional[LayerNode] = None
    layer2: Optional[LayerNode] = None
    layer3: Optional[LayerNode] = None
    # Could also include raw embedding vector if useful for frontend/debugging, but can be large
    # embedding: Optional[List[float]] = None

    class Config:
        from_attributes = True  # Replaced orm_mode

# Schema for a request to classify a new item (if different from just a string query)


class NewItemClassificationRequest(BaseModel):
    item_description: str = Field(...,
                                  example="Duplex Board 250gsm 90cm x 70cm")
    # Potentially other context if available
    # item_code: Optional[str] = None

# Schema for the response of a new item classification


class NewItemClassificationResponse(BaseModel):
    input_description: str
    assigned_layer1: Optional[LayerNode] = None
    assigned_layer2: Optional[LayerNode] = None
    assigned_layer3: Optional[LayerNode] = None
    # Confidence scores could be added if the model provides them
    # confidence_l1: Optional[float] = None

# This file can be expanded with more specific schemas as the classification logic develops.
