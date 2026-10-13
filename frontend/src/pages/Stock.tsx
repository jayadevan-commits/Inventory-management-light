import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Product, TransactionType } from "../api/types";
import { EmptyState, ErrorState, FormField, LoadingState, PageHeader } from "../components/Feedback";
import Pagination from "../components/Pagination";
import { StockBadge } from "../components/StockBadge";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { errorMessage, formatDate, formatNumber } from "../utils/format";

const HISTORY_PAGE_SIZE = 10;

export default function Stock() {
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // --- adjustment form state ---
  const [selected, setSelected] = useState<Product | null>(null);
  const [finder, setFinder] = useState("");
  const debouncedFinder = useDebounce(finder.trim());
  const [type, setType] = useState<TransactionType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [quantityError, setQuantityError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // --- history filter state ---
  const [historyPage, setHistoryPage] = useState(1);
  const [historyType, setHistoryType] = useState<TransactionType | "">("");
  const [onlySelected, setOnlySelected] = useState(false);

  const matches = useAsync(
    () => api.products.list({ page: 1, page_size: 20, search: debouncedFinder }).then((r) => r.data.items),
    [debouncedFinder, refresh],
  );

  const history = useAsync(
    () =>
      api.stock
        .transactions({
          page: historyPage,
          page_size: HISTORY_PAGE_SIZE,
          product_id: onlySelected && selected ? selected.id : null,
          transaction_type: historyType,
        })
        .then((r) => r.data),
    [historyPage, historyType, onlySelected, selected?.id, refresh],
  );

  // Open with a product already chosen when arriving from a "Adjust stock" link.
  useEffect(() => {
    const id = Number(searchParams.get("product"));
    if (!id) return;
    api.products
      .get(id)
      .then((r) => setSelected(r.data))
      .catch((err) => toast.error(errorMessage(err)));
  }, [searchParams, toast]);

  const options = matches.data ?? [];
  const listed = selected && !options.some((p) => p.id === selected.id) ? [selected, ...options] : options;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!selected) {
      setQuantityError(undefined);
      setServerError("Choose a product first.");
      return;
    }
    const amount = Number(quantity);
    if (!/^\d+$/.test(quantity.trim()) || amount < 1) {
      setQuantityError("Enter a whole number, 1 or more");
      return;
    }
    if (type === "OUT" && amount > selected.quantity) {
      setQuantityError(`Only ${formatNumber(selected.quantity)} in stock`);
      return;
    }
    setQuantityError(undefined);

    setSaving(true);
    try {
      const response = await api.stock.adjust({
        product_id: selected.id,
        transaction_type: type,
        quantity: amount,
        reason: reason.trim() || null,
      });
      toast.success(response.message);
      setSelected(response.data.product);
      setQuantity("");
      setReason("");
      setHistoryPage(1);
      setRefresh((n) => n + 1);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const data = history.data;

  return (
    <>
      <PageHeader title="Stock" description="Add or remove stock. Every change is recorded below." />

      <div className="stock-layout">
        <section className="panel">
          <h2>Change stock</h2>
          <form onSubmit={handleSubmit} noValidate>
            {serverError && <div className="form-error" role="alert">{serverError}</div>}
            <div className="form-stack">
              <FormField label="Find a product">
                <input
                  type="search"
                  value={finder}
                  onChange={(e) => setFinder(e.target.value)}
                  placeholder="Type a name or SKU"
                />
              </FormField>
              <FormField label="Product">
                <select
                  size={6}
                  value={selected?.id ?? ""}
                  onChange={(e) => {
                    setSelected(listed.find((p) => p.id === Number(e.target.value)) ?? null);
                    setQuantityError(undefined);
                    setServerError(null);
                  }}
                >
                  {listed.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} ({formatNumber(p.quantity)})
                    </option>
                  ))}
                </select>
                {matches.loading && !matches.data && <span className="field-hint">Loading products...</span>}
                {matches.data && matches.data.length === 0 && (
                  <span className="field-hint">No products match that search.</span>
                )}
              </FormField>

              {selected && (
                <div className="selected-product">
                  <div>
                    <div className="cell-title">{selected.name}</div>
                    <span className="sku">{selected.sku}</span>
                  </div>
                  <div className="selected-stock">
                    <span className="stat-value small">{formatNumber(selected.quantity)}</span>
                    <StockBadge product={selected} />
                  </div>
                </div>
              )}

              <fieldset className="segmented">
                <legend className="field-label">Change</legend>
                <label className={type === "IN" ? "segment active" : "segment"}>
                  <input type="radio" name="type" checked={type === "IN"} onChange={() => setType("IN")} />
                  Add stock
                </label>
                <label className={type === "OUT" ? "segment active" : "segment"}>
                  <input type="radio" name="type" checked={type === "OUT"} onChange={() => setType("OUT")} />
                  Remove stock
                </label>
              </fieldset>

              <FormField label="Quantity" error={quantityError}>
                <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </FormField>
              <FormField label="Note" hint="Optional, for example a purchase order or a sale">
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
              </FormField>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save stock change"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel panel-flush">
          <div className="panel-bar">
            <h2>Stock history</h2>
            <div className="panel-bar-controls">
              <label className="check">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  disabled={!selected}
                  onChange={(e) => {
                    setOnlySelected(e.target.checked);
                    setHistoryPage(1);
                  }}
                />
                Selected product only
              </label>
              <select
                aria-label="Filter by change type"
                value={historyType}
                onChange={(e) => {
                  setHistoryType(e.target.value as TransactionType | "");
                  setHistoryPage(1);
                }}
              >
                <option value="">All changes</option>
                <option value="IN">Stock added</option>
                <option value="OUT">Stock removed</option>
              </select>
            </div>
          </div>

          {!data && history.loading && <LoadingState label="Loading history..." />}
          {history.error && <ErrorState message={history.error} onRetry={history.reload} />}
          {data && data.items.length === 0 && (
            <EmptyState title="No stock changes found">Changes you save on this page appear here.</EmptyState>
          )}
          {data && data.items.length > 0 && (
            <div className={history.loading ? "table-wrap is-loading" : "table-wrap"}>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Product</th>
                    <th className="num">Change</th>
                    <th className="num">Stock after</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((tx) => (
                    <tr key={tx.id}>
                      <td className="nowrap">{formatDate(tx.created_at)}</td>
                      <td>
                        <div className="cell-title">{tx.product_name}</div>
                        <span className="sku">{tx.product_sku}</span>
                      </td>
                      <td className="num">
                        <span className={tx.transaction_type === "IN" ? "delta delta-in" : "delta delta-out"}>
                          {tx.transaction_type === "IN" ? "+" : "-"}
                          {formatNumber(tx.quantity)}
                        </span>
                      </td>
                      <td className="num">{formatNumber(tx.quantity_after)}</td>
                      <td>{tx.reason ?? <span className="muted">None</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              total={data.total}
              pageSize={data.page_size}
              onPageChange={setHistoryPage}
            />
          )}
        </section>
      </div>
    </>
  );
}
