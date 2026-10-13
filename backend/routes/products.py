from typing import Literal, Optional

from fastapi import APIRouter, Query

from schemas.common import ApiResponse, PageData
from schemas.product import ProductCreate, ProductOut, ProductUpdate
from services import product_service
from utils.responses import ERROR_RESPONSES, ok

router = APIRouter(prefix="/products", tags=["Products"], responses=ERROR_RESPONSES)


@router.get(
    "",
    response_model=ApiResponse[PageData[ProductOut]],
    summary="List products (search, filter, paginate)",
)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=100, description="Matches name or SKU"),
    category_id: Optional[int] = Query(None, ge=1),
    supplier_id: Optional[int] = Query(None, ge=1),
    stock_status: Optional[Literal["in_stock", "low_stock", "out_of_stock"]] = None,
):
    data = product_service.list_products(
        page, page_size, search.strip() if search else None, category_id, supplier_id, stock_status
    )
    return ok(data, "Products retrieved successfully")


@router.get("/{product_id}", response_model=ApiResponse[ProductOut], summary="Get one product")
def get_product(product_id: int):
    return ok(product_service.get_product(product_id), "Product retrieved successfully")


@router.post(
    "", response_model=ApiResponse[ProductOut], status_code=201, summary="Create a product"
)
def create_product(body: ProductCreate):
    return ok(product_service.create_product(body), "Product created successfully")


@router.put("/{product_id}", response_model=ApiResponse[ProductOut], summary="Update a product")
def update_product(product_id: int, body: ProductUpdate):
    return ok(product_service.update_product(product_id, body), "Product updated successfully")


@router.delete("/{product_id}", response_model=ApiResponse[None], summary="Delete a product")
def delete_product(product_id: int):
    product_service.delete_product(product_id)
    return ok(None, "Product deleted successfully")
