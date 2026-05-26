import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useDM } from "../context/DMContext";
import api from "../lib/api";

const STATUS_DOT = {
  online:  "bg-emerald-500",
  away:    "bg-amber-400",
  dnd:     "bg-red-500",
  offline: "bg-slate-400",
};

const STATUS_TEXT_COLOR = {
  online:  "text-emerald-600",
  away:    "text-amber-500",
  dnd:     "text-red-500",
  offline: "text-slate-400",
};

// Role badge styles
const ROLE_BADGE = {
  owner: "text-amber-700 bg-amber-50 border-amber-200",
  admin: "text-blue-600 bg-blue-50 border-blue-200",
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function WsMemberAvatar({ user, size = 32 }) {
  const initials = (user.displayName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-lg flex items-center justify-center font-semibold text-white overflow-hidden"
        style={{ width: size, height: size, fontSize: size * 0.38, background: user.avatarColor || "#2563eb" }}
      >
        {user.avatar
          ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          : initials}
      </div>
      <div className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${STATUS_DOT[user.status || "offline"]}`} />
    </div>
  );
}

// ── Workspace member row ──────────────────────────────────────────────────────
function WsMemberRow({ member, isMe, myRole, onOpenDM, onRefresh }) {
  const { activeWorkspace } = useWorkspace();
  const [hovered, setHovered] = useState(false);

  const role = member.wsRole; // "owner" | "admin" | "member" | "guest"
  const showBadge = role === "owner" || role === "admin";

  // Only the workspace owner can promote/demote; admins can only remove non-admins
  const canPromote  = myRole === "owner" && !isMe && role !== "owner";
  const canDemote   = myRole === "owner" && !isMe && role === "admin";
  const canRemove   = ["owner", "admin"].includes(myRole) && !isMe && role !== "owner"
                      && !(myRole === "admin" && role === "admin");

  const handlePromote = async () => {
    try {
      await api.patch(
        `/workspaces/${activeWorkspace._id}/members/${member._id}/role`,
        { role: "admin" }
      );
      onRefresh();
    } catch {}
  };

  const handleDemote = async () => {
    try {
      await api.patch(
        `/workspaces/${activeWorkspace._id}/members/${member._id}/role`,
        { role: "member" }
      );
      onRefresh();
    } catch {}
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${member.displayName || member.username} from this workspace?`)) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace._id}/members/${member._id}`);
      onRefresh();
    } catch {}
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors"
    >
      <WsMemberAvatar user={member} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] text-slate-700 font-medium truncate">
            {member.displayName || member.username}
          </span>
          {/* Role badge — owner gets amber, admin gets blue */}
          {showBadge && (
            <span className={`text-[9px] font-semibold border rounded px-1 py-0.5 leading-none flex-shrink-0 uppercase ${ROLE_BADGE[role]}`}>
              {role}
            </span>
          )}
          {isMe && (
            <span className="text-[9px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded px-1 py-0.5 leading-none flex-shrink-0">
              YOU
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">@{member.username}</div>
      </div>

      {/* Action buttons on hover — only for non-me members with applicable permissions */}
      {!isMe && hovered && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenDM(member)}
            title="Send DM"
            className="flex items-center gap-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md px-2 py-1 text-blue-600 text-[11px] cursor-pointer transition-colors font-inherit"
          >
            <i className="ti ti-message-circle text-[12px]" /> DM
          </button>

          {/* Promote to admin — owner only, for non-admin non-owner members */}
          {canPromote && role !== "admin" && (
            <button
              onClick={handlePromote}
              title="Make Admin"
              className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md px-2 py-1 text-slate-600 text-[11px] cursor-pointer transition-colors font-inherit"
            >
              <i className="ti ti-shield text-[11px] text-blue-500" /> Admin
            </button>
          )}

          {/* Demote from admin — owner only, for admins */}
          {canDemote && (
            <button
              onClick={handleDemote}
              title="Remove Admin"
              className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md px-2 py-1 text-slate-600 text-[11px] cursor-pointer transition-colors font-inherit"
            >
              <i className="ti ti-shield-off text-[11px] text-slate-400" /> Demote
            </button>
          )}

          {/* Remove from workspace */}
          {canRemove && (
            <button
              onClick={handleRemove}
              title="Remove from workspace"
              className="flex items-center gap-1 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md px-2 py-1 text-red-500 text-[11px] cursor-pointer transition-colors font-inherit"
            >
              <i className="ti ti-user-minus text-[11px]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main workspace members panel ──────────────────────────────────────────────
export default function WorkspaceMembersPanel({ open, onClose }) {
  const { activeWorkspace, myRole } = useWorkspace();
  const { user: me } = useAuth();
  const { openDMWithUser } = useDM();

  const [members, setMembers] = useState([]);
  const [filterQ, setFilterQ] = useState("");
  const [fetching, setFetching] = useState(false);

  const fetchMembers = useCallback(() => {
    if (!activeWorkspace) return;
    setFetching(true);
    api
      .get(`/workspaces/${activeWorkspace._id}`)
      .then(({ data }) => {
        const raw = data.data?.members || [];
        // Build flat user objects with wsRole attached
        const built = raw
          .map((m) => {
            const u = m.user && typeof m.user === "object" ? m.user : null;
            if (!u) return null;
            return { ...u, wsRole: m.role };
          })
          .filter(Boolean)
          // Sort: owner first, then admins, then rest — alphabetical within each group
          .sort((a, b) => {
            const order = { owner: 0, admin: 1, member: 2, guest: 3 };
            const diff = (order[a.wsRole] ?? 2) - (order[b.wsRole] ?? 2);
            if (diff !== 0) return diff;
            return (a.displayName || a.username || "").localeCompare(b.displayName || b.username || "");
          });
        setMembers(built);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [activeWorkspace?._id]);

  useEffect(() => {
    if (!open) return;
    fetchMembers();
  }, [open, activeWorkspace?._id]);

  const handleOpenDM = (targetUser) => {
    onClose();
    openDMWithUser(targetUser);
  };

  const filtered = members.filter((m) =>
    !filterQ ||
    (m.displayName || m.username || "").toLowerCase().includes(filterQ.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[49]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[300px] z-50 bg-white border-l border-slate-200 flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              {/* Workspace logo/initials */}
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white overflow-hidden flex-shrink-0"
                style={{ background: activeWorkspace?.themeColor || "#2563eb" }}
              >
                {activeWorkspace?.logo
                  ? <img src={activeWorkspace.logo} alt="" className="w-full h-full object-cover" />
                  : (activeWorkspace?.name || "W").slice(0, 2).toUpperCase()}
              </div>
              <div className="text-[14px] font-semibold text-slate-800 truncate">
                {activeWorkspace?.name}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg flex items-center p-1 rounded-md border-none bg-transparent cursor-pointer transition-colors"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 flex-shrink-0 border-b border-slate-50">
          <div className="relative">
            <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none" />
            <input
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="Filter members…"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md py-1.5 pl-7 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none transition-all box-border"
            />
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[12px] text-slate-400 text-center py-8">No members found</p>
          ) : (
            filtered.map((m) => (
              <WsMemberRow
                key={m._id}
                member={m}
                isMe={m._id === me?._id}
                myRole={myRole}
                onOpenDM={handleOpenDM}
                onRefresh={fetchMembers}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}