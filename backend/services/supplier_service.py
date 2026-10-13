"""Business rules for suppliers."""
import logging
from typing import Any, Dict, List

from database import transaction
from exceptions import ConflictError, NotFoundError
from repositories import supplier_repository as repo
from schemas.supplier import SupplierInput

logger = logging.getLogger(__name__)


def list_suppliers() -> List[Dict[str, Any]]:
    with transaction() as cursor:
        return repo.list_all(cursor)


def get_supplier(supplier_id: int) -> Dict[str, Any]:
    with transaction() as cursor:
        supplier = repo.get_by_id(cursor, supplier_id)
    if not supplier:
        raise NotFoundError("Supplier not found")
    return supplier


def create_supplier(data: SupplierInput) -> Dict[str, Any]:
    values = data.model_dump()
    with transaction() as cursor:
        if repo.find_by_name(cursor, values["name"]):
            raise ConflictError("A supplier with this name already exists")
        new_id = repo.create(cursor, values)
        supplier = repo.get_by_id(cursor, new_id)
    logger.info("Supplier created id=%s name=%s", new_id, values["name"])
    return supplier


def update_supplier(supplier_id: int, data: SupplierInput) -> Dict[str, Any]:
    values = data.model_dump()
    with transaction() as cursor:
        if not repo.get_by_id(cursor, supplier_id):
            raise NotFoundError("Supplier not found")
        if repo.find_by_name(cursor, values["name"], exclude_id=supplier_id):
            raise ConflictError("A supplier with this name already exists")
        repo.update(cursor, supplier_id, values)
        supplier = repo.get_by_id(cursor, supplier_id)
    logger.info("Supplier updated id=%s", supplier_id)
    return supplier


def delete_supplier(supplier_id: int) -> None:
    with transaction() as cursor:
        supplier = repo.get_by_id(cursor, supplier_id)
        if not supplier:
            raise NotFoundError("Supplier not found")
        if supplier["product_count"] > 0:
            raise ConflictError(
                f"Supplier is used by {supplier['product_count']} product(s). "
                "Move or delete those products first"
            )
        repo.delete(cursor, supplier_id)
    logger.info("Supplier deleted id=%s", supplier_id)
