"""Business rules for products."""
import logging
from typing import Any, Dict, Optional

from database import transaction
from exceptions import BadRequestError, ConflictError, NotFoundError
from repositories import category_repository, product_repository as repo
from repositories import stock_repository, supplier_repository
from schemas.product import ProductCreate, ProductUpdate
from utils.pagination import build_page

logger = logging.getLogger(__name__)


def _check_references(cursor, category_id: Optional[int], supplier_id: Optional[int]) -> None:
    if category_id and not category_repository.get_by_id(cursor, category_id):
        raise BadRequestError("The selected category does not exist")
    if supplier_id and not supplier_repository.get_by_id(cursor, supplier_id):
        raise BadRequestError("The selected supplier does not exist")


def list_products(
    page: int,
    page_size: int,
    search: Optional[str],
    category_id: Optional[int],
    supplier_id: Optional[int],
    stock_status: Optional[str],
) -> Dict[str, Any]:
    with transaction() as cursor:
        items, total = repo.search(
            cursor, page, page_size, search, category_id, supplier_id, stock_status
        )
    return build_page(items, total, page, page_size)


def get_product(product_id: int) -> Dict[str, Any]:
    with transaction() as cursor:
        product = repo.get_by_id(cursor, product_id)
    if not product:
        raise NotFoundError("Product not found")
    return product


def create_product(data: ProductCreate) -> Dict[str, Any]:
    values = data.model_dump(exclude={"initial_stock"})
    with transaction() as cursor:
        if repo.find_by_sku(cursor, values["sku"]):
            raise ConflictError("A product with this SKU already exists")
        _check_references(cursor, values["category_id"], values["supplier_id"])
        new_id = repo.create(cursor, values, quantity=data.initial_stock)
        if data.initial_stock > 0:
            stock_repository.create(
                cursor, new_id, "IN", data.initial_stock, 0, data.initial_stock, "Initial stock"
            )
        product = repo.get_by_id(cursor, new_id)
    logger.info("Product created id=%s sku=%s", new_id, values["sku"])
    return product


def update_product(product_id: int, data: ProductUpdate) -> Dict[str, Any]:
    values = data.model_dump()
    with transaction() as cursor:
        if not repo.get_by_id(cursor, product_id):
            raise NotFoundError("Product not found")
        if repo.find_by_sku(cursor, values["sku"], exclude_id=product_id):
            raise ConflictError("A product with this SKU already exists")
        _check_references(cursor, values["category_id"], values["supplier_id"])
        repo.update(cursor, product_id, values)
        product = repo.get_by_id(cursor, product_id)
    logger.info("Product updated id=%s", product_id)
    return product


def delete_product(product_id: int) -> None:
    with transaction() as cursor:
        if not repo.get_by_id(cursor, product_id):
            raise NotFoundError("Product not found")
        repo.delete(cursor, product_id)  # its stock history is deleted with it (ON DELETE CASCADE)
    logger.info("Product deleted id=%s", product_id)
