export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  unit_price: number;
  quantity: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export type TransactionType = "IN" | "OUT";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface StockTransaction {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  transaction_type: TransactionType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: string;
}

export interface Dashboard {
  total_products: number;
  total_stock: number;
  low_stock_count: number;
  out_of_stock_count: number;
  restock_list: Product[];
  recent_transactions: StockTransaction[];
}

// Request bodies
export interface CategoryInput {
  name: string;
  description: string | null;
}

export interface SupplierInput {
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ProductInput {
  sku: string;
  name: string;
  description: string | null;
  category_id: number | null;
  supplier_id: number | null;
  unit_price: string;
  reorder_level: number;
  initial_stock?: number;
}

export interface StockAdjustmentInput {
  product_id: number;
  transaction_type: TransactionType;
  quantity: number;
  reason: string | null;
}

export interface StockAdjustmentResult {
  product: Product;
  transaction: StockTransaction;
}
