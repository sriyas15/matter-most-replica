import { useState, useRef, useEffect } from "react";
import { useWorkspace }         from "../context/WorkspaceContext";
import { useAuth }              from "../context/AuthContext";
import { useDM }                from "../context/DMContext";
import { getSocket }            from "../lib/socket/socket";
import api                      from "../lib/api";
import CreateChannelModal       from "./CreateChannelModal";
import NewDMModal               from "./NewDMModal";
import CreateWorkspaceModal     from "./CreateWorkspaceModal";
import MembersPanel             from "./MembersPanel";

const STATUS_COLOR = { online: "#3db87a", away: "#f0a22a", dnd: "#e53e3e", offline: "#6060a0" };

// ── Workspace Settings Modal ──────────────────────────────────────────────────
function WorkspaceSettingsModal({ onClose }) {
  const { activeWorkspace, selectWorkspace, workspaces } = useWorkspace();
  const [form, setForm] = useState({
    name:        activeWorkspace?.name        || "",
    description: activeWorkspace?.description || "",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); };

  const handleSave = async () => {
    setError(""); setLoading(true);
    try {
      const { data } = await api.patch(`/workspaces/${activeWorkspace._id}`, {
        name:        form.name,
        description: form.description,
      });
      // Refresh active workspace in context with updated data
      selectWorkspace(data.data || { ...activeWorkspace, ...form });
      flash("Workspace updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally { setLoading(false); }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#e0e0f0" }}>Team Settings</span>
          <button onClick={onClose} style={closeBtnStyle}><i className="ti ti-x" /></button>
        </div>

        {error   && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>✓ {success}</div>}

        {/* Workspace icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: activeWorkspace?.themeColor || "#5d5fe8",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
          }}>
            {activeWorkspace?.logo
              ? <img src={activeWorkspace.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              : (activeWorkspace?.name || "W").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#d8d8f0" }}>{activeWorkspace?.name}</div>
            <div style={{ fontSize: 11, color: "#5050a0" }}>/{activeWorkspace?.slug}</div>
          </div>
        </div>

        {/* Name */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Workspace Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={inputStyle}
            placeholder="Acme Inc."
            maxLength={64}
          />
        </div>

        {/* Description */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Description <span style={{ color: "#4040a0" }}>(optional)</span></label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
            placeholder="What does this workspace do?"
            rows={2}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} disabled={loading || !form.name.trim()} style={submitBtnStyle}>
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
  const [error, setError]     = useState("");

  const handleLeave = async () => {
    setLoading(true); setError("");
    try {
      await api.delete(`/workspaces/${activeWorkspace._id}/leave`);
      // Switch to another workspace or clear
      const remaining = workspaces.filter((w) => w._id !== activeWorkspace._id);
      selectWorkspace(remaining[0] || null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave workspace");
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#e0e0f0" }}>Leave Team</span>
          <button onClick={onClose} style={closeBtnStyle}><i className="ti ti-x" /></button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {/* Warning icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 0 20px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-door-exit" style={{ fontSize: 24, color: "#f87171" }} />
          </div>
          <p style={{ fontSize: 13, color: "#c0c0d8", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            Are you sure you want to leave <strong style={{ color: "#e0e0f0" }}>{activeWorkspace?.name}</strong>?
            <br />
            <span style={{ fontSize: 12, color: "#6060a0" }}>You'll need an invite to rejoin.</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={handleLeave}
            disabled={loading}
            style={{ ...submitBtnStyle, background: "#e53e3e" }}
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

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const items = [
    { icon: "ti-users",       label: "Members",        action: onMembers,    color: "#a0a0c0" },
    { icon: "ti-plus",        label: "Create Team",    action: onCreateTeam, color: "#a0a0c0" },
    { divider: true },
    { icon: "ti-settings",   label: "Team Settings",  action: onSettings,   color: "#a0a0c0" },
    { divider: true },
    { icon: "ti-door-exit",  label: "Leave Team",     action: onLeave,      color: "#f87171" },
  ];

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 4px)", left: 12, right: 12,
      background: "#2a2a3e",
      border: "0.5px solid rgba(255,255,255,0.12)",
      borderRadius: 10, zIndex: 200,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      overflow: "hidden",
    }}>
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} style={{ height: 0.5, background: "rgba(255,255,255,0.07)", margin: "2px 0" }} />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 9,
              padding: "9px 12px", background: "transparent", border: "none",
              color: item.color, fontSize: 13, cursor: "pointer", textAlign: "left",
              transition: "background 0.12s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 15, width: 18, textAlign: "center" }} />
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
    <div style={S.sectionHeader}>
      <div style={S.sectionTitle} onClick={onToggle}>
        <i className={`ti ti-chevron-${collapsed ? "right" : "down"}`} style={{ fontSize: 11 }} />
        {title}
      </div>
      {onAdd && (
        <button style={S.sectionAdd} onClick={onAdd}>
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
      await api.patch(`/workspaces/${activeWorkspace._id}/channels/${channel._id}/me`, { isFavorited: !channel.isFavorited });
      updateChannel({ ...channel, isFavorited: !channel.isFavorited });
    } catch {}
  };

  const handleMute = async (e) => {
    e.stopPropagation();
    try {
      await api.patch(`/workspaces/${activeWorkspace._id}/channels/${channel._id}/me`, { isMuted: !channel.isMuted });
      updateChannel({ ...channel, isMuted: !channel.isMuted });
    } catch {}
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...S.channelItem, ...(active ? S.channelActive : {}) }}
    >
      <span style={S.chIcon}>
        <i className={`ti ${channel.type === "private" ? "ti-lock" : "ti-hash"}`} />
      </span>
      <span style={{ ...S.chName, ...(active ? S.chNameActive : {}), ...(unread > 0 ? { color: "#d8d8f8", fontWeight: 500 } : {}) }}>
        {channel.displayName || channel.name}
      </span>

      {hovered && !active && (
        <div style={{ display: "flex", gap: 1, marginLeft: "auto" }}>
          <button onClick={handleFavorite} title={channel.isFavorited ? "Unfavorite" : "Favorite"} style={S.miniBtn}>
            <i className={`ti ${channel.isFavorited ? "ti-star-filled" : "ti-star"}`} style={{ fontSize: 11, color: channel.isFavorited ? "#f0a22a" : "#6060a0" }} />
          </button>
          <button onClick={handleMute} title={channel.isMuted ? "Unmute" : "Mute"} style={S.miniBtn}>
            <i className={`ti ${channel.isMuted ? "ti-bell-off" : "ti-bell"}`} style={{ fontSize: 11, color: "#6060a0" }} />
          </button>
        </div>
      )}

      {!hovered && unread > 0 && <span style={S.chBadge}>{unread > 99 ? "99+" : unread}</span>}
    </div>
  );
}

// ── DM row ────────────────────────────────────────────────────────────────────
function DMItem({ dm, active, onClick }) {
  const { user: me } = useAuth();
  const { dmUnread } = useDM();

  const other = dm.participants?.find(
    (p) => (p.user?._id || p.user) !== me?._id
  )?.user || {};

  const name     = other.displayName || other.username || "Unknown";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const unread   = dmUnread[dm._id] || 0;

  return (
    <div onClick={onClick} style={{ ...S.channelItem, ...(active ? S.channelActive : {}) }}>
      <div style={{ ...S.dmAvatar, background: other.avatarColor || "#5d5fe8" }}>
        {other.avatar
          ? <img src={other.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 4, objectFit: "cover" }} />
          : initials}
        <div style={{ ...S.dmStatus, background: STATUS_COLOR[other.status || "offline"] }} />
      </div>
      <span style={{ ...S.chName, ...(active ? S.chNameActive : {}), ...(unread > 0 ? { color: "#d8d8f8", fontWeight: 500 } : {}) }}>
        {name}
      </span>
      {unread > 0 && <span style={S.chBadge}>{unread > 99 ? "99+" : unread}</span>}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function ChannelSidebar() {
  const { user }                                                       = useAuth();
  const { activeWorkspace, channels, activeChannel, selectChannel }    = useWorkspace();
  const { dms, activeDM, selectDM, openDMWithUser, totalDMUnread }     = useDM();

  const [collapsed, setCollapsed]       = useState({});
  const [unreadMap, setUnreadMap]       = useState({});
  const [search, setSearch]             = useState("");
  const [showCreateChannel, setShowCC]  = useState(false);
  const [showNewDM, setShowDM]          = useState(false);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showMembers, setShowMembers]       = useState(false);
  const [showSettings, setShowSettings]     = useState(false);
  const [showLeave, setShowLeave]           = useState(false);

  const headerRef = useRef(null);

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

  const publicChannels   = channels.filter((c) => ["public", "private"].includes(c.type));
  const favoriteChannels = channels.filter((c) => c.isFavorited);
  const filtered         = search.trim()
    ? publicChannels.filter((c) => (c.displayName || c.name).toLowerCase().includes(search.toLowerCase()))
    : publicChannels;

  return (
    <>
      <div style={S.sidebar}>
        {/* ── Header with dropdown ── */}
        <div ref={headerRef} style={{ ...S.header, position: "relative" }}>
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            style={{
              ...S.workspaceName,
              background: "none", border: "none", cursor: "pointer",
              padding: 0, fontFamily: "inherit",
              color: dropdownOpen ? "#c0c0f8" : undefined,
            }}
          >
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeWorkspace?.name || "Loading…"}
            </span>
            <i
              className="ti ti-chevron-down"
              style={{
                fontSize: 13, color: "#7070a0", flexShrink: 0,
                transition: "transform 0.2s",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          <div style={S.headerActions}>
            <button style={S.headerBtn} title="New Channel" onClick={() => setShowCC(true)}>
              <i className="ti ti-plus" />
            </button>
          </div>

          {/* Dropdown */}
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

        {/* Search */}
        <div style={S.searchWrap}>
          <i className="ti ti-search" style={S.searchIcon} />
          <input
            style={S.searchInput}
            placeholder="Find channels, people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6060a0", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        {/* Nav */}
        <div style={S.nav}>
          {favoriteChannels.length > 0 && (
            <div style={S.section}>
              <SectionHeader title="FAVORITES" collapsed={collapsed.favorites} onToggle={() => toggle("favorites")} />
              {!collapsed.favorites && favoriteChannels.map((ch) => (
                <ChannelItem key={ch._id} channel={ch} active={activeChannel?._id === ch._id}
                  unread={unreadMap[ch._id] || 0} onClick={() => handleSelectChannel(ch)} />
              ))}
            </div>
          )}

          <div style={S.section}>
            <SectionHeader title="CHANNELS" collapsed={collapsed.channels} onToggle={() => toggle("channels")} onAdd={() => setShowCC(true)} />
            {!collapsed.channels && filtered.map((ch) => (
              <ChannelItem key={ch._id} channel={ch} active={activeChannel?._id === ch._id}
                unread={unreadMap[ch._id] || 0} onClick={() => handleSelectChannel(ch)} />
            ))}
            {!collapsed.channels && filtered.length === 0 && search && (
              <p style={{ fontSize: 12, color: "#5050a0", padding: "4px 18px" }}>No channels found</p>
            )}
          </div>

          <div style={S.section}>
            <SectionHeader
              title={totalDMUnread > 0 ? `DIRECT MESSAGES · ${totalDMUnread}` : "DIRECT MESSAGES"}
              collapsed={collapsed.dms}
              onToggle={() => toggle("dms")}
              onAdd={() => setShowDM(true)}
            />
            {!collapsed.dms && dms.map((dm) => (
              <DMItem key={dm._id} dm={dm} active={activeDM?._id === dm._id} onClick={() => selectDM(dm)} />
            ))}
            {!collapsed.dms && dms.length === 0 && (
              <p style={{ fontSize: 12, color: "#5050a0", padding: "4px 18px 8px" }}>
                No direct messages yet.{" "}
                <button onClick={() => setShowDM(true)} style={{ background: "none", border: "none", color: "#7070e8", cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>
                  Start one
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateChannel && <CreateChannelModal open onClose={() => setShowCC(false)} />}
      {showNewDM         && <NewDMModal         open onClose={() => setShowDM(false)} />}
      {showCreateTeam    && <CreateWorkspaceModal open onClose={() => setShowCreateTeam(false)} />}
      {showSettings      && <WorkspaceSettingsModal onClose={() => setShowSettings(false)} />}
      {showLeave         && <LeaveWorkspaceModal    onClose={() => setShowLeave(false)} />}

      {/* Members panel — slides in from right */}
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

// ── Shared modal styles ───────────────────────────────────────────────────────
const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 300, backdropFilter: "blur(4px)",
};
const modalStyle = {
  background: "#1e1e2e", border: "0.5px solid rgba(255,255,255,0.12)",
  borderRadius: 12, width: "100%", padding: 24,
  boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
};
const modalHeaderStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20,
};
const closeBtnStyle = {
  background: "transparent", border: "none", color: "#6060a0",
  fontSize: 18, cursor: "pointer", padding: 4, borderRadius: 6,
  display: "flex", alignItems: "center",
};
const errorStyle = {
  background: "rgba(239,68,68,0.15)", border: "0.5px solid rgba(239,68,68,0.3)",
  color: "#f87171", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 16,
};
const successStyle = {
  background: "rgba(61,184,122,0.12)", border: "0.5px solid rgba(61,184,122,0.3)",
  borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#6ee7b7", marginBottom: 16,
};
const fieldStyle  = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 };
const labelStyle  = { fontSize: 12, fontWeight: 500, color: "#8080a8" };
const inputStyle  = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8,
  padding: "9px 12px", fontSize: 13, color: "#e0e0f0",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const cancelBtnStyle = {
  background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7,
  padding: "8px 16px", fontSize: 13, color: "#9090b0", cursor: "pointer",
  fontFamily: "inherit",
};
const submitBtnStyle = {
  background: "#5d5fe8", border: "none", borderRadius: 7,
  padding: "8px 18px", fontSize: 13, color: "#fff", cursor: "pointer",
  fontWeight: 500, fontFamily: "inherit",
};

// ── Sidebar styles ────────────────────────────────────────────────────────────
const S = {
  sidebar:       { width: 240, background: "#1e1e2e", display: "flex", flexDirection: "column", borderRight: "0.5px solid rgba(255,255,255,0.07)", height: "100vh", flexShrink: 0 },
  header:        { padding: "14px 14px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(255,255,255,0.07)" },
  workspaceName: { fontSize: 14, fontWeight: 500, color: "#e8e8f0", display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },
  headerActions: { display: "flex", gap: 4, flexShrink: 0 },
  headerBtn:     { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#8080a8", fontSize: 15, cursor: "pointer", border: "none", background: "transparent" },
  searchWrap:    { margin: "10px 10px 6px", position: "relative" },
  searchIcon:    { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6060a0", pointerEvents: "none" },
  searchInput:   { width: "100%", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 28px 6px 30px", fontSize: 12, color: "#c0c0d8", outline: "none", boxSizing: "border-box" },
  nav:           { flex: 1, overflowY: "auto", padding: "4px 0 12px" },
  section:       { marginBottom: 2 },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px 4px" },
  sectionTitle:  { fontSize: 11, fontWeight: 500, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", flex: 1 },
  sectionAdd:    { width: 20, height: 20, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#6060a0", fontSize: 14, cursor: "pointer", border: "none", background: "transparent" },
  channelItem:   { display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", cursor: "pointer", borderRadius: 4, margin: "0 6px", position: "relative" },
  channelActive: { background: "rgba(93,95,232,0.2)" },
  chIcon:        { fontSize: 14, color: "#6060a0", width: 16, textAlign: "center", flexShrink: 0 },
  chName:        { fontSize: 13, color: "#8080a8", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  chNameActive:  { color: "#d8d8f8", fontWeight: 500 },
  chBadge:       { background: "#5d5fe8", color: "#e0e0ff", fontSize: 10, padding: "1px 5px", borderRadius: 8, fontWeight: 500, flexShrink: 0 },
  miniBtn:       { width: 18, height: 18, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, padding: 0 },
  dmAvatar:      { width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500, color: "#fff", position: "relative", overflow: "hidden" },
  dmStatus:      { width: 6, height: 6, borderRadius: "50%", position: "absolute", bottom: -1, right: -1, border: "1.5px solid #1e1e2e" },
};