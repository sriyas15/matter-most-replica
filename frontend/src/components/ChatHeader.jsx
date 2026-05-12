import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../lib/api";

// ── Channel Info Panel ────────────────────────────────────────────────────────
function ChannelInfoPanel({ channel, workspace, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!channel || !workspace) return;
    setLoading(true);
    api
      .get(`/workspaces/${workspace._id}/channels/${channel._id}`)
      .then(({ data }) => setDetails(data.data || data))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [channel?._id, workspace?._id]);

  const info = details || channel;
  const createdAt = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

  const typeLabel = { public: "Public", private: "Private", direct: "Direct Message", group: "Group" };
console.log(details)
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 50, right: 0, bottom: 0,
        width: 300, zIndex: 50,
        background: "#1e1e2e",
        borderLeft: "0.5px solid rgba(255,255,255,0.09)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.35)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px 12px",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#d8d8f0" }}>Channel Info</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#5050a0", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", padding: 2 }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#5d5fe8",
              display: "inline-block", animation: "spin 0.7s linear infinite",
            }} />
          </div>
        ) : (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Channel name + type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "rgba(93,95,232,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, color: "#7d7fe8",
                }}>
                  <i className={`ti ${info?.type === "private" ? "ti-lock" : "ti-hash"}`} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e0e0f8" }}>
                    {info?.displayName || info?.name || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#5d5fe8", marginTop: 1 }}>
                    {typeLabel[info?.type] || info?.type || "Channel"}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {info?.description ? (
              <InfoSection title="Description">
                <p style={{ fontSize: 12, color: "#9090b8", lineHeight: 1.6, margin: 0 }}>
                  {info.description}
                </p>
              </InfoSection>
            ) : (
              <InfoSection title="Description">
                <p style={{ fontSize: 12, color: "#4040a0", fontStyle: "italic", margin: 0 }}>No description set.</p>
              </InfoSection>
            )}

            {/* Stats */}
            <InfoSection title="Details">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <InfoRow icon="ti-users" label="Members" value={info?.memberCount ?? info?.members?.length ?? "—"} />
                {createdAt && <InfoRow icon="ti-calendar" label="Created" value={createdAt} />}
                {info?.createdBy && (
                  <InfoRow
                    icon="ti-user"
                    label="Created by"
                    value={info.members.find((m) => m.role === "admin")?.user?.displayName || "Unknown" }
                  />
                )}
                {info?.isReadOnly && (
                  <InfoRow icon="ti-pencil-off" label="Mode" value="Read-only" accent />
                )}
              </div>
            </InfoSection>

            {/* Topic */}
            {info?.topic && (
              <InfoSection title="Topic">
                <p style={{ fontSize: 12, color: "#9090b8", lineHeight: 1.6, margin: 0 }}>{info.topic}</p>
              </InfoSection>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function InfoSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#4040a0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 13, color: "#5050a0", width: 16, textAlign: "center" }} />
      <span style={{ fontSize: 12, color: "#6060a0", flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: accent ? "#f0a22a" : "#a0a0c0", fontWeight: 500 }}>{String(value)}</span>
    </div>
  );
}

// ── Main ChatHeader ───────────────────────────────────────────────────────────
export default function ChatHeader({ onOpenMembers }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [searchOpen, setSearchOpen]   = useState(false);
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState([]);
  const [infoOpen, setInfoOpen]       = useState(false);
  const searchRef                     = useRef(null);
  const debounceRef                   = useRef(null);

  // Close search on Escape
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { setSearchOpen(false); setQuery(""); setResults([]); setInfoOpen(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2 || !activeWorkspace) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/workspaces/${activeWorkspace._id}/messages/search`,
          { params: { q: query, channelId: activeChannel?._id } }
        );
        setResults((data.data || []).slice(0, 8));
      } catch { }
    }, 350);
  }, [query, activeWorkspace?._id, activeChannel?._id]);

  const channelName  = activeChannel?.displayName || activeChannel?.name || "";
  const memberCount  = activeChannel?.memberCount ?? 0;
  const isPrivate    = activeChannel?.type === "private";

  return (
    <>
      <div style={styles.topbar}>
        {/* Left: channel title + clickable member count */}
        <div style={styles.left}>
          <div style={styles.title}>
            <i className={`ti ${isPrivate ? "ti-lock" : "ti-hash"}`} style={styles.titleIcon} />
            <span>{channelName}</span>
          </div>

          {memberCount > 0 && (
            <button
              onClick={onOpenMembers}
              title="View members"
              style={styles.memberPill}
            >
              <i className="ti ti-users" style={{ fontSize: 12 }} />
              <span>{memberCount}</span>
            </button>
          )}
        </div>

        {/* Right: actions — no duplicate members button */}
        <div style={styles.actions}>
          {searchOpen ? (
            <div style={{ position: "relative" }}>
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => { if (!query) { setSearchOpen(false); setResults([]); } }}
                placeholder="Search messages…"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 6, padding: "5px 10px",
                  fontSize: 12, color: "#d0d0f0", outline: "none", width: 220,
                }}
              />
              {results.length > 0 && (
                <div style={{
                  position: "absolute", top: "110%", right: 0, width: 340,
                  background: "#2a2a3e",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, zIndex: 50, overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ padding: "6px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
                    <span style={{ fontSize: 10, color: "#5050a0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {results.length} result{results.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {results.map((msg) => (
                    <div
                      key={msg._id}
                      style={{ padding: "9px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ fontSize: 11, color: "#5050a0", marginBottom: 3 }}>
                        {msg.sender?.displayName} · {new Date(msg.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: 12, color: "#a0a0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ActionBtn icon="ti-search" label="Search in channel" onClick={() => setSearchOpen(true)} />
          )}

          <ActionBtn icon="ti-pin" label="Pinned messages" onClick={() => {}} />

          <ActionBtn
            icon="ti-info-circle"
            label="Channel info"
            onClick={() => setInfoOpen((p) => !p)}
            active={infoOpen}
          />
        </div>
      </div>

      {/* Channel info slide-in panel */}
      {infoOpen && (
        <ChannelInfoPanel
          channel={activeChannel}
          workspace={activeWorkspace}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </>
  );
}

function ActionBtn({ icon, label, onClick, active }) {
  return (
    <button
      style={{
        ...styles.actionBtn,
        background: active ? "rgba(93,95,232,0.18)" : "transparent",
        color: active ? "#7d7fe8" : "#8080a8",
      }}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}

const styles = {
  topbar: {
    height: 50, display: "flex", alignItems: "center", padding: "0 16px",
    borderBottom: "0.5px solid rgba(255,255,255,0.07)",
    flexShrink: 0, background: "#25253a", justifyContent: "space-between",
    position: "relative", zIndex: 10,
  },
  left: { display: "flex", alignItems: "center", gap: 12 },
  title: { fontSize: 14, fontWeight: 500, color: "#d8d8f0", display: "flex", alignItems: "center", gap: 6 },
  titleIcon: { fontSize: 14, color: "#7070a0" },
  memberPill: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#7070a0",
    background: "rgba(255,255,255,0.05)",
    border: "0.5px solid rgba(255,255,255,0.08)",
    borderRadius: 6, padding: "3px 8px",
    cursor: "pointer", transition: "background 0.15s, color 0.15s",
    fontFamily: "inherit",
  },
  actions: { display: "flex", gap: 4, alignItems: "center" },
  actionBtn: {
    width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 16, cursor: "pointer",
    border: "none", transition: "background 0.15s, color 0.15s",
  },
};