import { useState, useCallback, useRef } from "react";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import MembersPanel from "../components/MembersPanel";
import DMPanel from "../components/DMPanel";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDM } from "../context/DMContext";
import api from "../lib/api";

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="h-[50px] border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="w-24 h-4 bg-slate-100 rounded animate-pulse" />
        <div className="w-12 h-6 bg-slate-100 rounded-md animate-pulse" />
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {[72, 48, 88, 56, 64].map((w, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse flex-shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%` }} />
              <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w * 0.6}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-white">
      <div style={{ fontSize: 52 }}>💬</div>
      <p style={{ color: "#2563eb", fontSize: 14, margin: 0 }}>
        Select a channel to start chatting
      </p>
      <p style={{ fontSize: 12, margin: 0, color: "#94a3b8" }}>
        Or create a new one with the <strong style={{ color: "#7070a0" }}>+</strong> button
      </p>
    </div>
  );
}

// ── Join gate ─────────────────────────────────────────────────────────────────
function JoinChannelGate({ channel, onJoined }) {
  const { activeWorkspace, updateChannel, selectChannel } = useWorkspace();
  const [joining, setJoining] = useState(false);
  const [error, setError]     = useState("");

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      await api.post(`/workspaces/${activeWorkspace._id}/channels/${channel._id}/join`);
      const updated = { ...channel, isMember: true };
      updateChannel(updated);
      selectChannel(updated);
      onJoined?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join channel");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-white px-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl text-blue-600">
        <i className={`ti ${channel.type === "private" ? "ti-lock" : "ti-hash"}`} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          #{channel.displayName || channel.name}
        </h2>
        {channel.description && (
          <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed mb-1">
            {channel.description}
          </p>
        )}
        <p className="text-xs text-slate-400">
          {channel.memberCount
            ? `${channel.memberCount} member${channel.memberCount !== 1 ? "s" : ""}`
            : "Public channel"}
        </p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-[13px]">
          {error}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={joining}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white border-none rounded-xl px-7 py-2.5 text-[14px] font-semibold cursor-pointer transition-colors"
      >
        <i className="ti ti-plus" />
        {joining ? "Joining…" : `Join #${channel.displayName || channel.name}`}
      </button>
      <p className="text-[11px] text-slate-400">
        You'll see all messages and members after joining.
      </p>
    </div>
  );
}

// ── Chat area ─────────────────────────────────────────────────────────────────
function ChatArea({ onOpenMembers }) {
  const { activeChannel, loading } = useWorkspace();

  // Channels still loading — show skeleton instead of empty state
  if (loading) return <LoadingSkeleton />;

  // Channels loaded but workspace has none yet
  if (!activeChannel) return <EmptyState />;

  const isMember = activeChannel.isMember !== false;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      <ChatHeader onOpenMembers={onOpenMembers} isMember={isMember} />
      {isMember ? (
        <>
          <MessageList />
          <MessageInput channelName={activeChannel.displayName || activeChannel.name} />
        </>
      ) : (
        <JoinChannelGate channel={activeChannel} />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [membersOpen, setMembersOpen] = useState(false);
  const { openDMWithUser, activeDM }  = useDM();
  const { activeChannel }             = useWorkspace();
  const refreshCountRef               = useRef(null);

  const handleOpenDM = useCallback(async (targetUser) => {
    setMembersOpen(false);
    await openDMWithUser(targetUser);
  }, [openDMWithUser]);

  const handleOpenMembers = useCallback((refreshCount) => {
    refreshCountRef.current = refreshCount;
    setMembersOpen(true);
  }, []);

  const handleMembersLoaded = useCallback(() => {
    refreshCountRef.current?.();
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <WorkspaceSidebar />

      {/* Channel chat is always the main content area */}
      <ChatArea onOpenMembers={handleOpenMembers} />

      {/* Members panel */}
      {activeChannel?.isMember !== false && (
        <MembersPanel
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          onOpenDM={handleOpenDM}
          onMembersLoaded={handleMembersLoaded}
        />
      )}

      {/* DM panel — floating popup in bottom-right, never replaces channel view */}
      {activeDM && <DMPanel />}
    </div>
  );
}