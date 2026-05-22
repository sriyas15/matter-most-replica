import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  isTokenExpiredOrExpiring,
  refreshAccessToken,
} from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [socketReady, setSocketReady] = useState(false);

  const initSocket = () => {
    const socket = connectSocket();

    socket.on("presence:update", ({ userId, status }) => {
      setUser((prev) => {
        if (!prev || prev._id !== userId) return prev;
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

        // ── Proactive refresh BEFORE hitting /users/me ──────────────────────
        // This is safe to await here (not inside an axios interceptor).
        // If the token expires in the next 30s, refresh it now so the
        // subsequent /users/me call never hits a 401 in the first place.
        if (isTokenExpiredOrExpiring(token, 30)) {
          try {
            await refreshAccessToken();
          } catch {
            // Refresh token itself is expired — clear and go to login
            clearAccessToken();
            return;
          }
        }

        const { data } = await api.get("/users/me");
        setUser({ ...data.data, status: "online" });
        initSocket();
      } catch (err) {
        // Only wipe the token on a real auth failure, not a network blip
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
    setUser({ ...data.user, status: "online" });
    initSocket();
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setAccessToken(data.accessToken);
    setUser({ ...data.user, status: "online" });
    initSocket();
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
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