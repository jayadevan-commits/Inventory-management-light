import { Link } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/Feedback";
import { StockBadge, StockLevel } from "../components/StockBadge";
import { useAsync } from "../hooks/useAsync";
import { formatDate, formatNumber } from "../utils/format";

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => api.dashboard().then((r) => r.data), []);

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        {loading ? <LoadingState /> : <ErrorState message={error ?? "Could not load the dashboard."} onRetry={reload} />}
      </>
    );
  }

  const cards = [
    { label: "Total products", value: data.total_products, tone: "navy", to: "/products" },
    { label: "Units in stock", value: data.total_stock, tone: "navy", to: "/products" },
    { label: "Low stock", value: data.low_stock_count, tone: "warn", to: "/products?status=low_stock" },
    { label: "Out of stock", value: data.out_of_stock_count, tone: "danger", to: "/products?status=out_of_stock" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Where your stock stands right now." />
      {error && <ErrorState message={error} onRetry={reload} />}

      <section className="stat-grid" aria-label="Summary">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className={`stat stat-${card.tone}`}>
            <span className="stat-value">{formatNumber(card.value)}</span>
            <span className="stat-label">{card.label}</span>
          </Link>
        ))}
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Needs restocking</h2>
          {data.restock_list.length === 0 ? (
            <EmptyState title="Nothing to restock">
              {data.total_products === 0
                ? "Add your first product to start tracking stock."
                : "Every product is above its reorder level."}
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Reorder at</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.restock_list.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="cell-title">{product.name}</div>
                        <span className="sku">{product.sku}</span>
                      </td>
                      <td>
                        <StockLevel product={product} />
                        <StockBadge product={product} />
                      </td>
                      <td>{formatNumber(product.reorder_level)}</td>
                      <td className="actions">
                        <Link className="btn btn-small" to={`/stock?product=${product.id}`}>
                          Add stock
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Recent stock changes</h2>
          {data.recent_transactions.length === 0 ? (
            <EmptyState title="No stock changes yet">Changes appear here as soon as you add or remove stock.</EmptyState>
          ) : (
            <ul className="feed">
              {data.recent_transactions.map((tx) => (
                <li key={tx.id}>
                  <span className={tx.transaction_type === "IN" ? "delta delta-in" : "delta delta-out"}>
                    {tx.transaction_type === "IN" ? "+" : "-"}
                    {formatNumber(tx.quantity)}
                  </span>
                  <span className="feed-main">
                    <span className="cell-title">{tx.product_name}</span>
                    <span className="muted">
                      {tx.reason ?? (tx.transaction_type === "IN" ? "Stock added" : "Stock removed")}
                    </span>
                  </span>
                  <span className="muted feed-time">{formatDate(tx.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link className="panel-link" to="/stock">
            See all stock changes
          </Link>
        </section>
      </div>
    </>
  );
}
