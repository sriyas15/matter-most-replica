import { useState, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

const STATUS_COLOR = {
  online:  "bg-emerald-500",
  away:    "bg-amber-400",
  dnd:     "bg-red-500",
  offline: "bg-slate-300",
};

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

  return (
    <div className="w-[260px] bg-white border-l border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-slate-100">
        <span className="text-sm font-medium text-slate-800 truncate">
          # {activeChannel?.displayName || activeChannel?.name}
        </span>
        <button
          className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-lg leading-none flex items-center"
          onClick={onClose}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Description */}
      {activeChannel?.description && (
        <p className="px-3.5 py-2 text-xs text-slate-500 border-b border-slate-100">
          {activeChannel.description}
        </p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {["members", "pins"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs cursor-pointer bg-transparent border-none transition-colors
              ${tab === t
                ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
              }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <p className="text-xs text-slate-400 px-3.5 py-3">Loading…</p>
        )}

        {!loading && tab === "members" && (
          <>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider px-3.5 pb-2 pt-1">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
            {members.map((m) => {
              const u = m.user || m;
              const name = u.displayName || u.username || "Unknown";
              const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={u._id} className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-slate-50 transition-colors">
                  <div
                    className="relative w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-white overflow-hidden"
                    style={{ background: u.avatarColor || "#2563eb" }}
                  >
                    {u.avatar
                      ? <img src={u.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                      : initials}
                    <div className={`absolute -bottom-px -right-px w-2 h-2 rounded-full border-2 border-white ${STATUS_COLOR[u.status || "offline"]}`} />
                  </div>
                  <div>
                    <p className="text-[13px] text-slate-700">{name}</p>
                    {m.role === "admin" && (
                      <p className="text-[10px] text-blue-500 font-medium">admin</p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {!loading && tab === "pins" && (
          <>
            {pinned.length === 0 ? (
              <p className="text-xs text-slate-400 px-3.5 py-3">No pinned messages</p>
            ) : (
              pinned.map((msg) => (
                <div
                  key={msg._id}
                  className="mx-2.5 my-1.5 bg-slate-50 rounded-lg p-2.5 border border-slate-200"
                >
                  <p className="text-[11px] text-slate-400 mb-1">
                    {msg.sender?.displayName || "Someone"} · {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{msg.text}</p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}