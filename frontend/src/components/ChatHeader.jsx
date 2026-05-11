import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import api              from "../lib/api";

export default function ChatHeader({ onOpenMembers }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [searchOpen, setSearchOpen]        = useState(false);
  const [query, setQuery]                  = useState("");
  const [results, setResults]              = useState([]);
  const searchRef                          = useRef(null);
  const debounceRef                        = useRef(null);

  // Close search on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { setSearchOpen(false); setQuery(""); setResults([]); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2 || !activeWorkspace) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/workspaces/${activeWorkspace._id}/messages/search`,
          { params: { q: query, channelId: activeChannel?._id } }
        );
        setResults((data.data || []).slice(0, 8));
      } catch {}
    }, 350);
  }, [query, activeWorkspace?._id, activeChannel?._id]);

  const channelName   = activeChannel?.displayName || activeChannel?.name || "";
  const memberCount   = activeChannel?.memberCount ?? 0;
  const isPrivate     = activeChannel?.type === "private";

  return (
    <div style={styles.topbar}>
      {/* Left: channel title */}
      <div style={styles.left}>
        <div style={styles.title}>
          <i className={`ti ${isPrivate ? "ti-lock" : "ti-hash"}`} style={styles.titleIcon} />
          <span>{channelName}</span>
        </div>
        {memberCount > 0 && (
          <div style={styles.memberCount}>
            <i className="ti ti-users" style={{ fontSize: 13 }} />
            <span>{memberCount}</span>
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div style={styles.actions}>
        {/* Search */}
        {searchOpen ? (
          <div style={{ position: "relative" }}>
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (!query) { setSearchOpen(false); setResults([]); } }}
              placeholder="Search messages…"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                borderRadius: 6, padding: "5px 10px",
                fontSize: 12, color: "#d0d0f0", outline: "none", width: 220,
              }}
            />
            {/* Results dropdown */}
            {results.length > 0 && (
              <div style={{
                position: "absolute", top: "110%", right: 0, width: 340,
                background: "#2a2a3e",
                border: "0.5px solid rgba(255,255,255,0.12)",
                borderRadius: 10, zIndex: 50, overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                <div style={{ padding: "6px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: 10, color: "#5050a0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {results.map((msg) => (
                  <div key={msg._id} style={{ padding: "9px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 11, color: "#5050a0", marginBottom: 3 }}>
                      {msg.sender?.displayName} · {new Date(msg.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#a0a0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ActionBtn icon="ti-search"  label="Search in channel"    onClick={() => setSearchOpen(true)} />
        )}

        <ActionBtn icon="ti-pin"          label="Pinned messages" onClick={() => {}} />

        {/* Members — opens panel */}
        <ActionBtn
          icon="ti-users"
          label="Members"
          onClick={onOpenMembers}
        />

        <ActionBtn icon="ti-info-circle"  label="Channel info"    onClick={() => {}} />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button
      style={styles.actionBtn}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}

const styles = {
  topbar: {
    height: 50, display: "flex", alignItems: "center", padding: "0 16px",
    borderBottom: "0.5px solid rgba(255,255,255,0.07)",
    flexShrink: 0, background: "#25253a", justifyContent: "space-between",
  },
  left:        { display: "flex", alignItems: "center", gap: 12 },
  title:       { fontSize: 14, fontWeight: 500, color: "#d8d8f0", display: "flex", alignItems: "center", gap: 6 },
  titleIcon:   { fontSize: 14, color: "#7070a0" },
  memberCount: { fontSize: 12, color: "#6060a0", display: "flex", alignItems: "center", gap: 4 },
  actions:     { display: "flex", gap: 4, alignItems: "center" },
  actionBtn:   {
    width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center",
    justifyContent: "center", color: "#8080a8", fontSize: 16, cursor: "pointer",
    border: "none", background: "transparent", transition: "background 0.15s, color 0.15s",
  },
};