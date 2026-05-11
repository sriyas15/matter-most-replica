import { useState } from "react";
import Modal from "./Modal";
import { Field, Input, Textarea, Button, ErrorBanner } from "./FormElements";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

export default function CreateWorkspaceModal({ open, onClose }) {
    const { selectWorkspace } = useWorkspace();
    const [form, setForm] = useState({ name: "", slug: "", description: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const set = (k) => (e) => {
        const v = e.target.value;
        setForm((p) => ({
            ...p,
            [k]: v,
            ...(k === "name" ? { slug: v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } : {}),
        }));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError("Workspace name is required"); return; }
        if (!form.slug.trim()) { setError("Slug is required"); return; }
        setError(""); setLoading(true);
        try {
            const { data } = await api.post("/workspaces", {
                name: form.name,
                slug: form.slug,
                description: form.description,
            });
            selectWorkspace(data.data);
            setForm({ name: "", slug: "", description: "" });
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create workspace");
        } finally { setLoading(false); }
    };

    return (
        <Modal open={open} onClose={onClose} title="Create a Workspace">
            <ErrorBanner message={error} />

            <Field label="Workspace Name">
                <Input value={form.name} onChange={set("name")} placeholder="Acme Inc." autoFocus maxLength={64} />
            </Field>

            <Field label="Slug (URL identifier)">
                <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6060a0", pointerEvents: "none" }}>
                        /
                    </span>
                    <input
                        value={form.slug}
                        onChange={set("slug")}
                        placeholder="acme-inc"
                        maxLength={48}
                        style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.06)",
                            border: "0.5px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            padding: "9px 12px 9px 22px",
                            fontSize: 13,
                            color: "#e0e0f0",
                            outline: "none",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                        }}
                    />
                </div>
            </Field>

            <Field label="Description (optional)">
                <Textarea value={form.description} onChange={set("description")} placeholder="What does your workspace do?" rows={2} />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Creating…" : "Create Workspace"}
                </Button>
            </div>
        </Modal>
    );
}