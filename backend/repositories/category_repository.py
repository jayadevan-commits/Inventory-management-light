"""Raw SQL for categories. No business rules here."""
from typing import Any, Dict, List, Optional

_SELECT = """
    SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
           (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c
"""


def list_all(cursor) -> List[Dict[str, Any]]:
    cursor.execute(_SELECT + " ORDER BY c.name")
    return cursor.fetchall()


def get_by_id(cursor, category_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(_SELECT + " WHERE c.id = %s", (category_id,))
    return cursor.fetchone()


def find_by_name(cursor, name: str, exclude_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    cursor.execute(
        "SELECT id FROM categories WHERE name = %s AND id <> %s",
        (name, exclude_id or 0),
    )
    return cursor.fetchone()


def create(cursor, name: str, description: Optional[str]) -> int:
    cursor.execute(
        "INSERT INTO categories (name, description) VALUES (%s, %s)", (name, description)
    )
    return cursor.lastrowid


def update(cursor, category_id: int, name: str, description: Optional[str]) -> None:
    cursor.execute(
        "UPDATE categories SET name = %s, description = %s WHERE id = %s",
        (name, description, category_id),
    )


def delete(cursor, category_id: int) -> None:
    cursor.execute("DELETE FROM categories WHERE id = %s", (category_id,))
