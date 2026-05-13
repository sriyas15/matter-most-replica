import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function InvitePage() {
  const { inviteToken }           = useParams();
  const { user, loading }         = useAuth();
  const navigate                  = useNavigate();
  const [status, setStatus]       = useState("loading"); // loading | preview | joining | error | done
  const [workspace, setWorkspace] = useState(null);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (loading) return;
    if (user) {
      joinWorkspace();
    } else {
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

  // ── Joining / loading spinner ─────────────────────────────────────────────
  if (status === "loading" || status === "joining") {
    return (
      <Screen>
        <Spinner />
        <p className="text-slate-400 text-sm mt-4">
          {status === "joining" ? "Joining workspace…" : "Loading…"}
        </p>
      </Screen>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <Screen>
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          You joined {workspace?.name}!
        </h2>
        <p className="text-sm text-slate-400">Redirecting you to the workspace…</p>
      </Screen>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <Screen>
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-red-500 mb-2">{error}</h2>
        <p className="text-sm text-slate-400 mb-5">
          The invite link may have expired or already been used.
        </p>
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Go to home
        </Link>
      </Screen>
    );
  }

  // ── Not logged in → preview + CTA ────────────────────────────────────────
  return (
    <Screen>
      <div className="bg-white border border-slate-200 rounded-2xl px-10 py-9 w-full max-w-sm text-center shadow-xl">

        {/* Logo */}
        <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-5 select-none">
          M
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-2">You've been invited!</h2>
        <p className="text-sm text-slate-400 mb-7 leading-relaxed">
          Create an account or log in to join the workspace.
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            to={`/signup?invite=${inviteToken}`}
            className="block bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium no-underline transition-colors"
          >
            Create account &amp; join
          </Link>
          <Link
            to={`/login?invite=${inviteToken}`}
            className="block bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg py-2.5 text-sm font-medium no-underline transition-colors"
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
    <div className="min-h-screen flex items-center justify-center flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-9 h-9 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
  );
}