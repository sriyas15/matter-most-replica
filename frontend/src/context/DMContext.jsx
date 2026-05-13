import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api";
import { getSocket } from "../lib/socket/socket";
import { useAuth } from "./AuthContext";
import { useWorkspace } from "./WorkspaceContext";

const DMContext = createContext(null);

export function DMProvider({ children }) {
  const { user, socketReady }   = useAuth();
  const { activeWorkspace }     = useWorkspace();

  const [dms, setDms]                 = useState([]);
  const [activeDM, setActiveDM]       = useState(null);
  const [dmMessages, setDmMessages]   = useState([]);
  const [dmUnread, setDmUnread]       = useState({});
  const [loadingDMs, setLoadingDMs]   = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ── Load DM list ────────────────────────────────────────────────────────────
  const refreshDMs = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingDMs(true);
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace._id}/dms`);
      setDms(data.data || []);
    } catch {}
    finally { setLoadingDMs(false); }
  }, [activeWorkspace?._id]);

  useEffect(() => {
    if (activeWorkspace && user) refreshDMs();
    else setDms([]);
  }, [activeWorkspace?._id, user?._id]);

  // ── Load messages + join room when DM opens ─────────────────────────────────
  useEffect(() => {
    if (!activeDM || !activeWorkspace) { setDmMessages([]); return; }

    setLoadingMsgs(true);
    api
      .get(`/workspaces/${activeWorkspace._id}/dms/${activeDM._id}/messages`)
      .then(({ data }) => setDmMessages(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));

    const channelId = activeDM.channel?._id || activeDM.channel;

    if (socketReady) {
      const socket = getSocket();
      // FIX: was "join:channel" — correct name is "channel:join"
      if (socket){
        socket.emit("channel:join", { channelId },);
      } 
    }

    return () => {
      if (socketReady) {
        const s = getSocket();
        if (s) s.emit("channel:leave", { channelId });
      }
    };
  }, [activeDM?._id, activeWorkspace?._id, socketReady]);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socketReady) return;

    const socket = getSocket();
    if (!socket) return;

    const onNewMsg = (msg) => {
      const msgChannelId =
        msg.channel?._id?.toString?.() ??
        msg.channel?.toString?.() ??
        msg.channel;

      const dm = dms.find((d) => {
        const dmChannelId =
          d.channel?._id?.toString?.() ??
          d.channel?.toString?.() ??
          d.channel;
        return dmChannelId === msgChannelId;
      });

      if (!dm) return;

      if (activeDM?._id === dm._id) {
        setDmMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        setDmUnread((prev) => ({ ...prev, [dm._id]: (prev[dm._id] || 0) + 1 }));
      }

      setDms((prev) =>
        prev.map((d) =>
          d._id === dm._id
            ? { ...d, lastMessage: { text: msg.text, sender: msg.sender, sentAt: msg.createdAt } }
            : d
        )
      );
    };

    socket.on("message:new", onNewMsg);
    socket.on("dm:message",  onNewMsg);

    return () => {
      socket.off("message:new", onNewMsg);
      socket.off("dm:message",  onNewMsg);
    };
  }, [socketReady, dms, activeDM?._id]);

  // ── Open DM with user ───────────────────────────────────────────────────────
  const openDMWithUser = useCallback(async (targetUser) => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.post(`/workspaces/${activeWorkspace._id}/dms`, {
        recipientId: targetUser._id,
      });
      const dm = data.data;
      setDms((prev) => (prev.find((d) => d._id === dm._id) ? prev : [dm, ...prev]));
      setActiveDM(dm);
      setDmUnread((prev) => ({ ...prev, [dm._id]: 0 }));
      return dm;
    } catch (err) {
      console.error("openDMWithUser:", err);
    }
  }, [activeWorkspace?._id]);

  // ── Select existing DM ──────────────────────────────────────────────────────
  const selectDM = useCallback((dm) => {
    setActiveDM(dm);
    setDmUnread((prev) => ({ ...prev, [dm._id]: 0 }));
    if (activeWorkspace) {
      api.patch(`/workspaces/${activeWorkspace._id}/dms/${dm._id}/read`).catch(() => {});
    }
  }, [activeWorkspace?._id]);

  const closeDM = useCallback(() => setActiveDM(null), []);

  // ── Send DM message ─────────────────────────────────────────────────────────
  const sendDMMessage = useCallback(async (text, attachmentIds = []) => {
  if (!activeDM || !activeWorkspace) return;
  const channelId = activeDM.channel?._id || activeDM.channel;
  const { data } = await api.post(
    `/workspaces/${activeWorkspace._id}/channels/${channelId}/messages`,
    { text, attachments: attachmentIds }   // ← pass IDs; backend resolves to sub-docs
  );
  setDmMessages((prev) => {
    if (prev.find((m) => m._id === data.data._id)) return prev;
    return [...prev, data.data];
  });
  return data.data;
}, [activeDM?._id, activeWorkspace?._id]);

  const totalDMUnread = Object.values(dmUnread).reduce((a, b) => a + b, 0);

  return (
    <DMContext.Provider value={{
      dms, activeDM, dmMessages, dmUnread, totalDMUnread,
      loadingDMs, loadingMsgs,
      openDMWithUser, selectDM, closeDM, sendDMMessage, refreshDMs,
    }}>
      {children}
    </DMContext.Provider>
  );
}

export const useDM = () => useContext(DMContext);