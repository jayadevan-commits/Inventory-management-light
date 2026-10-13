"""Builds the dashboard numbers."""
from typing import Any, Dict

from database import transaction
from repositories import product_repository, stock_repository


def get_dashboard() -> Dict[str, Any]:
    with transaction() as cursor:
        summary = product_repository.get_stock_summary(cursor)
        summary["restock_list"] = product_repository.list_needing_restock(cursor, limit=6)
        summary["recent_transactions"] = stock_repository.list_recent(cursor, limit=6)
    return summary
