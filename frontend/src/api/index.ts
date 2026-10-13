import { request } from "./client";
import type {
  Category,
  CategoryInput,
  Dashboard,
  PageData,
  Product,
  ProductInput,
  StockAdjustmentInput,
  StockAdjustmentResult,
  StockStatus,
  StockTransaction,
  Supplier,
  SupplierInput,
  TransactionType,
} from "./types";

export interface ProductQuery {
  page: number;
  page_size: number;
  search?: string;
  category_id?: number | null;
  stock_status?: StockStatus | "";
}

export interface TransactionQuery {
  page: number;
  page_size: number;
  product_id?: number | null;
  transaction_type?: TransactionType | "";
}

// Each call returns the full ApiResponse so the UI can show the server's success message.
export const api = {
  dashboard: () => request<Dashboard>("/dashboard"),

  products: {
    list: (params: ProductQuery) =>
      request<PageData<Product>>("/products", { params: { ...params } }),
    get: (id: number) => request<Product>(`/products/${id}`),
    create: (body: ProductInput) => request<Product>("/products", { method: "POST", body }),
    update: (id: number, body: ProductInput) =>
      request<Product>(`/products/${id}`, { method: "PUT", body }),
    remove: (id: number) => request<null>(`/products/${id}`, { method: "DELETE" }),
  },

  categories: {
    list: () => request<Category[]>("/categories"),
    create: (body: CategoryInput) => request<Category>("/categories", { method: "POST", body }),
    update: (id: number, body: CategoryInput) =>
      request<Category>(`/categories/${id}`, { method: "PUT", body }),
    remove: (id: number) => request<null>(`/categories/${id}`, { method: "DELETE" }),
  },

  suppliers: {
    list: () => request<Supplier[]>("/suppliers"),
    create: (body: SupplierInput) => request<Supplier>("/suppliers", { method: "POST", body }),
    update: (id: number, body: SupplierInput) =>
      request<Supplier>(`/suppliers/${id}`, { method: "PUT", body }),
    remove: (id: number) => request<null>(`/suppliers/${id}`, { method: "DELETE" }),
  },

  stock: {
    adjust: (body: StockAdjustmentInput) =>
      request<StockAdjustmentResult>("/stock/adjust", { method: "POST", body }),
    transactions: (params: TransactionQuery) =>
      request<PageData<StockTransaction>>("/stock/transactions", { params: { ...params } }),
  },
};
