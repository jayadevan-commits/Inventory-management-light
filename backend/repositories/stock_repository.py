"""Raw SQL for stock transactions. No business rules here."""
from typing import Any, Dict, List, Optional, Tuple

from utils.pagination import offset_for

_SELECT = """
    SELECT t.id, t.product_id, p.name AS product_name, p.sku AS product_sku,
           t.transaction_type, t.quantity, t.quantity_before, t.quantity_after,
           t.reason, t.created_at
    FROM stock_transactions t
    JOIN products p ON p.id = t.product_id
"""


def create(
    cursor,
    product_id: int,
    transaction_type: str,
    quantity: int,
    quantity_before: int,
    quantity_after: int,
    reason: Optional[str],
) -> int:
    cursor.execute(
        """INSERT INTO stock_transactions
               (product_id, transaction_type, quantity, quantity_before, quantity_after, reason)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (product_id, transaction_type, quantity, quantity_before, quantity_after, reason),
    )
    return cursor.lastrowid


def get_by_id(cursor, transaction_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(_SELECT + " WHERE t.id = %s", (transaction_id,))
    return cursor.fetchone()


def search(
    cursor,
    page: int,
    page_size: int,
    product_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    clauses: List[str] = []
    params: List[Any] = []
    if product_id:
        clauses.append("t.product_id = %s")
        params.append(product_id)
    if transaction_type:
        clauses.append("t.transaction_type = %s")
        params.append(transaction_type)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""

    cursor.execute(f"SELECT COUNT(*) AS total FROM stock_transactions t{where}", params)
    total = cursor.fetchone()["total"]
    cursor.execute(
        f"{_SELECT}{where} ORDER BY t.created_at DESC, t.id DESC LIMIT %s OFFSET %s",
        params + [page_size, offset_for(page, page_size)],
    )
    return cursor.fetchall(), total


def list_recent(cursor, limit: int) -> List[Dict[str, Any]]:
    cursor.execute(f"{_SELECT} ORDER BY t.created_at DESC, t.id DESC LIMIT %s", (limit,))
    return cursor.fetchall()
