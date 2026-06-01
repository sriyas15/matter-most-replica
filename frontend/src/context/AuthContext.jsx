import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketReady, setSocketReady] = useState(false);

  const initSocket = () => {
    const socket = connectSocket();

    // Keep logged-in user's own status in sync when server broadcasts it
    socket.on("presence:user_status", ({ userId, status }) => {
      setUser((prev) => {
        if (!prev || prev._id.toString() !== userId.toString()) return prev;
        return { ...prev, status };
      });
    });

    // Handle old event name too, in case backend uses both
    socket.on("presence:update", ({ userId, status }) => {
      setUser((prev) => {
        if (!prev || prev._id.toString() !== userId.toString()) return prev;
        return { ...prev, status };
      });
    });

    if (socket.connected) {
      setSocketReady(true);
    } else {
      socket.once("connect", () => setSocketReady(true));
    }

    socket.on("reconnect", () => setSocketReady(true));
    return socket;
  };

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = getAccessToken();
        if (!token) return;

        // ── FIX: removed manual proactive refresh block ───────────────────
        // The response interceptor in api.js already handles 401s by
        // refreshing the token and retrying automatically. Doing it manually
        // here too caused a race — both tried to refresh simultaneously,
        // the isRefreshing flag got confused, and one wiped the valid token.
        // Just fire /users/me directly — the interceptor handles it cleanly.
        const { data } = await api.get("/users/me");
        setUser(data.data);
        initSocket();
      } catch (err) {
        if (err.response?.status === 401) {
          clearAccessToken();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    initSocket();
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    initSocket();
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { }
    clearAccessToken();
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