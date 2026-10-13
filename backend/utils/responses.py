"""Helpers that build the standard success response."""
from typing import Any, Dict

from schemas.common import ErrorResponse

# Added to every router so Swagger UI documents the standard error shape.
ERROR_RESPONSES: Dict[int | str, Dict[str, Any]] = {
    400: {"model": ErrorResponse, "description": "Bad request"},
    404: {"model": ErrorResponse, "description": "Not found"},
    409: {"model": ErrorResponse, "description": "Conflict"},
    422: {"model": ErrorResponse, "description": "Validation failed"},
    500: {"model": ErrorResponse, "description": "Unexpected error"},
}


def ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    """Return {"success": true, "message": ..., "data": ...}.

    FastAPI validates it against the route's response_model.
    """
    return {"success": True, "message": message, "data": data}
