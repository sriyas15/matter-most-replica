import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api";
import { getSocket } from "../lib/socket/socket";
import { useWorkspace } from "./WorkspaceContext";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, socketReady } = useAuth();
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const typingTimers = useRef({});

  // ── Single effect: register listeners + join room + load messages ──────────
  useEffect(() => {
    if (!socketReady || !activeChannel || !activeWorkspace) {
      setMessages([]);
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    const channelId = activeChannel._id;

    // 1. Clear typing state + timers from previous channel
    setTypingUsers([]);
    Object.values(typingTimers.current).forEach(clearTimeout);
    typingTimers.current = {};

    // 2. Register listeners BEFORE joining the room
    const onNewMessage = (msg) => {
      const msgChannelId =
        msg.channel?._id?.toString?.() ??
        msg.channel?.toString?.() ??
        msg.channel;
      if (msgChannelId !== channelId) return;
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const onMessageUpdated = ({ messageId, text, isEdited, editedAt }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, text, isEdited, editedAt } : m))
      );
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    // Track by { uid, displayName } so stop_typing can remove by uid
    const onTypingStart = ({ userId: uid, displayName, channelId: cid }) => {
      if (uid?.toString() === user?._id?.toString()) return;
      if (cid?.toString() !== channelId?.toString()) return;
        console.log("[onTypingStart] uid:", uid, "| displayName:", displayName);
      setTypingUsers((prev) =>
        prev.find((u) => u.uid === uid) ? prev : [...prev, { uid, displayName }]
      );
      clearTimeout(typingTimers.current[uid]);
      typingTimers.current[uid] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.uid !== uid));
      }, 3000);
    };

    // Server only sends userId — no displayName — so filter by uid
    const onTypingStop = ({ userId: uid }) => {
      clearTimeout(typingTimers.current[uid]);
      delete typingTimers.current[uid];
      setTypingUsers((prev) => prev.filter((u) => u.uid !== uid));
    };

    const onReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:updated", onMessageUpdated);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:typing", onTypingStart);
    socket.on("message:stop_typing", onTypingStop);
    socket.on("message:reaction_updated", onReactionUpdated);

    socket.on("message:typing", (data) => {
  console.log("[raw typing]", data);
});

    // 3. Join room — listeners are live so no messages will be missed
    socket.emit("channel:join", { channelId });

    // 4. Load messages
    setLoadingMsgs(true);
    api
      .get(`/workspaces/${activeWorkspace._id}/channels/${channelId}/messages`)
      .then(({ data }) => {
        setMessages(data.data);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoadingMsgs(false));

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:updated", onMessageUpdated);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:typing", onTypingStart);
      socket.off("message:stop_typing", onTypingStop);
      socket.off("message:reaction_updated", onReactionUpdated);
      socket.emit("channel:leave", { channelId });
      // Clear typing state on leave
      setTypingUsers([]);
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
    };
  }, [socketReady, activeChannel?._id, activeWorkspace?._id]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!activeChannel || !activeWorkspace) return;
    const { data } = await api.post(
      `/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/messages`,
      { text }
    );
    setMessages((prev) => {
      if (prev.find((m) => m._id === data.data._id)) return prev;
      return [...prev, data.data];
    });
    return data.data;
  }, [activeChannel?._id, activeWorkspace?._id]);

  // ── Load older messages ────────────────────────────────────────────────────
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMsgs || !messages.length) return;
    setLoadingMsgs(true);
    const oldest = messages[0];
    const { data } = await api.get(
      `/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/messages`,
      { params: { before: oldest.createdAt, limit: 50 } }
    );
    setMessages((prev) => [...data.data, ...prev]);
    setHasMore(data.hasMore);
    setLoadingMsgs(false);
  }, [hasMore, loadingMsgs, messages, activeChannel, activeWorkspace]);

  // ── Emit typing ────────────────────────────────────────────────────────────
  const emitTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (!socket || !activeChannel) return;
    socket.emit(
      isTyping ? "message:typing" : "message:stop_typing",
      { channelId: activeChannel._id }
    );
  }, [activeChannel?._id]);

 return (
  <ChatContext.Provider value={{
    messages, 
    typingUsers: typingUsers.map((u) => {
      console.log("[typingUsers map] u:", u);
      return u.displayName;
    }),
    hasMore, loadingMsgs,
    sendMessage, loadMoreMessages, emitTyping,
  }}>
    {children}
  </ChatContext.Provider>
);
}

export const useChat = () => useContext(ChatContext);