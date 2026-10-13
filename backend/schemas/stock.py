from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from schemas.common import InputModel, blank_to_none
from schemas.product import ProductOut


class StockAdjustment(InputModel):
    product_id: int = Field(ge=1)
    transaction_type: Literal["IN", "OUT"]
    quantity: int = Field(gt=0, le=1_000_000)
    reason: Optional[str] = Field(default=None, max_length=255)

    _blank_reason = field_validator("reason", mode="before")(blank_to_none)


class StockTransactionOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str
    transaction_type: Literal["IN", "OUT"]
    quantity: int
    quantity_before: int
    quantity_after: int
    reason: Optional[str] = None
    created_at: datetime


class StockAdjustmentResult(BaseModel):
    product: ProductOut
    transaction: StockTransactionOut
