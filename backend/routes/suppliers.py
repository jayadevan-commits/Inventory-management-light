from typing import List

from fastapi import APIRouter

from schemas.common import ApiResponse
from schemas.supplier import SupplierInput, SupplierOut
from services import supplier_service
from utils.responses import ERROR_RESPONSES, ok

router = APIRouter(prefix="/suppliers", tags=["Suppliers"], responses=ERROR_RESPONSES)


@router.get("", response_model=ApiResponse[List[SupplierOut]], summary="List all suppliers")
def list_suppliers():
    return ok(supplier_service.list_suppliers(), "Suppliers retrieved successfully")


@router.get("/{supplier_id}", response_model=ApiResponse[SupplierOut], summary="Get one supplier")
def get_supplier(supplier_id: int):
    return ok(supplier_service.get_supplier(supplier_id), "Supplier retrieved successfully")


@router.post(
    "", response_model=ApiResponse[SupplierOut], status_code=201, summary="Create a supplier"
)
def create_supplier(body: SupplierInput):
    return ok(supplier_service.create_supplier(body), "Supplier created successfully")


@router.put("/{supplier_id}", response_model=ApiResponse[SupplierOut], summary="Update a supplier")
def update_supplier(supplier_id: int, body: SupplierInput):
    return ok(supplier_service.update_supplier(supplier_id, body), "Supplier updated successfully")


@router.delete("/{supplier_id}", response_model=ApiResponse[None], summary="Delete a supplier")
def delete_supplier(supplier_id: int):
    supplier_service.delete_supplier(supplier_id)
    return ok(None, "Supplier deleted successfully")
