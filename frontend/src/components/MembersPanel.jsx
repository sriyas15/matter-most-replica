import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const STATUS_COLOR = { online: "#3db87a", away: "#f0a22a", dnd: "#e53e3e", offline: "#6060a0" };

// ── Small user avatar ─────────────────────────────────────────────────────────
function MemberAvatar({ user, size = 32 }) {
  const initials = (user.displayName || user.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: user.avatarColor || "#5d5fe8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 600, color: "#fff", overflow: "hidden",
      }}>
        {user.avatar
          ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials}
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: STATUS_COLOR[user.status || "offline"],
        position: "absolute", bottom: -1, right: -1,
        border: "1.5px solid #1e1e2e",
      }} />
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
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "7px 16px", cursor: "pointer",
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 0.15s",
      }}
      onClick={() => onViewProfile(member)}
    >
      <MemberAvatar user={member} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#d0d0f0", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {member.displayName || member.username}
        </div>
        <div style={{ fontSize: 11, color: "#5050a0" }}>@{member.username}</div>
      </div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDM(member); }}
          title="Send direct message"
          style={{ background: "rgba(93,95,232,0.2)", border: "0.5px solid rgba(93,95,232,0.4)", borderRadius: 6, padding: "4px 8px", color: "#8080e8", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
        >
          <i className="ti ti-message-circle" style={{ fontSize: 13 }} /> DM
        </button>
      )}
    </div>
  );
}

export default function MembersPanel({ open, onClose, onOpenDM }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const { user: me } = useAuth();

  const [members, setMembers] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileUser, setProfileUser] = useState(null); // user to show in mini-profile
  const [tab, setTab] = useState("members"); // members | add
  const debounceRef = useRef(null);

  // Load channel members when panel opens
  useEffect(() => {
    if (!open || !activeChannel || !activeWorkspace) return;
    api.get(`/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}`)
      .then(({ data }) => {
        const populated = (data.data?.members || []).map((m) => m.user || m).filter(Boolean);
        setMembers(populated);
      })
      .catch(() => { });
  }, [open, activeChannel?._id, activeWorkspace?._id]);

  // Search workspace users
  useEffect(() => {
    if (!searchQ.trim() || !activeWorkspace) { setSearchRes([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/users/workspaces/${activeWorkspace._id}/search`,
          { params: { q: searchQ } }
        );
        setSearchRes(data.data || []);
      } catch { }
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

  const handleOpenDM = (targetUser) => {
    onOpenDM(targetUser);
    onClose();
  };

  const handleViewProfile = (targetUser) => setProfileUser(targetUser);

  const filtered = members.filter((m) =>
    !searchQ || (m.displayName || m.username || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 300, zIndex: 50,
        background: "#1e1e2e",
        borderLeft: "0.5px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e0e0f0" }}>
              #{activeChannel?.displayName || activeChannel?.name}
            </div>
            <div style={{ fontSize: 11, color: "#5050a0", marginTop: 2 }}>{members.length} member{members.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6060a0", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center" }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "0.5px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          {["members", "add"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearchQ(""); setProfileUser(null); }}
              style={{
                flex: 1, padding: "10px 0",
                background: "transparent", border: "none",
                borderBottom: tab === t ? "2px solid #5d5fe8" : "2px solid transparent",
                color: tab === t ? "#a0a0f8" : "#6060a0",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                textTransform: "capitalize", transition: "all 0.15s",
              }}
            >
              {t === "members" ? `Members (${members.length})` : "Add People"}
            </button>
          ))}
        </div>

        {/* ── Members tab ── */}
        {tab === "members" && (
          <>
            {/* Search within members */}
            <div style={{ padding: "10px 12px", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#5050a0", pointerEvents: "none" }} />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Filter members…"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "6px 10px 6px 28px", fontSize: 12, color: "#c0c0d8", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Member list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.length === 0 && (
                <p style={{ fontSize: 12, color: "#4040a0", textAlign: "center", padding: "20px 0" }}>No members found</p>
              )}
              {filtered.map((m) => (
                <MemberRow key={m._id} member={m} onOpenDM={handleOpenDM} onViewProfile={handleViewProfile} />
              ))}
            </div>
          </>
        )}

        {/* ── Add People tab ── */}
        {tab === "add" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {/* Search workspace members */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Search by name or username
              </p>
              <div style={{ position: "relative" }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#5050a0", pointerEvents: "none" }} />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Find someone in workspace…"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 6, padding: "7px 10px 7px 28px", fontSize: 12, color: "#c0c0d8", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {searchQ && (
                <div style={{ marginTop: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8, overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                  {searchRes.length === 0 && (
                    <p style={{ fontSize: 12, color: "#4040a0", textAlign: "center", padding: "14px 0" }}>No results</p>
                  )}
                  {searchRes.map((u) => (
                    <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                      <MemberAvatar user={u} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#d0d0f0", fontWeight: 500 }}>{u.displayName || u.username}</div>
                        <div style={{ fontSize: 10, color: "#5050a0" }}>@{u.username}</div>
                      </div>
                      <button
                        onClick={() => handleOpenDM(u)}
                        style={{ background: "rgba(93,95,232,0.2)", border: "0.5px solid rgba(93,95,232,0.4)", borderRadius: 5, padding: "3px 8px", color: "#8080e8", fontSize: 11, cursor: "pointer" }}
                      >
                        DM
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invite link section */}
            <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: "#7070a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Invite link
              </p>
              <p style={{ fontSize: 12, color: "#5050a0", marginBottom: 12, lineHeight: 1.5 }}>
                Share this link with people you want to invite to the workspace.
              </p>

              {!inviteUrl ? (
                <button
                  onClick={generateInvite}
                  disabled={inviteLoading}
                  style={{
                    width: "100%", background: "#5d5fe8", border: "none",
                    borderRadius: 8, padding: "9px 0", fontSize: 13,
                    color: "#fff", cursor: inviteLoading ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: inviteLoading ? 0.7 : 1,
                  }}
                >
                  <i className="ti ti-link" />
                  {inviteLoading ? "Generating…" : "Generate Invite Link"}
                </button>
              ) : (
                <div>
                  <div style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "8px 10px",
                    fontSize: 11, color: "#8080a8",
                    wordBreak: "break-all", marginBottom: 8,
                  }}>
                    {inviteUrl}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={copyInvite}
                      style={{
                        flex: 1, background: copied ? "rgba(61,184,122,0.2)" : "rgba(255,255,255,0.07)",
                        border: copied ? "0.5px solid rgba(61,184,122,0.4)" : "0.5px solid rgba(255,255,255,0.1)",
                        borderRadius: 7, padding: "7px 0", fontSize: 12,
                        color: copied ? "#6ee7b7" : "#c0c0d8", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}
                    >
                      <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => setInviteUrl("")}
                      style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#6060a0", cursor: "pointer" }}
                      title="Regenerate"
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
  const initials = (user.displayName || user.username || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={onClose} />
      <div style={{
        position: "fixed", right: 316, top: "50%", transform: "translateY(-50%)",
        width: 260, background: "#252538",
        border: "0.5px solid rgba(255,255,255,0.12)",
        borderRadius: 12, zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        {/* Cover */}
        <div style={{ height: 60, background: `linear-gradient(135deg,${user.avatarColor || "#5d5fe8"}80,#1e1e2e)` }} />

        {/* Avatar */}
        <div style={{ padding: "0 16px", marginTop: -28, marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: user.avatarColor || "#5d5fe8",
            border: "3px solid #252538",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 600, color: "#fff", overflow: "hidden",
          }}>
            {user.avatar
              ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials}
          </div>
        </div>

        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e0e0f0" }}>{user.displayName || user.username}</div>
          <div style={{ fontSize: 12, color: "#6060a0", marginBottom: 4 }}>@{user.username}</div>

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[user.status || "offline"] }} />
            <span style={{ fontSize: 11, color: "#7070a0", textTransform: "capitalize" }}>{user.status || "offline"}</span>
            {user.customStatus?.text && (
              <span style={{ fontSize: 11, color: "#6060a0" }}>· {user.customStatus.emoji} {user.customStatus.text}</span>
            )}
          </div>

          {user.bio && (
            <p style={{ fontSize: 12, color: "#8080a0", marginBottom: 12, lineHeight: 1.5 }}>{user.bio}</p>
          )}

          {!isMe && (
            <button
              onClick={onOpenDM}
              style={{
                width: "100%", background: "#5d5fe8", border: "none",
                borderRadius: 7, padding: "8px 0", fontSize: 13,
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <i className="ti ti-message-circle" /> Send Message
            </button>
          )}
        </div>
      </div>
    </>
  );
}