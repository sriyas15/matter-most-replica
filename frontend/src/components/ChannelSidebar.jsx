import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useDM } from "../context/DMContext";
import { getSocket } from "../lib/socket/socket";
import api from "../lib/api";
import CreateChannelModal from "./CreateChannelModal";
import NewDMModal from "./NewDMModal";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import MembersPanel from "./MembersPanel";

const STATUS_COLOR = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
  dnd: "bg-red-500",
  offline: "bg-slate-400",
};

// ── Workspace Settings Modal ──────────────────────────────────────────────────
function WorkspaceSettingsModal({ onClose }) {
  const { activeWorkspace, selectWorkspace } = useWorkspace();
  const [form, setForm] = useState({
    name: activeWorkspace?.name || "",
    description: activeWorkspace?.description || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); };

  const handleSave = async () => {
    setError(""); setLoading(true);
    try {
      const { data } = await api.patch(`/workspaces/${activeWorkspace._id}`, {
        name: form.name,
        description: form.description,
      });
      selectWorkspace(data.data || { ...activeWorkspace, ...form });
      flash("Workspace updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300]" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[15px] font-semibold text-slate-800">Team Settings</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-md hover:bg-slate-100 transition-colors">
            <i className="ti ti-x" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg px-3 py-2 text-xs mb-4">✓ {success}</div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white overflow-hidden"
            style={{ background: activeWorkspace?.themeColor || "#2563eb" }}
          >
            {activeWorkspace?.logo
              ? <img src={activeWorkspace.logo} alt="" className="w-full h-full object-cover" />
              : (activeWorkspace?.name || "W").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{activeWorkspace?.name}</div>
            <div className="text-xs text-blue-600">/{activeWorkspace?.slug}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs font-medium text-slate-500">Workspace Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Acme Inc."
            maxLength={64}
          />
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-xs font-medium text-slate-500">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none leading-relaxed"
            placeholder="What does this workspace do?"
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !form.name.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Leave Team confirmation modal ─────────────────────────────────────────────
function LeaveWorkspaceModal({ onClose }) {
  const { activeWorkspace, workspaces, selectWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLeave = async () => {
    setLoading(true); setError("");
    try {
      await api.delete(`/workspaces/${activeWorkspace._id}/leave`);
      const remaining = workspaces.filter((w) => w._id !== activeWorkspace._id);
      selectWorkspace(remaining[0] || null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave workspace");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300]" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[15px] font-semibold text-slate-800">Leave Team</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-md hover:bg-slate-100 transition-colors">
            <i className="ti ti-x" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs mb-4">{error}</div>
        )}

        <div className="flex flex-col items-center gap-3 py-4 pb-5">
          <div className="w-13 h-13 rounded-full bg-red-50 flex items-center justify-center">
            <i className="ti ti-door-exit text-2xl text-red-500" />
          </div>
          <p className="text-sm text-slate-600 text-center leading-relaxed">
            Are you sure you want to leave{" "}
            <strong className="text-slate-800">{activeWorkspace?.name}</strong>?
            <br />
            <span className="text-xs text-slate-400">You'll need an invite to rejoin.</span>
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
            Cancel
          </button>
          <button
            onClick={handleLeave}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors font-medium"
          >
            {loading ? "Leaving…" : "Leave Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Workspace name dropdown ───────────────────────────────────────────────────
function WorkspaceDropdown({ onClose, onCreateTeam, onMembers, onSettings, onLeave }) {
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const items = [
    { icon: "ti-users",      label: "Members",      action: onMembers,    danger: false },
    { icon: "ti-plus",       label: "Create Team",  action: onCreateTeam, danger: false },
    { divider: true },
    { icon: "ti-settings",   label: "Team Settings",action: onSettings,   danger: false },
    { divider: true },
    { icon: "ti-door-exit",  label: "Leave Team",   action: onLeave,      danger: true  },
  ];

  return (
    <div
      ref={ref}
      className="absolute top-[calc(100%+4px)] left-3 right-3 bg-white border border-slate-200 rounded-xl z-[200] shadow-xl overflow-hidden"
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="h-px bg-slate-100 my-0.5" />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium bg-transparent border-none cursor-pointer text-left transition-colors hover:bg-slate-50 ${
              item.danger ? "text-red-500" : "text-slate-600"
            }`}
          >
            <i className={`ti ${item.icon} text-[15px] w-4.5 text-center`} />
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, collapsed, onToggle, onAdd }) {
  return (
    <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 uppercase tracking-widest cursor-pointer bg-transparent border-none flex-1 text-left hover:text-blue-700 transition-colors"
      >
        <i className={`ti ti-chevron-${collapsed ? "right" : "down"} text-[10px]`} />
        {title}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          className="w-5 h-5 rounded flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-50 text-sm border-none bg-transparent cursor-pointer transition-colors"
        >
          <i className="ti ti-plus" />
        </button>
      )}
    </div>
  );
}

// ── Channel row ───────────────────────────────────────────────────────────────
function ChannelItem({ channel, active, onClick, unread }) {
  const [hovered, setHovered] = useState(false);
  const { activeWorkspace, updateChannel } = useWorkspace();

  const handleFavorite = async (e) => {
    e.stopPropagation();
    try {
      await api.patch(`/workspaces/${activeWorkspace._id}/channels/${channel._id}/me`, {
        isFavorited: !channel.isFavorited,
      });
      updateChannel({ ...channel, isFavorited: !channel.isFavorited });
    } catch {}
  };

  const handleMute = async (e) => {
    e.stopPropagation();
    try {
      await api.patch(`/workspaces/${activeWorkspace._id}/channels/${channel._id}/me`, {
        isMuted: !channel.isMuted,
      });
      updateChannel({ ...channel, isMuted: !channel.isMuted });
    } catch {}
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-2 px-3 py-1 mx-1.5 rounded-md cursor-pointer transition-colors ${
        active ? "bg-blue-50" : "hover:bg-slate-50"
      }`}
    >
      <span className="text-sm text-blue-500 w-4 text-center flex-shrink-0">
        <i className={`ti ${channel.type === "private" ? "ti-lock" : "ti-hash"}`} />
      </span>
      <span
        className={`text-[13px] flex-1 truncate transition-colors ${
          active
            ? "text-blue-600 font-semibold"
            : unread > 0
            ? "text-blue-600 font-medium"
            : "text-slate-500"
        }`}
      >
        {channel.displayName || channel.name}
      </span>

      {hovered && !active && (
        <div className="flex gap-0.5 ml-auto">
          <button
            onClick={handleFavorite}
            title={channel.isFavorited ? "Unfavorite" : "Favorite"}
            className="w-4.5 h-4.5 flex items-center justify-center bg-transparent border-none cursor-pointer rounded p-0"
          >
            <i
              className={`ti ${channel.isFavorited ? "ti-star-filled" : "ti-star"} text-[11px] ${
                channel.isFavorited ? "text-amber-400" : "text-slate-400 hover:text-amber-400"
              }`}
            />
          </button>
          <button
            onClick={handleMute}
            title={channel.isMuted ? "Unmute" : "Mute"}
            className="w-4.5 h-4.5 flex items-center justify-center bg-transparent border-none cursor-pointer rounded p-0"
          >
            <i className={`ti ${channel.isMuted ? "ti-bell-off" : "ti-bell"} text-[11px] text-slate-400 hover:text-blue-500`} />
          </button>
        </div>
      )}

      {!hovered && unread > 0 && (
        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </div>
  );
}

// ── DM row ────────────────────────────────────────────────────────────────────
function DMItem({ dm, active, onClick }) {
  const { user: me } = useAuth();
  const { dmUnread } = useDM();

  const other =
    dm.participants?.find((p) => (p.user?._id || p.user) !== me?._id)?.user || {};

  const name = other.displayName || other.username || "Unknown";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const unread = dmUnread[dm._id] || 0;
  const statusClass = STATUS_COLOR[other.status || "offline"];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1 mx-1.5 rounded-md cursor-pointer transition-colors ${
        active ? "bg-blue-50" : "hover:bg-slate-50"
      }`}
    >
      <div
        className="w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center text-[9px] font-medium text-white relative overflow-visible"
        style={{ background: other.avatarColor || "#2563eb" }}
      >
        {other.avatar ? (
          <img src={other.avatar} alt="" className="w-full h-full rounded object-cover" />
        ) : (
          initials
        )}
        <div
          className={`w-1.5 h-1.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${statusClass}`}
        />
      </div>
      <span
        className={`text-[13px] flex-1 truncate ${
          active
            ? "text-blue-600 font-semibold"
            : unread > 0
            ? "text-blue-600 font-medium"
            : "text-slate-500"
        }`}
      >
        {name}
      </span>
      {unread > 0 && (
        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function ChannelSidebar() {
  const { user } = useAuth();
  const { activeWorkspace, channels, activeChannel, selectChannel } = useWorkspace();
  const { dms, activeDM, selectDM, openDMWithUser, totalDMUnread } = useDM();

  const [collapsed, setCollapsed] = useState({});
  const [unreadMap, setUnreadMap] = useState({});
  const [search, setSearch] = useState("");
  const [showCreateChannel, setShowCC] = useState(false);
  const [showNewDM, setShowDM] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const toggle = (key) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  // Socket: track channel unread
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (msg) => {
      if (msg.channel === activeChannel?._id) return;
      const isDMChannel = dms.some((d) => (d.channel?._id || d.channel) === msg.channel);
      if (!isDMChannel) {
        setUnreadMap((p) => ({ ...p, [msg.channel]: (p[msg.channel] || 0) + 1 }));
      }
    };
    socket.on("new:message", onNew);
    socket.on("message:new", onNew);
    return () => { socket.off("new:message", onNew); socket.off("message:new", onNew); };
  }, [activeChannel?._id, dms]);

  const handleSelectChannel = (ch) => {
    selectChannel(ch);
    setUnreadMap((p) => ({ ...p, [ch._id]: 0 }));
    if (activeWorkspace)
      api.patch(`/workspaces/${activeWorkspace._id}/channels/${ch._id}/read`).catch(() => {});
  };

  const publicChannels = channels.filter((c) => ["public", "private"].includes(c.type));
  const favoriteChannels = channels.filter((c) => c.isFavorited);
  const filtered = search.trim()
    ? publicChannels.filter((c) =>
        (c.displayName || c.name).toLowerCase().includes(search.toLowerCase())
      )
    : publicChannels;

  return (
    <>
      <div className="w-[240px] bg-white flex flex-col border-r border-slate-200 h-screen flex-shrink-0">

        {/* ── Header ── */}
        <div className="px-3.5 py-3 flex items-center justify-between border-b border-slate-100 relative">
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-1.5 flex-1 min-w-0 bg-transparent border-none cursor-pointer p-0 text-left"
          >
            <span className="text-[14px] font-semibold text-slate-800 flex-1 truncate">
              {activeWorkspace?.name || "Loading…"}
            </span>
            <i
              className={`ti ti-chevron-down text-[13px] text-blue-500 flex-shrink-0 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="flex gap-1 flex-shrink-0 ml-2">
            <button
              onClick={() => setShowCC(true)}
              title="New Channel"
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-[15px] border-none bg-transparent cursor-pointer transition-colors"
            >
              <i className="ti ti-plus" />
            </button>
          </div>

          {dropdownOpen && (
            <WorkspaceDropdown
              onClose={() => setDropdownOpen(false)}
              onCreateTeam={() => setShowCreateTeam(true)}
              onMembers={() => setShowMembers(true)}
              onSettings={() => setShowSettings(true)}
              onLeave={() => setShowLeave(true)}
            />
          )}
        </div>

        {/* ── Search ── */}
        <div className="mx-2.5 my-2 relative">
          <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-blue-400 pointer-events-none" />
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-7 pr-7 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 box-border"
            placeholder="Find channels, people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-400 hover:text-slate-600 cursor-pointer text-xs leading-none p-0"
            >
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <div className="flex-1 overflow-y-auto py-1">

          {/* Favorites */}
          {favoriteChannels.length > 0 && (
            <div className="mb-1">
              <SectionHeader
                title="Favorites"
                collapsed={collapsed.favorites}
                onToggle={() => toggle("favorites")}
              />
              {!collapsed.favorites &&
                favoriteChannels.map((ch) => (
                  <ChannelItem
                    key={ch._id}
                    channel={ch}
                    active={activeChannel?._id === ch._id}
                    unread={unreadMap[ch._id] || 0}
                    onClick={() => handleSelectChannel(ch)}
                  />
                ))}
            </div>
          )}

          {/* Channels */}
          <div className="mb-1">
            <SectionHeader
              title="Channels"
              collapsed={collapsed.channels}
              onToggle={() => toggle("channels")}
              onAdd={() => setShowCC(true)}
            />
            {!collapsed.channels &&
              filtered.map((ch) => (
                <ChannelItem
                  key={ch._id}
                  channel={ch}
                  active={activeChannel?._id === ch._id}
                  unread={unreadMap[ch._id] || 0}
                  onClick={() => handleSelectChannel(ch)}
                />
              ))}
            {!collapsed.channels && filtered.length === 0 && search && (
              <p className="text-xs text-slate-400 px-4 py-1">No channels found</p>
            )}
          </div>

          {/* Direct Messages */}
          <div className="mb-1">
            <SectionHeader
              title={totalDMUnread > 0 ? `Direct Messages · ${totalDMUnread}` : "Direct Messages"}
              collapsed={collapsed.dms}
              onToggle={() => toggle("dms")}
              onAdd={() => setShowDM(true)}
            />
            {!collapsed.dms &&
              dms.map((dm) => (
                <DMItem
                  key={dm._id}
                  dm={dm}
                  active={activeDM?._id === dm._id}
                  onClick={() => selectDM(dm)}
                />
              ))}
            {!collapsed.dms && dms.length === 0 && (
              <p className="text-xs text-slate-400 px-4 py-1">
                No direct messages yet.{" "}
                <button
                  onClick={() => setShowDM(true)}
                  className="bg-transparent border-none text-blue-500 hover:text-blue-700 cursor-pointer text-xs p-0 underline"
                >
                  Start one
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateChannel && <CreateChannelModal open onClose={() => setShowCC(false)} />}
      {showNewDM && <NewDMModal open onClose={() => setShowDM(false)} />}
      {showCreateTeam && <CreateWorkspaceModal open onClose={() => setShowCreateTeam(false)} />}
      {showSettings && <WorkspaceSettingsModal onClose={() => setShowSettings(false)} />}
      {showLeave && <LeaveWorkspaceModal onClose={() => setShowLeave(false)} />}
      {showMembers && (
        <MembersPanel
          open={showMembers}
          onClose={() => setShowMembers(false)}
          onOpenDM={(targetUser) => {
            setShowMembers(false);
            openDMWithUser(targetUser);
          }}
        />
      )}
    </>
  );
}