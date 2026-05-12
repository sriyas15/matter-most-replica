import { useState, useEffect, useRef } from "react";
import Modal            from "./Modal";
import { Button, ErrorBanner } from "./FormElements";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDM }        from "../context/DMContext";
import api              from "../lib/api";

const STATUS_COLOR = {
  online:  "bg-emerald-500",
  away:    "bg-amber-400",
  dnd:     "bg-red-500",
  offline: "bg-slate-300",
};

export default function NewDMModal({ open, onClose }) {
  const { activeWorkspace } = useWorkspace();
  const { openDMWithUser }  = useDM();

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
      p.find((u) => u._id === user._id)
        ? p.filter((u) => u._id !== user._id)
        : [...p, user]
    );
  };

  const handleOpen = async () => {
    if (!selected.length) { setError("Select at least one person"); return; }
    setError(""); setLoading(true);
    try {
      if (selected.length === 1) {
        await openDMWithUser(selected[0]);
      } else {
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
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((u) => (
            <div
              key={u._id}
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full py-1 pl-2 pr-2.5 text-xs text-blue-700"
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center text-[8px] text-white font-semibold flex-shrink-0"
                style={{ background: u.avatarColor || "#2563eb" }}
              >
                {(u.displayName || u.username || "?")[0].toUpperCase()}
              </div>
              <span>{u.displayName || u.username}</span>
              <button
                onClick={() => toggle(u)}
                className="text-blue-400 hover:text-blue-600 bg-transparent border-none cursor-pointer text-sm leading-none ml-0.5 p-0"
              >
                ×
              </button>
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
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition mb-3 box-border"
      />

      {/* Results */}
      <div className="max-h-60 overflow-y-auto">
        {results.length === 0 && query.trim() && (
          <p className="text-xs text-slate-400 text-center py-5">No users found</p>
        )}
        {results.map((u) => {
          const isSel = !!selected.find((s) => s._id === u._id);
          return (
            <div
              key={u._id}
              onClick={() => toggle(u)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors
                ${isSel ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white overflow-hidden"
                  style={{ background: u.avatarColor || "#2563eb" }}
                >
                  {u.avatar
                    ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    : (u.displayName || u.username || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className={`absolute -bottom-px -right-px w-2 h-2 rounded-full border-2 border-white ${STATUS_COLOR[u.status || "offline"]}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{u.displayName || u.username}</p>
                <p className="text-[11px] text-slate-400">@{u.username}</p>
              </div>

              {isSel && <i className="ti ti-check text-blue-600 text-base" />}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleOpen} disabled={!selected.length || loading}>
          {loading ? "Opening…" : selected.length > 1 ? "Create Group DM" : "Open DM"}
        </Button>
      </div>
    </Modal>
  );
}