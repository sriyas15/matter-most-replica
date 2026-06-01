import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function setAccessToken(token) {
  localStorage.setItem("accessToken", token);
}

export function clearAccessToken() {
  localStorage.removeItem("accessToken");
}

// Decode JWT payload without a library
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// Returns true if token expires within bufferSeconds from now
export function isTokenExpiredOrExpiring(token, bufferSeconds = 30) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
}

// ── Refresh logic (queue-safe, called from response interceptor only) ─────────

let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

// Exported so AuthContext can call it proactively on boot
// in refreshAccessToken()
export async function refreshAccessToken() {
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const newToken = data.accessToken;
    if (!newToken) throw new Error("No access token in refresh response");
    setAccessToken(newToken);
    return newToken;
  } catch (err) {
    console.error("[refresh] failed:", err.response?.status, err.response?.data);
    throw err;
  }
}

// ── Request interceptor — sync only, just attaches the current token ──────────
// NOTE: Do NOT make this async. Axios request interceptors don't reliably
// await promises — the request fires before the promise settles, causing
// race conditions where the old expired token gets attached anyway.

api.interceptors.request.use((config) => {
  // Skip auth routes — they don't need a token
  if (config.url?.includes("/auth/")) return config;

  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handles 401 reactively ────────────────────────────

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    const isAuthRoute =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/register") ||
      original.url?.includes("/auth/refresh");

    if (err.response?.status === 401 && !original._retry && !isAuthRoute) {
      // Another request is already refreshing — queue this one
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAccessToken();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;