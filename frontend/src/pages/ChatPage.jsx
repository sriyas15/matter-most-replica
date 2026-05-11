import { useState } from "react";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import ChatHeader       from "../components/ChatHeader";
import MessageList      from "../components/MessageList";
import MessageInput     from "../components/MessageInput";
import MembersPanel     from "../components/MembersPanel";
import DMPanel          from "../components/DMPanel";
import { useWorkspace } from "../context/WorkspaceContext";
import { useDM }        from "../context/DMContext";

function EmptyState() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#25253a" }}>
      <div style={{ fontSize: 52 }}>💬</div>
      <p style={{ color: "#6060a0", fontSize: 14, margin: 0 }}>Select a channel to start chatting</p>
      <p style={{ color: "#40406080", fontSize: 12, margin: 0 }}>
        Or create a new one with the <strong style={{ color: "#7070a0" }}>+</strong> button
      </p>
    </div>
  );
}

function ChatArea({ onOpenMembers }) {
  const { activeChannel } = useWorkspace();
  if (!activeChannel) return <EmptyState />;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: "#25253a" }}>
      <ChatHeader onOpenMembers={onOpenMembers} />
      <MessageList />
      <MessageInput channelName={activeChannel.displayName || activeChannel.name} />
    </div>
  );
}

export default function ChatPage() {
  const [membersOpen, setMembersOpen] = useState(false);
  const { openDMWithUser, activeDM }  = useDM();

  const handleOpenDM = async (targetUser) => {
    setMembersOpen(false);
    await openDMWithUser(targetUser);
  };

  // ChatProvider is now in App.jsx — do NOT wrap here
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <WorkspaceSidebar />

      <ChatArea onOpenMembers={() => setMembersOpen(true)} />

      <MembersPanel
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        onOpenDM={handleOpenDM}
      />

      {activeDM && <DMPanel />}
    </div>
  );
}