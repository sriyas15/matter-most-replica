import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChannelSidebar from "./ChannelSidebar";
import UserSettingsModal from "./UserSettingsModal";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import NotificationPanel from "./NotificationPanel";
import MentionsPanel from "./MentionsPanel";
import NewDMModal from "./NewDMModal";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDM } from "../context/DMContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../lib/api";
import Avatar from "./ui/Avatar";

// ── Rail icon ─────────────────────────────────────────────────────────────────
function RailIcon({ icon, label, badge = 0, active = false, onClick }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`relative flex items-center justify-center w-9 h-9 rounded-xl text-lg border-0 cursor-pointer transition-all duration-150 outline-none ${
        active
          ? "bg-blue-600 text-white"
          : "bg-transparent text-slate-400 hover:bg-blue-50 hover:text-blue-600"
      }`}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
      {badge > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 border-2 border-white text-[9px] font-bold text-white flex items-center justify-center px-0.5">
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
  const { totalDMUnread } = useDM();
  const { unreadCount, unreadMentions } = useNotifications();
  const navigate = useNavigate();

  const [active, setActive]           = useState("Home");
  const [showMenu, setShowMenu]       = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateWS, setShowCreateWS] = useState(false);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showNewDM, setShowNewDM]     = useState(false);

  if (loading || !user) return null;

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

  const openNewDM = () => {
    setActive("Direct Messages");
    setShowNewDM(true);
  };

  const STATUS_OPTIONS = [
    { value: "online",  label: "Online",          dot: "bg-emerald-500" },
    { value: "away",    label: "Away",             dot: "bg-amber-400" },
    { value: "dnd",     label: "Do Not Disturb",   dot: "bg-red-500" },
    { value: "offline", label: "Invisible",        dot: "bg-slate-400" },
  ];

  return (
    <div className="flex h-screen relative">
      {/* ── Icon Rail ── */}
      <aside className="flex flex-col items-center w-14 py-2 gap-1 flex-shrink-0 bg-white border-r border-slate-200">

        {/* Home */}
        <RailIcon
          icon="ti-layout-sidebar"
          label="Home"
          active={active === "Home"}
          onClick={() => { setActive("Home"); setShowNotifs(false); setShowMentions(false); }}
        />
        <div className="w-6 h-px my-1 bg-slate-200" />

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
          label="Direct Message"
          badge={totalDMUnread}
          active={active === "Direct Messages"}
          onClick={openNewDM}
        />

        {/* Mentions */}
        <RailIcon
          icon="ti-at"
          label="Mentions"
          badge={unreadMentions}
          active={showMentions}
          onClick={openMentions}
        />

        <div className="w-6 h-px my-1 bg-slate-200" />
        <div className="flex-1" />

        {/* Workspace switcher */}
        {workspaces.length > 0 && (
          <div className="flex flex-col gap-1 mb-1.5">
            {workspaces.slice(0, 5).map((ws) => (
              <button
                key={ws._id}
                title={ws.name}
                onClick={() => selectWorkspace(ws)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white cursor-pointer overflow-hidden border-2 transition-all ${
                  ws._id === activeWorkspace?._id
                    ? "border-blue-600 shadow-sm"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
                style={{ background: ws.themeColor || "#2563eb" }}
              >
                {ws.logo
                  ? <img src={ws.logo} alt="" className="w-full h-full object-cover" />
                  : ws.name.slice(0, 2).toUpperCase()}
              </button>
            ))}
            <button
              title="Create workspace"
              onClick={() => setShowCreateWS(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer text-base border-2 border-dashed border-blue-200 hover:border-blue-400 bg-transparent transition-colors"
            >
              <i className="ti ti-plus" />
            </button>
          </div>
        )}

        {/* Profile avatar */}
        <div className="relative mb-1">
          <Avatar user={user} size={32} onClick={() => setShowMenu((p) => !p)} />

          {showMenu && (
            <div className="absolute bottom-10 left-10 bg-white border border-slate-200 rounded-xl min-w-[200px] z-[100] shadow-xl overflow-hidden">
              {/* User info */}
              <div className="px-3.5 py-3 border-b border-slate-100">
                <div className="text-[13px] font-semibold text-blue-600">
                  {user.displayName || user.username}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{user.email}</div>
              </div>

              {/* Status options */}
              <div className="py-1.5 border-b border-slate-100">
                <p className="text-[10px] text-slate-400 px-3.5 pb-1 uppercase tracking-wider font-medium">
                  Set status
                </p>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateStatus(s.value)}
                    className={`w-full px-3.5 py-1.5 flex items-center gap-2 text-[12px] text-slate-600 border-none cursor-pointer text-left font-inherit transition-colors ${
                      user.status === s.value ? "bg-blue-50" : "bg-transparent hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    {s.label}
                    {user.status === s.value && (
                      <i className="ti ti-check ml-auto text-blue-600 text-[13px]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Settings & logout */}
              <div className="py-1">
                <button
                  onClick={() => { setShowMenu(false); setShowSettings(true); }}
                  className="w-full px-3.5 py-2 flex items-center gap-2 text-[12px] text-slate-600 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors font-inherit"
                >
                  <i className="ti ti-settings text-[14px]" /> Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-3.5 py-2 flex items-center gap-2 text-[12px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors font-inherit"
                >
                  <i className="ti ti-logout text-[14px]" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <ChannelSidebar />

      {/* Backdrop for avatar menu */}
      {showMenu && (
        <div className="fixed inset-0 z-[99]" onClick={() => setShowMenu(false)} />
      )}

      {/* Panels */}
      <NotificationPanel open={showNotifs} onClose={() => { setShowNotifs(false); setActive("Home"); }} />
      <MentionsPanel     open={showMentions} onClose={() => { setShowMentions(false); setActive("Home"); }} />

      {/* Modals */}
      <UserSettingsModal   open={showSettings}  onClose={() => setShowSettings(false)} />
      <CreateWorkspaceModal open={showCreateWS} onClose={() => setShowCreateWS(false)} />
      <NewDMModal          open={showNewDM}     onClose={() => { setShowNewDM(false); setActive("Home"); }} />
    </div>
  );
}