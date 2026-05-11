import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces]         = useState([]);
  const [activeWorkspace, setActiveWS]      = useState(null);
  const [channels, setChannels]             = useState([]);
  const [activeChannel, setActiveChannel]   = useState(null);
  const [loading, setLoading]               = useState(false);

  // Fetch workspaces when user logs in
  useEffect(() => {
    if (!user) { setWorkspaces([]); setActiveWS(null); return; }
    api.get("/workspaces").then(({ data }) => {
      setWorkspaces(data.data);
      if (data.data.length) setActiveWS(data.data[0]);
    });
  }, [user]);

  // Fetch channels when workspace changes
  useEffect(() => {
    if (!activeWorkspace) { setChannels([]); setActiveChannel(null); return; }
    setLoading(true);
    api.get(`/workspaces/${activeWorkspace._id}/channels`)
      .then(({ data }) => {
        setChannels(data.data);
        if (data.data.length && !activeChannel) setActiveChannel(data.data[0]);
      })
      .finally(() => setLoading(false));
  }, [activeWorkspace?._id]);

  const selectChannel = useCallback((channel) => setActiveChannel(channel), []);
  const selectWorkspace = useCallback((ws) => { setActiveWS(ws); setActiveChannel(null); }, []);

  const addChannel = useCallback((ch) => setChannels((p) => [...p, ch]), []);
  const updateChannel = useCallback((ch) => setChannels((p) => p.map((c) => c._id === ch._id ? ch : c)), []);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, activeWorkspace, selectWorkspace,
      channels, activeChannel, selectChannel,
      loading, addChannel, updateChannel,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);