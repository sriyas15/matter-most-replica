import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import { getSocket } from "../lib/socket/socket";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, socketReady } = useAuth();
  const [workspaces, setWorkspaces]       = useState([]);
  const [activeWorkspace, setActiveWS]    = useState(null);
  const [channels, setChannels]           = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loading, setLoading]             = useState(true);

  // ── Members map: { [userId]: { status, displayName, avatar, ... } } ───────
  // Used by MessageItem to show live status on message avatars.
  const [members, setMembers] = useState({});

  // ── Listen for live presence broadcasts ──────────────────────────────────
  // Runs whenever socketReady flips true (i.e. after login / reconnect).
  useEffect(() => {
    if (!socketReady) return;
    const socket = getSocket();
    if (!socket) return;

    const handleStatus = ({ userId, status }) => {
      setMembers((prev) => ({
        ...prev,
        [userId.toString()]: {
          ...(prev[userId.toString()] || {}),
          status,
        },
      }));
    };

    socket.on("presence:user_status", handleStatus);
    // Handle old event name too, in case some parts of the backend still emit it
    socket.on("presence:update", handleStatus);

    return () => {
      socket.off("presence:user_status", handleStatus);
      socket.off("presence:update", handleStatus);
    };
  }, [socketReady]);

  // ── Fetch workspaces when user logs in ───────────────────────────────────
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWS(null);
      setMembers({});
      setLoading(false);
      return;
    }
    api.get("/workspaces").then(({ data }) => {
      setWorkspaces(data.data);
      if (data.data.length) setActiveWS(data.data[0]);
      else setLoading(false);
    });
  }, [user]);

  // ── Fetch channels + workspace members when workspace changes ────────────
  useEffect(() => {
    if (!activeWorkspace) {
      setChannels([]);
      setActiveChannel(null);
      return;
    }
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [channelsRes, membersRes] = await Promise.all([
          api.get(`/workspaces/${activeWorkspace._id}/channels`),
          // Fetch all workspace members to seed the members map with
          // current statuses — uses the same search endpoint as the sidebar
          api.get(`/workspaces/${activeWorkspace._id}/users/search`, {
            params: { q: "", limit: 200 },
          }),
        ]);

        setChannels(channelsRes.data.data);
        setActiveChannel((prev) => {
          if (prev) {
            const stillExists = channelsRes.data.data.find((c) => c._id === prev._id);
            if (stillExists) return stillExists;
          }
          const firstReal = channelsRes.data.data.find(
            (c) => c.type === "public" || c.type === "private"
          );
          return firstReal ?? null;
        });

        // Seed members map from the fetched list so MessageItem immediately
        // shows the correct status without waiting for a socket event
        const map = {};
        for (const m of membersRes.data.data || []) {
          map[m._id.toString()] = m;
        }
        setMembers(map);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [activeWorkspace?._id]);

  const selectChannel = useCallback((channel) => setActiveChannel(channel), []);

  const selectWorkspace = useCallback((ws) => {
    setActiveWS(ws);
    setActiveChannel(null);
  }, []);

  const refreshWorkspaces = useCallback(() => {
    api.get("/workspaces").then(({ data }) => {
      setWorkspaces(data.data);
      setActiveWS((prev) => {
        if (!prev) return prev;
        return data.data.find((w) => w._id === prev._id) ?? prev;
      });
    });
  }, []);

  const addChannel    = useCallback((ch) => setChannels((p) => [...p, ch]), []);

  const updateChannel = useCallback((ch) => {
    if (ch._remove) {
      setChannels((p) => p.filter((c) => c._id !== ch._id));
      setActiveChannel((prev) => (prev?._id === ch._id ? null : prev));
      return;
    }
    setChannels((p) => p.map((c) => (c._id === ch._id ? { ...c, ...ch } : c)));
    setActiveChannel((prev) =>
      prev?._id === ch._id ? { ...prev, ...ch } : prev
    );
  }, []);

  const myRole = activeWorkspace?.myRole ?? "member";

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        selectWorkspace,
        refreshWorkspaces,
        channels,
        activeChannel,
        selectChannel,
        loading,
        addChannel,
        updateChannel,
        myRole,
        // ── Exposed so MessageItem can overlay live status on sender ─────────
        members,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);