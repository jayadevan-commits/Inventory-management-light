import type { Product, StockStatus } from "../api/types";

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatPrice(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Same rules as the backend: out = 0, low = 1..reorder level, otherwise in stock. */
export function getStockStatus(product: Pick<Product, "quantity" | "reorder_level">): StockStatus {
  if (product.quantity === 0) return "out_of_stock";
  if (product.quantity <= product.reorder_level) return "low_stock";
  return "in_stock";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
