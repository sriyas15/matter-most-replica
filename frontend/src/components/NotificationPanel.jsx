import { useNotifications } from "../context/NotificationContext";

const TYPE_ICON = {
  mention:          { icon: "ti-at",             color: "#5d5fe8", bg: "rgba(93,95,232,0.15)" },
  direct_message:   { icon: "ti-message-circle", color: "#3db87a", bg: "rgba(61,184,122,0.15)" },
  reaction:         { icon: "ti-mood-smile",     color: "#f0a22a", bg: "rgba(240,162,42,0.15)"  },
  thread_reply:     { icon: "ti-message-2",      color: "#8b5cf6", bg: "rgba(139,92,246,0.15)"  },
  channel_invite:   { icon: "ti-door-enter",     color: "#06b6d4", bg: "rgba(6,182,212,0.15)"   },
  workspace_invite: { icon: "ti-building",       color: "#10b981", bg: "rgba(16,185,129,0.15)"  },
  system:           { icon: "ti-info-circle",    color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifRow({ n, onMarkRead, onDelete }) {
  const meta    = TYPE_ICON[n.type] || TYPE_ICON.system;
  const actor   = n.actor;
  const actorName = actor?.displayName || actor?.username || "Someone";
  const actorInit = actorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const channelName = n.channel?.displayName || n.channel?.name || "";

  const label = {
    mention:          `${actorName} mentioned you${channelName ? ` in #${channelName}` : ""}`,
    direct_message:   `${actorName} sent you a message`,
    reaction:         `${actorName} reacted to your message`,
    thread_reply:     `${actorName} replied in a thread`,
    channel_invite:   `You were invited to #${channelName}`,
    workspace_invite: `${actorName} invited you to a workspace`,
    system:           "System notification",
  }[n.type] || "New notification";

  return (
    <div
      style={{
        display: "flex", gap: 10, padding: "10px 16px",
        background: n.isRead ? "transparent" : "rgba(93,95,232,0.06)",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
        transition: "background 0.15s",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={() => !n.isRead && onMarkRead(n._id)}
      onMouseEnter={(e) => e.currentTarget.style.background = n.isRead ? "rgba(255,255,255,0.03)" : "rgba(93,95,232,0.1)"}
      onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(93,95,232,0.06)"}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5d5fe8", flexShrink: 0, marginTop: 6 }} />
      )}
      {n.isRead && <div style={{ width: 6, flexShrink: 0 }} />}

      {/* Type icon or actor avatar */}
      <div style={{ flexShrink: 0 }}>
        {actor ? (
          <div style={{ position: "relative" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: actor.avatarColor || "#5d5fe8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden",
            }}>
              {actor.avatar
                ? <img src={actor.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : actorInit}
            </div>
            {/* Type badge */}
            <div style={{
              position: "absolute", bottom: -3, right: -3,
              width: 16, height: 16, borderRadius: "50%",
              background: meta.bg, border: "1.5px solid #1e1e2e",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className={`ti ${meta.icon}`} style={{ fontSize: 9, color: meta.color }} />
            </div>
          </div>
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={`ti ${meta.icon}`} style={{ fontSize: 16, color: meta.color }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: n.isRead ? "#8080a8" : "#d0d0f0", lineHeight: 1.4, marginBottom: 3 }}>
          {label}
        </div>
        {n.preview && (
          <div style={{
            fontSize: 11, color: "#5050a0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            background: "rgba(255,255,255,0.04)", borderRadius: 4,
            padding: "2px 6px", marginBottom: 4,
          }}>
            "{n.preview}"
          </div>
        )}
        <div style={{ fontSize: 10, color: "#4040a0" }}>{timeAgo(n.createdAt)}</div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(n._id); }}
        style={{ background: "none", border: "none", color: "#4040a0", cursor: "pointer", fontSize: 14, opacity: 0, transition: "opacity 0.15s", padding: "2px 4px", borderRadius: 4, alignSelf: "flex-start" }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
        title="Dismiss"
      >
        <i className="ti ti-x" />
      </button>
    </div>
  );
}

export default function NotificationPanel({ open, onClose }) {
  const { notifications, unreadCount, loading, markRead, markAllRead, deleteOne } = useNotifications();

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
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, background: "#5d5fe8", color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#8080a8", cursor: "pointer" }}
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6060a0", cursor: "pointer", fontSize: 18 }}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <span style={{ fontSize: 12, color: "#5050a0" }}>Loading…</span>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
              <p style={{ fontSize: 13, color: "#5050a0" }}>You're all caught up!</p>
              <p style={{ fontSize: 11, color: "#40408080", marginTop: 4 }}>No notifications yet</p>
            </div>
          )}

          {!loading && notifications.map((n) => (
            <NotifRow key={n._id} n={n} onMarkRead={markRead} onDelete={deleteOne} />
          ))}
        </div>
      </div>
    </>
  );
}