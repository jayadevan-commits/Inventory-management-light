import type { Product } from "../api/types";
import { formatNumber, getStockStatus, STOCK_STATUS_LABEL } from "../utils/format";

type StockFields = Pick<Product, "quantity" | "reorder_level">;

export function StockBadge({ product }: { product: StockFields }) {
  const status = getStockStatus(product);
  return <span className={`badge badge-${status}`}>{STOCK_STATUS_LABEL[status]}</span>;
}

/** Quantity with a thin bar. A full bar means at least twice the reorder level. */
export function StockLevel({ product }: { product: StockFields }) {
  const status = getStockStatus(product);
  const target = Math.max(product.reorder_level * 2, 1);
  const percent = Math.min(100, Math.round((product.quantity / target) * 100));
  return (
    <div className="stock-level">
      <span className="stock-number">{formatNumber(product.quantity)}</span>
      <span className="meter" aria-hidden="true">
        <span className={`meter-fill meter-${status}`} style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}
