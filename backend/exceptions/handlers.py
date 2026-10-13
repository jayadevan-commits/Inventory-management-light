"""Centralized exception handling. Every error leaves the API in the standard error shape."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from mysql.connector import errors as mysql_errors
from starlette.exceptions import HTTPException as StarletteHTTPException

from exceptions.errors import AppException

logger = logging.getLogger(__name__)

# MySQL error numbers we can explain safely to the client.
_DUPLICATE_ENTRY = 1062
_ROW_IS_REFERENCED = 1451
_PARENT_ROW_MISSING = 1452


def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "message": message, "data": None},
    )


async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
    return _error_response(exc.status_code, exc.message)


async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    friendly = {404: "Resource not found", 405: "Method not allowed"}
    message = friendly.get(exc.status_code) or (
        exc.detail if isinstance(exc.detail, str) else "Request failed"
    )
    return _error_response(exc.status_code, message)


async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    problems = []
    for error in exc.errors():
        location = [str(part) for part in error["loc"] if part not in ("body", "query", "path")]
        field = ".".join(location) or "request"
        text = str(error["msg"]).removeprefix("Value error, ")
        problems.append(f"{field}: {text}")
    return _error_response(422, "Validation failed - " + "; ".join(problems))


async def handle_database_error(request: Request, exc: mysql_errors.Error) -> JSONResponse:
    # Full details go to the log only. The client gets a generic message.
    logger.error(
        "Database error on %s %s: %s", request.method, request.url.path, exc, exc_info=True
    )
    if isinstance(exc, mysql_errors.IntegrityError):
        if exc.errno == _DUPLICATE_ENTRY:
            return _error_response(409, "A record with the same unique value already exists")
        if exc.errno == _ROW_IS_REFERENCED:
            return _error_response(409, "This record is still in use by other records")
        if exc.errno == _PARENT_ROW_MISSING:
            return _error_response(400, "A referenced record does not exist")
        return _error_response(409, "The data conflicts with existing records")
    if isinstance(
        exc, (mysql_errors.OperationalError, mysql_errors.InterfaceError, mysql_errors.PoolError)
    ):
        return _error_response(503, "The database is temporarily unavailable. Please try again")
    return _error_response(500, "A database error occurred")


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unexpected error on %s %s", request.method, request.url.path, exc_info=exc
    )
    return _error_response(500, "An unexpected error occurred")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, handle_app_exception)
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(mysql_errors.Error, handle_database_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
