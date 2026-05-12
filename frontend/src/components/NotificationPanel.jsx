import { useNotifications } from "../context/NotificationContext";

const TYPE_ICON = {
  mention:          { icon: "ti-at",             color: "text-blue-600",   bg: "bg-blue-100"   },
  direct_message:   { icon: "ti-message-circle", color: "text-emerald-600",bg: "bg-emerald-100"},
  reaction:         { icon: "ti-mood-smile",      color: "text-amber-500",  bg: "bg-amber-100"  },
  thread_reply:     { icon: "ti-message-2",       color: "text-violet-600", bg: "bg-violet-100" },
  channel_invite:   { icon: "ti-door-enter",      color: "text-cyan-600",   bg: "bg-cyan-100"   },
  workspace_invite: { icon: "ti-building",        color: "text-teal-600",   bg: "bg-teal-100"   },
  system:           { icon: "ti-info-circle",     color: "text-slate-500",  bg: "bg-slate-100"  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifRow({ n, onMarkRead, onDelete }) {
  const meta = TYPE_ICON[n.type] || TYPE_ICON.system;
  const actor = n.actor;
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
      className={`group flex gap-2.5 px-4 py-2.5 border-b border-slate-100 cursor-pointer transition-colors duration-150
        ${n.isRead ? "bg-white hover:bg-slate-50" : "bg-blue-50 hover:bg-blue-100/70"}`}
      onClick={() => !n.isRead && onMarkRead(n._id)}
    >
      {/* Unread dot */}
      {!n.isRead
        ? <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
        : <div className="w-1.5 flex-shrink-0" />
      }

      {/* Avatar / icon */}
      <div className="flex-shrink-0">
        {actor ? (
          <div className="relative">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white overflow-hidden"
              style={{ background: actor.avatarColor || "#2563eb" }}
            >
              {actor.avatar
                ? <img src={actor.avatar} alt="" className="w-full h-full object-cover" />
                : actorInit}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${meta.bg} border-2 border-white flex items-center justify-center`}>
              <i className={`ti ${meta.icon} text-[9px] ${meta.color}`} />
            </div>
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
            <i className={`ti ${meta.icon} text-base ${meta.color}`} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug mb-0.5 ${n.isRead ? "text-slate-500" : "text-slate-800"}`}>
          {label}
        </p>
        {n.preview && (
          <p className="text-[11px] text-slate-400 truncate bg-slate-100 rounded px-1.5 py-0.5 mb-1">
            "{n.preview}"
          </p>
        )}
        <p className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(n._id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity self-start text-slate-400 hover:text-red-500 p-0.5 rounded text-sm bg-transparent border-none cursor-pointer"
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
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 w-[340px] z-50 bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-600 text-slate-800 font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] text-slate-500 cursor-pointer transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-lg leading-none"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-10">
              <span className="text-xs text-slate-400">Loading…</span>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center px-5 py-12">
              <div className="text-4xl mb-3">🔔</div>
              <p className="text-sm text-slate-400">You're all caught up!</p>
              <p className="text-[11px] text-slate-300 mt-1">No notifications yet</p>
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