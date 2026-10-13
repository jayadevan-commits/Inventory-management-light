-- Inventory Management System (Lite) - database schema
-- Safe to run more than once: every statement uses IF NOT EXISTS and nothing is ever dropped.
-- Requires MySQL 8.0.16 or newer (CHECK constraints are enforced from that version).
-- If you change the database name below, also change DB_NAME in your .env file.

CREATE DATABASE IF NOT EXISTS inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_db;

CREATE TABLE IF NOT EXISTS categories (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name           VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NULL,
    email          VARCHAR(150) NULL,
    phone          VARCHAR(30)  NULL,
    address        VARCHAR(255) NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_suppliers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku           VARCHAR(50)  NOT NULL,
    name          VARCHAR(150) NOT NULL,
    description   TEXT NULL,
    category_id   INT UNSIGNED NULL,
    supplier_id   INT UNSIGNED NULL,
    unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity      INT UNSIGNED NOT NULL DEFAULT 0,
    reorder_level INT UNSIGNED NOT NULL DEFAULT 10,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_name (name),
    KEY idx_products_category (category_id),
    KEY idx_products_supplier (supplier_id),
    KEY idx_products_quantity (quantity),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_products_price CHECK (unit_price >= 0),
    CONSTRAINT chk_products_quantity CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_transactions (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id       INT UNSIGNED NOT NULL,
    transaction_type ENUM('IN', 'OUT') NOT NULL,
    quantity         INT UNSIGNED NOT NULL,
    quantity_before  INT UNSIGNED NOT NULL,
    quantity_after   INT UNSIGNED NOT NULL,
    reason           VARCHAR(255) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_stock_tx_product_created (product_id, created_at),
    KEY idx_stock_tx_created (created_at),
    CONSTRAINT fk_stock_tx_product FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_stock_tx_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
