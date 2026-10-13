"""Centralized logging: console output plus rotating files (app.log and errors.log)."""
import logging
from logging.handlers import RotatingFileHandler

from config import get_settings

_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def setup_logging() -> None:
    settings = get_settings()
    settings.log_path.mkdir(parents=True, exist_ok=True)
    formatter = logging.Formatter(_FORMAT)

    console = logging.StreamHandler()
    console.setFormatter(formatter)

    app_file = RotatingFileHandler(
        settings.log_path / "app.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8"
    )
    app_file.setFormatter(formatter)

    # Warnings and errors (database errors, unexpected exceptions) also go to their own file.
    error_file = RotatingFileHandler(
        settings.log_path / "errors.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8"
    )
    error_file.setLevel(logging.WARNING)
    error_file.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(settings.log_level.upper())
    root.addHandler(console)
    root.addHandler(app_file)
    root.addHandler(error_file)

    # Keep the MySQL driver quiet unless something is wrong.
    logging.getLogger("mysql.connector").setLevel(logging.WARNING)
