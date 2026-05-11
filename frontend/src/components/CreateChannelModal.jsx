import { useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

export default function CreateChannelModal({ onClose }) {
  const { activeWorkspace, addChannel } = useWorkspace();
  const [form, setForm]   = useState({ name: "", description: "", type: "public" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(
        `/workspaces/${activeWorkspace._id}/channels`,
        {
          name:        form.name.toLowerCase().replace(/\s+/g, "-"),
          displayName: form.name,
          description: form.description,
          type:        form.type,
        }
      );
      addChannel(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Create a Channel</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Channel type */}
          <div style={styles.field}>
            <label style={styles.label}>Channel Type</label>
            <div style={styles.typeRow}>
              {["public", "private"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t }))}
                  style={{
                    ...styles.typeBtn,
                    ...(form.type === t ? styles.typeBtnActive : {}),
                  }}
                >
                  <i className={`ti ${t === "public" ? "ti-hash" : "ti-lock"}`} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>Channel Name</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputPrefix}>
                <i className={`ti ${form.type === "private" ? "ti-lock" : "ti-hash"}`} />
              </span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. frontend-dev"
                style={styles.input}
              />
            </div>
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>
              Description <span style={{ color: "#5050a0" }}>(optional)</span>
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's this channel about?"
              style={styles.input}
            />
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.name.trim()} style={styles.submitBtn}>
              {loading ? "Creating…" : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" },
  modal:   { background: "#1e1e2e", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, width: "100%", maxWidth: 440, padding: "24px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" },
  header:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title:   { fontSize: 16, fontWeight: 600, color: "#e8e8f0", margin: 0 },
  closeBtn:{ background: "transparent", border: "none", color: "#6060a0", fontSize: 18, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" },
  error:   { background: "rgba(239,68,68,0.15)", border: "0.5px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 16 },
  form:    { display: "flex", flexDirection: "column", gap: 16 },
  field:   { display: "flex", flexDirection: "column", gap: 6 },
  label:   { fontSize: 12, fontWeight: 500, color: "#8080a8" },
  typeRow: { display: "flex", gap: 8 },
  typeBtn: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#8080a8", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  typeBtnActive: { background: "rgba(93,95,232,0.2)", border: "0.5px solid rgba(93,95,232,0.5)", color: "#a0a0f8" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputPrefix: { position: "absolute", left: 10, color: "#6060a0", fontSize: 14, pointerEvents: "none" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px 9px 32px", fontSize: 13, color: "#e0e0f0", outline: "none", boxSizing: "border-box" },
  footer: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 },
  cancelBtn: { background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, color: "#9090b0", cursor: "pointer" },
  submitBtn: { background: "#5d5fe8", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 500 },
};