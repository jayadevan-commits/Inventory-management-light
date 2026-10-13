"""Business rules for categories."""
import logging
from typing import Any, Dict, List

from database import transaction
from exceptions import ConflictError, NotFoundError
from repositories import category_repository as repo
from schemas.category import CategoryInput

logger = logging.getLogger(__name__)


def list_categories() -> List[Dict[str, Any]]:
    with transaction() as cursor:
        return repo.list_all(cursor)


def get_category(category_id: int) -> Dict[str, Any]:
    with transaction() as cursor:
        category = repo.get_by_id(cursor, category_id)
    if not category:
        raise NotFoundError("Category not found")
    return category


def create_category(data: CategoryInput) -> Dict[str, Any]:
    with transaction() as cursor:
        if repo.find_by_name(cursor, data.name):
            raise ConflictError("A category with this name already exists")
        new_id = repo.create(cursor, data.name, data.description)
        category = repo.get_by_id(cursor, new_id)
    logger.info("Category created id=%s name=%s", new_id, data.name)
    return category


def update_category(category_id: int, data: CategoryInput) -> Dict[str, Any]:
    with transaction() as cursor:
        if not repo.get_by_id(cursor, category_id):
            raise NotFoundError("Category not found")
        if repo.find_by_name(cursor, data.name, exclude_id=category_id):
            raise ConflictError("A category with this name already exists")
        repo.update(cursor, category_id, data.name, data.description)
        category = repo.get_by_id(cursor, category_id)
    logger.info("Category updated id=%s", category_id)
    return category


def delete_category(category_id: int) -> None:
    with transaction() as cursor:
        category = repo.get_by_id(cursor, category_id)
        if not category:
            raise NotFoundError("Category not found")
        if category["product_count"] > 0:
            raise ConflictError(
                f"Category is used by {category['product_count']} product(s). "
                "Move or delete those products first"
            )
        repo.delete(cursor, category_id)
    logger.info("Category deleted id=%s", category_id)
