import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { getSocket } from "../lib/socket/socket";
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
    ? new Date(info.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const typeLabel = {
    public: "Public",
    private: "Private",
    direct: "Direct Message",
    group: "Group",
  };

  return (
    <>
      <div className="fixed inset-0 z-[49]" onClick={onClose} />
      <div className="fixed top-[50px] right-0 bottom-0 w-[300px] z-50 bg-white border-l border-slate-200 flex flex-col shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
          <span className="text-[13px] font-semibold text-slate-800">Channel Info</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg flex items-center p-1 rounded-md border-none bg-transparent cursor-pointer transition-colors"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg text-blue-600 flex-shrink-0">
                <i className={`ti ${info?.type === "private" ? "ti-lock" : "ti-hash"}`} />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-slate-800">
                  {info?.displayName || info?.name || "—"}
                </div>
                <div className="text-[11px] text-blue-600 mt-0.5">
                  {typeLabel[info?.type] || info?.type || "Channel"}
                </div>
              </div>
            </div>

            <InfoSection title="Description">
              {info?.description ? (
                <p className="text-[12px] text-slate-500 leading-relaxed m-0">
                  {info.description}
                </p>
              ) : (
                <p className="text-[12px] text-slate-400 italic m-0">No description set.</p>
              )}
            </InfoSection>

            <InfoSection title="Details">
              <div className="flex flex-col gap-2.5">
                <InfoRow
                  icon="ti-users"
                  label="Members"
                  value={info?.memberCount ?? info?.members?.length ?? "—"}
                />
                {createdAt && (
                  <InfoRow icon="ti-calendar" label="Created" value={createdAt} />
                )}
                {info?.createdBy && (
                  <InfoRow
                    icon="ti-user"
                    label="Created by"
                    value={
                      info.members?.find((m) => m.role === "admin")?.user?.displayName ||
                      "Unknown"
                    }
                  />
                )}
                {info?.isReadOnly && (
                  <InfoRow icon="ti-pencil-off" label="Mode" value="Read-only" accent />
                )}
              </div>
            </InfoSection>

            {info?.topic && (
              <InfoSection title="Topic">
                <p className="text-[12px] text-slate-500 leading-relaxed m-0">{info.topic}</p>
              </InfoSection>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function InfoSection({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-2.5">
      <i className={`ti ${icon} text-[13px] text-slate-400 w-4 text-center`} />
      <span className="text-[12px] text-slate-500 flex-1">{label}</span>
      <span
        className={`text-[12px] font-medium ${accent ? "text-amber-500" : "text-slate-700"}`}
      >
        {String(value)}
      </span>
    </div>
  );
}

// ── useLiveMemberCount ────────────────────────────────────────────────────────
// Maintains an accurate live member count via:
//   1. HTTP fetch on channel change (initial hydration)
//   2. socket `channel:member_updated` event (join / leave / add — zero-latency)
//   3. Manual refresh() callable by MembersPanel after its own mutations
function useLiveMemberCount(workspace, channel, snapshotFallback) {
  const [liveCount, setLiveCount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // HTTP refresh — callable externally from MembersPanel after add/remove
  const refresh = useCallback(async () => {
    if (!workspace?._id || !channel?._id) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(
        `/workspaces/${workspace._id}/channels/${channel._id}`
      );
      const count =
        data.data?.members?.length ?? data.data?.memberCount ?? null;
      setLiveCount(count);
    } catch {
      // silently fail — snapshotFallback still shows
    } finally {
      setIsLoading(false);
    }
  }, [workspace?._id, channel?._id]);

  // HTTP fetch whenever the active channel changes
  useEffect(() => {
    if (!channel?._id) return;
    setLiveCount(null); // clear stale count from previous channel
    refresh();
  }, [channel?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time socket listener ─────────────────────────────────────────────
  // Listens for `channel:member_updated` emitted by the server on every
  // join / leave / addChannelMembers mutation and updates the badge instantly,
  // no polling required.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channel?._id) return;

    const handler = ({ channelId, memberCount }) => {
      if (channelId === channel._id) {
        setLiveCount(memberCount);
      }
    };

    socket.on("channel:member_updated", handler);
    return () => socket.off("channel:member_updated", handler);
  }, [channel?._id]);

  const displayCount = liveCount ?? snapshotFallback;

  return [displayCount, isLoading, refresh];
}

// ── Main ChatHeader ───────────────────────────────────────────────────────────
export default function ChatHeader({ onOpenMembers, isMember = true }) {
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const snapshotCount =
    activeChannel?.memberCount ?? activeChannel?.members?.length ?? 0;

  const [displayCount, isCountLoading, refreshCount] = useLiveMemberCount(
    activeWorkspace,
    activeChannel,
    snapshotCount
  );

  const handleOpenMembers = useCallback(() => {
    onOpenMembers(refreshCount);
  }, [onOpenMembers, refreshCount]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
        setResults([]);
        setInfoOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2 || !activeWorkspace) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/workspaces/${activeWorkspace._id}/messages/search`,
          { params: { q: query, channelId: activeChannel?._id } }
        );
        setResults((data.data || []).slice(0, 8));
      } catch {}
    }, 350);
  }, [query, activeWorkspace?._id, activeChannel?._id]);

  const channelName = activeChannel?.displayName || activeChannel?.name || "";
  const isPrivate = activeChannel?.type === "private";

  return (
    <>
      <div className="h-[50px] flex items-center px-4 border-b border-slate-200 flex-shrink-0 bg-white justify-between relative z-10">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-800">
            <i
              className={`ti ${isPrivate ? "ti-lock" : "ti-hash"} text-[14px] text-slate-400`}
            />
            <span>{channelName}</span>
          </div>

          {isMember && (
            <button
              onClick={handleOpenMembers}
              title="View members"
              className="flex items-center gap-1 text-[12px] text-slate-500 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-md px-2 py-1 cursor-pointer transition-colors font-inherit min-w-[48px]"
            >
              <i className="ti ti-users text-[12px]" />
              {isCountLoading ? (
                <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin inline-block ml-0.5" />
              ) : (
                <span>{displayCount > 0 ? displayCount : "—"}</span>
              )}
            </button>
          )}
        </div>

        {/* Right */}
        <div className="flex gap-1 items-center">
          {isMember && (
            <>
              {searchOpen ? (
                <div className="relative">
                  <input
                    ref={searchRef}
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => {
                      if (!query) {
                        setSearchOpen(false);
                        setResults([]);
                      }
                    }}
                    placeholder="Search messages…"
                    className="bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md px-3 py-1.5 text-[12px] text-slate-800 outline-none w-[220px] transition-all placeholder:text-slate-400"
                  />
                  {results.length > 0 && (
                    <div className="absolute top-[110%] right-0 w-[340px] bg-white border border-slate-200 rounded-xl z-50 overflow-hidden shadow-xl">
                      <div className="px-3 py-1.5 border-b border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                          {results.length} result{results.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {results.map((msg) => (
                        <div
                          key={msg._id}
                          className="px-3 py-2.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div className="text-[11px] text-slate-400 mb-0.5">
                            {msg.sender?.displayName} ·{" "}
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[12px] text-slate-600 truncate">{msg.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <ActionBtn
                  icon="ti-search"
                  label="Search in channel"
                  onClick={() => setSearchOpen(true)}
                />
              )}
              <ActionBtn icon="ti-pin" label="Pinned messages" onClick={() => {}} />
            </>
          )}

          <ActionBtn
            icon="ti-info-circle"
            label="Channel info"
            onClick={() => setInfoOpen((p) => !p)}
            active={infoOpen}
          />
        </div>
      </div>

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
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`w-[30px] h-[30px] rounded-md flex items-center justify-center text-[16px] border-none cursor-pointer transition-colors ${
        active
          ? "bg-blue-50 text-blue-600"
          : "bg-transparent text-slate-400 hover:text-blue-600 hover:bg-blue-50"
      }`}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}