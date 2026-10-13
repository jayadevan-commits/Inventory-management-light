"""Business rules for stock changes. Stock can never go below zero."""
import logging
from typing import Any, Dict, Optional

from database import transaction
from exceptions import BadRequestError, NotFoundError
from repositories import product_repository, stock_repository
from schemas.product import MAX_QUANTITY
from schemas.stock import StockAdjustment
from utils.pagination import build_page

logger = logging.getLogger(__name__)


def adjust_stock(data: StockAdjustment) -> Dict[str, Any]:
    """Add or remove stock and record the transaction, all in one database transaction."""
    with transaction() as cursor:
        # Lock the product row so two simultaneous requests cannot both use the same stock.
        current = product_repository.get_by_id_for_update(cursor, data.product_id)
        if not current:
            raise NotFoundError("Product not found")

        before = current["quantity"]
        if data.transaction_type == "OUT":
            if data.quantity > before:
                raise BadRequestError(
                    f"Not enough stock. Only {before} unit(s) available, "
                    f"but {data.quantity} requested"
                )
            after = before - data.quantity
        else:
            after = before + data.quantity
            if after > MAX_QUANTITY:
                raise BadRequestError("Stock quantity would exceed the allowed maximum")

        product_repository.set_quantity(cursor, data.product_id, after)
        transaction_id = stock_repository.create(
            cursor, data.product_id, data.transaction_type, data.quantity, before, after, data.reason
        )
        result = {
            "product": product_repository.get_by_id(cursor, data.product_id),
            "transaction": stock_repository.get_by_id(cursor, transaction_id),
        }
    logger.info(
        "Stock %s product_id=%s qty=%s (%s -> %s)",
        data.transaction_type, data.product_id, data.quantity, before, after,
    )
    return result


def list_transactions(
    page: int, page_size: int, product_id: Optional[int], transaction_type: Optional[str]
) -> Dict[str, Any]:
    with transaction() as cursor:
        items, total = stock_repository.search(
            cursor, page, page_size, product_id, transaction_type
        )
    return build_page(items, total, page, page_size)
