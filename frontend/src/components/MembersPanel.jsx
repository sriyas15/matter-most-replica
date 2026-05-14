import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
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
      <div className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${STATUS_DOT[user.status || "offline"]}`} />
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────
function MemberRow({ member, onOpenDM, onViewProfile }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => onViewProfile(member)}
    >
      <MemberAvatar user={member} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-slate-700 font-medium truncate">
          {member.displayName || member.username}
        </div>
        <div className="text-[11px] text-slate-400">@{member.username}</div>
      </div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDM(member); }}
          title="Send direct message"
          className="flex items-center gap-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md px-2 py-1 text-blue-600 text-[11px] cursor-pointer transition-colors font-inherit"
        >
          <i className="ti ti-message-circle text-[13px]" /> DM
        </button>
      )}
    </div>
  );
}

export default function MembersPanel({ open, onClose, onOpenDM }) {
  const { activeWorkspace, activeChannel, myRole } = useWorkspace();  // add myRole
  const { user: me } = useAuth();

  const [members, setMembers]           = useState([]);
  const [searchQ, setSearchQ]           = useState("");
  const [searchRes, setSearchRes]       = useState([]);
  const [inviteUrl, setInviteUrl]       = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [profileUser, setProfileUser]   = useState(null);
  const [tab, setTab]                   = useState("members");
  const debounceRef                     = useRef(null);

  useEffect(() => {
    if (!open || !activeChannel || !activeWorkspace) return;
    api.get(`/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}`)
      .then(({ data }) => {
        const populated = (data.data?.members || []).map((m) => m.user || m).filter(Boolean);
        setMembers(populated);
      })
      .catch(() => {});
  }, [open, activeChannel?._id, activeWorkspace?._id]);

  useEffect(() => {
    if (!searchQ.trim() || !activeWorkspace) { setSearchRes([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/workspaces/${activeWorkspace._id}/search`, { params: { q: searchQ } });
        setSearchRes(data.data || []);
      } catch {}
    }, 300);
  }, [searchQ, activeWorkspace?._id]);

  const generateInvite = async () => {
    setInviteLoading(true);
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace._id}/invite-link`);
      setInviteUrl(data.inviteUrl);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate link");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDM = (targetUser) => { onOpenDM(targetUser); onClose(); };
  const handleViewProfile = (targetUser) => setProfileUser(targetUser);

  const filtered = members.filter((m) =>
    !searchQ || (m.displayName || m.username || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[49]" onClick={onClose} />

      {/* Panel */}
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
          {["members", ...( ["owner", "admin"].includes(myRole) ? ["add"] : []) ].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearchQ(""); setProfileUser(null); }}
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

        {/* ── Members tab ── */}
        {tab === "members" && (
          <>
            <div className="px-3 py-2.5 flex-shrink-0">
              <div className="relative">
                <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
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
                <MemberRow key={m._id} member={m} onOpenDM={handleOpenDM} onViewProfile={handleViewProfile} />
              ))}
            </div>
          </>
        )}

        {/* ── Add People tab ── */}
        {tab === "add" && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Search */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Search by name or username
              </p>
              <div className="relative">
                <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Find someone in workspace…"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md py-2 pl-7 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none transition-all box-border"
                />
              </div>

              {searchQ && (
                <div className="mt-2 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  {searchRes.length === 0 && (
                    <p className="text-[12px] text-slate-400 text-center py-3.5">No results</p>
                  )}
                  {searchRes.map((u) => (
                    <div key={u._id} className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-50 last:border-0">
                      <MemberAvatar user={u} size={28} />
                      <div className="flex-1">
                        <div className="text-[12px] text-slate-700 font-medium">{u.displayName || u.username}</div>
                        <div className="text-[10px] text-slate-400">@{u.username}</div>
                      </div>
                      <button
                        onClick={() => handleOpenDM(u)}
                        className="bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md px-2 py-0.5 text-blue-600 text-[11px] cursor-pointer transition-colors font-inherit"
                      >
                        DM
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invite link */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Invite Link</p>
              <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
                Share this link with people you want to invite to the workspace.
              </p>

              {!inviteUrl ? (
                <button
                  onClick={generateInvite}
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white border-none rounded-lg py-2.5 text-[13px] cursor-pointer transition-colors font-inherit"
                >
                  <i className="ti ti-link" />
                  {inviteLoading ? "Generating…" : "Generate Invite Link"}
                </button>
              ) : (
                <div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-500 break-all mb-2">
                    {inviteUrl}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={copyInvite}
                      className={`flex-1 flex items-center justify-center gap-1.5 border rounded-lg py-1.5 text-[12px] cursor-pointer transition-colors font-inherit ${
                        copied
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                      }`}
                    >
                      <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => setInviteUrl("")}
                      title="Regenerate"
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-500 cursor-pointer transition-colors"
                    >
                      <i className="ti ti-refresh" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mini profile popup ── */}
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

function UserProfilePopup({ user, onClose, onOpenDM, isMe }) {
  const initials = (user.displayName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const statusDot  = STATUS_DOT[user.status || "offline"];
  const statusText = STATUS_TEXT_COLOR[user.status || "offline"];

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div className="fixed right-[316px] top-1/2 -translate-y-1/2 w-[260px] bg-white border border-slate-200 rounded-xl z-[100] shadow-xl overflow-hidden">
        {/* Cover */}
        <div
          className="h-[60px]"
          style={{ background: `linear-gradient(135deg, ${user.avatarColor || "#2563eb"}60, #e0e7ff)` }}
        />

        {/* Avatar */}
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
          <div className="text-[15px] font-semibold text-slate-800">{user.displayName || user.username}</div>
          <div className="text-[12px] text-slate-400 mb-1.5">@{user.username}</div>

          <div className="flex items-center gap-1.5 mb-2.5">
            <div className={`w-[7px] h-[7px] rounded-full ${statusDot}`} />
            <span className={`text-[11px] capitalize ${statusText}`}>{user.status || "offline"}</span>
            {user.customStatus?.text && (
              <span className="text-[11px] text-slate-400">· {user.customStatus.emoji} {user.customStatus.text}</span>
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