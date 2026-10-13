import { FormEvent, useState } from "react";
import { api } from "../api";
import type { Category, Product, Supplier } from "../api/types";
import { errorMessage } from "../utils/format";
import { FormField } from "./Feedback";

interface ProductFormProps {
  product: Product | null; // null = creating a new product
  categories: Category[];
  suppliers: Supplier[];
  onSaved: (message: string) => void;
  onClose: () => void;
}

interface FormState {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  supplierId: string;
  unitPrice: string;
  reorderLevel: string;
  initialStock: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState, isEdit: boolean): Errors {
  const errors: Errors = {};
  if (!form.sku.trim()) errors.sku = "Enter a SKU";
  else if (/\s/.test(form.sku.trim())) errors.sku = "A SKU cannot contain spaces";
  if (!form.name.trim()) errors.name = "Enter a product name";
  if (!/^\d+(\.\d{1,2})?$/.test(form.unitPrice.trim())) errors.unitPrice = "Enter a price such as 199.50";
  if (!/^\d+$/.test(form.reorderLevel.trim())) errors.reorderLevel = "Enter a whole number, 0 or more";
  if (!isEdit && !/^\d+$/.test(form.initialStock.trim())) errors.initialStock = "Enter a whole number, 0 or more";
  return errors;
}

export default function ProductForm({ product, categories, suppliers, onSaved, onClose }: ProductFormProps) {
  const isEdit = product !== null;
  const [form, setForm] = useState<FormState>({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.category_id ? String(product.category_id) : "",
    supplierId: product?.supplier_id ? String(product.supplier_id) : "",
    unitPrice: product ? product.unit_price.toFixed(2) : "",
    reorderLevel: product ? String(product.reorder_level) : "10",
    initialStock: "0",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.categoryId ? Number(form.categoryId) : null,
      supplier_id: form.supplierId ? Number(form.supplierId) : null,
      unit_price: Number(form.unitPrice).toFixed(2),
      reorder_level: Number(form.reorderLevel),
    };

    setSaving(true);
    setServerError(null);
    try {
      const response = isEdit
        ? await api.products.update(product.id, body)
        : await api.products.create({ ...body, initial_stock: Number(form.initialStock) });
      onSaved(response.message);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="form-error" role="alert">
          {serverError}
        </div>
      )}
      <div className="form-grid">
        <FormField label="SKU" error={errors.sku} hint="Letters and numbers, no spaces">
          <input value={form.sku} onChange={(e) => set("sku")(e.target.value)} maxLength={50} autoFocus />
        </FormField>
        <FormField label="Product name" error={errors.name}>
          <input value={form.name} onChange={(e) => set("name")(e.target.value)} maxLength={150} />
        </FormField>
        <FormField label="Category">
          <select value={form.categoryId} onChange={(e) => set("categoryId")(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Supplier">
          <select value={form.supplierId} onChange={(e) => set("supplierId")(e.target.value)}>
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Unit price" error={errors.unitPrice}>
          <input
            inputMode="decimal"
            value={form.unitPrice}
            onChange={(e) => set("unitPrice")(e.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Reorder level" error={errors.reorderLevel} hint="Stock at or below this counts as low">
          <input inputMode="numeric" value={form.reorderLevel} onChange={(e) => set("reorderLevel")(e.target.value)} />
        </FormField>
        {!isEdit && (
          <FormField label="Starting stock" error={errors.initialStock} hint="Recorded as the first stock change">
            <input inputMode="numeric" value={form.initialStock} onChange={(e) => set("initialStock")(e.target.value)} />
          </FormField>
        )}
        <div className="span-2">
          <FormField label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} maxLength={2000} />
          </FormField>
        </div>
      </div>
      {isEdit && <p className="muted note">To change the quantity, use the Stock page so the change is recorded.</p>}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
