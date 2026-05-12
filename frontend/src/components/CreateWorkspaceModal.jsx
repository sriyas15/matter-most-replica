import { useState } from "react";
import Modal from "./Modal";
import { Field, Input, Textarea, Button, ErrorBanner } from "./FormElements";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

export default function CreateWorkspaceModal({ open, onClose }) {
  const { selectWorkspace } = useWorkspace();
  const [form, setForm]   = useState({ name: "", slug: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((p) => ({
      ...p,
      [k]: v,
      ...(k === "name"
        ? { slug: v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }
        : {}),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Workspace name is required"); return; }
    if (!form.slug.trim()) { setError("Slug is required"); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/workspaces", {
        name:        form.name,
        slug:        form.slug,
        description: form.description,
      });
      selectWorkspace(data.data);
      setForm({ name: "", slug: "", description: "" });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a Workspace">
      <ErrorBanner message={error} />

      <Field label="Workspace Name">
        <Input value={form.name} onChange={set("name")} placeholder="Acme Inc." autoFocus maxLength={64} />
      </Field>

      <Field label="Slug (URL identifier)">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none">
            /
          </span>
          <input
            value={form.slug}
            onChange={set("slug")}
            placeholder="acme-inc"
            maxLength={48}
            className="w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg pl-6 pr-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition-all box-border font-inherit"
          />
        </div>
      </Field>

      <Field label="Description (optional)">
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder="What does your workspace do?"
          rows={2}
        />
      </Field>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating…" : "Create Workspace"}
        </Button>
      </div>
    </Modal>
  );
}