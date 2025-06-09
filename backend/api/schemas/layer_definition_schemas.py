from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class LayerDefinitionBase(BaseModel):
    layer_name_db: Optional[str] = Field(None, max_length=100)
    cluster_label_id: Optional[str] = Field(None, max_length=255)
    descriptive_name: Optional[str] = Field(None, max_length=255)
    parent_layer_id: Optional[str] = Field(None, max_length=255)
    company_code: Optional[int] = None

    class Config:
        from_attributes = True

class LayerDefinitionCreate(LayerDefinitionBase):
    layer_name_db: str = Field(..., max_length=100)
    cluster_label_id: str = Field(..., max_length=255)
    descriptive_name: str = Field(..., max_length=255)
    company_code: int
    # parent_layer_id is optional

class LayerDefinition(LayerDefinitionBase):
    id: int
    created_at: datetime
    updated_at: datetime
