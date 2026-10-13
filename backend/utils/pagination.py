"""Pagination and search helpers."""
import math
from typing import Any, Dict, List


def offset_for(page: int, page_size: int) -> int:
    return (page - 1) * page_size


def build_page(items: List[Any], total: int, page: int, page_size: int) -> Dict[str, Any]:
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


def like_pattern(term: str) -> str:
    """Turn user text into a safe LIKE pattern ('%term%'), escaping % and _ typed by the user."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
