"""Errors raised by the service layer. The handlers turn them into standard API responses."""


class AppException(Exception):
    status_code = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class BadRequestError(AppException):
    status_code = 400


class NotFoundError(AppException):
    status_code = 404


class ConflictError(AppException):
    status_code = 409
