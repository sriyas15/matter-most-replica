import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  // FIX: track when the socket is actually connected so consumers
  // (ChatContext, DMContext) know when it's safe to register listeners
  const [socketReady, setSocketReady] = useState(false);

  const initSocket = () => {
    const socket = connectSocket();

    socket.on("presence:update", ({ userId, status }) => {
      setUser((prev) => {
        if (!prev || prev._id !== userId) return prev;
        return { ...prev, status };
      });
    });

    // FIX: flip socketReady only after the socket confirms connection
    if (socket.connected) {
      setSocketReady(true);
    } else {
      socket.once("connect", () => setSocketReady(true));
    }

    // If it disconnects and reconnects, keep socketReady true
    socket.on("reconnect", () => setSocketReady(true));

    return socket;
  };

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }

    async function restoreSession() {
      try {
        const { data } = await api.get("/users/me");
        setUser({ ...data.data, status: "online" });
        initSocket();
      } catch {
        localStorage.removeItem("accessToken");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    setUser({ ...data.user, status: "online" });
    initSocket();
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("accessToken", data.accessToken);
    setUser({ ...data.user, status: "online" });
    initSocket();
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("accessToken");
    setUser(null);
    setSocketReady(false);
    disconnectSocket();
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, socketReady, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);