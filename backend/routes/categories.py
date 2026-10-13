from typing import List

from fastapi import APIRouter

from schemas.category import CategoryInput, CategoryOut
from schemas.common import ApiResponse
from services import category_service
from utils.responses import ERROR_RESPONSES, ok

router = APIRouter(prefix="/categories", tags=["Categories"], responses=ERROR_RESPONSES)


@router.get("", response_model=ApiResponse[List[CategoryOut]], summary="List all categories")
def list_categories():
    return ok(category_service.list_categories(), "Categories retrieved successfully")


@router.get("/{category_id}", response_model=ApiResponse[CategoryOut], summary="Get one category")
def get_category(category_id: int):
    return ok(category_service.get_category(category_id), "Category retrieved successfully")


@router.post(
    "", response_model=ApiResponse[CategoryOut], status_code=201, summary="Create a category"
)
def create_category(body: CategoryInput):
    return ok(category_service.create_category(body), "Category created successfully")


@router.put("/{category_id}", response_model=ApiResponse[CategoryOut], summary="Update a category")
def update_category(category_id: int, body: CategoryInput):
    return ok(category_service.update_category(category_id, body), "Category updated successfully")


@router.delete("/{category_id}", response_model=ApiResponse[None], summary="Delete a category")
def delete_category(category_id: int):
    category_service.delete_category(category_id)
    return ok(None, "Category deleted successfully")
