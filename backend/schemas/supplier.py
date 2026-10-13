from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from schemas.common import InputModel, blank_to_none


class SupplierInput(InputModel):
    name: str = Field(min_length=1, max_length=150)
    contact_person: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = Field(default=None, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=255)

    _blank_optional = field_validator(
        "contact_person", "email", "phone", "address", mode="before"
    )(blank_to_none)


class SupplierOut(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    product_count: int = 0
    created_at: datetime
    updated_at: datetime
