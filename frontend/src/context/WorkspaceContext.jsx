import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWS] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loading, setLoading] = useState(true); // ← start true to avoid flash

  // Fetch workspaces when user logs in
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWS(null);
      setLoading(false);
      return;
    }
    api.get("/workspaces").then(({ data }) => {
      setWorkspaces(data.data);
      if (data.data.length) setActiveWS(data.data[0]);
      else setLoading(false); // no workspaces — stop loading
    });
  }, [user]);

  // Fetch channels when workspace changes
  useEffect(() => {
    if (!activeWorkspace) {
      setChannels([]);
      setActiveChannel(null);
      return;
    }
    setLoading(true);
    api
      .get(`/workspaces/${activeWorkspace._id}/channels`)
      .then(({ data }) => {
        setChannels(data.data);
        setActiveChannel((prev) => {
          // Keep current channel if it still exists in the new list
          if (prev) {
            const stillExists = data.data.find((c) => c._id === prev._id);
            if (stillExists) return stillExists;
          }
          // ── KEY FIX: never auto-select a direct/group channel ──
          // The channels API returns ALL types including type:"direct".
          // Picking data[0] blindly causes a DM-looking view on login/refresh.
          const firstReal = data.data.find(
            (c) => c.type === "public" || c.type === "private"
          );
          return firstReal ?? null;
        });
      })
      .finally(() => setLoading(false));
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

  const addChannel = useCallback((ch) => setChannels((p) => [...p, ch]), []);

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
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);