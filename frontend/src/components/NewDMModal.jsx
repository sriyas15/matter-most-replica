import { useState, useEffect, useRef } from "react";
import Modal            from "./Modal";
import { Button, ErrorBanner } from "./FormElements";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDM }        from "../context/DMContext";
import api              from "../lib/api";

const STATUS_COLOR = { online: "#3db87a", away: "#f0a22a", dnd: "#e53e3e", offline: "#6060a0" };

export default function NewDMModal({ open, onClose }) {
  const { activeWorkspace }     = useWorkspace();
  const { openDMWithUser }      = useDM();

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const debounceRef             = useRef(null);

  useEffect(() => {
    if (!query.trim() || !activeWorkspace) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/users/workspaces/${activeWorkspace._id}/search`,
          { params: { q: query } }
        );
        setResults(data.data || []);
      } catch {}
    }, 300);
  }, [query, activeWorkspace?._id]);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setSelected([]); setError(""); }
  }, [open]);

  const toggle = (user) => {
    setSelected((p) =>
      p.find((u) => u._id === user._id) ? p.filter((u) => u._id !== user._id) : [...p, user]
    );
  };

  const handleOpen = async () => {
    if (!selected.length) { setError("Select at least one person"); return; }
    setError(""); setLoading(true);
    try {
      if (selected.length === 1) {
        await openDMWithUser(selected[0]);
      } else {
        // Group DM
        await api.post(`/workspaces/${activeWorkspace._id}/dms/group`, {
          participantIds: selected.map((u) => u._id),
        });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to open DM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Direct Message">
      <ErrorBanner message={error} />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {selected.map((u) => (
            <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(93,95,232,0.2)", border: "0.5px solid rgba(93,95,232,0.4)", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 12, color: "#c0c0f0" }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: u.avatarColor || "#5d5fe8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 600 }}>
                {(u.displayName || u.username || "?")[0].toUpperCase()}
              </div>
              {u.displayName || u.username}
              <button onClick={() => toggle(u)} style={{ background: "none", border: "none", color: "#8080c0", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or username…"
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#e0e0f0", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
      />

      {/* Results */}
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {results.length === 0 && query.trim() && (
          <p style={{ fontSize: 12, color: "#5050a0", textAlign: "center", padding: "20px 0" }}>No users found</p>
        )}
        {results.map((u) => {
          const isSel = !!selected.find((s) => s._id === u._id);
          return (
            <div
              key={u._id}
              onClick={() => toggle(u)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: isSel ? "rgba(93,95,232,0.15)" : "transparent", marginBottom: 2, transition: "background 0.15s" }}
            >
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: u.avatarColor || "#5d5fe8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden" }}>
                  {u.avatar ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (u.displayName || u.username || "?").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[u.status || "offline"], position: "absolute", bottom: -1, right: -1, border: "1.5px solid #1e1e30" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#d8d8f0", fontWeight: 500 }}>{u.displayName || u.username}</div>
                <div style={{ fontSize: 11, color: "#6060a0" }}>@{u.username}</div>
              </div>
              {isSel && <i className="ti ti-check" style={{ color: "#5d5fe8", fontSize: 16 }} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleOpen} disabled={!selected.length || loading}>
          {loading ? "Opening…" : selected.length > 1 ? "Create Group DM" : "Open DM"}
        </Button>
      </div>
    </Modal>
  );
}