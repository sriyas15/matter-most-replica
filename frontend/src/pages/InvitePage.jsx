import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function InvitePage() {
  const { inviteToken }         = useParams();
  const { user, loading }       = useAuth();
  const navigate                = useNavigate();
  const [status, setStatus]     = useState("loading"); // loading | preview | joining | error | done
  const [workspace, setWorkspace] = useState(null);
  const [error, setError]       = useState("");

  // If already logged in → join immediately
  useEffect(() => {
    if (loading) return;
    if (user) {
      joinWorkspace();
    } else {
      // Store token so SignupPage can pick it up after registration
      sessionStorage.setItem("pendingInviteToken", inviteToken);
      setStatus("preview");
    }
  }, [loading, user]);

  const joinWorkspace = async () => {
    setStatus("joining");
    try {
      const { data } = await api.post(`/workspaces/join/${inviteToken}`);
      setWorkspace(data.data);
      setStatus("done");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired invite link");
      setStatus("error");
    }
  };

  // ── Joining spinner ───────────────────────────────────────────────────────
  if (status === "loading" || status === "joining") {
    return (
      <Screen>
        <Spinner />
        <p style={{ color: "#8080a8", fontSize: 14, marginTop: 16 }}>
          {status === "joining" ? "Joining workspace…" : "Loading…"}
        </p>
      </Screen>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <Screen>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h2 style={{ color: "#e0e0f0", fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
          You joined {workspace?.name}!
        </h2>
        <p style={{ color: "#6060a0", fontSize: 13 }}>Redirecting you to the workspace…</p>
      </Screen>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <Screen>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
          {error}
        </h2>
        <p style={{ color: "#6060a0", fontSize: 13, marginBottom: 20 }}>
          The invite link may have expired or already been used.
        </p>
        <Link to="/" style={{ color: "#8080e8", fontSize: 13 }}>Go to home</Link>
      </Screen>
    );
  }

  // ── Not logged in → show preview + CTA ───────────────────────────────────
  return (
    <Screen>
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "0.5px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: "36px 40px",
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg,#5d5fe8,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "#fff",
            margin: "0 auto 20px",
          }}
        >
          M
        </div>

        <h2 style={{ color: "#e0e0f0", fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
          You've been invited!
        </h2>
        <p style={{ color: "#7070a0", fontSize: 13, margin: "0 0 28px", lineHeight: 1.6 }}>
          Create an account or log in to join the workspace.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            to={`/signup?invite=${inviteToken}`}
            style={{
              display: "block",
              background: "#5d5fe8",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            Create account & join
          </Link>
          <Link
            to={`/login?invite=${inviteToken}`}
            style={{
              display: "block",
              background: "rgba(255,255,255,0.07)",
              color: "#c0c0d8",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              textAlign: "center",
              border: "0.5px solid rgba(255,255,255,0.1)",
            }}
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 36, height: 36,
        border: "3px solid rgba(93,95,232,0.2)",
        borderTopColor: "#5d5fe8",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}