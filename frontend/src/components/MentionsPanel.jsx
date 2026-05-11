import { useNotifications } from "../context/NotificationContext";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MentionRow({ n, onMarkRead }) {
  const actor     = n.actor;
  const actorName = actor?.displayName || actor?.username || "Someone";
  const actorInit = actorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const channel   = n.channel?.displayName || n.channel?.name || "";

  return (
    <div
      onClick={() => !n.isRead && onMarkRead(n._id)}
      style={{
        padding: "12px 16px",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
        background: n.isRead ? "transparent" : "rgba(93,95,232,0.07)",
        cursor: n.isRead ? "default" : "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
      onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(93,95,232,0.07)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {/* Unread dot */}
        {!n.isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5d5fe8", flexShrink: 0 }} />}
        {n.isRead  && <div style={{ width: 6, flexShrink: 0 }} />}

        {/* Avatar */}
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: actor?.avatarColor || "#5d5fe8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 600, color: "#fff", overflow: "hidden", flexShrink: 0,
        }}>
          {actor?.avatar
            ? <img src={actor.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : actorInit}
        </div>

        <span style={{ fontSize: 12, color: "#c0c0e0", fontWeight: 500 }}>{actorName}</span>
        {channel && (
          <span style={{ fontSize: 11, color: "#5050a0" }}>in <span style={{ color: "#7070b0" }}>#{channel}</span></span>
        )}
        <span style={{ fontSize: 10, color: "#40408080", marginLeft: "auto" }}>{timeAgo(n.createdAt)}</span>
      </div>

      {/* Message preview */}
      {n.preview && (
        <div style={{
          marginLeft: 14,
          background: "rgba(93,95,232,0.1)",
          border: "0.5px solid rgba(93,95,232,0.2)",
          borderLeft: "2px solid #5d5fe8",
          borderRadius: "0 6px 6px 0",
          padding: "6px 10px",
          fontSize: 12,
          color: "#a0a0c0",
          lineHeight: 1.5,
        }}>
          {n.preview}
        </div>
      )}
    </div>
  );
}

export default function MentionsPanel({ open, onClose }) {
  const { mentions, unreadMentions, loading, markRead } = useNotifications();

  if (!open) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={onClose} />

      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 340, zIndex: 50,
        background: "#1e1e2e",
        borderLeft: "0.5px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e0e0f0" }}>
              Mentions
              {unreadMentions > 0 && (
                <span style={{ marginLeft: 8, background: "#5d5fe8", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                  {unreadMentions}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#5050a0", marginTop: 2 }}>
              Where you were @mentioned
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6060a0", cursor: "pointer", fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <span style={{ fontSize: 12, color: "#5050a0" }}>Loading…</span>
            </div>
          )}

          {!loading && mentions.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>@</div>
              <p style={{ fontSize: 13, color: "#5050a0" }}>No mentions yet</p>
              <p style={{ fontSize: 11, color: "#40408080", marginTop: 4 }}>
                When someone @mentions you, it will appear here
              </p>
            </div>
          )}

          {!loading && mentions.map((n) => (
            <MentionRow key={n._id} n={n} onMarkRead={markRead} />
          ))}
        </div>
      </div>
    </>
  );
}