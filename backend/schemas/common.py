"""Shared request/response models."""
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard success envelope."""

    success: bool = True
    message: str
    data: Optional[T] = None


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    success: bool = False
    message: str
    data: None = None


class PageData(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class InputModel(BaseModel):
    """Base for request bodies: trims whitespace from every string."""

    model_config = ConfigDict(str_strip_whitespace=True)


def blank_to_none(value: Any) -> Any:
    """Use as a 'before' validator so an empty optional text field is stored as NULL."""
    if isinstance(value, str) and not value.strip():
        return None
    return value
