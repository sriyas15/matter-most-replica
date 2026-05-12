import { useState }              from "react";
import { useNavigate }           from "react-router-dom";
import ChannelSidebar            from "./ChannelSidebar";
import UserSettingsModal         from "./UserSettingsModal";
import CreateWorkspaceModal      from "./CreateWorkspaceModal";
import NotificationPanel         from "./NotificationPanel";
import MentionsPanel             from "./MentionsPanel";
import { useAuth }               from "../context/AuthContext";
import { useWorkspace }          from "../context/WorkspaceContext";
import { useDM }                 from "../context/DMContext";
import { useNotifications }      from "../context/NotificationContext";
import api                       from "../lib/api";
import Avatar from "./ui/Avatar";

const STATUS_COLOR = { online: "#22c55e", away: "#f59e0b", dnd: "#ef4444", offline: "#6b7280" };

// ── Rail icon ─────────────────────────────────────────────────────────────────
function RailIcon({ icon, label, badge = 0, active = false, onClick }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        "relative flex items-center justify-center",
        "w-9 h-9 rounded-[10px] text-lg border-0 cursor-pointer",
        "transition-all duration-150 outline-none",
        active
          ? "bg-indigo-600 text-white"
          : "bg-transparent text-[#a0a0c0] hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 3, right: 3,
          minWidth: 14, height: 14, borderRadius: 7,
          background: "#e53e3e", border: "1.5px solid #1a1a2a",
          fontSize: 9, fontWeight: 700, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 3px",
        }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function WorkspaceSidebar() {
  const { user, logout, updateUser, loading } = useAuth();
  const { activeWorkspace, workspaces, selectWorkspace } = useWorkspace();
  const { totalDMUnread }         = useDM();
  const { unreadCount, unreadMentions } = useNotifications();
  const navigate                  = useNavigate();

  const [active, setActive]             = useState("Home");
  const [showMenu, setShowMenu]         = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateWS, setShowCreateWS] = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  if (loading || !user) return null;

  const initials = (user.displayName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    navigate("/login");
  };

  const updateStatus = async (status) => {
    try {
      await api.patch("/users/me/status", { status });
      updateUser({ status });
      setShowMenu(false);
    } catch {}
  };

  const openNotifs = () => {
    setShowMentions(false);
    setShowNotifs((p) => !p);
    setActive("Notifications");
  };

  const openMentions = () => {
    setShowNotifs(false);
    setShowMentions((p) => !p);
    setActive("Mentions");
  };

  return (
    <div className="flex h-screen relative">
      {/* ── Icon Rail ── */}
      <aside
        className="flex flex-col items-center w-14 py-2 gap-1 flex-shrink-0"
        style={{ background: "#1a1a2a", borderRight: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        {/* Home */}
        <RailIcon
          icon="ti-layout-sidebar"
          label="Home"
          active={active === "Home"}
          onClick={() => { setActive("Home"); setShowNotifs(false); setShowMentions(false); }}
        />
        <div className="w-6 h-px my-1" style={{ background: "rgba(255,255,255,0.1)" }} />

        {/* Notifications */}
        <RailIcon
          icon="ti-bell"
          label="Notifications"
          badge={unreadCount}
          active={showNotifs}
          onClick={openNotifs}
        />

        {/* Direct Messages */}
        <RailIcon
          icon="ti-message-circle"
          label="Direct Messages"
          badge={totalDMUnread}
          active={active === "Direct Messages"}
          onClick={() => setActive("Direct Messages")}
        />

        {/* Mentions */}
        <RailIcon
          icon="ti-at"
          label="Mentions"
          badge={unreadMentions}
          active={showMentions}
          onClick={openMentions}
        />

        {/* Saved */}
        <RailIcon
          icon="ti-bookmark"
          label="Saved"
          active={active === "Saved"}
          onClick={() => setActive("Saved")}
        />

        <div className="w-6 h-px my-1" style={{ background: "rgba(255,255,255,0.1)" }} />

        {/* Search */}
        <RailIcon
          icon="ti-search"
          label="Search"
          active={active === "Search"}
          onClick={() => setActive("Search")}
        />

        <div className="flex-1" />

        {/* Workspace switcher */}
        {workspaces.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
            {workspaces.slice(0, 5).map((ws) => (
              <button
                key={ws._id}
                title={ws.name}
                onClick={() => selectWorkspace(ws)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: ws._id === activeWorkspace?._id
                    ? (ws.themeColor || "#5d5fe8")
                    : "rgba(255,255,255,0.08)",
                  border: ws._id === activeWorkspace?._id
                    ? `2px solid ${ws.themeColor || "#5d5fe8"}`
                    : "2px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff",
                  cursor: "pointer", overflow: "hidden",
                }}
              >
                {ws.logo
                  ? <img src={ws.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : ws.name.slice(0, 2).toUpperCase()}
              </button>
            ))}
            <button
              title="Create workspace"
              onClick={() => setShowCreateWS(true)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px dashed rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6060a0", cursor: "pointer", fontSize: 16,
              }}
            >
              <i className="ti ti-plus" />
            </button>
          </div>
        )}

        {/* Profile avatar */}
        <div style={{ position: "relative", marginBottom: 4 }}>
          {/* <div
            title={user.displayName || "Profile"}
            onClick={() => setShowMenu((p) => !p)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: user.avatarColor || "#5d5fe8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#fff",
              cursor: "pointer", overflow: "hidden",
            }}
          >
            {user.avatar
              ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials}
          </div>

          
          <span style={{
            position: "absolute", bottom: -1, right: -1,
            width: 10, height: 10, borderRadius: "50%",
            border: "2px solid #1a1a2a",
            background: STATUS_COLOR[user.status] || STATUS_COLOR.offline,}}
             /> */}
          <Avatar user={user} size={32} onClick={() => setShowMenu((p) => !p)}/>

          {/* Dropdown */}
          {showMenu && (
            <div style={{
              position: "absolute", bottom: 40, left: 40,
              background: "#2a2a3e",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: 10, minWidth: 200, zIndex: 100,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
            }}>
              {/* User info */}
              <div style={{ padding: "12px 14px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#d8d8f0" }}>
                  {user.displayName || user.username}
                </div>
                <div style={{ fontSize: 11, color: "#6060a0", marginTop: 2 }}>{user.email}</div>
              </div>

              {/* Status options */}
              <div style={{ padding: "6px 0", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 10, color: "#5050a0", padding: "0 14px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Set status
                </p>
                {[
                  { value: "online",  label: "Online",          color: "#22c55e" },
                  { value: "away",    label: "Away",            color: "#f59e0b" },
                  { value: "dnd",     label: "Do Not Disturb",  color: "#ef4444" },
                  { value: "offline", label: "Invisible",       color: "#6b7280" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateStatus(s.value)}
                    style={{
                      width: "100%", padding: "7px 14px",
                      background: user.status === s.value ? "rgba(255,255,255,0.06)" : "transparent",
                      border: "none", color: "#c0c0d8", fontSize: 12,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      gap: 8, textAlign: "left",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    {s.label}
                    {user.status === s.value && (
                      <i className="ti ti-check" style={{ marginLeft: "auto", color: "#5d5fe8", fontSize: 13 }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Settings & logout */}
              <div style={{ padding: "4px 0" }}>
                <button
                  onClick={() => { setShowMenu(false); setShowSettings(true); }}
                  style={{ width: "100%", padding: "8px 14px", background: "transparent", border: "none", color: "#c0c0d8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <i className="ti ti-settings" style={{ fontSize: 14 }} /> Settings
                </button>
                <button
                  onClick={handleLogout}
                  style={{ width: "100%", padding: "8px 14px", background: "transparent", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <i className="ti ti-logout" style={{ fontSize: 14 }} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <ChannelSidebar />

      {/* Backdrop for menu */}
      {showMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
      )}

      {/* Panels */}
      <NotificationPanel open={showNotifs}   onClose={() => { setShowNotifs(false);   setActive("Home"); }} />
      <MentionsPanel     open={showMentions} onClose={() => { setShowMentions(false); setActive("Home"); }} />

      {/* Modals */}
      <UserSettingsModal    open={showSettings}  onClose={() => setShowSettings(false)} />
      <CreateWorkspaceModal open={showCreateWS}  onClose={() => setShowCreateWS(false)} />
    </div>
  );
}