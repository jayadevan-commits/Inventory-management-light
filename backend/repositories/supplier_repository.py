"""Raw SQL for suppliers. No business rules here."""
from typing import Any, Dict, List, Optional

_SELECT = """
    SELECT s.id, s.name, s.contact_person, s.email, s.phone, s.address,
           s.created_at, s.updated_at,
           (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count
    FROM suppliers s
"""


def list_all(cursor) -> List[Dict[str, Any]]:
    cursor.execute(_SELECT + " ORDER BY s.name")
    return cursor.fetchall()


def get_by_id(cursor, supplier_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(_SELECT + " WHERE s.id = %s", (supplier_id,))
    return cursor.fetchone()


def find_by_name(cursor, name: str, exclude_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    cursor.execute(
        "SELECT id FROM suppliers WHERE name = %s AND id <> %s",
        (name, exclude_id or 0),
    )
    return cursor.fetchone()


def create(cursor, data: Dict[str, Any]) -> int:
    cursor.execute(
        """INSERT INTO suppliers (name, contact_person, email, phone, address)
           VALUES (%(name)s, %(contact_person)s, %(email)s, %(phone)s, %(address)s)""",
        data,
    )
    return cursor.lastrowid


def update(cursor, supplier_id: int, data: Dict[str, Any]) -> None:
    cursor.execute(
        """UPDATE suppliers
           SET name = %(name)s, contact_person = %(contact_person)s, email = %(email)s,
               phone = %(phone)s, address = %(address)s
           WHERE id = %(id)s""",
        {**data, "id": supplier_id},
    )


def delete(cursor, supplier_id: int) -> None:
    cursor.execute("DELETE FROM suppliers WHERE id = %s", (supplier_id,))
