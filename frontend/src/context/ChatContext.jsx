import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api          from "../lib/api";
import { getSocket } from "../lib/socket/socket";
import { useWorkspace } from "./WorkspaceContext";
import { useAuth }   from "./AuthContext";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, socketReady }              = useAuth();
  const { activeWorkspace, activeChannel } = useWorkspace();
  const [messages, setMessages]            = useState([]);
  const [typingUsers, setTypingUsers]      = useState([]);
  const [hasMore, setHasMore]              = useState(false);
  const [loadingMsgs, setLoadingMsgs]      = useState(false);
  const typingTimers                       = useRef({});
  const activeChannelIdRef                 = useRef(null);
  // Tracks whether socket listeners have been registered yet.
  // channel:join must not fire until this is true.
  const listenersReadyRef                  = useRef(false);

  useEffect(() => {
    activeChannelIdRef.current = activeChannel?._id ?? null;
  }, [activeChannel?._id]);

  // ── EFFECT 1: Register socket listeners ───────────────────────────────────
  // Runs first (React guarantees top-down effect order).
  // Sets listenersReadyRef = true so Effect 2 knows it's safe to join.
  useEffect(() => {
    if (!socketReady) return;

    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg) => {
      const msgChannelId =
        msg.channel?._id?.toString?.() ??
        msg.channel?.toString?.() ??
        msg.channel;

      if (msgChannelId !== activeChannelIdRef.current) return;

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

    const onTypingStart = ({ userId: uid, displayName, channelId }) => {
      if (uid?.toString() === user?._id?.toString()) return;
      if (channelId !== activeChannelIdRef.current) return;
      setTypingUsers((prev) =>
        prev.includes(displayName) ? prev : [...prev, displayName]
      );
      clearTimeout(typingTimers.current[uid]);
      typingTimers.current[uid] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== displayName));
      }, 3000);
    };

    const onTypingStop = ({ userId: uid }) => {
      clearTimeout(typingTimers.current[uid]);
    };

    const onReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("message:new",              onNewMessage);
    socket.on("message:updated",          onMessageUpdated);
    socket.on("message:deleted",          onMessageDeleted);
    socket.on("message:typing",           onTypingStart);
    socket.on("message:stop_typing",      onTypingStop);
    socket.on("message:reaction_updated", onReactionUpdated);

    // Mark listeners as live — Effect 2 can now safely emit channel:join
    listenersReadyRef.current = true;

    // If a channel was already active before listeners were ready, join it now
    if (activeChannelIdRef.current) {
      socket.emit("channel:join", { channelId: activeChannelIdRef.current });
    }

    return () => {
      socket.off("message:new",              onNewMessage);
      socket.off("message:updated",          onMessageUpdated);
      socket.off("message:deleted",          onMessageDeleted);
      socket.off("message:typing",           onTypingStart);
      socket.off("message:stop_typing",      onTypingStop);
      socket.off("message:reaction_updated", onReactionUpdated);
      listenersReadyRef.current = false;
    };
  }, [socketReady]);

  // ── EFFECT 2: Load messages + join/leave channel room ─────────────────────
  // Only emits channel:join if listeners are already registered.
  // If not (socketReady not yet true), Effect 1 handles the join after setup.
  useEffect(() => {
    if (!activeChannel || !activeWorkspace) { setMessages([]); return; }

    setLoadingMsgs(true);
    setTypingUsers([]);

    api
      .get(`/workspaces/${activeWorkspace._id}/channels/${activeChannel._id}/messages`)
      .then(({ data }) => {
        setMessages(data.data);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoadingMsgs(false));

    // Only join if listeners are already live (Effect 1 ran first)
    if (listenersReadyRef.current) {
      const socket = getSocket();
      if (socket) socket.emit("channel:join", { channelId: activeChannel._id });
    }

    return () => {
      const s = getSocket();
      if (s) s.emit("channel:leave", { channelId: activeChannel._id });
    };
  }, [activeChannel?._id, activeWorkspace?._id]);

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
      messages, typingUsers, hasMore, loadingMsgs,
      sendMessage, loadMoreMessages, emitTyping,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);