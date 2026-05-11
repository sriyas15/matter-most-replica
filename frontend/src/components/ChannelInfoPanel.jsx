import { useState, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

export default function ChannelInfoPanel({ onClose }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [tab, setTab]         = useState("members"); // members | pins
  const [members, setMembers] = useState([]);
  const [pinned, setPinned]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeChannel || !activeWorkspace) return;
    setLoading(true);
    api
      .get(`/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}`)
      .then(({ data }) => {
        setMembers(data.data.members || []);
        setPinned(data.data.pinnedMessages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeChannel?._id, activeWorkspace?._id]);

  const statusColors = { online: "#3db87a", away: "#f0a22a", dnd: "#e53e3e", offline: "#6060a0" };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>
          # {activeChannel?.displayName || activeChannel?.name}
        </span>
        <button style={styles.closeBtn} onClick={onClose}>
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Description */}
      {activeChannel?.description && (
        <p style={styles.desc}>{activeChannel.description}</p>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {["members", "pins"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.body}>
        {loading && <p style={styles.hint}>Loading…</p>}

        {!loading && tab === "members" && (
          <>
            <p style={styles.count}>{members.length} member{members.length !== 1 ? "s" : ""}</p>
            {members.map((m) => {
              const u = m.user || m;
              const name = u.displayName || u.username || "Unknown";
              const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={u._id} style={styles.memberRow}>
                  <div style={{ ...styles.avatar, background: u.avatarColor || "#5d5fe8" }}>
                    {u.avatar
                      ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 6, objectFit: "cover" }} />
                      : initials}
                    <div style={{ ...styles.statusDot, background: statusColors[u.status || "offline"] }} />
                  </div>
                  <div>
                    <div style={styles.memberName}>{name}</div>
                    {m.role === "admin" && (
                      <div style={styles.roleBadge}>admin</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {!loading && tab === "pins" && (
          <>
            {pinned.length === 0
              ? <p style={styles.hint}>No pinned messages</p>
              : pinned.map((msg) => (
                  <div key={msg._id} style={styles.pinCard}>
                    <div style={styles.pinMeta}>
                      {msg.sender?.displayName || "Someone"} · {new Date(msg.createdAt).toLocaleDateString()}
                    </div>
                    <div style={styles.pinText}>{msg.text}</div>
                  </div>
                ))}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  panel:     { width: 260, background: "#1e1e2e", borderLeft: "0.5px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", height: "100%", flexShrink: 0 },
  header:    { padding: "14px 14px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(255,255,255,0.07)" },
  title:     { fontSize: 14, fontWeight: 500, color: "#d8d8f0" },
  closeBtn:  { background: "transparent", border: "none", color: "#6060a0", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center" },
  desc:      { padding: "8px 14px", fontSize: 12, color: "#7070a0", borderBottom: "0.5px solid rgba(255,255,255,0.06)" },
  tabs:      { display: "flex", borderBottom: "0.5px solid rgba(255,255,255,0.07)" },
  tab:       { flex: 1, padding: "10px", fontSize: 12, color: "#7070a0", background: "transparent", border: "none", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#a0a0f8", borderBottom: "2px solid #5d5fe8" },
  body:      { flex: 1, overflowY: "auto", padding: "8px 0" },
  count:     { fontSize: 11, color: "#5050a0", padding: "4px 14px 8px", textTransform: "uppercase", letterSpacing: "0.05em" },
  memberRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 14px" },
  avatar:    { width: 28, height: 28, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff", position: "relative", overflow: "hidden" },
  statusDot: { width: 7, height: 7, borderRadius: "50%", position: "absolute", bottom: -1, right: -1, border: "1.5px solid #1e1e2e" },
  memberName:{ fontSize: 13, color: "#c0c0d8" },
  roleBadge: { fontSize: 10, color: "#7070a8", marginTop: 1 },
  hint:      { fontSize: 12, color: "#5050a0", padding: "12px 14px" },
  pinCard:   { margin: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px", border: "0.5px solid rgba(255,255,255,0.07)" },
  pinMeta:   { fontSize: 11, color: "#6060a0", marginBottom: 4 },
  pinText:   { fontSize: 12, color: "#a0a0c0", lineHeight: 1.5 },
};