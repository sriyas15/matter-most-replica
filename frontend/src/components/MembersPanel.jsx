import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../lib/socket/socket";
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

// ── Small user avatar ─────────────────────────────────────────────────────────
function MemberAvatar({ user, size = 32 }) {
  const initials = (user.displayName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-lg flex items-center justify-center font-semibold text-white overflow-hidden"
        style={{
          width: size, height: size, fontSize: size * 0.38,
          background: user.avatarColor || "#2563eb",
        }}
      >
        {user.avatar
          ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          : initials}
      </div>
      <div
        className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${STATUS_DOT[user.status || "offline"]}`}
      />
    </div>
  );
}

// ── Manage dropdown for channel admins ────────────────────────────────────────
// Shows "Make Admin" / "Remove Admin" and "Remove from channel" for a member.
function ManageDropdown({ member, onMakeAdmin, onRemoveAdmin, onRemove, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const isAdmin = member.channelRole === "admin";

  return (
    <div
      ref={ref}
      className="absolute right-0 top-7 bg-white border border-slate-200 rounded-lg shadow-lg z-[60] min-w-[170px] overflow-hidden"
    >
      {isAdmin ? (
        <button
          onClick={() => { onRemoveAdmin(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-600 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors text-left font-inherit"
        >
          <i className="ti ti-shield-off text-[13px] text-slate-400" />
          Remove Admin
        </button>
      ) : (
        <button
          onClick={() => { onMakeAdmin(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-600 bg-transparent border-none cursor-pointer hover:bg-slate-50 transition-colors text-left font-inherit"
        >
          <i className="ti ti-shield text-[13px] text-blue-500" />
          Make Admin
        </button>
      )}
      <div className="h-px bg-slate-100 mx-2" />
      <button
        onClick={() => { onRemove(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors text-left font-inherit"
      >
        <i className="ti ti-user-minus text-[13px]" />
        Remove from channel
      </button>
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────
function MemberRow({ member, onOpenDM, onViewProfile, isMe, canManage, onRefresh }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [hovered, setHovered]     = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const isAdmin = member.channelRole === "admin";

  const handleMakeAdmin = async () => {
    try {
      await api.patch(
        `/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/members/${member._id}/role`,
        { role: "admin" }
      );
      onRefresh();
    } catch {}
  };

  const handleRemoveAdmin = async () => {
    try {
      await api.patch(
        `/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/members/${member._id}/role`,
        { role: "member" }
      );
      onRefresh();
    } catch {}
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${member.displayName || member.username} from this channel?`)) return;
    try {
      await api.delete(
        `/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/members/${member._id}`
      );
      onRefresh();
    } catch {}
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setManageOpen(false); }}
      className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors relative"
      onClick={() => onViewProfile(member)}
    >
      <MemberAvatar user={member} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-slate-700 font-medium truncate">
            {member.displayName || member.username}
          </span>
          {/* Admin badge */}
          {isAdmin && (
            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 leading-none flex-shrink-0">
              ADMIN
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">@{member.username}</div>
      </div>

      {isMe ? (
        <span className="text-[11px] text-slate-400 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 font-medium flex-shrink-0">
          You
        </span>
      ) : hovered && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* DM button */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDM(member); }}
            title="Send direct message"
            className="flex items-center gap-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md px-2 py-1 text-blue-600 text-[11px] cursor-pointer transition-colors font-inherit"
          >
            <i className="ti ti-message-circle text-[13px]" /> DM
          </button>

          {/* Manage button — only for channel admins and not for the member themselves */}
          {canManage && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setManageOpen((p) => !p); }}
                title="Manage member"
                className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md px-2 py-1 text-slate-600 text-[11px] cursor-pointer transition-colors font-inherit"
              >
                Manage <i className="ti ti-chevron-down text-[10px]" />
              </button>

              {manageOpen && (
                <ManageDropdown
                  member={member}
                  onMakeAdmin={handleMakeAdmin}
                  onRemoveAdmin={handleRemoveAdmin}
                  onRemove={handleRemove}
                  onClose={() => setManageOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add People Tab ────────────────────────────────────────────────────────────
function AddPeopleTab({ workspace, channel, currentMemberIds, onMembersAdded }) {
  const [searchQ, setSearchQ]       = useState("");
  const [searchRes, setSearchRes]   = useState([]);
  const [selected, setSelected]     = useState([]);
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const debounceRef                 = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!workspace) { setSearchRes([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const q = searchQ.trim() || " ";
        const { data } = await api.get(
          `/workspaces/${workspace._id}/users/search`,
          { params: { q, limit: 50 } }
        );
        const selectedIds = new Set(selected.map((u) => u._id?.toString()));
        const normalizedMemberIds = new Set(
          currentMemberIds.map((id) => (typeof id === "object" ? id.toString() : id))
        );
        const filtered = (data.data || []).filter((u) => {
          const uid = u._id?.toString();
          return !normalizedMemberIds.has(uid) && !selectedIds.has(uid);
        });
        setSearchRes(filtered);
      } catch {
        setSearchRes([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [searchQ, workspace?._id, currentMemberIds, selected]);

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const removeSelected = (userId) =>
    setSelected((prev) => prev.filter((u) => u._id !== userId));

  const handleAdd = async () => {
    if (!selected.length) return;
    setAdding(true);
    setAddError("");
    setAddSuccess("");
    try {
      await api.post(
        `/workspaces/${workspace._id}/channels/${channel._id}/members`,
        { userIds: selected.map((u) => u._id) }
      );
      setAddSuccess(
        `Added ${selected.length} member${selected.length !== 1 ? "s" : ""} successfully`
      );
      setSelected([]);
      onMembersAdded?.();
      setTimeout(() => setAddSuccess(""), 3000);
    } catch (err) {
      setAddError(err.response?.data?.message || "Failed to add members");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Search workspace members
        </p>
        <div className="relative">
          <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Find someone to add…"
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md py-2 pl-7 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none transition-all box-border"
          />
        </div>
        <div className="mt-1.5 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm max-h-[200px] overflow-y-auto">
          {searchRes.length === 0 ? (
            <p className="text-[12px] text-slate-400 text-center py-3">
              {currentMemberIds.length > 0 && !searchQ
                ? "All workspace members are already in this channel"
                : "No results"}
            </p>
          ) : (
            searchRes.map((u) => (
              <div
                key={u._id}
                onClick={() => toggleSelect(u)}
                className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <MemberAvatar user={u} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-slate-700 font-medium truncate">
                    {u.displayName || u.username}
                  </div>
                  <div className="text-[10px] text-slate-400">@{u.username}</div>
                </div>
                <i className="ti ti-plus text-[13px] text-blue-500" />
              </div>
            ))
          )}
        </div>
      </div>

      {selected.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Selected ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full pl-2 pr-1 py-0.5 text-[11px] font-medium"
              >
                <span>{u.displayName || u.username}</span>
                <button
                  onClick={() => removeSelected(u._id)}
                  className="w-4 h-4 rounded-full flex items-center justify-center bg-blue-200 hover:bg-blue-300 text-blue-700 border-none cursor-pointer transition-colors"
                >
                  <i className="ti ti-x text-[9px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {addError && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-[12px]">
          {addError}
        </div>
      )}
      {addSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 text-[12px] flex items-center gap-1.5">
          <i className="ti ti-check text-[13px]" /> {addSuccess}
        </div>
      )}

      {selected.length > 0 && (
        <button
          onClick={handleAdd}
          disabled={adding}
          className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white border-none rounded-lg py-2.5 text-[13px] font-medium cursor-pointer transition-colors font-inherit"
        >
          <i className="ti ti-user-plus" />
          {adding
            ? "Adding…"
            : `Add ${selected.length} member${selected.length !== 1 ? "s" : ""} to channel`}
        </button>
      )}
    </div>
  );
}

// ── Main channel members panel ────────────────────────────────────────────────
export default function MembersPanel({ open, onClose, onOpenDM, onMembersLoaded, initialTab }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const { user: me } = useAuth();

  const [members, setMembers]         = useState([]);
  const [filterQ, setFilterQ]         = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [tab, setTab]                 = useState(initialTab || "members");

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // ── Fetch members — preserve channelRole from the members array ───────────
  // Previously this mapped m.user and dropped m.role. We now attach
  // m.role as channelRole on the user object so the row can show the badge
  // and the Manage dropdown can read it.
  const fetchMembers = useCallback(() => {
    if (!activeChannel || !activeWorkspace) return;
    api
      .get(`/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}`)
      .then(({ data }) => {
        const rawMembers = data.data?.members || [];
        const populated = rawMembers
          .map((m) => {
            const userObj = m.user && typeof m.user === "object" ? m.user : m;
            if (!userObj) return null;
            // Attach the channel-level role so rows can render the ADMIN badge
            return { ...userObj, channelRole: m.role ?? userObj.channelRole };
          })
          .filter(Boolean);
        setMembers(populated);
        onMembersLoaded?.();
      })
      .catch(() => {});
  }, [activeChannel?._id, activeWorkspace?._id]);

  useEffect(() => {
    if (!open) return;
    fetchMembers();
  }, [open, activeChannel?._id, activeWorkspace?._id]);

  useEffect(() => {
    if (!open) return;
    const socket = getSocket();
    if (!socket || !activeChannel?._id) return;
    const handler = ({ channelId }) => {
      if (channelId === activeChannel._id) fetchMembers();
    };
    socket.on("channel:member_updated", handler);
    return () => socket.off("channel:member_updated", handler);
  }, [open, activeChannel?._id, fetchMembers]);

  // Current user is a channel admin if they have role="admin" in the members list,
  // or if they're a workspace owner/admin.
  const myMember = members.find((m) => m._id === me?._id);
  const isChannelAdmin =
    myMember?.channelRole === "admin" ||
    ["owner", "admin"].includes(activeWorkspace?.myRole);

  const handleOpenDM      = (targetUser) => { onOpenDM(targetUser); onClose(); };
  const handleViewProfile = (targetUser) => setProfileUser(targetUser);

  const filtered = members.filter((m) =>
    !filterQ ||
    (m.displayName || m.username || "").toLowerCase().includes(filterQ.toLowerCase())
  );

  const currentMemberIds = members.map((m) => m._id?.toString?.() ?? m._id);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[49]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[300px] z-50 bg-white border-l border-slate-200 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-slate-800">
              #{activeChannel?.displayName || activeChannel?.name}
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

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {["members", ...(isChannelAdmin ? ["add"] : [])].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setFilterQ(""); setProfileUser(null); }}
              className={`flex-1 py-2.5 text-[12px] font-medium cursor-pointer bg-transparent border-none border-b-2 transition-all capitalize ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t === "members" ? `Members (${members.length})` : "Add People"}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab === "members" && (
          <>
            <div className="px-3 py-2.5 flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[12px] text-slate-400 text-center py-5">No members found</p>
              )}
              {filtered.map((m) => (
                <MemberRow
                  key={m._id}
                  member={m}
                  isMe={m._id === me?._id}
                  canManage={isChannelAdmin && m._id !== me?._id}
                  onOpenDM={handleOpenDM}
                  onViewProfile={handleViewProfile}
                  onRefresh={fetchMembers}
                />
              ))}
            </div>
          </>
        )}

        {/* Add People tab */}
        {tab === "add" && isChannelAdmin && (
          <AddPeopleTab
            workspace={activeWorkspace}
            channel={activeChannel}
            currentMemberIds={currentMemberIds}
            onMembersAdded={() => {
              fetchMembers();
              onMembersLoaded?.();
            }}
          />
        )}
      </div>

      {profileUser && (
        <UserProfilePopup
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onOpenDM={() => { handleOpenDM(profileUser); setProfileUser(null); }}
          isMe={profileUser._id === me?._id}
        />
      )}
    </>
  );
}

// ── User profile popup ────────────────────────────────────────────────────────
function UserProfilePopup({ user, onClose, onOpenDM, isMe }) {
  const initials = (user.displayName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const statusDot  = STATUS_DOT[user.status || "offline"];
  const statusText = STATUS_TEXT_COLOR[user.status || "offline"];

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div className="fixed right-[316px] top-1/2 -translate-y-1/2 w-[260px] bg-white border border-slate-200 rounded-xl z-[100] shadow-xl overflow-hidden">
        <div
          className="h-[60px]"
          style={{
            background: `linear-gradient(135deg, ${user.avatarColor || "#2563eb"}60, #e0e7ff)`,
          }}
        />
        <div className="px-4 -mt-7 mb-3">
          <div
            className="w-[52px] h-[52px] rounded-xl border-[3px] border-white flex items-center justify-center text-lg font-semibold text-white overflow-hidden"
            style={{ background: user.avatarColor || "#2563eb" }}
          >
            {user.avatar
              ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              : initials}
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="text-[15px] font-semibold text-slate-800">
            {user.displayName || user.username}
          </div>
          <div className="text-[12px] text-slate-400 mb-1.5">@{user.username}</div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className={`w-[7px] h-[7px] rounded-full ${statusDot}`} />
            <span className={`text-[11px] capitalize ${statusText}`}>
              {user.status || "offline"}
            </span>
            {user.customStatus?.text && (
              <span className="text-[11px] text-slate-400">
                · {user.customStatus.emoji} {user.customStatus.text}
              </span>
            )}
          </div>
          {user.bio && (
            <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">{user.bio}</p>
          )}
          {!isMe && (
            <button
              onClick={onOpenDM}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg py-2 text-[13px] cursor-pointer transition-colors font-inherit"
            >
              <i className="ti ti-message-circle" /> Send Message
            </button>
          )}
        </div>
      </div>
    </>
  );
}