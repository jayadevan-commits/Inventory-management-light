from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from schemas.common import InputModel, blank_to_none

MAX_QUANTITY = 2_000_000_000


class ProductInput(InputModel):
    sku: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = Field(default=None, max_length=2000)
    category_id: Optional[int] = Field(default=None, ge=1)
    supplier_id: Optional[int] = Field(default=None, ge=1)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    reorder_level: int = Field(default=10, ge=0, le=MAX_QUANTITY)

    _blank_description = field_validator("description", mode="before")(blank_to_none)

    @field_validator("sku")
    @classmethod
    def _normalize_sku(cls, value: str) -> str:
        if " " in value:
            raise ValueError("SKU cannot contain spaces")
        return value.upper()


class ProductCreate(ProductInput):
    initial_stock: int = Field(default=0, ge=0, le=MAX_QUANTITY)


class ProductUpdate(ProductInput):
    """Stock quantity is deliberately not editable here. Use the stock adjustment endpoint."""


class ProductOut(BaseModel):
    id: int
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    unit_price: float
    quantity: int
    reorder_level: int
    created_at: datetime
    updated_at: datetime
