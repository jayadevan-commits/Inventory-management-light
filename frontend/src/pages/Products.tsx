import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Product, StockStatus } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/Feedback";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import ProductForm from "../components/ProductForm";
import { StockBadge, StockLevel } from "../components/StockBadge";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { errorMessage, formatPrice } from "../utils/format";

const PAGE_SIZE = 10;
const STATUS_VALUES: StockStatus[] = ["in_stock", "low_stock", "out_of_stock"];

export default function Products() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") as StockStatus | null;

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<StockStatus | "">(
    initialStatus && STATUS_VALUES.includes(initialStatus) ? initialStatus : "",
  );
  const search = useDebounce(searchText.trim());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const products = useAsync(
    () =>
      api.products
        .list({
          page,
          page_size: PAGE_SIZE,
          search,
          category_id: categoryId ? Number(categoryId) : null,
          stock_status: status,
        })
        .then((r) => r.data),
    [page, search, categoryId, status],
  );
  const categories = useAsync(() => api.categories.list().then((r) => r.data), []);
  const suppliers = useAsync(() => api.suppliers.list().then((r) => r.data), []);

  const filtersActive = Boolean(searchText || categoryId || status);
  const data = products.data;

  function openForm(product: Product | null) {
    setEditing(product);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function handleSaved(message: string) {
    toast.success(message);
    closeForm();
    products.reload();
    categories.reload();
    suppliers.reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const response = await api.products.remove(deleting.id);
      toast.success(response.message);
      setDeleting(null);
      if (data && data.items.length === 1 && page > 1) setPage(page - 1);
      else products.reload();
      categories.reload();
      suppliers.reload();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you stock, with its current level."
        actions={
          <button className="btn btn-primary" onClick={() => openForm(null)}>
            Add product
          </button>
        }
      />

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by name or SKU"
          aria-label="Search by name or SKU"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter by category"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by stock level"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StockStatus | "");
            setPage(1);
          }}
        >
          <option value="">All stock levels</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        {filtersActive && (
          <button
            className="btn btn-quiet"
            onClick={() => {
              setSearchText("");
              setCategoryId("");
              setStatus("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <section className="panel panel-flush">
        {!data && products.loading && <LoadingState label="Loading products..." />}
        {products.error && <ErrorState message={products.error} onRetry={products.reload} />}
        {data && data.items.length === 0 && !products.error && (
          <EmptyState title={filtersActive ? "No products match these filters" : "No products yet"}>
            {filtersActive ? "Try a different search or clear the filters." : "Use Add product to create the first one."}
          </EmptyState>
        )}
        {data && data.items.length > 0 && (
          <div className={products.loading ? "table-wrap is-loading" : "table-wrap"}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th className="num">Unit price</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="cell-title">{product.name}</div>
                      <span className="sku">{product.sku}</span>
                    </td>
                    <td>{product.category_name ?? <span className="muted">None</span>}</td>
                    <td>{product.supplier_name ?? <span className="muted">None</span>}</td>
                    <td className="num">{formatPrice(product.unit_price)}</td>
                    <td>
                      <StockLevel product={product} />
                      <StockBadge product={product} />
                    </td>
                    <td className="actions">
                      <Link className="btn btn-small" to={`/stock?product=${product.id}`}>
                        Adjust stock
                      </Link>
                      <button className="btn btn-small" onClick={() => openForm(product)}>
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger-quiet" onClick={() => setDeleting(product)}>
                        Delete
                      </button>
                    </td>
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
            onPageChange={setPage}
          />
        )}
      </section>

      {formOpen && (
        <Modal title={editing ? "Edit product" : "Add product"} onClose={closeForm} wide>
          <ProductForm
            product={editing}
            categories={categories.data ?? []}
            suppliers={suppliers.data ?? []}
            onSaved={handleSaved}
            onClose={closeForm}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete "${deleting.name}" (${deleting.sku})? Its stock history is deleted with it. This cannot be undone.`}
          confirmLabel="Delete product"
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
