import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

export default function LoginPage() {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const inviteToken           = searchParams.get("invite") || sessionStorage.getItem("pendingInviteToken");

  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      if (inviteToken) {
        try { await api.post(`/workspaces/join/${inviteToken}`); } catch {}
        sessionStorage.removeItem("pendingInviteToken");
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)" }}
        className="rounded-2xl p-10 w-full max-w-md shadow-2xl">

        <div className="flex justify-center mb-6">
          <div style={{ background: "linear-gradient(135deg,#5d5fe8,#8b5cf6)" }}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-1" style={{ color: "#e8e8f8" }}>Welcome back</h2>
        <p className="text-center mb-8 text-sm" style={{ color: "#7070a0" }}>
          {inviteToken ? "Sign in to join the workspace" : "Sign in to your workspace"}
        </p>

        {inviteToken && (
          <div style={{ background: "rgba(93,95,232,0.12)", border: "0.5px solid rgba(93,95,232,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#a0a0f0", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-link" /> You'll be added to the workspace automatically after signing in
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "0.5px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "#8080a8" }}>Email or Username</label>
            <input type="email" name="email" placeholder="you@company.com" value={form.email}
              onChange={handleChange} required
              style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", color: "#e0e0f0" }}
              className="w-full rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder-gray-600" />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: "#8080a8" }}>Password</label>
            <input type="password" name="password" placeholder="••••••••" value={form.password}
              onChange={handleChange} required
              style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.12)", color: "#e0e0f0" }}
              className="w-full rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder-gray-600" />
          </div>
          <button type="submit" disabled={loading}
            style={{ background: loading ? "rgba(93,95,232,0.5)" : "#5d5fe8" }}
            className="w-full text-white p-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Signing in…</>
            ) : inviteToken ? "Sign in & join" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#6060a0" }}>
          Don't have an account?{" "}
          <Link to={inviteToken ? `/signup?invite=${inviteToken}` : "/signup"} className="font-medium" style={{ color: "#8080e8" }}>Create one</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}