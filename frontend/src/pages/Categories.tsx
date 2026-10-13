import { FormEvent, useState } from "react";
import { api } from "../api";
import type { Category } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState, FormField, LoadingState, PageHeader } from "../components/Feedback";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useAsync } from "../hooks/useAsync";
import { errorMessage } from "../utils/format";

function CategoryForm({
  category,
  onSaved,
  onClose,
}: {
  category: Category | null;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Enter a category name");
      return;
    }
    setNameError(undefined);
    setSaving(true);
    setServerError(null);
    const body = { name: name.trim(), description: description.trim() || null };
    try {
      const response = category
        ? await api.categories.update(category.id, body)
        : await api.categories.create(body);
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
      <div className="form-stack">
        <FormField label="Name" error={nameError}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        </FormField>
        <FormField label="Description">
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
        </FormField>
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : category ? "Save changes" : "Create category"}
        </button>
      </div>
    </form>
  );
}

export default function Categories() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.categories.list().then((r) => r.data), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const response = await api.categories.remove(deleting.id);
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
        title="Categories"
        description="Group products so they are easy to find."
        actions={
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            Add category
          </button>
        }
      />
      <section className="panel panel-flush">
        {!data && loading && <LoadingState label="Loading categories..." />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.length === 0 && (
          <EmptyState title="No categories yet">Use Add category to create the first one.</EmptyState>
        )}
        {data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th className="num">Products</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((category) => (
                  <tr key={category.id}>
                    <td className="cell-title">{category.name}</td>
                    <td>{category.description ?? <span className="muted">None</span>}</td>
                    <td className="num">{category.product_count}</td>
                    <td className="actions">
                      <button
                        className="btn btn-small"
                        onClick={() => {
                          setEditing(category);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn btn-small btn-danger-quiet" onClick={() => setDeleting(category)}>
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
        <Modal title={editing ? "Edit category" : "Add category"} onClose={closeForm}>
          <CategoryForm
            category={editing}
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
          title="Delete category"
          message={`Delete the category "${deleting.name}"? This cannot be undone.`}
          confirmLabel="Delete category"
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
