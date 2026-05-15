import { useState, useCallback } from "react";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import MembersPanel from "../components/MembersPanel";
import DMPanel from "../components/DMPanel";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDM } from "../context/DMContext";
import api from "../lib/api";

// ── Empty state (no channel selected) ────────────────────────────────────────
function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        background: "white",
      }}
    >
      <div style={{ fontSize: 52 }}>💬</div>
      <p style={{ color: "#2563eb", fontSize: 14, margin: 0 }}>
        Select a channel to start chatting
      </p>
      <p style={{ fontSize: 12, margin: 0 }}>
        Or create a new one with the{" "}
        <strong style={{ color: "#7070a0" }}>+</strong> button
      </p>
    </div>
  );
}

// ── Join gate — shown to non-members of a public channel ─────────────────────
// ⚠️  Fix #5 / Feature: non-members see this instead of messages + members
function JoinChannelGate({ channel, onJoined }) {
  const { activeWorkspace, updateChannel, selectChannel } = useWorkspace();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      await api.post(
        `/workspaces/${activeWorkspace._id}/channels/${channel._id}/join`
      );
      // Mark channel as joined in context so the UI switches immediately
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
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        background: "white",
        padding: "0 24px",
      }}
    >
      {/* Channel icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#eff6ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          color: "#2563eb",
        }}
      >
        <i className={`ti ${channel.type === "private" ? "ti-lock" : "ti-hash"}`} />
      </div>

      {/* Name */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          #{channel.displayName || channel.name}
        </h2>
        {channel.description && (
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              color: "#64748b",
              maxWidth: 360,
              lineHeight: 1.6,
            }}
          >
            {channel.description}
          </p>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
          {channel.memberCount
            ? `${channel.memberCount} member${channel.memberCount !== 1 ? "s" : ""}`
            : "Public channel"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Join button */}
      <button
        onClick={handleJoin}
        disabled={joining}
        style={{
          background: joining ? "#93c5fd" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 10,
          padding: "10px 28px",
          fontSize: 14,
          fontWeight: 600,
          cursor: joining ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "background 0.15s",
        }}
      >
        <i className="ti ti-plus" />
        {joining ? "Joining…" : `Join #${channel.displayName || channel.name}`}
      </button>

      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
        You'll see all messages and members after joining.
      </p>
    </div>
  );
}

// ── Chat area ─────────────────────────────────────────────────────────────────
function ChatArea({ onOpenMembers }) {
  const { activeChannel } = useWorkspace();

  if (!activeChannel) return <EmptyState />;

  // ⚠️  Fix #5 / Feature: gate access for non-members
  // isMember is undefined for channels loaded before the fix — treat undefined
  // as true (backwards-compatible) so existing members aren't locked out.
  const isMember = activeChannel.isMember !== false;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        background: "white",
      }}
    >
      {/* Header always visible so the user can see channel name */}
      <ChatHeader onOpenMembers={onOpenMembers} isMember={isMember} />

      {isMember ? (
        <>
          <MessageList />
          <MessageInput
            channelName={activeChannel.displayName || activeChannel.name}
          />
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
  const { openDMWithUser, activeDM } = useDM();
  const { activeChannel } = useWorkspace();

  const handleOpenDM = useCallback(
    async (targetUser) => {
      setMembersOpen(false);
      await openDMWithUser(targetUser);
    },
    [openDMWithUser]
  );

  // Only allow opening the members panel if the user is a member
  const handleOpenMembers = useCallback(() => {
    if (activeChannel?.isMember !== false) {
      setMembersOpen(true);
    }
  }, [activeChannel]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <WorkspaceSidebar />

      <ChatArea onOpenMembers={handleOpenMembers} />

      {/* Members panel — only mount when channel membership is confirmed */}
      {activeChannel?.isMember !== false && (
        <MembersPanel
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          onOpenDM={handleOpenDM}
        />
      )}

      {activeDM && <DMPanel />}
    </div>
  );
}