"""Raw SQL for products. No business rules here."""
from typing import Any, Dict, List, Optional, Tuple

from utils.pagination import like_pattern, offset_for

_SELECT = """
    SELECT p.id, p.sku, p.name, p.description,
           p.category_id, c.name AS category_name,
           p.supplier_id, s.name AS supplier_name,
           p.unit_price, p.quantity, p.reorder_level, p.created_at, p.updated_at
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
"""

# Fixed SQL fragments only. User input always goes through %s parameters.
_STOCK_FILTERS = {
    "in_stock": "p.quantity > p.reorder_level",
    "low_stock": "p.quantity > 0 AND p.quantity <= p.reorder_level",
    "out_of_stock": "p.quantity = 0",
}


def _where(
    search: Optional[str],
    category_id: Optional[int],
    supplier_id: Optional[int],
    stock_status: Optional[str],
) -> Tuple[str, List[Any]]:
    clauses: List[str] = []
    params: List[Any] = []
    if search:
        pattern = like_pattern(search)
        clauses.append("(p.name LIKE %s OR p.sku LIKE %s)")
        params += [pattern, pattern]
    if category_id:
        clauses.append("p.category_id = %s")
        params.append(category_id)
    if supplier_id:
        clauses.append("p.supplier_id = %s")
        params.append(supplier_id)
    if stock_status in _STOCK_FILTERS:
        clauses.append(f"({_STOCK_FILTERS[stock_status]})")
    return (" WHERE " + " AND ".join(clauses)) if clauses else "", params


def search(
    cursor,
    page: int,
    page_size: int,
    search_text: Optional[str] = None,
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    stock_status: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    where, params = _where(search_text, category_id, supplier_id, stock_status)
    cursor.execute(f"SELECT COUNT(*) AS total FROM products p{where}", params)
    total = cursor.fetchone()["total"]
    cursor.execute(
        f"{_SELECT}{where} ORDER BY p.name, p.id LIMIT %s OFFSET %s",
        params + [page_size, offset_for(page, page_size)],
    )
    return cursor.fetchall(), total


def get_by_id(cursor, product_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(_SELECT + " WHERE p.id = %s", (product_id,))
    return cursor.fetchone()


def get_by_id_for_update(cursor, product_id: int) -> Optional[Dict[str, Any]]:
    """Lock the row until the transaction ends, so two stock changes cannot overlap."""
    cursor.execute(
        "SELECT id, quantity FROM products WHERE id = %s FOR UPDATE", (product_id,)
    )
    return cursor.fetchone()


def find_by_sku(cursor, sku: str, exclude_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    cursor.execute(
        "SELECT id FROM products WHERE sku = %s AND id <> %s", (sku, exclude_id or 0)
    )
    return cursor.fetchone()


def create(cursor, data: Dict[str, Any], quantity: int) -> int:
    cursor.execute(
        """INSERT INTO products
               (sku, name, description, category_id, supplier_id, unit_price, quantity, reorder_level)
           VALUES (%(sku)s, %(name)s, %(description)s, %(category_id)s, %(supplier_id)s,
                   %(unit_price)s, %(quantity)s, %(reorder_level)s)""",
        {**data, "quantity": quantity},
    )
    return cursor.lastrowid


def update(cursor, product_id: int, data: Dict[str, Any]) -> None:
    cursor.execute(
        """UPDATE products
           SET sku = %(sku)s, name = %(name)s, description = %(description)s,
               category_id = %(category_id)s, supplier_id = %(supplier_id)s,
               unit_price = %(unit_price)s, reorder_level = %(reorder_level)s
           WHERE id = %(id)s""",
        {**data, "id": product_id},
    )


def set_quantity(cursor, product_id: int, quantity: int) -> None:
    cursor.execute("UPDATE products SET quantity = %s WHERE id = %s", (quantity, product_id))


def delete(cursor, product_id: int) -> None:
    cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))


def get_stock_summary(cursor) -> Dict[str, int]:
    cursor.execute(
        """SELECT COUNT(*) AS total_products,
                  COALESCE(SUM(quantity), 0) AS total_stock,
                  COALESCE(SUM(quantity > 0 AND quantity <= reorder_level), 0) AS low_stock_count,
                  COALESCE(SUM(quantity = 0), 0) AS out_of_stock_count
           FROM products"""
    )
    row = cursor.fetchone()
    return {key: int(value) for key, value in row.items()}


def list_needing_restock(cursor, limit: int) -> List[Dict[str, Any]]:
    cursor.execute(
        f"{_SELECT} WHERE p.quantity <= p.reorder_level ORDER BY p.quantity, p.name LIMIT %s",
        (limit,),
    )
    return cursor.fetchall()
