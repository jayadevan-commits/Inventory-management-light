from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from schemas.common import InputModel, blank_to_none


class CategoryInput(InputModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)

    _blank_description = field_validator("description", mode="before")(blank_to_none)


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    product_count: int = 0
    created_at: datetime
    updated_at: datetime
