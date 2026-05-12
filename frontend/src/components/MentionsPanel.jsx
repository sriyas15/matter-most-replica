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
      className={`px-4 py-3 border-b border-slate-100 transition-colors duration-150
        ${n.isRead ? "bg-white cursor-default hover:bg-slate-50" : "bg-blue-50 cursor-pointer hover:bg-blue-100/70"}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {/* Unread dot */}
        {!n.isRead
          ? <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
          : <div className="w-1.5 flex-shrink-0" />
        }

        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-semibold text-white overflow-hidden flex-shrink-0"
          style={{ background: actor?.avatarColor || "#2563eb" }}
        >
          {actor?.avatar
            ? <img src={actor.avatar} alt="" className="w-full h-full object-cover" />
            : actorInit}
        </div>

        <span className="text-xs font-medium text-slate-700">{actorName}</span>

        {channel && (
          <span className="text-[11px] text-slate-400">
            in <span className="text-blue-600 font-medium">#{channel}</span>
          </span>
        )}

        <span className="text-[10px] text-slate-300 ml-auto">{timeAgo(n.createdAt)}</span>
      </div>

      {/* Message preview */}
      {n.preview && (
        <div className="ml-3.5 bg-blue-50 border border-blue-100 border-l-2 border-l-blue-600 rounded-r-md px-2.5 py-1.5 text-xs text-slate-600 leading-relaxed">
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
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 w-[340px] z-50 bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Mentions</span>
              {unreadMentions > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadMentions}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Where you were @mentioned</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-lg leading-none"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-10">
              <span className="text-xs text-slate-400">Loading…</span>
            </div>
          )}

          {!loading && mentions.length === 0 && (
            <div className="text-center px-5 py-12">
              <div className="text-4xl mb-3 text-slate-300 font-bold">@</div>
              <p className="text-sm text-slate-400">No mentions yet</p>
              <p className="text-[11px] text-slate-300 mt-1">
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