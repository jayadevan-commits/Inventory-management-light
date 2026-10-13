import { FormEvent, useState } from "react";
import { api } from "../api";
import type { Supplier } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState, FormField, LoadingState, PageHeader } from "../components/Feedback";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { errorMessage } from "../utils/format";

function SupplierForm({
  supplier,
  onSaved,
  onClose,
}: {
  supplier: Supplier | null;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    contact_person: supplier?.contact_person ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    address: supplier?.address ?? "",
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found: { name?: string; email?: string } = {};
    if (!form.name.trim()) found.name = "Enter a supplier name";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) found.email = "Enter a valid email address";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      name: form.name.trim(),
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };
    setSaving(true);
    setServerError(null);
    try {
      const response = supplier
        ? await api.suppliers.update(supplier.id, body)
        : await api.suppliers.create(body);
      onSaved(response.message);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && <div className="form-error" role="alert">{serverError}</div>}
      <div className="form-grid">
        <div className="span-2">
          <FormField label="Supplier name" error={errors.name}>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} maxLength={150} autoFocus />
          </FormField>
        </div>
        <FormField label="Contact person">
          <input value={form.contact_person} onChange={(e) => set("contact_person")(e.target.value)} maxLength={100} />
        </FormField>
        <FormField label="Phone">
          <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} maxLength={30} />
        </FormField>
        <div className="span-2">
          <FormField label="Email" error={errors.email}>
            <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} maxLength={150} />
          </FormField>
        </div>
        <div className="span-2">
          <FormField label="Address">
            <input value={form.address} onChange={(e) => set("address")(e.target.value)} maxLength={255} />
          </FormField>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : supplier ? "Save changes" : "Create supplier"}
        </button>
      </div>
    </form>
  );
}

export default function Suppliers() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.suppliers.list().then((r) => r.data), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const response = await api.suppliers.remove(deleting.id);
      toast.success(response.message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy from and how to reach them."
        actions={
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            Add supplier
          </button>
        }
      />
      <section className="panel panel-flush">
        {!data && loading && <LoadingState label="Loading suppliers..." />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.length === 0 && (
          <EmptyState title="No suppliers yet">Use Add supplier to create the first one.</EmptyState>
        )}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="num">Products</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="cell-title">{supplier.name}</div>
                      {supplier.address && <span className="muted">{supplier.address}</span>}
                    </td>
                    <td>{supplier.contact_person ?? <span className="muted">None</span>}</td>
                    <td>{supplier.email ?? <span className="muted">None</span>}</td>
                    <td>{supplier.phone ?? <span className="muted">None</span>}</td>
                    <td className="num">{supplier.product_count}</td>
                    <td className="actions">
                      <button
                        className="btn btn-small"
                        onClick={() => {
                          setEditing(supplier);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger-quiet" onClick={() => setDeleting(supplier)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <Modal title={editing ? "Edit supplier" : "Add supplier"} onClose={closeForm} wide>
          <SupplierForm
            supplier={editing}
            onClose={closeForm}
            onSaved={(message) => {
              toast.success(message);
              closeForm();
              reload();
            }}
          />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete supplier"
          message={`Delete the supplier "${deleting.name}"? This cannot be undone.`}
          confirmLabel="Delete supplier"
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
