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
  const [loading, setLoading] = useState(false);

  // Fetch workspaces when user logs in
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWS(null);
      return;
    }
    api.get("/workspaces").then(({ data }) => {
      setWorkspaces(data.data);
      if (data.data.length) setActiveWS(data.data[0]);
    });
  }, [user]);

  // Fetch channels when workspace changes
  // ⚠️  Bug fix #1: removed the second api.get("/workspaces") call that was
  //     re-fetching all workspaces and blindly calling setActiveWS(data[0]),
  //     which overwrote whatever workspace the user had selected.
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
        // Only auto-select first channel on initial load, not on every refresh
        setActiveChannel((prev) => {
          // Keep the current channel if it still exists in the new list
          if (prev) {
            const stillExists = data.data.find((c) => c._id === prev._id);
            if (stillExists) return stillExists; // refresh its data (e.g. memberCount)
          }
          return data.data[0] ?? null;
        });
      })
      .finally(() => setLoading(false));
  }, [activeWorkspace?._id]);

  const selectChannel = useCallback((channel) => setActiveChannel(channel), []);

  // ⚠️  Bug fix #1 (continued): selectWorkspace now only updates the active
  //     workspace; it does NOT touch the workspaces list, so the switcher
  //     correctly highlights whatever the user clicked.
  const selectWorkspace = useCallback((ws) => {
    setActiveWS(ws);
    setActiveChannel(null);
  }, []);

  // Refresh the workspaces list without resetting the active workspace
  const refreshWorkspaces = useCallback(() => {
    api.get("/workspaces").then(({ data }) => {
      setWorkspaces(data.data);
      // If the active workspace was updated on the server, sync its data
      setActiveWS((prev) => {
        if (!prev) return prev;
        return data.data.find((w) => w._id === prev._id) ?? prev;
      });
    });
  }, []);

  const addChannel = useCallback((ch) => setChannels((p) => [...p, ch]), []);

  // ⚠️  Bug fix #4 (partial): updateChannel can now also remove a channel from
  //     the list when `_remove: true` is passed, so leaving works correctly.
  const updateChannel = useCallback((ch) => {
    if (ch._remove) {
      setChannels((p) => p.filter((c) => c._id !== ch._id));
      setActiveChannel((prev) => (prev?._id === ch._id ? null : prev));
      return;
    }
    setChannels((p) => p.map((c) => (c._id === ch._id ? { ...c, ...ch } : c)));
    // Also sync activeChannel if it's the one being updated
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