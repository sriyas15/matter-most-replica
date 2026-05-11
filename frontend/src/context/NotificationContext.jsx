import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api           from "../lib/api";
import { getSocket } from "../lib/socket/socket";
import { useAuth }   from "./AuthContext";
import { useWorkspace } from "./WorkspaceContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user }            = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [mentions, setMentions]             = useState([]);    // type==="mention"
  const [loading, setLoading]               = useState(false);

  // ── Fetch notifications when workspace changes ──────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!activeWorkspace || !user) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/workspaces/${activeWorkspace._id}/notifications`,
        { params: { limit: 50 } }
      );
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
      setMentions((data.data || []).filter((n) => n.type === "mention"));
    } catch {}
    finally { setLoading(false); }
  }, [activeWorkspace?._id, user?._id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Socket: real-time notifications ────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // notification:new — from createNotification() in backend
    const onNew = (notification) => {
      setNotifications((prev) => {
        if (prev.find((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((c) => c + 1);
      if (notification.type === "mention") {
        setMentions((prev) => [notification, ...prev]);
      }
    };

    // notification:mention — from socket message handler @mention parsing
    const onMention = ({ message, channelId }) => {
      const synthetic = {
        _id:       `tmp-${Date.now()}`,
        type:      "mention",
        actor:     message.sender,
        message:   message,
        channel:   { _id: channelId },
        preview:   message.text?.slice(0, 120) || "",
        isRead:    false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [synthetic, ...prev]);
      setUnreadCount((c) => c + 1);
      setMentions((prev) => [synthetic, ...prev]);
    };

    // notification:dm — from socket DM handler
    const onDMNotif = ({ message, channelId }) => {
      const synthetic = {
        _id:       `tmp-dm-${Date.now()}`,
        type:      "direct_message",
        actor:     message.sender,
        message:   message,
        channel:   { _id: channelId },
        preview:   message.text?.slice(0, 120) || "",
        isRead:    false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [synthetic, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    socket.on("notification:new",     onNew);
    socket.on("notification:mention", onMention);
    socket.on("notification:dm",      onDMNotif);

    return () => {
      socket.off("notification:new",     onNew);
      socket.off("notification:mention", onMention);
      socket.off("notification:dm",      onDMNotif);
    };
  }, []);

  // ── Mark single as read ─────────────────────────────────────────────────────
  const markRead = useCallback(async (notificationId) => {
    if (!activeWorkspace) return;
    // Optimistic
    setNotifications((prev) =>
      prev.map((n) => n._id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(
        `/workspaces/${activeWorkspace._id}/notifications/${notificationId}/read`
      );
    } catch {}
  }, [activeWorkspace?._id]);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!activeWorkspace) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch(`/workspaces/${activeWorkspace._id}/notifications/read-all`);
    } catch {}
  }, [activeWorkspace?._id]);

  // ── Delete single ───────────────────────────────────────────────────────────
  const deleteOne = useCallback(async (notificationId) => {
    if (!activeWorkspace) return;
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    try {
      await api.delete(
        `/workspaces/${activeWorkspace._id}/notifications/${notificationId}`
      );
    } catch {}
  }, [activeWorkspace?._id]);

  const unreadMentions = mentions.filter((m) => !m.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, mentions, unreadMentions,
      loading, markRead, markAllRead, deleteOne, fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);