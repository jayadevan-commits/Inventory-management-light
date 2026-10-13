"""MySQL connection management: schema initialization, connection pool, transactions."""
import logging
from contextlib import contextmanager
from typing import Iterator, Optional

import mysql.connector
from mysql.connector.abstracts import MySQLCursorAbstract
from mysql.connector.pooling import MySQLConnectionPool

from config import BASE_DIR, get_settings

logger = logging.getLogger(__name__)

_pool: Optional[MySQLConnectionPool] = None
SCHEMA_FILE = BASE_DIR / "schema.sql"


def _connection_args(with_database: bool = True) -> dict:
    settings = get_settings()
    args = {
        "host": settings.db_host,
        "port": settings.db_port,
        "user": settings.db_user,
        "password": settings.db_password,
        "charset": "utf8mb4",
        "connection_timeout": 10,
    }
    if with_database:
        args["database"] = settings.db_name
    return args


def _create_database_if_missing() -> None:
    name = get_settings().db_name  # validated in config.py
    conn = mysql.connector.connect(**_connection_args(with_database=False))
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{name}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        cursor.close()
    finally:
        conn.close()


def _read_schema_statements() -> list[str]:
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    lines = [line for line in sql.splitlines() if not line.strip().startswith("--")]
    statements = [s.strip() for s in "\n".join(lines).split(";") if s.strip()]
    # The database is created from DB_NAME, so skip the CREATE DATABASE / USE lines.
    return [
        s for s in statements
        if not s.upper().startswith(("CREATE DATABASE", "USE "))
    ]


def _run_schema() -> None:
    conn = mysql.connector.connect(**_connection_args())
    try:
        cursor = conn.cursor()
        for statement in _read_schema_statements():
            cursor.execute(statement)  # IF NOT EXISTS: existing tables and data are untouched
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def init_database() -> None:
    """Called once at startup: optionally create the schema, then open the connection pool."""
    global _pool
    settings = get_settings()
    try:
        if settings.auto_init_schema:
            _create_database_if_missing()
            _run_schema()
            logger.info("Database schema checked (database '%s')", settings.db_name)
        _pool = MySQLConnectionPool(
            pool_name="inventory_pool",
            pool_size=settings.db_pool_size,
            pool_reset_session=True,
            **_connection_args(),
        )
        check_connection()
    except mysql.connector.Error as exc:
        logger.error("Could not initialize the database: %s", exc, exc_info=True)
        raise
    logger.info(
        "Connected to MySQL at %s:%s (pool size %s)",
        settings.db_host, settings.db_port, settings.db_pool_size,
    )


def get_pool() -> MySQLConnectionPool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool


def check_connection() -> None:
    with transaction() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()


@contextmanager
def transaction() -> Iterator[MySQLCursorAbstract]:
    """Give the caller a dict cursor inside one database transaction.

    Everything done inside the `with` block is committed together when the block ends,
    or rolled back if any exception is raised.
    """
    conn = get_pool().get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()  # returns the connection to the pool
